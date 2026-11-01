import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// The signed-in person's access token.
// Native: SecureStore (keychain/keystore). Web/Electron: AsyncStorage (localStorage).
// Installed apps that signed in before this keep theirs in AsyncStorage under the
// same name; it is moved across the first time it is read.
const LEGACY_KEY = "token";
const KEY = "smartpos.authToken.v1";
const useSecureStore = Platform.OS !== "web";

export async function saveAuthToken(token: string): Promise<void> {
  if (useSecureStore) {
    try {
      await SecureStore.setItemAsync(KEY, token);
      await AsyncStorage.removeItem(LEGACY_KEY);
      return;
    } catch (error) {
      console.warn("SecureStore write failed, falling back to AsyncStorage.", error);
    }
  }
  await AsyncStorage.setItem(LEGACY_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  if (useSecureStore) {
    try {
      const token = await SecureStore.getItemAsync(KEY);
      if (token) return token;
    } catch (error) {
      console.warn("SecureStore read failed, falling back to AsyncStorage.", error);
    }
  }
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy && useSecureStore) await saveAuthToken(legacy);
  return legacy;
}

export async function clearAuthToken(): Promise<void> {
  if (useSecureStore) {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch (error) {
      console.warn("SecureStore delete failed.", error);
    }
  }
  await AsyncStorage.removeItem(LEGACY_KEY);
}
