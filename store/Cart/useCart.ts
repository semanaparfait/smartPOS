// useCart.ts
import { API_URL } from "@/config/api";
import type {
  CartItemRequest,
  CartItemsResponse,
  CartResponse,
  ProductResponse,
} from "@/store/Cart/cartTypes";
import useItem, { type ItemChangeResponse } from "@/store/Item/useItem";
import useProduct from "@/store/products/useProduct";
import { tr } from "@/i18n";
import type { OrderType } from "@/store/Order/OrderType";
import type { DeliveryDetails } from "@/store/Delivery/useDelivery";
import { getAuthToken } from "@/utils/authToken";
import Toast from "react-native-toast-message";
import useTableState from "@/components/venueMap/tableState";
import { create } from "zustand";

// What the till needs to show a product in the cart before the server answers.
export type CartProduct = {
  id: string;
  name: string;
  sellingPrice: number | string;
  barCode?: string | null;
  images?: unknown[];
  sendToKitchen?: boolean;
  trackStock?: boolean;
  stockQuantity?: number | string;
  unit?: string;
};

interface CartState {
  cartItems: CartResponse[];
  activeCartId: string | null;
  // True while cart changes are still being saved.
  syncing: boolean;
  // The kitchen product whose note box is open.
  noteProductId: string | null;
  askNote: (productId: string | null) => void;
  setItemNote: (productId: string, note: string) => Promise<void>;
  addToCart: (item?: CartItemRequest) => Promise<void>;
  getCart: () => Promise<CartResponse[]>;
  deleteCart: (cartId: string) => Promise<void>;
  getOrCreateActiveCart: () => Promise<string>;
  // Returns the new order; newer backends include its items and payments.
  // With `delivery`, the order is to be delivered (its fee is added by the server).
  checkoutCart: (
    cartId: string,
    delivery?: DeliveryDetails,
  ) => Promise<{ orderId: string; order: OrderType }>;
  // Instant cart changes: the screen updates now, the server is updated in the background.
  addProduct: (product: CartProduct, quantity?: number) => void;
  addByBarcode: (barCode: string) => void;
  setItemQuantity: (itemId: string, quantity: number) => void;
  removeLine: (itemId: string) => void;
  // Resolves once every pending change has been saved.
  flush: () => Promise<void>;
  // Sales put aside while their customer fetches something.
  heldCarts: CartResponse[];
  getHeldCarts: () => Promise<void>;
  holdCart: (customerName: string, minutes: number) => Promise<void>;
  extendHold: (cartId: string, minutes: number) => Promise<void>;
  resumeHeld: (cartId: string) => Promise<void>;
  cancelHeld: (cartId: string) => Promise<void>;
}

// Ids for things the server hasn't created yet.
const LOCAL_CART = "local-";
const TEMP_ITEM = "temp-";
export const isPendingLine = (itemId: string) => itemId.startsWith(TEMP_ITEM);

const authHeaders = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error("User not authenticated");
  return { "ngrok-skip-browser-warning": "true", Authorization: `Bearer ${token}` };
};

// Active carts from the server, without touching the store.
const fetchActiveCarts = async (): Promise<CartResponse[]> => {
  // Only open carts: the full list includes every past sale with its items.
  // (Older backends ignore the filter; the ACTIVE check below still applies.)
  const response = await fetch(`${API_URL}/api/v1/carts?status=ACTIVE`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch carts");
  }
  const allCarts: CartResponse[] = await response.json();
  return allCarts.filter((cart) => cart.status === "ACTIVE");
};

