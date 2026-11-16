import { API_URL } from "@/config/api";
import { t } from "@/i18n";
import useAuth from "@/store/Authentication/useAuth";
import useOrder from "@/store/Order/Order";
import type { OrderType } from "@/store/Order/OrderType";
import useStations from "@/store/Station/useStations";
import { getAuthToken } from "@/utils/authToken";
import { hasStations, partItems } from "@/utils/stations";
import Toast from "react-native-toast-message";
import { create } from "zustand";
import { placeText } from "@/components/orders/orderKit";

export interface ReadyAlert {
  // One alert per order, or per station's part ("orderId:stationId").
  key: string;
  // The order.
  id: string;
  // With kitchen stations: which station's part is ready ("Bar").
  stationId?: string | null;
  stationName?: string | null;
  orderedBy: string | null;
  // Where to take it: "Table T04 · Restaurant", "Delivery", "In store".
  place?: string;
  items: { name: string; quantity: number; note?: string | null }[];
}

type ReadyStation = { id: string; name: string } | null | undefined;

interface ReadyAlertsState {
  alerts: ReadyAlert[];
  // From order.ready, which carries the whole order: only kitchen food is
  // listed, and with stations only that station's part.
  add: (order: OrderType, station?: ReadyStation) => void;
  // Without `stationId`, every alert for the order.
  remove: (orderId: string, stationId?: string | null) => void;
  // Catches up with alerts sent while this device was offline.
  load: () => Promise<void>;
  markServed: (alert: ReadyAlert) => Promise<void>;
}

const keyOf = (orderId: string, stationId?: string | null) =>
  stationId ? `${orderId}:${stationId}` : orderId;

const toAlert = (order: OrderType, station?: ReadyStation): ReadyAlert => {
  const items =
    station && hasStations(order)
      ? partItems(order, station.id)
      : (order.items ?? []).filter((item) => item.product?.sendToKitchen !== false);
  return {
    key: keyOf(order.id, station?.id),
    id: order.id,
    stationId: station?.id ?? null,
    stationName: station?.name ?? null,
    orderedBy: order.user?.name ?? null,
    place: placeText(order),
    items: items.map((item) => ({
      name: item.product?.name ?? "Item",
      quantity: item.quantity,
      note: item.note,
    })),
  };
};

const putBack = (alerts: ReadyAlert[], alert: ReadyAlert) =>
  alerts.some((a) => a.key === alert.key) ? alerts : [...alerts, alert];

const useReadyAlerts = create<ReadyAlertsState>((set, get) => ({
  alerts: [],
  add: (order, station) =>
    set((state) => ({ alerts: putBack(state.alerts, toAlert(order, station)) })),
  remove: (orderId, stationId) =>
    set((state) => ({
      alerts: state.alerts.filter((a) =>
        stationId ? a.key !== keyOf(orderId, stationId) : a.id !== orderId,
      ),
    })),
  load: async () => {
    const me = useAuth.getState().profile?.id;
    const [stations] = await Promise.all([
      useStations.getState().load().catch(() => useStations.getState().stations),
      useOrder.getState().fetchOrders(),
    ]);
    for (const order of useOrder.getState().orders) {
      if (order.user?.id !== me) continue;
      if (hasStations(order)) {
        // Each part ready and not yet taken out.
        for (const station of stations)
          if (order.stationStatus?.[station.id]?.status === "READY") get().add(order, station);
      } else if (order.status === "READY") {
        get().add(order);
      }
    }
  },
  // The sound stops on the tap; the alert comes back if saving fails.
  markServed: async (alert) => {
    get().remove(alert.id, alert.stationId ?? null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("User not authenticated");
      const response = await fetch(`${API_URL}/api/v1/orders/${alert.id}/served`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(alert.stationId ? { stationId: alert.stationId } : {}),
      });
      // Someone already moved it on, e.g. it was paid: nothing is waiting any more.
      if (response.status === 400) return;
      if (!response.ok) throw new Error("Check your connection and try again.");
    } catch (error) {
      set((state) => ({ alerts: putBack(state.alerts, alert) }));
      Toast.show({
        type: "error",
        text1: t("ready.serveFailed"),
        text2: (error as Error).message,
      });
    }
  },
}));

export default useReadyAlerts;
