import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Device secret used to sign heartbeats (x-device-secret header).
// The server only returns it once, so it must survive app restarts.
// Native: SecureStore (keychain/keystore). Web/Electron: AsyncStorage (localStorage).
const KEY = "smartpos.deviceSecret.v1";
const useSecureStore = Platform.OS !== "web";

export async function getDeviceSecret(): Promise<string | null> {
  if (useSecureStore) {
    try {
      return await SecureStore.getItemAsync(KEY);
    } catch (error) {
      console.warn("SecureStore read failed, falling back to AsyncStorage.", error);
    }
  }
  return AsyncStorage.getItem(KEY);
}

export async function saveDeviceSecret(secret: string): Promise<void> {
  const value = secret.trim();
  if (useSecureStore) {
    try {
      await SecureStore.setItemAsync(KEY, value);
      return;
    } catch (error) {
      console.warn("SecureStore write failed, falling back to AsyncStorage.", error);
    }
  }
  await AsyncStorage.setItem(KEY, value);
}
