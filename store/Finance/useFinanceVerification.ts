import type { PaymentMethod } from "@/store/Order/OrderType";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// The owner's check of one worker's takings for one day.
// Saved on this device for now; swap load/save for API calls once a
// verification endpoint exists.
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

const KEY = "smartpos.financeVerification.v1";

export const verificationKey = (date: string, userId: string) => `${date}|${userId}`;

interface FinanceVerificationStore {
  records: Record<string, VerificationRecord>;
  loaded: boolean;
  load: () => Promise<void>;
  save: (record: VerificationRecord) => Promise<void>;
  reopen: (date: string, userId: string) => Promise<void>;
}

const persist = async (records: Record<string, VerificationRecord>) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(records));
  } catch (error) {
    console.warn("Unable to save finance verification.", error);
  }
};

const useFinanceVerification = create<FinanceVerificationStore>((set, get) => ({
  records: {},
  loaded: false,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      set({ records: raw ? JSON.parse(raw) : {}, loaded: true });
    } catch (error) {
      console.warn("Unable to load finance verification.", error);
      set({ loaded: true });
    }
  },
  save: async (record) => {
    const records = { ...get().records, [verificationKey(record.date, record.userId)]: record };
    set({ records });
    await persist(records);
  },
  reopen: async (date, userId) => {
    const records = { ...get().records };
    delete records[verificationKey(date, userId)];
    set({ records });
    await persist(records);
  },
}));

export default useFinanceVerification;
