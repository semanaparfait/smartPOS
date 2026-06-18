import type { itemRequest } from "@/store/Item/ItemType";
import { API_URL } from "@/config/api";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ItemStore {
  items: itemRequest[];
  addItem: (item: itemRequest) => Promise<void>;
  getItems: () => Promise<itemRequest[]>;
}

const useItem = create<ItemStore>((set, get) => ({
  items: [],
  addItem: async (item: itemRequest) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }
    try {    
          const token = await AsyncStorage.getItem("token");

      if (!token) return;
        const response = await fetch(`${API_URL}/api/v1/items/{itemId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify(item),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to add item");
        }
        const newItem = await response.json();
        set((state) => ({ items: [...state.items, newItem] }));
    } catch (error) {
        console.error("Error adding item:", error);
    }
    },
    getItems: async () => {
        if (!API_URL) {
            console.error("API_URL is not defined");
            return [];
        }
        try {
            const token = await AsyncStorage.getItem("token");

            if (!token) return;
            const response = await fetch(`${API_URL}/api/v1/items`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "ngrok-skip-browser-warning": "true",
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to fetch items");
            }
            const items = await response.json();
            set({ items });
            return items;
        }
        catch (error) {
            console.error("Error fetching items:", error);
            return [];
        }
    },
}));

export default useItem;