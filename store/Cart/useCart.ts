// useCart.ts
import { API_URL } from "@/config/api";
import type {
  CartItemRequest,
  CartItemsResponse,
  CartResponse,
  ProductResponse,
} from "@/store/Cart/cartTypes";
import useItem, { type ItemChangeResponse } from "@/store/Item/useItem";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { create } from "zustand";

// What the till needs to show a product in the cart before the server answers.
export type CartProduct = {
  id: string;
  name: string;
  sellingPrice: number | string;
  barCode?: string | null;
  images?: unknown[];
};

interface CartState {
  cartItems: CartResponse[];
  activeCartId: string | null;
  // True while cart changes are still being saved.
  syncing: boolean;
  addToCart: (item?: CartItemRequest) => Promise<void>;
  getCart: () => Promise<CartResponse[]>;
  deleteCart: (cartId: string) => Promise<void>;
  getOrCreateActiveCart: () => Promise<string>;
  checkoutCart: (cartId: string) => Promise<{ orderId: string }>;
  // Instant cart changes: the screen updates now, the server is updated in the background.
  addProduct: (product: CartProduct, quantity?: number) => void;
  addByBarcode: (barCode: string) => void;
  setItemQuantity: (itemId: string, quantity: number) => void;
  removeLine: (itemId: string) => void;
  // Resolves once every pending change has been saved.
  flush: () => Promise<void>;
}

// Ids for things the server hasn't created yet.
const LOCAL_CART = "local-";
const TEMP_ITEM = "temp-";
export const isPendingLine = (itemId: string) => itemId.startsWith(TEMP_ITEM);

const authHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
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

    addProduct: (product, quantity = 1) => {
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

    checkoutCart: async (cartId: string): Promise<{ orderId: string }> => {
      if (!API_URL) throw new Error("API URL not configured");
      // Every item must be saved before the sale is closed.
      await get().flush();
      const id = cartId.startsWith(LOCAL_CART) ? get().activeCartId : cartId;
      if (!id || id.startsWith(LOCAL_CART)) throw new Error("The cart couldn't be saved. Try again.");
      try {
        const response = await fetch(`${API_URL}/api/v1/carts/${id}/checkout`, {
          method: "PATCH",
          headers: await authHeaders(),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to checkout cart");
        }

        const orderData = await response.json();

        return { orderId: orderData.id };
      } catch (error) {
        console.error("Error checking out cart:", error);
        throw error;
      }
    },
  };
});

export default useCart;
