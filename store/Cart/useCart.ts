// useCart.ts
import type { CartItemRequest, CartResponse } from "@/store/Cart/cartTypes";
import { API_URL } from "@/config/api";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CartState {
  cartItems: CartResponse[];
  activeCartId: string | null; 
  addToCart: (item?: CartItemRequest) => Promise<void>;
  getCart: () => Promise<CartResponse[]>;
  deleteCart: (cartId: string) => Promise<void>;
  getOrCreateActiveCart: () => Promise<string>; 
  checkoutCart: (cartId: string) => Promise<{ orderId: string }>;
}

const useCart = create<CartState>((set, get) => ({
  cartItems: [],
  activeCartId: null,


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
      throw new Error(errorData.message || "Failed to fetch carts");
    }

    const allCarts: CartResponse[] = await response.json();
    const activeCarts = allCarts.filter(cart => cart.status === "ACTIVE");
    set({ 
      cartItems: activeCarts,
      activeCartId: activeCarts.length > 0 ? activeCarts[0].id : null 
    });

    return activeCarts; 
  } catch (error) {
    console.error("Error filtering active cart:", error);
    throw error;
  }
},

  getOrCreateActiveCart: async () => {
    const { activeCartId, getCart } = get();
    if (activeCartId) return activeCartId;

   
    try {
      const currentCarts = await getCart();
      if (currentCarts && currentCarts.length > 0) {
        return currentCarts[0].id;
      }
    } catch (e) {
      console.log("No existing carts found or error fetching, creating one instead.");
    }

    // Create a new cart if none found
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(`${API_URL}/api/v1/carts/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create active cart");
    }

    const newCart: CartResponse = await response.json();
    set((state) => ({ 
      activeCartId: newCart.id,
      cartItems: [...state.cartItems, newCart] 
    }));
    
    return newCart.id;
  },

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
  deleteCart: async (cartId) => {
    if (!API_URL) throw new Error("API URL not configured");
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("User not authenticated");
      const response = await fetch(`${API_URL}/api/v1/carts/${cartId}`, {
        method: "DELETE",
        headers: {
          "ngrok-skip-browser-warning": "true",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete cart");
      }
      set((state) => ({
        cartItems: state.cartItems.filter((cart) => cart.id !== cartId),
        activeCartId: state.activeCartId === cartId ? null : state.activeCartId,
      }));
    } catch (error) {
      console.error("Error deleting cart:", error);
      throw error;
    }
  },
checkoutCart: async (cartId: string): Promise<{ orderId: string }> => {
  if (!API_URL) throw new Error("API URL not configured");
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("User not authenticated");
    
    const response = await fetch(`${API_URL}/api/v1/carts/${cartId}/checkout`, {
      method: "PATCH",
      headers: {
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
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
}));

export default useCart;