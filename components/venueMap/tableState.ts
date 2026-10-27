// Live table status + linked order, kept on this device.
// Orders from the API have no table field yet, so staff link them here.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";

export const TABLE_STATUS: Record<TableStatus, { label: string; color: string; text: string; icon: string }> = {
  available: { label: "Available", color: "#D0E66B", text: "#20283B", icon: "checkmark-circle" },
  occupied: { label: "Occupied", color: "#DC2626", text: "#FFFFFF", icon: "people" },
  reserved: { label: "Reserved", color: "#2563EB", text: "#FFFFFF", icon: "bookmark" },
  cleaning: { label: "Cleaning", color: "#F59E0B", text: "#20283B", icon: "sparkles" },
};

export type TableInfo = { status: TableStatus; orderId?: string; since: string };

const KEY = "smartpos.tableState.v1";

type Store = {
  tables: Record<string, TableInfo>;
  loaded: boolean;
  load: () => Promise<void>;
  setStatus: (tableId: string, status: TableStatus) => void;
  linkOrder: (tableId: string, orderId: string | undefined) => void;
};

const persist = (tables: Record<string, TableInfo>) =>
  AsyncStorage.setItem(KEY, JSON.stringify(tables)).catch((e) => console.error("[tableState] save failed", e));

const useTableState = create<Store>((set, get) => ({
  tables: {},
  loaded: false,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      set({ tables: raw ? JSON.parse(raw) : {}, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  setStatus: (tableId, status) => {
    const prev = get().tables[tableId];
    const next = {
      ...get().tables,
      // Freeing a table also clears its order.
      [tableId]: {
        status,
        orderId: status === "available" || status === "cleaning" ? undefined : prev?.orderId,
        since: new Date().toISOString(),
      },
    };
    set({ tables: next });
    persist(next);
  },
  linkOrder: (tableId, orderId) => {
    const prev = get().tables[tableId];
    const next = {
      ...get().tables,
      [tableId]: {
        status: orderId ? "occupied" : prev?.status ?? "available",
        orderId,
        since: orderId && prev?.status !== "occupied" ? new Date().toISOString() : prev?.since ?? new Date().toISOString(),
      } as TableInfo,
    };
    set({ tables: next });
    persist(next);
  },
}));

export const tableStatusOf = (tables: Record<string, TableInfo>, id: string): TableStatus =>
  tables[id]?.status ?? "available";

export default useTableState;
