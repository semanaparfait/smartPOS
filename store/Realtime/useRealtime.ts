import { API_URL } from "@/config/api";
import useAuth from "@/store/Authentication/useAuth";
import { accessOf } from "@/store/Authentication/usePermissions";
import type { DeviceListType } from "@/store/Device/DeviceType";
import useDeviceInfo from "@/store/Device/useDeviceInfo";
import { startDisplayPreview } from "@/store/Realtime/displayPreview";
import useDelivery from "@/store/Delivery/useDelivery";
import useOrder from "@/store/Order/Order";
import type { OrderType } from "@/store/Order/OrderType";
import useReadyAlerts from "@/store/Order/useReadyAlerts";
import useProduct from "@/store/products/useProduct";
import { endSession } from "@/utils/endSession";
import { isSessionEnded } from "@/utils/sessionGuard";
import { getAuthToken } from "@/utils/authToken";
import { useEffect } from "react";
import Toast from "react-native-toast-message";
import { io } from "socket.io-client";
import useTableState from "@/components/venueMap/tableState";
import { useVenueVersion } from "@/store/Venue/useVenueVersion";
import { orderNumber, placeText } from "@/components/orders/orderKit";
import { tr } from "@/i18n";
import { playSound } from "@/utils/sounds";
import type { ServerTable } from "@/store/Venue/venueApi";

type DevicePayload = { device: Partial<DeviceListType> & { id: string } };
type StockLowProduct = { id: string; name: string; unit: string; stockQuantity: number | string };

// The kitchen sent the alert, and customers must never hear it.
const ringsHere = () => {
  const { deviceType } = useDeviceInfo.getState();
  // Ready food is for the till; a rider's phone doesn't ring for it either.
  return deviceType === "POS_TERMINAL";
};

