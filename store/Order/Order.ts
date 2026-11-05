import type { OrderPaymentInput, OrderType } from "@/store/Order/OrderType";
import { API_URL } from "@/config/api";
import { getAuthToken } from "@/utils/authToken";
import { create } from "zustand";

interface OrderState {
  orders: OrderType[];
  // The order just created at checkout, so the payment screen opens without a fetch.
  justCheckedOut: OrderType | null;
  setJustCheckedOut: (order: OrderType | null) => void;
  // Adds or replaces one order (live updates from the server).
  upsertOrder: (order: OrderType) => void;
  // Loads the orders since `since` (a date, or a number of days back), plus every
  // order still open. The furthest back any screen asked for is kept, so other
  // screens refreshing don't drop it. Infinity loads them all.
  fetchOrders: (since?: Date | number) => Promise<void>;
  // How many days back `orders` reaches.
  loadedDays: number;
  // Every paid order with a credit payment, however old (credit stays owed).
  creditOrders: OrderType[];
  fetchCreditOrders: () => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<OrderType | null>;
  cancelOrder: (orderId: string) => Promise<void>;
  completeOrder: (orderId: string, payments: OrderPaymentInput[]) => Promise<OrderType | null>;
  // Kitchen steps; throws with the API's message.
  setOrderStatus: (orderId: string, status: "PENDING" | "PREPARING" | "READY") => Promise<OrderType>;
}

// Two months by default: every period the screens show by default, and the one
// before it to compare.
const DEFAULT_DAYS = 62;

const startOfDayDaysAgo = (days: number) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - days);
};

const daysBack = (since?: Date | number) => {
  if (since === undefined) return 0;
  if (typeof since === "number") return since;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.ceil((start.getTime() - new Date(since.getFullYear(), since.getMonth(), since.getDate()).getTime()) / 86_400_000));
};

const useOrder = create<OrderState>((set, get) => ({
  setOrderStatus: async (orderId, status) => {
    const token = await getAuthToken();
    if (!token) throw new Error("User not authenticated");
    const response = await fetch(`${API_URL}/api/v1/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
      throw new Error(message || "Could not update this order");
    }
    // The reply may leave out relations (items, user); keep the ones already loaded.
    const existing = get().orders.find((o) => o.id === orderId);
    const updated = { ...existing, ...data, items: data.items ?? existing?.items, user: data.user ?? existing?.user };
    get().upsertOrder(updated);
    return updated as OrderType;
  },
  orders: [],
  loadedDays: DEFAULT_DAYS,
  creditOrders: [],
  fetchCreditOrders: async () => {
    const token = await getAuthToken();
    if (!token) throw new Error("User not authenticated");
    const response = await fetch(`${API_URL}/api/v1/orders?credit=true`, {
      headers: { "ngrok-skip-browser-warning": "true", Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to fetch credit sales");
    }
    set({ creditOrders: await response.json() });
  },
  justCheckedOut: null,
  setJustCheckedOut: (order) => set({ justCheckedOut: order }),
  upsertOrder: (order) =>
    set((state) => ({
      // Newest first, like GET /orders.
      orders: state.orders.some((o) => o.id === order.id)
        ? state.orders.map((o) => (o.id === order.id ? order : o))
        : [order, ...state.orders],
      justCheckedOut: state.justCheckedOut?.id === order.id ? order : state.justCheckedOut,
    })),
  fetchOrders: async (since) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("User not authenticated");
      const days = Math.max(get().loadedDays, daysBack(since));
      const query = Number.isFinite(days) ? `?from=${encodeURIComponent(startOfDayDaysAgo(days).toISOString())}` : "";
        const response = await fetch(`${API_URL}/api/v1/orders${query}`, {
          headers: {
            "ngrok-skip-browser-warning": "true",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to fetch orders");
        }
        const orders: OrderType[] = await response.json();
        set({ orders, loadedDays: days });
    } catch (error) {
        console.error("Error fetching orders:", error);
        throw error;
    }
    },
    fetchOrderById: async (orderId: string) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error("User not authenticated");
            const response = await fetch(`${API_URL}/api/v1/orders/${orderId}`, {
                headers: {
                    "ngrok-skip-browser-warning": "true",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to fetch order");
            }
            const orderResponse: OrderType = await response.json();
            return orderResponse;
        }
        catch (error) {
            console.error(`Error fetching order with ID ${orderId}:`, error);
            return null;
        }
    },
    cancelOrder: async (orderId: string) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error("User not authenticated");
            const response = await fetch(`${API_URL}/api/v1/orders/${orderId}/cancel`, {
                method: "PATCH",
                headers: {
                    "ngrok-skip-browser-warning": "true",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to cancel order");
            }
        }
        catch (error) {
            console.error(`Error canceling order with ID ${orderId}:`, error);
            throw error;
        }
    },
    // Records the payments and marks the order COMPLETED. Throws with the API message on failure.
    completeOrder: async (orderId, payments) => {
        const token = await getAuthToken();
        if (!token) throw new Error("User not authenticated");
        const response = await fetch(`${API_URL}/api/v1/orders/${orderId}/complete`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ payments }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
            throw new Error(message || "Failed to complete order");
        }
        const updated: OrderType | null = data?.id ? data : null;
        if (updated) {
            set((state) => ({
                orders: state.orders.map((o) => (o.id === updated.id ? updated : o)),
            }));
        }
        return updated;
    },
}));

export default useOrder;