import { API_URL } from "@/config/api";
import type {
  AuditEntry,
  Page,
  ProductType,
  StockMovement,
} from "@/store/products/productsType";
import { getAuthToken } from "@/utils/authToken";
import { create } from "zustand";

interface ProductStore {
  products: ProductType[];
  lowStock: ProductType[];
  loading: boolean;
  error: string | null;
  addProduct: (product: FormData) => Promise<void>;
  updateProduct: (id: string, changes: FormData) => Promise<void>;
  setProductActive: (id: string, active: boolean) => Promise<void>;
  restockProduct: (id: string, quantity: number, note?: string) => Promise<void>;
  getProducts: () => Promise<void>;
  getLowStock: () => Promise<void>;
  getExpiring: (days: number) => Promise<ProductType[]>;
  getStockMovements: (id: string, page: number) => Promise<Page<StockMovement>>;
  getAuditLogs: (query: Record<string, string | number>) => Promise<Page<AuditEntry>>;
}

export const isLowStock = (p: ProductType) =>
  p.trackStock &&
  p.lowStockLevel !== null &&
  p.lowStockLevel !== undefined &&
  Number(p.stockQuantity) <= Number(p.lowStockLevel);

// Throws the server's own message, e.g. "Another product already has this SKU".
const request = async (path: string, init: RequestInit = {}) => {
  if (!API_URL) throw new Error("API_URL is not configured");
  const token = await getAuthToken();
  if (!token) throw new Error("You are signed out. Please sign in again.");

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
      ...init.headers,
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error([data?.message].flat().join("\n") || "Something went wrong");
  }
  return data;
};

const useProduct = create<ProductStore>((set) => {
  // Keeps both lists right after a product comes back from the server.
  const replace = (updated: ProductType) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === updated.id ? { ...p, ...updated } : p,
      ),
      lowStock: state.lowStock
        .map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
        .filter(isLowStock),
    }));

  return {
    products: [],
    lowStock: [],
    loading: false,
    error: null,
    addProduct: async (data) => {
      const result = await request("/products", { method: "POST", body: data });
      set((state) => ({ products: [...state.products, result] }));
    },
    updateProduct: async (id, changes) => {
      replace(
        await request(`/products/${id}`, { method: "PATCH", body: changes }),
      );
    },
    setProductActive: async (id, active) => {
      const action = active ? "activate" : "deactivate";
      await request(`/products/${id}/${action}`, { method: "PATCH" });
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? { ...p, active } : p)),
        lowStock: active ? state.lowStock : state.lowStock.filter((p) => p.id !== id),
      }));
    },
    restockProduct: async (id, quantity, note) => {
      replace(
        await request(`/products/${id}/restock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity, ...(note ? { note } : {}) }),
        }),
      );
    },
    getProducts: async () => {
      try {
        const products = await request("/products");
        set({ products, loading: false });
      } catch (error: any) {
        set({ error: error.message || "Something went wrong", loading: false });
        console.error("Error fetching products:", error);
      }
    },
    getLowStock: async () => {
      set({ lowStock: await request("/products/low-stock") });
    },
    getExpiring: (days) => request(`/products/expiring?days=${days}`),
    getStockMovements: (id, page) =>
      request(`/products/${id}/stock-movements?page=${page}&limit=50`),
    getAuditLogs: (query) => {
      const params = Object.entries(query)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
      return request(`/audit-logs?${params}`);
    },
  };
});

export default useProduct;
