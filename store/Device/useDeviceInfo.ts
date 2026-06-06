import { API_URL } from "@/config/api";
import type { DeviceInfo } from "@/store/Device/DeviceType";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DeviceCheckResult {
  registered: boolean;
  company: boolean;
}

interface DeviceStore {
  deviceId: string | null;
  deviceInformation: DeviceInfo | null;
  devicesList: DeviceInfo[] | null;
  setDeviceInformation: (deviceInfo: DeviceInfo) => void;
  sendDeviceInfo: (deviceInfo?: DeviceInfo) => Promise<boolean>;
  checkDevice: (deviceId: string) => Promise<DeviceCheckResult>;
  getDevices: () => Promise<DeviceInfo[] | null>;
}

const useDeviceInfo = create<DeviceStore>((set, get) => ({
  deviceInformation: null,
  deviceId: null,
  devicesList: null,
  setDeviceInformation: (deviceInfo) => set({ deviceInformation: deviceInfo }),

  sendDeviceInfo: async (deviceInfo) => {
    const payload = deviceInfo ?? get().deviceInformation;

    if (!payload) return false;

    if (!API_URL) {
      console.warn(
        "Missing API_URL. Set EXPO_PUBLIC_API_URL in your environment.",
      );
      return false;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/v1/devices/${encodeURIComponent(payload.deviceId)}/request-registration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      return response.ok;
    } catch (error) {
      console.warn("Failed to send device info registration request.", error);
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

      const normalizedDevices: DeviceInfo[] | null = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.devices)
            ? data.devices
            : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.results)
                ? data.results
                : null;

      set({ devicesList: normalizedDevices });
      return normalizedDevices;
    } catch (error) {
      console.warn("Error fetching devices:", error);
      return null;
    }
  },
}));

export default useDeviceInfo;
