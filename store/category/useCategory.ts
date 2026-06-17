import type { categoryType, categoriesResponse} from "@/store/category/categoryType";
import { API_URL } from "@/config/api";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CategoryStore {
  categories: categoryType[];
  categoriesResponse: categoriesResponse[];
  loading: boolean;
  error: string | null;
  addCategory: (data: FormData) => Promise<void>;
  getCategories: () => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const useCategory = create<CategoryStore>((set, get) => ({
  categories: [],
  categoriesResponse: [],
  loading: false,
  error: null,

addCategory: async (data: FormData) => {
  if (!API_URL) {
    console.error("API_URL is not defined");
    return;
  }

  try {
    set({ loading: true, error: null });

    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const response = await fetch(`${API_URL}/api/v1/categories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: data,
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
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/v1/categories`, {
        method: "GET",
        headers: { "Content-Type": "application/json", 
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
         },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = await response.json();

      // safer parsing (depends on backend structure)
      const categoriesResponse = data?.categoriesResponse || data || [];

      set({
        categoriesResponse,
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
  deleteCategory: async (id) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`${API_URL}/api/v1/categories/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", 
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
         },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete category");
      }
      set((state) => ({
        categories: state.categories.filter((category) => category.id !== id),
      }));
    }
      catch (error: any) {
      set({
        error: error.message || "Failed to delete category",
      });
      console.error("Error deleting category:", error);
    }
  }

}));

export default useCategory;