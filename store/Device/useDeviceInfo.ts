import { API_URL } from "@/config/api";
import type { DeviceInfo } from "@/store/Device/DeviceType";
import { create } from "zustand";

interface DeviceStore {
  deviceInformation: DeviceInfo | null;
  setDeviceInformation: (deviceInfo: DeviceInfo) => void;
  sendDeviceInfo: (deviceInfo?: DeviceInfo) => Promise<void>;
}

const useDeviceInfo = create<DeviceStore>((set, get) => ({
  deviceInformation: null,

  setDeviceInformation: (deviceInfo) => set({ deviceInformation: deviceInfo }),

  sendDeviceInfo: async (deviceInfo) => {
    const payload = deviceInfo ?? get().deviceInformation;

    if (!payload) return;

    if (!API_URL) {
      throw new Error(
        "Missing API_URL. Set EXPO_PUBLIC_API_URL in your environment.",
      );
    }

    await fetch(
      `${API_URL}/api/v1/devices/${encodeURIComponent(payload.deviceId)}/request-registration`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
  },
}));

export default useDeviceInfo;
