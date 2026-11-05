import { API_URL } from "@/config/api";
import { getAuthToken } from "@/utils/authToken";

// Closing the business day (the server's /day-closings).

export type Method = "CASH" | "MOMO" | "CARD" | "CREDIT";
export type CountedMethod = Exclude<Method, "CREDIT">;

export interface StockRow {
  productId: string;
  name: string;
  unit: string;
  opening: number;
  received: number;
  sold: number;
  wasted: number;
  adjusted: number;
  expected: number;
  counted: number | null;
  difference: number;
  value: number;
}

export interface ClosingMoney {
  expected: Record<Method, number>;
  counted: Record<CountedMethod, number>;
  difference: number;
  sales: number;
  services: number;
  tillExpenses: number;
}

export interface ClosingPreview {
  businessDay: string;
  from: string;
  lastClosedAt: string | null;
  openOrders: { id: string; createdAt: string; status: string; total: number; staff: string; customerName: string | null }[];
  money: ClosingMoney;
  orders: { paid: number; paidTotal: number; cancelled: number };
  moneyChecks: { verified: number; flagged: number };
  stock: StockRow[];
}

export interface DayClosing {
  id: string;
  businessDay: string;
  openedAt: string;
  closedAt: string;
  closedByName: string;
  money: ClosingMoney;
  orders: { paid: number; paidTotal: number; cancelled: number };
  stock: StockRow[];
  note: string | null;
}

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = await getAuthToken();
  if (!token) throw new Error("Please sign in again");
  const response = await fetch(`${API_URL}/api/v1/day-closings${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(". ") : data?.message;
    throw new Error(message || "Something went wrong");
  }
  return (data?.data ?? data) as T;
};

export const loadClosingPreview = () => request<ClosingPreview>("/preview");
export const loadClosings = () => request<DayClosing[]>("");
export const closeTheDay = (body: {
  counted: Record<CountedMethod, number>;
  stock: { productId: string; counted: number }[];
  note?: string;
}) => request<DayClosing>("", { method: "POST", body: JSON.stringify(body) });
