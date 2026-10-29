import { API_URL } from "@/config/api";
import type {
  ActivityLog,
  DeviceInfo,
  DeviceListType,
} from "@/store/Device/DeviceType";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveDeviceSecret } from "@/utils/deviceSecret";
import { deviceKind, type DeviceKind } from "@/config/deviceTypes";

export interface DeviceCheckResult {
  registered: boolean;
  company: boolean;
  // What the owner approved this device as; tills on older backends.
  deviceType: DeviceKind;
  // The company's public details, for screens shown before anyone signs in.
  companyName?: string | null;
  companyInfo?: PublicCompany | null;
  // MoMo Pay code customers pay to here (a display's own, else its till's).
  momoCode?: string | null;
}

export interface PublicCompany {
  name: string;
  location?: string | null;
  type?: string | null;
  // A link, or an uploaded-file object ({ url, thumbnailUrl }).
  logo?: string | { url?: string | null; thumbnailUrl?: string | null } | null;
}

// Kept so the device opens on the right screens before verify answers (or offline).
const DEVICE_TYPE_KEY = "smartpos.deviceType.v1";

// Body of PATCH /devices/:id/type. `displayForId` (a till's id) only for customer displays; null unpairs.
export interface DeviceTypeChange {
  type: DeviceKind;
  displayForId?: string | null;
}

// Details of the last failed activation request (for troubleshooting on the activation screen).
export interface ActivationError {
  message: string;
  status?: number;
  statusText?: string;
  method: string;
  url: string;
  path?: string;
}

// Nest errors: { statusCode, message: string | string[], error, path }
const readErrorMessage = (
  body: string,
): { message?: string; path?: string } => {
  try {
    const data = JSON.parse(body);
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : (data?.message ?? data?.error);
    return { message, path: data?.path };
  } catch {
    return { message: body.trim().slice(0, 200) || undefined };
  }
};

// Result of the last heartbeat. "no-secret" / "invalid-secret" mean the device
// needs a secret from the owner (rotate-secret) before it can show as online.
export type HeartbeatStatus =
  | "idle"
  | "ok"
  | "no-secret"
  | "invalid-secret"
  | "error";

export interface RotatedSecret {
  deviceId: string;
  deviceSecret: string;
}

interface DeviceStore {
  lastActivationError: ActivationError | null;
  deviceId: string | null;
  deviceInformation: DeviceInfo | null;
  devicesList: DeviceInfo[] | null;
  deviceListType: DeviceListType[] | null;
  setDeviceInformation: (deviceInfo: DeviceInfo) => void;
  sendDeviceInfo: (deviceInfo?: DeviceInfo) => Promise<boolean>;
  checkDevice: (deviceId: string) => Promise<DeviceCheckResult>;
  // This device's type, from the last verify (or the saved one until then).
  deviceType: DeviceKind;
  loadSavedDeviceType: () => Promise<DeviceKind>;
  // From the device socket's `device.status` (and verify, if it sends `type`).
  saveDeviceType: (type: DeviceKind) => void;
  getDevices: () => Promise<DeviceListType[] | null>;
  // Owner actions below take the device's database id (UUID, `device.id`),
  // not the hardware id (`device.deviceId`) that verify/heartbeat use.
  // Approving needs the type the device will be used as.
  updateRegistration: (
    deviceId: string,
    action: "APPROVE" | "REJECT",
    deviceType?: DeviceKind,
  ) => Promise<boolean>;
  // Throws with the API's message.
  setDeviceType: (
    id: string,
    change: DeviceTypeChange,
  ) => Promise<DeviceListType>;
  // null removes it. Throws the API's message.
  setMomoCode: (id: string, momoCode: string | null) => Promise<DeviceListType>;
  setDeviceEnabled: (deviceId: string, enabled: boolean) => Promise<boolean>;
  deleteDevice: (deviceId: string) => Promise<boolean>;
  getDeviceActivities: (deviceId: string) => Promise<ActivityLog[] | null>;
  heartbeatStatus: HeartbeatStatus;
  sendHeartbeat: (
    deviceId: string,
    secret: string | null,
  ) => Promise<HeartbeatStatus>;
  rotateSecret: (id: string) => Promise<RotatedSecret | null>;
  // Live updates from the server; all take the database id (`device.id`).
  upsertDevice: (device: Partial<DeviceListType> & { id: string }) => void;
  removeDevice: (id: string) => void;
  setDeviceOnline: (id: string, online: boolean) => void;
}

