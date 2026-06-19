import type { CartItemRequest, CartResponse } from "@/store/Cart/cartTypes";
import { API_URL } from "@/config/api";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CartState {
  cartItems: CartResponse[];
  addToCart: (item?: CartItemRequest) => Promise<void>;
  getCart: () => Promise<CartResponse[]>;
}

const useCart = create<CartState>((set, get) => ({
  cartItems: [],
  addToCart: async (item) => {
    if (!API_URL) throw new Error("API URL not configured");
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("User not authenticated");
      const response = await fetch(`${API_URL}/api/v1/carts/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          Authorization: `Bearer ${token}`,
        },
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
  getCart: async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("User not authenticated");

      const response = await fetch(`${API_URL}/api/v1/carts`, {
        headers: {
          "ngrok-skip-browser-warning": "true",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch cart");
      }

      const cartItems: CartResponse[] = await response.json();

      set({ cartItems });

      return cartItems; // ← return the array
    } catch (error) {
      console.error("Error fetching cart:", error);
      throw error;
    }
  },
}));
export default useCart;
