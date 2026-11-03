import { API_URL } from "@/config/api";
import type { OrderType, PaymentMethod } from "@/store/Order/OrderType";
import { getAuthToken } from "@/utils/authToken";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// The check of one worker's takings for one day, by the owner or a worker
// allowed to verify money. Saved on the server so every device sees it.
export type VerificationStatus = "verified" | "flagged";

export interface VerificationRecord {
  date: string; // YYYY-MM-DD
  userId: string;
  status: VerificationStatus;
  counted: Partial<Record<PaymentMethod, number>>;
  expected: Partial<Record<PaymentMethod, number>>;
  difference: number;
  note: string;
  decidedAt: string;
  decidedBy: string;
}

// Where checks were kept before the server stored them. Whatever is still here
// is uploaded once, then removed.
const LEGACY_KEY = "smartpos.financeVerification.v1";

export const verificationKey = (date: string, userId: string) => `${date}|${userId}`;

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// When the money changed hands: the payment time, else when the order was completed.
export const paidAt = (o: OrderType) => o.payments?.[0]?.createdAt ?? o.updatedAt;

// Whether the owner checked the money for a completed order: it's covered by
// that worker's count for the day it was paid. Orders not paid have no money yet.
export type OrderCheck = VerificationStatus | "awaiting" | "unpaid";
// The check that covers a completed order, if one was made.
export const orderCheckRecord = (
  o: OrderType,
  records: Record<string, VerificationRecord>,
): VerificationRecord | undefined =>
  (o.status || "").toUpperCase() === "COMPLETED" && o.user
    ? records[verificationKey(dayKey(new Date(paidAt(o))), o.user.id)]
    : undefined;

export const orderCheck = (
  o: OrderType,
  records: Record<string, VerificationRecord>,
): OrderCheck => {
  if ((o.status || "").toUpperCase() !== "COMPLETED" || !o.user) return "unpaid";
  return orderCheckRecord(o, records)?.status ?? "awaiting";
};

interface ServerCheck {
  date: string;
  worker: { id: string };
  status: "VERIFIED" | "FLAGGED";
  counted: Partial<Record<PaymentMethod, number>>;
  expected: Partial<Record<PaymentMethod, number>>;
  difference: string | number;
  note: string | null;
  decidedAt: string;
  decidedByName: string;
}

const fromServer = (c: ServerCheck): VerificationRecord => ({
  date: c.date,
  userId: c.worker.id,
  status: c.status === "FLAGGED" ? "flagged" : "verified",
  counted: c.counted ?? {},
  expected: c.expected ?? {},
  difference: Number(c.difference) || 0,
  note: c.note ?? "",
  decidedAt: c.decidedAt,
  decidedBy: c.decidedByName,
});

const request = async (path: string, init: RequestInit = {}) => {
  const token = await getAuthToken();
  if (!token) throw new Error("User not authenticated");
  const response = await fetch(`${API_URL}/api/v1/money-checks${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(message || "Could not save the money check");
  }
  return data;
};

const upload = async (record: VerificationRecord) =>
  fromServer(
    await request("", {
      method: "PUT",
      body: JSON.stringify({
        date: record.date,
        userId: record.userId,
        status: record.status.toUpperCase(),
        counted: record.counted,
        expected: record.expected,
        difference: record.difference,
        note: record.note || undefined,
        decidedAt: record.decidedAt,
        decidedBy: record.decidedBy,
      }),
    }),
  );

// Sends checks saved on this device before the server kept them. Ones the
// server already has are left as the server has them; ones that fail stay for
// next time.
const uploadLegacy = async (server: Record<string, VerificationRecord>) => {
  let local: Record<string, VerificationRecord>;
  try {
    const raw = await AsyncStorage.getItem(LEGACY_KEY);
    if (!raw) return {};
    local = JSON.parse(raw);
  } catch {
    return {};
  }

  const uploaded: Record<string, VerificationRecord> = {};
  const left: Record<string, VerificationRecord> = {};
  for (const [key, record] of Object.entries(local)) {
    if (server[key]) continue;
    try {
      uploaded[key] = await upload(record);
    } catch {
      left[key] = record;
    }
  }
  try {
    if (Object.keys(left).length) await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(left));
    else await AsyncStorage.removeItem(LEGACY_KEY);
  } catch {}
  return uploaded;
};

interface FinanceVerificationStore {
  records: Record<string, VerificationRecord>;
  loaded: boolean;
  // Fetches the latest checks; call it whenever a page opens.
  load: () => Promise<void>;
  // Throw with the server's message when saving fails.
  save: (record: VerificationRecord) => Promise<void>;
  reopen: (date: string, userId: string) => Promise<void>;
}

const useFinanceVerification = create<FinanceVerificationStore>((set) => ({
  records: {},
  loaded: false,
  load: async () => {
    try {
      const checks: ServerCheck[] = await request("");
      const records = Object.fromEntries(
        checks.map((c) => [verificationKey(c.date, c.worker.id), fromServer(c)]),
      );
      const uploaded = await uploadLegacy(records);
      set({ records: { ...records, ...uploaded }, loaded: true });
    } catch (error) {
      console.warn("Unable to load money checks.", error);
      set({ loaded: true });
    }
  },
  save: async (record) => {
    const saved = await upload(record);
    set((state) => ({
      records: { ...state.records, [verificationKey(saved.date, saved.userId)]: saved },
    }));
  },
  reopen: async (date, userId) => {
    await request(`/${date}/${userId}`, { method: "DELETE" });
    set((state) => {
      const records = { ...state.records };
      delete records[verificationKey(date, userId)];
      return { records };
    });
  },
}));

export default useFinanceVerification;
