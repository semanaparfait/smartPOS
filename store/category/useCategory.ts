import type { categoryType } from "@/store/category/categoryType";
import { API_URL } from "@/config/api";
import { create } from "zustand";

interface CategoryStore {
  categories: categoryType[];
  loading: boolean;
  error: string | null;

  addCategory: (category: categoryType) => Promise<void>;
  getCategories: () => Promise<void>;
}

const useCategory = create<CategoryStore>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  addCategory: async (category) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }

    try {
      set({ loading: true, error: null });

      const response = await fetch(`${API_URL}/api/v1/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add category");
      }

      const newCategory = await response.json();

      set((state) => ({
        categories: [...state.categories, newCategory],
        loading: false,
      }));
    } catch (error: any) {
      set({
        loading: false,
        error: error.message || "Something went wrong",
      });
      console.error("Error adding category:", error);
    }
  },

  getCategories: async () => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }

    try {
      set({ loading: true, error: null });

      const response = await fetch(`${API_URL}/api/v1/categories`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = await response.json();

      // safer parsing (depends on backend structure)
      const categories = data?.categories || data || [];

      set({
        categories,
        loading: false,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error.message || "Failed to load categories",
      });

      console.error("Error fetching categories:", error);
    }
  },
}));

export default useCategory;