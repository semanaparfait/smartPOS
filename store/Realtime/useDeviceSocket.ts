import { API_URL } from "@/config/api";
import { deviceKind, type DeviceKind } from "@/config/deviceTypes";
import useAuth from "@/store/Authentication/useAuth";
import { isOwnerRole } from "@/store/Authentication/usePermissions";
import useDeviceInfo from "@/store/Device/useDeviceInfo";
import { fetchUniversalDeviceInfo } from "@/utils/device";
import { getDeviceSecret } from "@/utils/deviceSecret";
import { router } from "expo-router";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { create } from "zustand";

// The device's own connection (it signs in with its secret, not as a person).
// The server sends `device.status` { status, type, displayForId, momoCode } on connect and
// whenever the owner approves, disables or changes the device, and customer
// displays receive their till's cart on it (display.* events).

interface DeviceStatus {
  // REGISTERED, DISABLED, ... or null once the device is removed.
  status: string | null;
  type: DeviceKind;
  displayForId: string | null;
  // MoMo Pay code shown on a customer display (its own, else its till's).
  momoCode: string | null;
}

interface DeviceSocketState extends Partial<DeviceStatus> {
  connected: boolean;
  // Set once the server has said what this device is.
  known: boolean;
}

export const useDeviceSocketState = create<DeviceSocketState>(() => ({
  connected: false,
  known: false,
}));

let socket: Socket | null = null;
let connecting = false;

// Listens to an event on the device socket; returns a function that stops listening.
// Safe to call before the socket exists: it attaches once connected.
const listeners = new Map<string, Set<(payload: any) => void>>();
export function onDeviceEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
    socket?.on(event, (payload: unknown) =>
      listeners.get(event)?.forEach((h) => h(payload)),
    );
  }
  listeners.get(event)!.add(handler);
  return () => {
    listeners.get(event)?.delete(handler);
  };
}

// Signed in on a screen that no longer fits the device: move to the right one.
function followType(type: DeviceKind, previous: DeviceKind) {
  const profile = useAuth.getState().profile;
  if (!profile) return; // The start screen picks the screen itself.
  if (type === "KITCHEN_DISPLAY") router.replace("/(kitchen)/KitchenScreen");
  else if (type === "POS_TERMINAL" && previous === "KITCHEN_DISPLAY")
    router.replace(
      isOwnerRole(profile.role)
        ? "/(owner)/dashboard"
        : "/(tabs)/products/products",
    );
  // CUSTOMER_DISPLAY: the server signs the person out, which returns to the start screen.
}

// Connects once the device has a secret; call again after activation or a new secret.
export async function connectDeviceSocket() {
  if (!API_URL || socket || connecting) return;
  connecting = true;
  try {
    const [{ deviceId }, deviceSecret] = await Promise.all([
      fetchUniversalDeviceInfo(),
      getDeviceSecret(),
    ]);
    if (!deviceSecret || socket) return;

    socket = io(`${API_URL}/realtime`, {
      auth: { deviceId, deviceSecret },
      transports: ["websocket"],
    });
    for (const event of listeners.keys())
      socket.on(event, (payload: unknown) =>
        listeners.get(event)?.forEach((h) => h(payload)),
      );

    socket.on("connect", () =>
      useDeviceSocketState.setState({ connected: true }),
    );
    socket.on("disconnect", () =>
      useDeviceSocketState.setState({ connected: false }),
    );
    // Refused (not approved yet, removed, wrong secret): try again on the next call.
    // Network trouble is retried by socket.io itself.
    socket.on("connect_error", (error) => {
      useDeviceSocketState.setState({ connected: false });
      if (/websocket error|timeout|xhr|transport/i.test(error.message)) return;
      socket?.disconnect();
      socket = null;
    });

    socket.on(
      "device.status",
      (next: Partial<DeviceStatus> & { type?: string | null }) => {
        const before = useDeviceSocketState.getState();
        const type = deviceKind(next.type ?? before.type);
        useDeviceSocketState.setState({
          status: next.status ?? null,
          type,
          displayForId: next.displayForId ?? null,
          momoCode: next.momoCode ?? null,
          known: true,
        });
        if (next.type) {
          const previous = useDeviceInfo.getState().deviceType;
          useDeviceInfo.getState().saveDeviceType(type);
          if (previous !== type) followType(type, previous);
        }
      },
    );
  } catch (error) {
    console.warn("Device connection failed:", error);
  } finally {
    connecting = false;
  }
}

export function useDeviceSocket() {
  useEffect(() => {
    connectDeviceSocket();
  }, []);
}
