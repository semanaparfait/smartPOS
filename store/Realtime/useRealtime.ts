import { API_URL } from "@/config/api";
import useAuth from "@/store/Authentication/useAuth";
import type { DeviceListType } from "@/store/Device/DeviceType";
import useDeviceInfo from "@/store/Device/useDeviceInfo";
import useOrder from "@/store/Order/Order";
import type { OrderType } from "@/store/Order/OrderType";
import { endSession } from "@/utils/endSession";
import { isSessionEnded } from "@/utils/sessionGuard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import Toast from "react-native-toast-message";
import { io } from "socket.io-client";

type DevicePayload = { device: Partial<DeviceListType> & { id: string } };

// Live updates from the server while someone is signed in. The socket only
// notifies; every change is still made and checked over HTTP. Events sent while
// disconnected are lost, so lists that are already loaded are refetched on reconnect.
export default function useRealtime() {
  const userId = useAuth((s) => s.profile?.id);

  useEffect(() => {
    if (!userId || !API_URL) return;
    let socket: ReturnType<typeof io> | null = null;
    let closed = false;

    AsyncStorage.getItem("token").then((token) => {
      if (closed || !token) return;
      socket = io(`${API_URL}/realtime`, { auth: { token }, transports: ["websocket"] });

      // A refused handshake says why, e.g. "Your account has been deactivated".
      socket.on("connect_error", (error) => {
        if (isSessionEnded(error.message)) endSession(error.message);
        else console.warn("Realtime connection failed:", error.message);
      });
      socket.on("session.revoked", ({ reason }: { reason?: string }) => endSession(reason));
      socket.on("permissions.changed", () => {
        useAuth.getState().fetchProfile();
      });

      socket.on("order.created", (order: OrderType) => useOrder.getState().upsertOrder(order));
      socket.on("order.updated", (order: OrderType) => useOrder.getState().upsertOrder(order));

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
      socket.on("device.removed", ({ id }: { id: string }) => useDeviceInfo.getState().removeDevice(id));
      socket.on("device.presence", ({ deviceId, online }: { deviceId: string; online: boolean }) =>
        useDeviceInfo.getState().setDeviceOnline(deviceId, online),
      );

      socket.io.on("reconnect", () => {
        if (useOrder.getState().orders.length) useOrder.getState().fetchOrders().catch(() => {});
        if (useDeviceInfo.getState().deviceListType?.length) useDeviceInfo.getState().getDevices();
      });
    });

    // Runs on logout (profile cleared), so the next login connects with its own token.
    return () => {
      closed = true;
      socket?.disconnect();
    };
  }, [userId]);
}
