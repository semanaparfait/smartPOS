import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/config/api";
import type { Login, PinLogin, profile } from "@/store/Authentication/AuthTypes";

interface AuthStore {
  profile: profile | null;
  token: string | null;

  login: (credentials: Login) => Promise<{ success: boolean; token: string | null; profile: profile | null }>;
  pinLogin: (credentials: PinLogin) => Promise<boolean>;
  fetchProfile: (existingToken?: string) => Promise<profile | null>; 
  logout: () => void;
}

const useAuth = create<AuthStore>((set, get) => ({
  profile: null,
  token: null,

login: async (credentials) => {
  if (!API_URL) return { success: false, token: null, profile: null };

  try {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    
    // 🔍 DEBUG LOG #1: See what the login endpoint actually said
    console.log("➡️ RAW LOGIN RESPONSE STATUS:", response.status);
    console.log("➡️ RAW LOGIN DATA:", data);

    if (!response.ok) return { success: false, token: null, profile: null };

    await SecureStore.setItemAsync("token", data.accessToken);
    set({ token: data.accessToken });

    // Pass token directly to avoid race conditions
    const userProfile = await get().fetchProfile(data.accessToken);

    // 🔍 DEBUG LOG #2: See if the profile step is what failed
    console.log("➡️ PROFILE FETCH RESULT WITHIN LOGIN:", userProfile);

    if (!userProfile) return { success: false, token: null, profile: null };

    return { 
      success: true, 
      token: data.accessToken, 
      profile: userProfile 
    };
  } catch (error) {
    console.error("Login network error:", error);
    return { success: false, token: null, profile: null };
  }
},

  pinLogin: async (credentials) => {
    if (!API_URL) return false;

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/pin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      if (!response.ok) return false;

      await SecureStore.setItemAsync("token", data.accessToken);
      set({ token: data.accessToken });

      // Pass token directly here too
      const userProfile = await get().fetchProfile(data.accessToken);
      return !!userProfile;
    } catch (error) {
      console.error("PIN login error:", error);
      return false;
    }
  },

  fetchProfile: async (existingToken) => {
    if (!API_URL) return null;

    try {
      // Use passed token, or fall back to state, or fall back to SecureStore
      const token = existingToken || get().token || await SecureStore.getItemAsync("token");

      if (!token) {
        console.error("FetchProfile failed: No token found.");
        return null;
      }

      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Fetch profile endpoint failed:", data);
        return null;
      }

      set({ profile: data.profile });
      return data.profile;
    } catch (error) {
      console.error("Profile fetch network error:", error);
      return null;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("token");
    set({ profile: null, token: null });
  },
}));

export default useAuth;