import useAuth from "@/store/Authentication/useAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

let ending: Promise<void> | null = null;

// Signs the person out and returns to the start screen, showing why. Safe to call
// more than once: the socket message and an HTTP 401 often arrive together.
export function endSession(reason?: string) {
  ending ??= (async () => {
    if (!(await AsyncStorage.getItem("token"))) return;
    // The server already ended this session, so there's nothing to tell it.
    await useAuth.getState().logout({ local: true });
    router.replace("/");
    Toast.show({ type: "error", text1: "Signed out", text2: reason });
  })().finally(() => {
    ending = null;
  });
  return ending;
}
