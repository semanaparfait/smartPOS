import { tr } from "@/i18n";
import { API_URL } from "@/config/api";
import { getAuthToken } from "@/utils/authToken";
import { Platform } from "react-native";
import { create } from "zustand";

export type DebtKind = "SHORTAGE" | "ADVANCE" | "GOODS" | "DAMAGE" | "EXPENSE" | "OTHER";
// SALARY = taken off the salary on payday.
export type DebtPaymentMethod = "CASH" | "MOMO" | "SALARY";
export type DebtPaymentStatus = "PENDING" | "APPROVED" | "REJECTED";

type Person = { id: string; name: string } | null;

export interface StaffDebt {
  id: string;
  kind: DebtKind;
  amount: number;
  date: string;
  note: string | null;
  source: string | null;
  chargedBy: Person;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  amount: number;
  method: DebtPaymentMethod;
  status: DebtPaymentStatus;
  proofUrl: string | null;
  note: string | null;
  sentBy: Person;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: Person;
  createdAt: string;
}

export type SalaryMethod = "CASH" | "MOMO" | "BANK";

// One month's salary actually paid.
export interface SalaryPayment {
  id: string;
  month: string; // YYYY-MM
  salary: number;
  // Taken off for what the worker owed.
  deducted: number;
  // Handed to the worker.
  amount: number;
  method: SalaryMethod;
  paidOn: string;
  note: string | null;
  paidBy: Person;
  createdAt: string;
}

export interface PaySalaryInput {
  employeeId: string;
  month: string;
  deducted: number;
  amount: number;
  method: SalaryMethod;
  paidOn: string;
  note?: string;
}

interface Totals {
  // For per-delivery pay: this month's deliveries times the rate.
  salary: number;
  payType?: "MONTHLY" | "PER_DELIVERY";
  perDelivery?: number | null;
  // Deliveries made this month.
  deliveries?: number;
  charged: number;
  paid: number;
  // Payments sent and not checked yet.
  waiting: number;
  // Still owed: comes off the salary.
  owed: number;
  // Salary after what is owed.
  toPay: number;
  debts: StaffDebt[];
  payments: DebtPayment[];
  salaryPayments: SalaryPayment[];
}

// "Salary 120,000 RWF" or "12 deliveries × 1,000 RWF".
export const payLine = (t: Pick<Totals, "salary" | "payType" | "perDelivery" | "deliveries">, rwf: (n: number) => string) =>
  t.payType === "PER_DELIVERY"
    ? `${t.deliveries ?? 0} ${tr("deliveries")} × ${rwf(Number(t.perDelivery) || 0)} ${tr("this month")}`
    : `${tr("Salary")} ${rwf(t.salary)}`;

export interface WorkerPayroll extends Totals {
  employeeId: string;
  userId: string | null;
  name: string;
  active: boolean;
}

export interface ChargeInput {
  employeeId?: string;
  // The worker's login, when the debt comes from a count, a payment or an expense.
  userId?: string;
  kind: DebtKind;
  amount: number;
  date: string;
  note?: string;
  // What it came from, so it is charged only once.
  source?: string;
}

interface PayrollStore {
  workers: WorkerPayroll[];
  loaded: boolean;
  load: () => Promise<void>;
  charge: (input: ChargeInput) => Promise<void>;
  removeDebt: (id: string) => Promise<void>;
  // The money it was charged for is no longer missing.
  removeBySource: (source: string) => Promise<void>;
  record: (employeeId: string, amount: number, method: DebtPaymentMethod, note?: string) => Promise<void>;
  paySalary: (input: PaySalaryInput) => Promise<void>;
  undoSalary: (id: string) => Promise<void>;
  approve: (id: string) => Promise<void>;
  reject: (id: string, note: string) => Promise<void>;
  // The signed-in worker's own; null when they have no employee record.
  mine: Totals | null;
  loadMine: () => Promise<void>;
  pay: (amount: number, method: "CASH" | "MOMO", note?: string, photo?: { uri: string; file: Blob | null } | null) => Promise<void>;
  withdraw: (id: string) => Promise<void>;
}

// Throws the server's own message, e.g. "This was already charged to the worker".
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

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

const usePayroll = create<PayrollStore>((set) => ({
  workers: [],
  loaded: false,
  load: async () => {
    set({ workers: await request("/staff-debts"), loaded: true });
  },
  charge: async (input) => {
    set({ workers: await request("/staff-debts", json("POST", input)) });
  },
  removeDebt: async (id) => {
    await request(`/staff-debts/${id}`, { method: "DELETE" });
    set({ workers: await request("/staff-debts") });
  },
  removeBySource: async (source) => {
    set({ workers: await request(`/staff-debts/by-source?source=${encodeURIComponent(source)}`, { method: "DELETE" }) });
  },
  record: async (employeeId, amount, method, note) => {
    set({ workers: await request("/staff-debts/payments", json("POST", { employeeId, amount, method, ...(note ? { note } : {}) })) });
  },
  paySalary: async (input) => {
    set({ workers: await request("/staff-debts/salaries", json("POST", input)) });
  },
  undoSalary: async (id) => {
    set({ workers: await request(`/staff-debts/salaries/${id}`, { method: "DELETE" }) });
  },
  approve: async (id) => {
    set({ workers: await request(`/staff-debts/payments/${id}/approve`, { method: "PATCH" }) });
  },
  reject: async (id, note) => {
    set({ workers: await request(`/staff-debts/payments/${id}/reject`, json("PATCH", { note })) });
  },
  mine: null,
  loadMine: async () => {
    set({ mine: await request("/staff-debts/mine") });
  },
  pay: async (amount, method, note, photo) => {
    const form = new FormData();
    form.append("amount", String(amount));
    form.append("method", method);
    if (note) form.append("note", note);
    if (photo) {
      if (Platform.OS === "web") {
        const picture = photo.file ?? (await fetch(photo.uri).then((r) => r.blob()));
        form.append("picture", picture as Blob, "proof.jpg");
      } else {
        form.append("picture", { uri: photo.uri, name: "proof.jpg", type: "image/jpeg" } as any);
      }
    }
    set({ mine: await request("/staff-debts/mine/payments", { method: "POST", body: form }) });
  },
  withdraw: async (id) => {
    set({ mine: await request(`/staff-debts/mine/payments/${id}`, { method: "DELETE" }) });
  },
}));

export default usePayroll;
