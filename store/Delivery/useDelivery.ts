import { API_URL } from "@/config/api";
import type { DeliveryArea } from "@/store/Authentication/AuthTypes";
import type { OrderType } from "@/store/Order/OrderType";
import { getAuthToken } from "@/utils/authToken";
import { create } from "zustand";

// What the till asks when an order is to be delivered.
export interface DeliveryDetails {
  customerName: string;
  customerPhone?: string;
  address?: string;
  area?: string;
  payOnDelivery: boolean;
  riderId?: string;
  outsideRider?: string;
  note?: string;
}

export interface Rider {
  id: string;
  name: string;
  phone?: string | null;
}

export type RiderRole = { id: string; name: string; created: boolean };

// Who carries a delivery: one of the shop's riders or an outside service.
export type Who = { riderId?: string; outsideRider?: string };

export type DoorPayment = { method: "CASH" | "MOMO" | "CARD"; amount: number };

interface DeliveryStore {
  deliveries: OrderType[];
  // True once loaded, so live updates know to refresh it.
  loaded: boolean;
  riders: Rider[];
  // Open deliveries plus today's finished ones.
  load: () => Promise<void>;
  loadRiders: () => Promise<void>;
  send: (orderId: string, who: Who) => Promise<void>;
  // A rider picks a waiting delivery nobody has, or gives it back.
  take: (orderId: string) => Promise<void>;
  giveBack: (orderId: string) => Promise<void>;
  // `who` records who carried it, when only known now.
  delivered: (orderId: string, payments?: DoorPayment[], who?: Who) => Promise<void>;
  notDelivered: (orderId: string, reason: string) => Promise<void>;
  // With own riders, the server makes sure a rider role exists and returns it.
  saveSettings: (settings: { enabled: boolean; fee: number; areas: DeliveryArea[]; riders: boolean }) => Promise<{ riderRole: RiderRole | null }>;
}

// Throws the server's own message, e.g. "Take the payment before sending it".
export const deliveryRequest = async (path: string, init: RequestInit = {}) => {
  const token = await getAuthToken();
  if (!token) throw new Error("User not authenticated");
  const response = await fetch(`${API_URL}/api/v1/deliveries${path}`, {
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
    throw new Error(message || "Something went wrong");
  }
  return data;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const useDelivery = create<DeliveryStore>((set) => {
  // Puts the server's copy of one delivery in the list.
  const replace = (order: OrderType) =>
    set((state) => ({
      deliveries: state.deliveries.some((d) => d.id === order.id)
        ? state.deliveries.map((d) => (d.id === order.id ? order : d))
        : [order, ...state.deliveries],
    }));

  return {
    deliveries: [],
    loaded: false,
    riders: [],

    load: async () => {
      const deliveries: OrderType[] = await deliveryRequest(
        `?since=${encodeURIComponent(startOfToday())}`,
      );
      set({ deliveries, loaded: true });
    },

    loadRiders: async () => {
      set({ riders: await deliveryRequest("/riders") });
    },

    send: async (orderId, who) => {
      replace(
        await deliveryRequest(`/${orderId}/send`, { method: "PATCH", body: JSON.stringify(who) }),
      );
    },

    take: async (orderId) => {
      replace(await deliveryRequest(`/${orderId}/take`, { method: "PATCH" }));
    },

    giveBack: async (orderId) => {
      replace(await deliveryRequest(`/${orderId}/give-back`, { method: "PATCH" }));
    },

    delivered: async (orderId, payments, who = {}) => {
      replace(
        await deliveryRequest(`/${orderId}/delivered`, {
          method: "PATCH",
          body: JSON.stringify({ ...who, ...(payments ? { payments } : {}) }),
        }),
      );
    },

    notDelivered: async (orderId, reason) => {
      replace(
        await deliveryRequest(`/${orderId}/not-delivered`, {
          method: "PATCH",
          body: JSON.stringify({ reason }),
        }),
      );
    },

    saveSettings: async (settings) => {
      const saved = await deliveryRequest("/settings", { method: "PUT", body: JSON.stringify(settings) });
      return { riderRole: saved?.riderRole ?? null };
    },
  };
});

export default useDelivery;