const createServerCart = async (): Promise<CartResponse> => {
  const response = await fetch(`${API_URL}/api/v1/carts/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create active cart");
  }
  return response.json();
};

const cartRequest = async (path: string, method: string, body?: object) => {
  const response = await fetch(`${API_URL}/api/v1/carts/${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Something went wrong");
  return data as CartResponse;
};

// Soonest to run out first.
const byHoldUntil = (carts: CartResponse[]) =>
  [...carts].sort((a, b) => String(a.holdUntil).localeCompare(String(b.holdUntil)));

// ---- Background save queue ----
// Changes are sent one at a time, in order, so the server never sees two adds of
// the same product racing each other. Taps made while a request is in flight are
// merged into the next one (5 quick taps -> one "+5").
let queue: Promise<void> = Promise.resolve();
let pending = 0;
let lastServerCart: CartResponse | null = null;
let needsRefetch = false;
let lastError: Error | null = null;
const pendingAdds = new Map<string, number>(); // productId -> quantity not sent yet
const pendingQuantities = new Map<string, number>(); // itemId -> latest quantity not sent yet

const lineTotal = (price: number | string, quantity: number) =>
  String(Number(price || 0) * quantity);

type StockInfo = Pick<CartProduct, "id" | "trackStock" | "stockQuantity">;

// How many of a product this till's held sales are keeping for their customers.
// (Other tills' held sales are checked by the server.)
export const heldQuantity = (productId: string, heldCarts = useCart.getState().heldCarts) =>
  heldCarts
    .flatMap((c) => c.items ?? [])
    .reduce((sum, i) => (i.product?.id === productId ? sum + i.quantity : sum), 0);

// How many can be sold, from the latest product list, less what held sales keep;
// null when stock isn't tracked.
export const stockLimit = (product?: StockInfo | null): number | null => {
  if (!product) return null;
  const latest = useProduct.getState().products.find((p) => p.id === product.id) ?? product;
  if (!latest.trackStock) return null;
  return Math.max(0, (Number(latest.stockQuantity) || 0) - heldQuantity(product.id));
};

const showNoStock = (name: string, limit: number, unit?: string) =>
  Toast.show({
    type: "error",
    text1: name,
    text2:
      limit <= 0
        ? tr("Out of stock")
        : `${tr("Only this many in stock:")} ${limit.toLocaleString()} ${unit ?? ""}`.trim(),
  });

const useCart = create<CartState>((set, get) => {
  const enqueue = (task: () => Promise<ItemChangeResponse | undefined>) => {
    pending++;
    set({ syncing: true });
    queue = queue.then(async () => {
      try {
        const result = await task();
        if (result?.cart) lastServerCart = result.cart;
        // Older backends answer with a message only; reload once everything is sent.
        else if (result) needsRefetch = true;
      } catch (error) {
        lastError = error as Error;
      } finally {
        pending--;
        if (pending === 0) await settle();
      }
    });
    return queue;
  };

  // Everything is saved: replace the guessed cart with the server's.
  const settle = async () => {
    const error = lastError;
    const serverCart = lastServerCart;
    const refetch = needsRefetch || !!error;
    lastError = null;
    lastServerCart = null;
    needsRefetch = false;

    if (refetch) {
      try {
        const carts = await fetchActiveCarts();
        // A tap during the reload starts a new round that will sync again.
        if (pending === 0) set(cartsState(carts));
      } catch (e) {
        console.error("Error reloading cart:", e);
      }
    } else if (serverCart) {
      set((state) => ({
        activeCartId: serverCart.id,
        cartItems: state.cartItems.some((c) => c.id === serverCart.id)
          ? state.cartItems.map((c) => (c.id === serverCart.id ? serverCart : c))
          : [serverCart],
      }));
    }
    set({ syncing: pending > 0 });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Cart not updated",
        text2: error.message || "Something went wrong. The cart was reloaded.",
      });
    }
  };

  const cartsState = (carts: CartResponse[]) => ({
    cartItems: carts,
    activeCartId: carts.length > 0 ? carts[0].id : null,
  });

  // The server id of the active cart, creating it if the sale only exists locally.
  const resolveCartId = async () => {
    const current = get().activeCartId;
    if (current && !current.startsWith(LOCAL_CART)) return current;

    const existing = await fetchActiveCarts();
    const cart = existing[0] ?? (await createServerCart());
    set((state) => ({
      activeCartId: cart.id,
      cartItems: state.cartItems.map((c) => (c.id === current ? { ...c, id: cart.id } : c)),
    }));
    return cart.id;
  };

  // Applies a change to the active cart's lines, starting a local cart if needed.
  const updateLines = (change: (items: CartItemsResponse[]) => CartItemsResponse[]) => {
    set((state) => {
      let cartId = state.activeCartId;
      let carts = state.cartItems;
      if (!cartId || !carts.some((c) => c.id === cartId)) {
        cartId = `${LOCAL_CART}${Date.now()}`;
        const now = new Date().toISOString();
        carts = [
          { id: cartId, createdAt: now, updatedAt: now, status: "ACTIVE", totalAmount: 0, items: [] },
        ];
      }
      return {
        activeCartId: cartId,
        cartItems: carts.map((c) => (c.id === cartId ? { ...c, items: change(c.items ?? []) } : c)),
      };
    });
  };

  return {
    cartItems: [],
    activeCartId: null,
    syncing: false,
    noteProductId: null,
    heldCarts: [],

    askNote: (productId) => set({ noteProductId: productId }),

    // The product may still be saving, so its line is found by product, then the
    // note is sent once the line has its server id.
    setItemNote: async (productId, note) => {
      const applyNote = () =>
        updateLines((items) =>
          items.map((i) => (i.product?.id === productId ? { ...i, note } : i)),
        );
      applyNote();
      await get().flush();
      const lines = get().cartItems.find((c) => c.id === get().activeCartId)?.items;
      const line = lines?.find((i) => i.product?.id === productId);
      if (!line || isPendingLine(line.id)) return;
      applyNote();
      enqueue(() => useItem.getState().setNote(line.id, note));
    },

    addProduct: (product, quantity = 1) => {
      const lines = get().cartItems.find((c) => c.id === get().activeCartId)?.items;
      const inCart = lines?.find((i) => i.product?.id === product.id)?.quantity ?? 0;
      const limit = stockLimit(product);
      if (limit !== null && inCart + quantity > limit) {
        showNoStock(product.name, limit, product.unit);
        return;
      }

      // First time in this sale: the note box opens right after the line appears.
      if (product.sendToKitchen && !lines?.some((i) => i.product?.id === product.id)) {
        set({ noteProductId: product.id });
      }

      updateLines((items) => {
        const line = items.find((i) => i.product?.id === product.id);
        if (line) {
          const next = line.quantity + quantity;
          return items.map((i) =>
            i === line ? { ...i, quantity: next, totalPrice: lineTotal(product.sellingPrice, next) } : i,
          );
        }
        const now = new Date().toISOString();
        return [
          ...items,
          {
            id: `${TEMP_ITEM}${product.id}`,
            createdAt: now,
            updatedAt: now,
            product: product as unknown as ProductResponse,
            quantity,
            totalPrice: lineTotal(product.sellingPrice, quantity),
          },
        ];
      });

      // A request for this product is already waiting: just add to it.
      const queued = pendingAdds.has(product.id);
      pendingAdds.set(product.id, (pendingAdds.get(product.id) ?? 0) + quantity);
      if (queued) return;

      enqueue(async () => {
        const delta = pendingAdds.get(product.id) ?? 0;
        pendingAdds.delete(product.id);
        if (delta <= 0) return undefined;
        const cartId = await resolveCartId();
        return useItem.getState().addItem(cartId, product.id, delta);
      });
    },

    // Unknown barcodes can't be shown before the server finds the product.
    addByBarcode: (barCode) => {
      enqueue(async () => {
        const cartId = await resolveCartId();
        return useItem.getState().addByBarCode(cartId, barCode);
      });
    },

    setItemQuantity: (itemId, quantity) => {
      if (quantity <= 0) return get().removeLine(itemId);
      // Not saved yet: its add request will create it; adjust after it lands.
      if (isPendingLine(itemId)) return;

      const line = get()
        .cartItems.flatMap((c) => c.items ?? [])
        .find((i) => i.id === itemId);
      const limit = stockLimit(line?.product);
      // Lowering is always allowed, even if stock dropped below what's in the cart.
      if (line && limit !== null && quantity > line.quantity && quantity > limit) {
        showNoStock(line.product.name, limit, line.product.unit);
        return;
      }

      updateLines((items) =>
        items.map((i) =>
          i.id === itemId
            ? { ...i, quantity, totalPrice: lineTotal(i.product?.sellingPrice, quantity) }
            : i,
        ),
      );

      const queued = pendingQuantities.has(itemId);
      pendingQuantities.set(itemId, quantity);
      if (queued) return;

      enqueue(async () => {
        const latest = pendingQuantities.get(itemId);
        pendingQuantities.delete(itemId);
        if (latest === undefined) return undefined;
        return useItem.getState().updateItem(itemId, latest);
      });
    },

    removeLine: (itemId) => {
      if (isPendingLine(itemId)) return;
      updateLines((items) => items.filter((i) => i.id !== itemId));
      pendingQuantities.delete(itemId);
      enqueue(() => useItem.getState().removeItem(itemId));
    },

    flush: async () => {
      while (pending > 0) await queue;
    },

    getHeldCarts: async () => {
      const response = await fetch(`${API_URL}/api/v1/carts?status=HELD`, {
        headers: await authHeaders(),
      });
      if (!response.ok) return;
      const carts: CartResponse[] = await response.json();
      // Older backends ignore the filter.
      set({ heldCarts: byHoldUntil(carts.filter((c) => c.status === "HELD")) });
    },

    holdCart: async (customerName, minutes) => {
      const cartId = await get().getOrCreateActiveCart();
      const held = await cartRequest(`${cartId}/hold`, "PATCH", { customerName, minutes });
      set((state) => ({
        cartItems: state.cartItems.filter((c) => c.id !== cartId),
        activeCartId: null,
        heldCarts: byHoldUntil([...state.heldCarts, held]),
      }));
    },

    extendHold: async (cartId, minutes) => {
      const held = await cartRequest(`${cartId}/hold/extend`, "PATCH", { minutes });
      set((state) => ({
        heldCarts: byHoldUntil(state.heldCarts.map((c) => (c.id === cartId ? held : c))),
      }));
    },

    resumeHeld: async (cartId) => {
      const open = get().cartItems.find((c) => c.id === get().activeCartId);
      if (open?.items?.length) throw new Error(tr("Finish or hold the current sale first"));
      await get().flush();
      const cart = await cartRequest(`${cartId}/resume`, "PATCH");
      set((state) => ({
        cartItems: [cart],
        activeCartId: cart.id,
        heldCarts: state.heldCarts.filter((c) => c.id !== cartId),
      }));
    },

    cancelHeld: async (cartId) => {
      await cartRequest(`${cartId}/abandon`, "DELETE");
      set((state) => ({ heldCarts: state.heldCarts.filter((c) => c.id !== cartId) }));
    },

    getCart: async () => {
      try {
        const activeCarts = await fetchActiveCarts();
        // Don't overwrite changes that are still being saved; settle() syncs after.
        if (pending === 0) set(cartsState(activeCarts));
        return activeCarts;
      } catch (error) {
        console.error("Error filtering active cart:", error);
        throw error;
      }
    },

    getOrCreateActiveCart: async () => {
      await get().flush();
      return resolveCartId();
    },

    addToCart: async (item) => {
      if (!API_URL) throw new Error("API URL not configured");
      try {
        const response = await fetch(`${API_URL}/api/v1/carts/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify(item),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to add item to cart");
        }
        const newItem: CartResponse = await response.json();
        set((state) => ({ cartItems: [...state.cartItems, newItem] }));
      } catch (error) {
        console.error("Error adding item to cart:", error);
        throw error;
      }
    },

    deleteCart: async (cartId) => {
      if (!API_URL) throw new Error("API URL not configured");
      // Let pending saves finish first, so the server cart id is known.
      await get().flush();
      const id = cartId.startsWith(LOCAL_CART) ? get().activeCartId : cartId;
      try {
        if (id && !id.startsWith(LOCAL_CART)) {
          const response = await fetch(`${API_URL}/api/v1/carts/${id}/abandon`, {
            method: "DELETE",
            headers: await authHeaders(),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to delete cart");
          }
        }
        set((state) => ({
          cartItems: state.cartItems.filter((cart) => cart.id !== id && cart.id !== cartId),
          activeCartId: state.activeCartId === id ? null : state.activeCartId,
        }));
      } catch (error) {
        console.error("Error deleting cart:", error);
        throw error;
      }
    },

    checkoutCart: async (cartId: string, delivery?: DeliveryDetails) => {
      if (!API_URL) throw new Error("API URL not configured");
      // Every item must be saved before the sale is closed.
      await get().flush();
      const id = cartId.startsWith(LOCAL_CART) ? get().activeCartId : cartId;
      if (!id || id.startsWith(LOCAL_CART)) throw new Error("The cart couldn't be saved. Try again.");
      try {
        const response = await fetch(`${API_URL}/api/v1/carts/${id}/checkout`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          // More for a table still being served: added to its open order.
          body: JSON.stringify(
            delivery
              ? { delivery }
              : useTableState.getState().pendingTable?.orderId
                ? { orderId: useTableState.getState().pendingTable!.orderId }
                : {},
          ),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to checkout cart");
        }

        const order: OrderType = await response.json();

        // The server removed the cart; clear it here instead of fetching carts again.
        set((state) => ({
          cartItems: state.cartItems.filter((c) => c.id !== id),
          activeCartId: state.activeCartId === id ? null : state.activeCartId,
        }));

        // Taken for a table from the floor map: the order is now served there.
        useTableState.getState().orderPlaced(order.id).catch(() => {});

        return { orderId: order.id, order };
      } catch (error) {
        console.error("Error checking out cart:", error);
        throw error;
      }
    },
  };
});

export default useCart;
