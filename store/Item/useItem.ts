
import type { itemRequest } from "@/store/Item/ItemType";
import { API_URL } from "@/config/api";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ItemStore {
  addItem: (cartId: string, productId: string, quantity: number) => Promise<any>;
  getItems: () => Promise<itemRequest[]>;
  removeItem: (itemId: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
}

const useItem = create<ItemStore>((set, get) => ({
  addItem: async (cartId: string, productId: string, quantity: number) => {
    if (!API_URL) throw new Error("API_URL is not defined");
    
    try {    
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("User not authenticated");

      const response = await fetch(`${API_URL}/api/v1/items/${cartId}/item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ productId, quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add item");
      }
      
      const newItem = await response.json();
      return newItem; 
    } catch (error) {
      console.error("Error adding item:", error);
      throw error; 
    }
  },

  getItems: async () => {
    if (!API_URL) return [];
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return [];
      const response = await fetch(`${API_URL}/api/v1/items`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch items");
      return await response.json();
    } catch (error) {
      console.error("Error fetching items:", error);
      return [];
    }
  },

  removeItem: async (itemId: string) => {
    if (!API_URL) return;
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/items/${itemId}/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      if (!response.ok) throw new Error("Failed to remove item");
    } catch (error) {
      console.error("Error removing item:", error);
      throw error;
    }
  },

  updateItem: async (itemId: string, quantity: number) => {
    if (!API_URL) return;
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/items/${itemId}`, {
        method: "PATCH", 
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ quantity }),
      });
      if (!response.ok) throw new Error("Failed to update item");
    } catch (error) {
      console.error("Error updating item:", error);
      throw error;
    }
  },
}));

export default useItem;