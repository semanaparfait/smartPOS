import type {CartItemRequest,CartItemResponse} from "@/store/Cart/cartTypes"
import {API_URL} from "@/config/api";
import {create} from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CartState {
  cartItems: CartItemResponse[];
  addToCart: (item?: CartItemRequest) => Promise<void>;
  getCart: () => Promise<void>;
//   checkout: () => Promise<void>;
//   removeFromCart: (itemId: string) => Promise<void>;
//   clearCart: () => void;
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
        const newItem: CartItemResponse = await response.json();
        set((state) => ({ cartItems: [...state.cartItems, newItem] }));
    }

        catch (error) {
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
          Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch cart");
      }
      const cartItems: CartItemResponse[] = await response.json();
      set({ cartItems });
    } catch (error) {
      console.error("Error fetching cart:", error);
      throw error;
    }
  },
 
}));
export default useCart;