import { API_URL } from "@/config/api";
import type { DeviceInfo , DeviceListType } from "@/store/Device/DeviceType";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DeviceCheckResult {
  registered: boolean;
  company: boolean;
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
const readErrorMessage = (body: string): { message?: string; path?: string } => {
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

interface DeviceStore {
  lastActivationError: ActivationError | null;
  deviceId: string | null;
  deviceInformation: DeviceInfo | null;
  devicesList: DeviceInfo[] | null;
  deviceListType: DeviceListType[] | null;
  setDeviceInformation: (deviceInfo: DeviceInfo) => void;
  sendDeviceInfo: (deviceInfo?: DeviceInfo) => Promise<boolean>;
  checkDevice: (deviceId: string) => Promise<DeviceCheckResult>;
  getDevices: () => Promise<DeviceListType[] | null>;
  updateRegistration: (deviceId: string, status: "REGISTERED" | "REJECTED") => Promise<boolean>;
  setDeviceEnabled: (deviceId: string, enabled: boolean) => Promise<boolean>;
  deleteDevice: (deviceId: string) => Promise<boolean>;
}

const useDeviceInfo = create<DeviceStore>((set, get) => ({
  lastActivationError: null,
  deviceInformation: null,
  deviceId: null,
  devicesList: null,
  deviceListType: [],
  setDeviceInformation: (deviceInfo) => set({ deviceInformation: deviceInfo }),

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
      return { registered: false, company: false };
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

      return { registered, company };
    } catch (error) {
      console.warn("Failed to check device registration.", error);
      return { registered: false, company: false };
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
  updateRegistration: async (deviceId, status) => {
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
          body: JSON.stringify({ status }),
        },
      );

      return response.ok;
    } catch (error) {
      console.warn("Failed to update device registration.", error);
      return false;
    }
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
      console.warn(`Failed to ${enabled ? "enable" : "disable"} device.`, error);
      return false;
    }
  },
  deleteDevice: async (deviceId) => {
    if (!API_URL) return false;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return false;

      const response = await fetch(
        `${API_URL}/api/v1/devices/${deviceId}/deletete`,
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
}));

export default useDeviceInfo;
