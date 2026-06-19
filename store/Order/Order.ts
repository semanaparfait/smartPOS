import type { OrderType } from "@/store/Order/OrderType";
import { API_URL } from "@/config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface OrderState {
  orders: OrderType[];
  fetchOrders: () => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<OrderType | null>;
  cancelOrder: (orderId: string) => Promise<void>;
}

const useOrder = create<OrderState>((set) => ({
  orders: [],
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
    }
}));

export default useOrder;