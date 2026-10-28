import { API_URL } from "@/config/api";
import type {
  CompanyUpdate,
  PickedImage,
  profile,
  ProfileUpdate,
} from "@/store/Authentication/AuthTypes";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Only using AsyncStorage now
import DeviceInfo from "react-native-device-info";
import { Platform } from "react-native";
import { create } from "zustand";

// Builds the multipart body the profile/company PATCH endpoints accept.
const toFormData = async (
  fields: Record<string, string | undefined>,
  imageField: string,
  image?: PickedImage,
) => {
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) body.append(key, value);
  });
  if (image) {
    if (Platform.OS === "web") {
      const blob: Blob = image.file
        ? image.file
        : await fetch(image.uri).then((response) => response.blob());
      body.append(imageField, blob, `${imageField}.jpg`);
    } else {
      body.append(imageField, {
        uri: image.uri,
        name: `${imageField}.jpg`,
        type: "image/jpeg",
      } as any);
    }
  }
  return body;
};

// Nest sends validation errors as an array of messages.
const errorMessage = (data: any, fallback: string) => {
  const message = data?.message;
  if (Array.isArray(message)) return message.join("\n");
  return typeof message === "string" && message ? message : fallback;
};

// Sends FormData as multipart, anything else as JSON.
const patch = async (path: string, body: FormData | object, fallback: string) => {
  const token = await AsyncStorage.getItem("token");
  if (!API_URL) throw new Error("API_URL is not configured");
  if (!token) throw new Error("You are signed out. Please sign in again.");

  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(errorMessage(data, fallback));
  return data;
};

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
  updateProfile: (changes: ProfileUpdate, picture?: PickedImage) => Promise<profile>;
  updateCompany: (changes: CompanyUpdate, logo?: PickedImage) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  changePin: (currentPin: string, newPin: string) => Promise<void>;
  // Tells the server (so the device shows who signed out), then clears the session
  // here. `local` skips the server call, for when the session has already ended.
  logout: (options?: { local?: boolean }) => Promise<void>;
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
        headers: {
           "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
         },
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
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
         },
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

  updateProfile: async (changes, picture) => {
    const data = await patch(
      "/api/v1/auth/me",
      await toFormData({ ...changes }, "picture", picture),
      "Could not update your profile",
    );
    // The endpoint returns the same shape as /auth/me.
    set({ profile: data });
    return data;
  },

  updateCompany: async (changes, logo) => {
    const companyId = get().profile?.company?.id;
    if (!companyId) throw new Error("No company is linked to this account");

    const company = await patch(
      `/api/v1/companies/${companyId}`,
      await toFormData({ ...changes }, "logo", logo),
      "Could not update company details",
    );
    set((state) => ({
      profile: state.profile
        ? { ...state.profile, company: { ...state.profile.company!, ...company } }
        : null,
    }));
  },

  changePassword: async (currentPassword, newPassword) => {
    await patch(
      "/api/v1/auth/change-password",
      { currentPassword, newPassword },
      "Could not change your password",
    );
    // Clears mustChangePassword on the stored profile.
    await get().fetchProfile();
  },

  changePin: async (currentPin, newPin) => {
    await patch(
      "/api/v1/auth/change-pin",
      { currentPin, newPin },
      "Could not change your PIN",
    );
  },

  logout: async (options) => {
    const token = await AsyncStorage.getItem("token");
    if (token && API_URL && !options?.local) {
      // Best effort: signing out must work offline too, so don't wait long or fail on it.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        signal: controller.signal,
      })
        .catch(() => undefined)
        .finally(() => clearTimeout(timer));
    }
    await AsyncStorage.removeItem("token");
    set({ profile: null, token: null });
  },
}));

export default useAuth;