// Live updates from the server while someone is signed in. The socket only
// notifies; every change is still made and checked over HTTP. Events sent while
// disconnected are lost, so lists that are already loaded are refetched on reconnect.
export default function useRealtime() {
  const userId = useAuth((s) => s.profile?.id);

  useEffect(() => {
    if (!userId || !API_URL) return;
    let socket: ReturnType<typeof io> | null = null;
    let preview: ReturnType<typeof startDisplayPreview> | null = null;
    let closed = false;

    getAuthToken().then((token) => {
      if (closed || !token) return;
      socket = io(`${API_URL}/realtime`, { auth: { token }, transports: ["websocket"] });

      // A till shows each tap on its customer display straight away.
      const live = socket;
      preview = startDisplayPreview((payload) => {
        if (live.connected) live.emit("display.preview", payload);
      });
      socket.on("connect", () => {
        preview?.resend();
        if (ringsHere()) useReadyAlerts.getState().load().catch(() => {});
      });

      // A refused handshake says why, e.g. "Your account has been deactivated".
      socket.on("connect_error", (error) => {
        if (isSessionEnded(error.message)) endSession(error.message);
        else console.warn("Realtime connection failed:", error.message);
      });
      socket.on("session.revoked", ({ reason }: { reason?: string }) => endSession(reason));
      socket.on("permissions.changed", () => {
        useAuth.getState().fetchProfile();
      });

      // Refetches the delivery list once loaded: some updates leave out the rider,
      // and the server decides who may see each delivery (e.g. one another rider took).
      let deliveryTimer: ReturnType<typeof setTimeout> | null = null;
      const deliveryChanged = (order: OrderType) => {
        if (order.type !== "DELIVERY" || !useDelivery.getState().loaded) return;
        if (deliveryTimer) clearTimeout(deliveryTimer);
        deliveryTimer = setTimeout(() => useDelivery.getState().load().catch(() => {}), 400);
      };

      socket.on("order.created", (order: OrderType) => {
        useOrder.getState().upsertOrder(order);
        deliveryChanged(order);
      });
      socket.on("order.updated", (order: OrderType) => {
        useOrder.getState().upsertOrder(order);
        deliveryChanged(order);
        // Sent back, paid or cancelled: it is no longer waiting to be taken.
        // With stations, each part's alert goes once that part isn't ready.
        const alerts = useReadyAlerts.getState();
        for (const alert of alerts.alerts.filter((a) => a.id === order.id)) {
          const stillReady = alert.stationId
            ? order.stationStatus?.[alert.stationId]?.status === "READY" && order.status !== "CANCELLED"
            : order.status === "READY";
          if (!stillReady) alerts.remove(order.id, alert.stationId ?? null);
        }
      });

      // With kitchen stations, one alert per station's part ("Bar ready").
      socket.on(
        "order.ready",
        ({ order, station }: { order: OrderType; station?: { id: string; name: string } | null }) => {
          if (ringsHere()) useReadyAlerts.getState().add(order, station);
        },
      );
      // A cook took this worker's order: a toast and a short chime (not the
      // ready alarm). With stations: "Grill · Eric started preparing".
      socket.on(
        "order.preparing",
        ({
          order,
          station,
          cook,
        }: {
          order: OrderType;
          station?: { id: string; name: string } | null;
          cook: { id: string; name: string };
        }) => {
          if (!ringsHere()) return;
          playSound("taken");
          Toast.show({
            type: "success",
            text1: `${station?.name ? `${station.name} · ` : ""}${cook.name || tr("The kitchen")} ${tr("started preparing")}`,
            text2: `${placeText(order)} · ${orderNumber(order)}`,
            visibilityTime: 5000,
          });
        },
      );
      socket.on("order.served", ({ orderId, stationId }: { orderId: string; stationId?: string | null }) =>
        useReadyAlerts.getState().remove(orderId, stationId ?? null),
      );

      socket.on("stock.low", ({ products }: { products: StockLowProduct[] }) => {
        const [first] = products;
        Toast.show({
          type: "info",
          text1: products.length > 1 ? `${products.length} products are low on stock` : `${first.name} is low on stock`,
          text2: products.length > 1
            ? products.map((p) => p.name).join(", ")
            : `${Number(first.stockQuantity).toLocaleString()} ${first.unit} left.`,
        });
        useProduct.getState().getLowStock().catch(() => {});
      });

      socket.on("device.requested", ({ device }: DevicePayload) => {
        useDeviceInfo.getState().upsertDevice(device);
        Toast.show({
          type: "info",
          text1: "New device wants to join",
          text2: device.deviceName ? `${device.deviceName} is waiting for approval.` : undefined,
        });
      });
      socket.on("device.updated", ({ device }: DevicePayload) =>
        useDeviceInfo.getState().upsertDevice(device),
      );
      // Too many wrong PINs/passwords on a device: tell the owner, who can unlock it.
      socket.on("device.locked", ({ device }: DevicePayload) => {
        useDeviceInfo.getState().upsertDevice(device);
        Toast.show({
          type: "info",
          text1: tr("Device locked"),
          text2: `${device.deviceName ?? tr("A device")}: ${tr("too many wrong tries.")}`,
        });
      });
      socket.on("device.removed", ({ id }: { id: string }) => useDeviceInfo.getState().removeDevice(id));
      socket.on("device.presence", ({ deviceId, online }: { deviceId: string; online: boolean }) =>
        useDeviceInfo.getState().setDeviceOnline(deviceId, online),
      );

      // The floor map: a table changed, or the owner saved a new map.
      socket.on("venue.table", (row: ServerTable) => useTableState.getState().apply(row));
      socket.on("venue.saved", ({ savedByName }: { savedByName?: string | null }) => {
        useVenueVersion.getState().bump();
        if (savedByName && savedByName !== useAuth.getState().profile?.name)
          Toast.show({ type: "info", text1: "The floor map was updated", text2: `Saved by ${savedByName}.` });
      });

      socket.io.on("reconnect", () => {
        if (useTableState.getState().loaded) useTableState.getState().load().catch(() => {});
        // A rider phone may not load the order list (403): live updates fill `orders` there,
        // but it only shows deliveries, which are refetched below.
        const riderPhone = useDeviceInfo.getState().deviceType === "RIDER_PHONE";
        if (!riderPhone && useOrder.getState().orders.length) useOrder.getState().fetchOrders().catch(() => {});
        if (useDelivery.getState().loaded) useDelivery.getState().load().catch(() => {});
        // Only for someone allowed to see devices: the list may be left from an earlier sign-in.
        if (useDeviceInfo.getState().deviceListType?.length && accessOf(useAuth.getState().profile).can("devices.manage"))
          useDeviceInfo.getState().getDevices();
      });
    });

    // Runs on logout (profile cleared), so the next login connects with its own token.
    return () => {
      closed = true;
      preview?.stop();
      socket?.disconnect();
    };
  }, [userId]);
}
