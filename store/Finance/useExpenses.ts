import { API_URL } from "@/config/api";
import { getAuthToken } from "@/utils/authToken";
import { Platform } from "react-native";
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
// Workers' submissions wait for approval; only approved ones lower the profit.
export type ExpenseStatus = "APPROVED" | "PENDING" | "REJECTED";
export type ExpensePaidFrom = "TILL_CASH" | "TILL_MOMO" | "OWN_MONEY" | "OTHER";
export type RepaidWith = "CASH" | "MOMO" | "BANK";

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
  status: ExpenseStatus;
  paidFrom: ExpensePaidFrom | null;
  // Photo of the receipt or bill.
  proofUrl: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: { id: string; name: string } | null;
  // Paid with the worker's own money: when and how the company paid it back.
  repaidAt: string | null;
  repaidWith: RepaidWith | null;
  repaidBy: { id: string; name: string } | null;
}

export interface ExpenseSubmission {
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidOn: string;
  paidFrom: ExpensePaidFrom;
  note?: string;
  // The receipt photo: a File on web, a local uri on phones.
  photo: { uri: string; file: Blob | null };
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
  approve: (id: string) => Promise<Expense>;
  reject: (id: string, note: string) => Promise<Expense>;
  markRepaid: (id: string, method: RepaidWith) => Promise<Expense>;
  markNotRepaid: (id: string) => Promise<Expense>;
  // Workers: their own submissions.
  mine: Expense[];
  loadMine: () => Promise<void>;
  submit: (input: ExpenseSubmission) => Promise<Expense>;
  withdraw: (id: string) => Promise<void>;
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
      ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
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
  approve: async (id) => {
    const expense = await request(`/expenses/${id}/approve`, { method: "PATCH" });
    set((state) => ({ expenses: state.expenses.map((e) => (e.id === id ? expense : e)) }));
    return expense;
  },
  reject: async (id, note) => {
    const expense = await request(`/expenses/${id}/reject`, { method: "PATCH", body: JSON.stringify({ note }) });
    set((state) => ({ expenses: state.expenses.map((e) => (e.id === id ? expense : e)) }));
    return expense;
  },
  markRepaid: async (id, method) => {
    const expense = await request(`/expenses/${id}/repaid`, { method: "PATCH", body: JSON.stringify({ method }) });
    set((state) => ({ expenses: state.expenses.map((e) => (e.id === id ? expense : e)) }));
    return expense;
  },
  markNotRepaid: async (id) => {
    const expense = await request(`/expenses/${id}/not-repaid`, { method: "PATCH" });
    set((state) => ({ expenses: state.expenses.map((e) => (e.id === id ? expense : e)) }));
    return expense;
  },
  mine: [],
  loadMine: async () => {
    set({ mine: await request("/expenses/mine") });
  },
  submit: async ({ photo, note, ...fields }) => {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => form.append(key, String(value)));
    if (note) form.append("note", note);
    if (Platform.OS === "web") {
      const picture = photo.file ?? (await fetch(photo.uri).then((r) => r.blob()));
      form.append("picture", picture as Blob, "receipt.jpg");
    } else {
      form.append("picture", { uri: photo.uri, name: "receipt.jpg", type: "image/jpeg" } as any);
    }
    const expense = await request("/expenses/submit", { method: "POST", body: form });
    set((state) => ({ mine: [expense, ...state.mine] }));
    return expense;
  },
  withdraw: async (id) => {
    await request(`/expenses/mine/${id}`, { method: "DELETE" });
    set((state) => ({ mine: state.mine.filter((e) => e.id !== id) }));
  },
}));

export default useExpenses;