const useDeviceInfo = create<DeviceStore>((set, get) => ({
  lastActivationError: null,
  deviceInformation: null,
  deviceId: null,
  devicesList: null,
  deviceListType: [],
  heartbeatStatus: "idle",
  deviceType: "POS_TERMINAL",
  saveDeviceType: (type) => {
    set({ deviceType: type });
    AsyncStorage.setItem(DEVICE_TYPE_KEY, type).catch(() => {});
  },
  loadSavedDeviceType: async () => {
    const saved = deviceKind(
      await AsyncStorage.getItem(DEVICE_TYPE_KEY).catch(() => null),
    );
    set({ deviceType: saved });
    return saved;
  },
  setDeviceInformation: (deviceInfo) => set({ deviceInformation: deviceInfo }),

  // Socket payloads are the plain device record, without list-only fields such as
  // `online`, so they're merged into the row already shown.
  upsertDevice: (device) =>
    set((state) => {
      const list = state.deviceListType ?? [];
      const existing = list.find((d) => d.id === device.id);
      return {
        deviceListType: existing
          ? list.map((d) => (d.id === device.id ? { ...d, ...device } : d))
          : [
              { online: false, currentUser: null, ...device } as DeviceListType,
              ...list,
            ],
      };
    }),
  removeDevice: (id) =>
    set((state) => ({
      deviceListType: (state.deviceListType ?? []).filter((d) => d.id !== id),
    })),
  setDeviceOnline: (id, online) =>
    set((state) => ({
      deviceListType: (state.deviceListType ?? []).map((d) =>
        d.id === id
          ? { ...d, online, lastSeenAt: new Date().toISOString() }
          : d,
      ),
    })),

  sendDeviceInfo: async (deviceInfo) => {
    const payload = deviceInfo ?? get().deviceInformation;
    const method = "POST";
    const url = `${API_URL}/api/v1/devices/request-registration`;
    set({ lastActivationError: null });

    if (!payload) {
      set({
        lastActivationError: {
          message: "No device info to send (payload is empty)",
          method,
          url,
        },
      });
      return false;
    }

    if (!API_URL) {
      console.warn(
        "Missing API_URL. Set EXPO_PUBLIC_API_URL in your environment.",
      );
      set({
        lastActivationError: {
          message: "EXPO_PUBLIC_API_URL is not set in this build",
          method,
          url: "(no API_URL)/api/v1/devices/request-registration",
        },
      });
      return false;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      console.warn("Activation response status:", response.status);
      console.warn("Activation response body:", text);

      if (!response.ok) {
        const { message, path } = readErrorMessage(text);
        set({
          lastActivationError: {
            message: message ?? "Request failed with no error message",
            status: response.status,
            statusText: response.statusText,
            method,
            url,
            path,
          },
        });
      } else {
        // The secret is only returned here once; keep it for heartbeats.
        try {
          const secret = JSON.parse(text)?.deviceSecret;
          if (secret) await saveDeviceSecret(secret);
        } catch (error) {
          console.warn(
            "Unable to save device secret from registration.",
            error,
          );
        }
      }
      return response.ok;
    } catch (error) {
      console.warn("Failed to send device info registration request.", error);
      set({
        lastActivationError: {
          message:
            error instanceof Error
              ? `Network error: ${error.message}`
              : "Network error: request did not reach the server",
          method,
          url,
        },
      });
      return false;
    }
  },
  checkDevice: async (deviceId: string) => {
    if (!API_URL) {
      console.warn(
        "Missing API_URL. Set EXPO_PUBLIC_API_URL in your environment.",
      );
      return {
        registered: false,
        company: false,
        deviceType: get().deviceType,
      };
    }
    try {
      const response = await fetch(
        `${API_URL}/api/v1/devices/${deviceId}/verify`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
        },
      );
      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const registered =
        typeof data === "boolean"
          ? data
          : Boolean(data?.registered ?? data?.isRegistered ?? response.ok);

      const company =
        typeof data === "boolean"
          ? false
          : Boolean(
              data?.company ??
              data?.hasCompany ??
              data?.companyExists ??
              data?.registeredCompany ??
              data?.companyActive,
            );

      // Verify doesn't send the type yet; the device socket does (device.status),
      // so until then this is the one saved last time.
      const deviceType = data?.type ? deviceKind(data.type) : get().deviceType;
      if (registered && data?.type) get().saveDeviceType(deviceType);

      return {
        registered,
        company,
        deviceType,
        companyName: data?.company?.name ?? null,
        companyInfo: data?.company?.name
          ? (data.company as PublicCompany)
          : null,
        momoCode: data?.momoCode ?? null,
      };
    } catch (error) {
      console.warn("Failed to check device registration.", error);
      return {
        registered: false,
        company: false,
        deviceType: get().deviceType,
      };
    }
  },
  getDevices: async () => {
    if (!API_URL) {
      console.warn(
        "Missing API_URL. Set EXPO_PUBLIC_API_URL in your environment.",
      );
      return null;
    }

    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) return null;

      const response = await fetch(`${API_URL}/api/v1/devices`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        console.warn("Failed to fetch devices list.", data);
        return null;
      }

      set({ deviceListType: data });
      return data;
    } catch (error) {
      console.warn("Error fetching devices:", error);
      return null;
    }
  },
  updateRegistration: async (deviceId, action, deviceType) => {
    if (!API_URL) return false;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return false;

      const response = await fetch(
        `${API_URL}/api/v1/devices/${deviceId}/registration`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify(
            action === "APPROVE"
              ? { action, type: deviceType ?? "POS_TERMINAL" }
              : { action },
          ),
        },
      );

      return response.ok;
    } catch (error) {
      console.warn("Failed to update device registration.", error);
      return false;
    }
  },
  setDeviceType: async (id, change) => {
    if (!API_URL) throw new Error("API_URL is not configured");
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("Authentication token is missing");
    const response = await fetch(`${API_URL}/api/v1/devices/${id}/type`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(change),
    });
    const text = await response.text();
    if (!response.ok)
      throw new Error(
        readErrorMessage(text).message || "Could not change this device's type",
      );
    const updated: DeviceListType = JSON.parse(text);
    get().upsertDevice(updated);
    return updated;
  },
  setMomoCode: async (id, momoCode) => {
    if (!API_URL) throw new Error("API_URL is not configured");
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("Authentication token is missing");
    const response = await fetch(`${API_URL}/api/v1/devices/${id}/momo-code`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ momoCode }),
    });
    const text = await response.text();
    if (!response.ok)
      throw new Error(
        readErrorMessage(text).message || "Could not save the MoMo code",
      );
    const updated: DeviceListType = JSON.parse(text);
    get().upsertDevice(updated);
    return updated;
  },
  setDeviceEnabled: async (deviceId, enabled) => {
    if (!API_URL) return false;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return false;

      const action = enabled ? "enable" : "disable";
      const response = await fetch(
        `${API_URL}/api/v1/devices/${deviceId}/${action}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        },
      );

      return response.ok;
    } catch (error) {
      console.warn(
        `Failed to ${enabled ? "enable" : "disable"} device.`,
        error,
      );
      return false;
    }
  },
  deleteDevice: async (deviceId) => {
    if (!API_URL) return false;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return false;

      const response = await fetch(
        `${API_URL}/api/v1/devices/${deviceId}/delete`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        },
      );

      return response.ok;
    } catch (error) {
      console.warn("Failed to delete device.", error);
      return false;
    }
  },
  getDeviceActivities: async (deviceId) => {
    if (!API_URL) return null;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return null;

      const response = await fetch(
        `${API_URL}/api/v1/devices/${deviceId}/activities`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        },
      );

      const data = await response.json();
      if (!response.ok) {
        console.warn("Failed to fetch device activities.", data);
        return null;
      }

      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch (error) {
      console.warn("Error fetching device activities:", error);
      return null;
    }
  },
  sendHeartbeat: async (deviceId, secret) => {
    if (!secret) {
      set({ heartbeatStatus: "no-secret" });
      return "no-secret";
    }
    if (!API_URL) return get().heartbeatStatus;

    let status: HeartbeatStatus;
    try {
      const response = await fetch(
        `${API_URL}/api/v1/devices/${deviceId}/heartbeat`,
        {
          method: "POST",
          headers: {
            "x-device-secret": secret,
            "ngrok-skip-browser-warning": "true",
          },
        },
      );
      status = response.ok
        ? "ok"
        : response.status === 401
          ? "invalid-secret"
          : "error";
    } catch {
      status = "error";
    }
    set({ heartbeatStatus: status });
    return status;
  },
  rotateSecret: async (id) => {
    if (!API_URL) return null;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return null;

      const response = await fetch(
        `${API_URL}/api/v1/devices/${id}/rotate-secret`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        },
      );

      const data = await response.json();
      if (!response.ok || !data?.deviceSecret) {
        console.warn("Failed to rotate device secret.", data);
        return null;
      }
      return data;
    } catch (error) {
      console.warn("Error rotating device secret:", error);
      return null;
    }
  },
}));

export default useDeviceInfo;
