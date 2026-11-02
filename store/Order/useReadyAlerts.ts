import { API_URL } from "@/config/api";
import { t } from "@/i18n";
import useAuth from "@/store/Authentication/useAuth";
import useOrder from "@/store/Order/Order";
import type { OrderType } from "@/store/Order/OrderType";
import { getAuthToken } from "@/utils/authToken";
import Toast from "react-native-toast-message";
import { create } from "zustand";

export interface ReadyAlert {
  id: string;
  orderedBy: string | null;
  items: { name: string; quantity: number; note?: string | null }[];
}

interface ReadyAlertsState {
  alerts: ReadyAlert[];
  // From order.ready, which carries the whole order: only kitchen food is listed.
  add: (order: OrderType) => void;
  remove: (orderId: string) => void;
  // Catches up with alerts sent while this device was offline.
  load: () => Promise<void>;
  markServed: (alert: ReadyAlert) => Promise<void>;
}

const toAlert = (order: OrderType): ReadyAlert => ({
  id: order.id,
  orderedBy: order.user?.name ?? null,
  items: (order.items ?? [])
    .filter((item) => item.product?.sendToKitchen !== false)
    .map((item) => ({
      name: item.product?.name ?? "Item",
      quantity: item.quantity,
      note: item.note,
    })),
});

const putBack = (alerts: ReadyAlert[], alert: ReadyAlert) =>
  alerts.some((a) => a.id === alert.id) ? alerts : [...alerts, alert];

const useReadyAlerts = create<ReadyAlertsState>((set, get) => ({
  alerts: [],
  add: (order) => set((state) => ({ alerts: putBack(state.alerts, toAlert(order)) })),
  remove: (orderId) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== orderId) })),
  load: async () => {
    const me = useAuth.getState().profile?.id;
    await useOrder.getState().fetchOrders();
    useOrder
      .getState()
      .orders.filter((o) => o.status === "READY" && o.user?.id === me)
      .forEach(get().add);
  },
  // The sound stops on the tap; the alert comes back if saving fails.
  markServed: async (alert) => {
    get().remove(alert.id);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("User not authenticated");
      const response = await fetch(`${API_URL}/api/v1/orders/${alert.id}/served`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
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
