import { API_URL } from "@/config/api";
import type { DeviceInfo } from "@/store/Device/DeviceType";
import { create } from "zustand";

interface DeviceStore {
  // checkDevice: (deviceId: string) => Promise<boolean>;
  deviceInformation: DeviceInfo | null;
  setDeviceInformation: (deviceInfo: DeviceInfo) => void;
  sendDeviceInfo: (deviceInfo?: DeviceInfo) => Promise<boolean>;
}

const useDeviceInfo = create<DeviceStore>((set, get) => ({
  deviceInformation: null,

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
}));

export default useDeviceInfo;
