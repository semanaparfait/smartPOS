import { API_URL } from "@/config/api";
import type { profile } from "@/store/Authentication/AuthTypes";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Only using AsyncStorage now
import DeviceInfo from "react-native-device-info";
import { create } from "zustand";

const deviceId = DeviceInfo.getUniqueId();
interface AuthStore {
  profile: profile | null;
  token: string | null;
  deviceId: string | null;
  login: (
    deviceId: string,
    email: string,
    password: string,
  ) => Promise<profile | false>;
  pinLogin: (pin: string, deviceId: string) => Promise<profile | false>;
  fetchProfile: () => Promise<profile | null>;
  logout: () => void;
}

const useAuth = create<AuthStore>((set, get) => ({
  profile: null,
  token: null,
  deviceId: null,
  login: async (deviceId: string, email: string, password: string) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return false;
    }
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }
      await AsyncStorage.setItem("token", data.accessToken);
      set({ token: data.accessToken });
      const userProfile = await get().fetchProfile();

      if (!userProfile) {
        console.error("Failed to load profile after login");
        return false;
      }

      return userProfile;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  },

  pinLogin: async (pin: string, deviceId: string) => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/pin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, deviceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("PIN login failed:", data.message);
        return false;
      }
      await AsyncStorage.setItem("token", data.accessToken);
      set({ token: data.accessToken });
      const userProfile = await get().fetchProfile();

      if (!userProfile) {
        console.error("Failed to load profile after PIN login");
        return false;
      }

      return userProfile;
    } catch (error) {
      console.error("PIN login error:", error);
      return false;
    }
  },

  fetchProfile: async () => {
    if (!API_URL) return null;

    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) return null;

      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      const data = await response.json();
      // console.log("Profile response:", data);
      if (!response.ok) {
        console.log("PROFILE ERROR RESPONSE:", data);
        return null;
      }

      set({ profile: data });
      return data;
    } catch (error) {
      console.error("Profile error:", error);
      return null;
    }
  },

  logout: async () => {
    // FIXED: Swapped SecureStore to AsyncStorage
    await AsyncStorage.removeItem("token");
    set({ profile: null, token: null });
  },
}));

export default useAuth;
