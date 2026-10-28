import type { OrderPaymentInput, OrderType } from "@/store/Order/OrderType";
import { API_URL } from "@/config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface OrderState {
  orders: OrderType[];
  // The order just created at checkout, so the payment screen opens without a fetch.
  justCheckedOut: OrderType | null;
  setJustCheckedOut: (order: OrderType | null) => void;
  fetchOrders: () => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<OrderType | null>;
  cancelOrder: (orderId: string) => Promise<void>;
  completeOrder: (orderId: string, payments: OrderPaymentInput[]) => Promise<OrderType | null>;
}

const useOrder = create<OrderState>((set) => ({
  orders: [],
  justCheckedOut: null,
  setJustCheckedOut: (order) => set({ justCheckedOut: order }),
  fetchOrders: async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("User not authenticated");
        const response = await fetch(`${API_URL}/api/v1/orders`, {
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
        set({ orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        throw error;
    }
    },
    fetchOrderById: async (orderId: string) => {
        try {
            const token = await AsyncStorage.getItem("token");
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
            const token = await AsyncStorage.getItem("token");
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
        const token = await AsyncStorage.getItem("token");
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