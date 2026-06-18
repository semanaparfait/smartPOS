import type { ProductType, ProductRequest } from "@/store/products/productsType";
import { API_URL } from "@/config/api";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ProductStore {
  products: ProductType[];
  loading: boolean;
  error: string | null;
    addProduct: (product: FormData) => Promise<void>;
    getProducts: () => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
}

const useProduct = create<ProductStore>((set, get) => ({
  products: [],
  loading: false,
  error: null,
    addProduct: async (data: FormData) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }
    try {
          const token = await AsyncStorage.getItem("token");
      if (!token) return;
        const response = await fetch(`${API_URL}/api/v1/products`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
            },
            body: data,
        });
        const newProduct = await response.json();
        set((state) => ({
            products: [...state.products, newProduct],
        }));

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to add product");
        }
    } catch (error: any) {
        console.error("Error adding product:", error);
    }
    },
    getProducts: async () => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }
    try {      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/products`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
        },
      });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to fetch products");
        }
        const products = await response.json();
        set({ products, loading: false });
    } catch (error: any) {
        set({ error: error.message || "Something went wrong", loading: false });
        console.error("Error fetching products:", error);
    }
    },
    deleteProduct: async (id) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }
    try {     
         const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/products/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
        },
      });
      if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to delete product");
        }
        set((state) => ({
            products: state.products.filter((product) => product.id !== id),
        }));
    } catch (error: any) {
        console.error("Error deleting product:", error);
    }
}
}));

export default useProduct;