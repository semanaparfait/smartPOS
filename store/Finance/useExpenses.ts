import { API_URL } from "@/config/api";
import { getAuthToken } from "@/utils/authToken";
import { create } from "zustand";

export type ExpenseCategory =
  | "RENT"
  | "ELECTRICITY"
  | "WATER"
  | "INTERNET"
  | "WAGES"
  | "TRANSPORT"
  | "SUPPLIES"
  | "MAINTENANCE"
  | "TAX"
  | "MARKETING"
  | "OTHER";

export type ExpenseRepeat = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  // Paid each time: once, or per day, week, month or year.
  amount: number | string;
  repeat: ExpenseRepeat;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  note: string | null;
  recordedBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface ExpenseInput {
  title: string;
  category: ExpenseCategory;
  amount: number;
  repeat: ExpenseRepeat;
  startDate: string;
  endDate?: string | null;
  note?: string | null;
}

export interface Salaries {
  monthly: number;
  workers: { id: string; name: string; salary: number }[];
}

interface ExpensesStore {
  expenses: Expense[];
  salaries: Salaries;
  loaded: boolean;
  load: () => Promise<void>;
  add: (input: ExpenseInput) => Promise<Expense>;
  update: (id: string, input: Partial<ExpenseInput>) => Promise<Expense>;
  remove: (id: string) => Promise<void>;
}

// Throws the server's own message, e.g. "The end date is before the start date".
const request = async (path: string, init: RequestInit = {}) => {
  if (!API_URL) throw new Error("API_URL is not configured");
  const token = await getAuthToken();
  if (!token) throw new Error("You are signed out. Please sign in again.");

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
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

const newestFirst = (list: Expense[]) =>
  [...list].sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt));

const useExpenses = create<ExpensesStore>((set) => ({
  expenses: [],
  salaries: { monthly: 0, workers: [] },
  loaded: false,
  load: async () => {
    const [expenses, salaries] = await Promise.all([request("/expenses"), request("/expenses/salaries")]);
    set({ expenses, salaries, loaded: true });
  },
  add: async (input) => {
    const expense = await request("/expenses", { method: "POST", body: JSON.stringify(input) });
    set((state) => ({ expenses: newestFirst([...state.expenses, expense]) }));
    return expense;
  },
  update: async (id, input) => {
    const expense = await request(`/expenses/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    set((state) => ({ expenses: newestFirst(state.expenses.map((e) => (e.id === id ? expense : e))) }));
    return expense;
  },
  remove: async (id) => {
    await request(`/expenses/${id}`, { method: "DELETE" });
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
  },
}));

export default useExpenses;
