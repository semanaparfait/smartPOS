// Live table status, booking and order, shared by every worker through the
// server (GET/PATCH /venue/tables, live "venue.table" events). This device keeps
// a copy so the map still shows the last known state without internet.
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { create } from "zustand";
import { fetchTables, patchTable, type ServerTable, type TableBooking, type TableStatus } from "@/store/Venue/venueApi";

export type { TableStatus, TableBooking };

export const TABLE_STATUS: Record<TableStatus, { label: string; color: string; text: string; icon: string }> = {
  available: { label: "Available", color: "#D0E66B", text: "#20283B", icon: "checkmark-circle" },
  occupied: { label: "Occupied", color: "#DC2626", text: "#FFFFFF", icon: "people" },
  reserved: { label: "Reserved", color: "#2563EB", text: "#FFFFFF", icon: "bookmark" },
  cleaning: { label: "Cleaning", color: "#F59E0B", text: "#20283B", icon: "sparkles" },
};

export type TableInfo = {
  status: TableStatus;
  orderId?: string;
  since: string;
  booking?: TableBooking | null;
  order?: ServerTable["order"];
  servedById?: string | null;
  servedByName?: string | null;
};

const KEY = "smartpos.tableState.v2";

type PendingTable = { id: string; label: string; orderId?: string };

type Change ={ status?: TableStatus; orderId?: string | null; booking?: TableBooking | null };

type Store = {
  tables: Record<string, TableInfo>;
  loaded: boolean;
  online: boolean;
  // The table a worker is taking an order for: the next sale from this device goes there.
  // With orderId: the table's open order, which the new products are added to.
  pendingTable: PendingTable | null;
  // Table names from the floor map (id → "T04"), for receipts.
  labels: Record<string, string>;
  setLabels: (labels: Record<string, string>) => void;
  load: () => Promise<void>;
  setStatus: (tableId: string, status: TableStatus) => Promise<boolean>;
  linkOrder: (tableId: string, orderId: string | undefined) => Promise<boolean>;
  book: (tableId: string, booking: TableBooking) => Promise<boolean>;
  cancelBooking: (tableId: string) => Promise<boolean>;
  startOrderFor: (table: PendingTable | null) => void;
  // Called after a sale is made on this device.
  orderPlaced: (orderId: string) => Promise<void>;
  // A live update from the server.
  apply: (row: ServerTable) => void;
};

const toInfo = (row: ServerTable): TableInfo => ({
  status: row.status,
  orderId: row.orderId ?? undefined,
  since: row.since,
  booking: row.booking,
  order: row.order,
  servedById: row.servedById ?? null,
  servedByName: row.servedByName,
});

const persist = (tables: Record<string, TableInfo>) =>
  AsyncStorage.setItem(KEY, JSON.stringify(tables)).catch(() => {});

const useTableState = create<Store>((set, get) => {
  const put = (tableId: string, info: TableInfo | null) => {
    const next = { ...get().tables };
    if (!info || info.status === "available") delete next[tableId];
    else next[tableId] = info;
    set({ tables: next });
    persist(next);
  };

  // Shows the change at once, then saves it; puts the old state back if the server refuses.
  const change = async (tableId: string, body: Change, guess: TableInfo): Promise<boolean> => {
    const before = get().tables[tableId] ?? null;
    put(tableId, guess);
    try {
      put(tableId, toInfo(await patchTable(tableId, body)));
      return true;
    } catch (error) {
      put(tableId, before);
      Toast.show({ type: "error", text1: error instanceof Error ? error.message : "Could not update the table" });
      return false;
    }
  };

  const now = () => new Date().toISOString();

  return {
    tables: {},
    loaded: false,
    online: false,
    pendingTable: null,
    labels: {},
    setLabels: (labels) => set({ labels }),

    load: async () => {
      if (!get().loaded) {
        try {
          const raw = await AsyncStorage.getItem(KEY);
          if (raw) set({ tables: JSON.parse(raw) });
        } catch {}
      }
      try {
        const rows = await fetchTables();
        const tables = Object.fromEntries(rows.map((r) => [r.tableId, toInfo(r)]));
        set({ tables, loaded: true, online: true });
        persist(tables);
      } catch {
        set({ loaded: true, online: false });
      }
    },

    setStatus: (tableId, status) => {
      const prev = get().tables[tableId];
      const keeps = status === "occupied" || status === "reserved";
      return change(tableId, { status }, {
        ...prev,
        status,
        orderId: keeps ? prev?.orderId : undefined,
        order: keeps ? prev?.order : null,
        booking: status === "reserved" ? prev?.booking : null,
        since: prev?.status === status ? prev.since : now(),
      });
    },

    linkOrder: (tableId, orderId) => {
      const prev = get().tables[tableId];
      return change(tableId, { orderId: orderId ?? null }, {
        ...prev,
        status: orderId ? "occupied" : prev?.status ?? "available",
        orderId,
        order: orderId ? prev?.order : null,
        booking: orderId ? null : prev?.booking,
        since: orderId && prev?.status !== "occupied" ? now() : prev?.since ?? now(),
      });
    },

    book: (tableId, booking) => {
      const prev = get().tables[tableId];
      return change(tableId, { booking }, {
        ...prev,
        status: prev?.status === "occupied" ? "occupied" : "reserved",
        booking,
        since: prev?.status === "reserved" || prev?.status === "occupied" ? prev.since : now(),
      });
    },

    cancelBooking: (tableId) => {
      const prev = get().tables[tableId];
      return change(tableId, { booking: null }, {
        ...prev,
        status: prev?.status === "reserved" ? "available" : prev?.status ?? "available",
        booking: null,
        since: now(),
      });
    },

    startOrderFor: (table) => set({ pendingTable: table }),

    orderPlaced: async (orderId) => {
      const table = get().pendingTable;
      if (!table) return;
      set({ pendingTable: null });
      // Added to the order already at the table: it is linked already.
      if (table.orderId === orderId) {
        Toast.show({ type: "success", text1: `Added to table ${table.label}` });
        get().load().catch(() => {});
        return;
      }
      if (await get().linkOrder(table.id, orderId))
        Toast.show({ type: "success", text1: `Order sent to table ${table.label}` });
    },

    apply: (row) => put(row.tableId, toInfo(row)),
  };
});

export const tableStatusOf = (tables: Record<string, TableInfo>, id: string): TableStatus =>
  tables[id]?.status ?? "available";

export default useTableState;
