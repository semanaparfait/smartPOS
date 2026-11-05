import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router, type Href } from "expo-router";
import { API_URL } from "@/config/api";
import { getAuthToken } from "@/utils/authToken";
import { brand } from "@/config/theme";

// Phone notifications from the SmartPOS server: a device asking to join, a
// flagged money check, a booking about to start, the subscription running out.

// While the app is open, notifications still show as a banner with a sound.
if (Platform.OS !== "web")
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

// The token this phone gave the server, kept to take it back at sign-out.
let registered: string | null = null;

const projectId = (): string | undefined =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

const call = async (method: "POST" | "DELETE", token: string) => {
  const auth = await getAuthToken();
  if (!auth || !API_URL) return;
  await fetch(`${API_URL}/api/v1/notifications/phones`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth}`,
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ token, platform: Platform.OS }),
  });
};

// Asks once for permission, then tells the server where to send. Quietly does
// nothing on a simulator, the web, or when the person says no.
export async function registerForNotifications() {
  try {
    if (Platform.OS === "web" || !Device.isDevice) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "SmartPOS",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: brand.lime,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== "granted") return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    if (!token || token === registered) return;
    await call("POST", token);
    registered = token;
  } catch (error) {
    console.warn("Notifications are not available on this phone:", error);
  }
}

// At sign-out: this phone stops receiving the person's notifications.
export async function unregisterForNotifications() {
  const token = registered;
  registered = null;
  if (!token) return;
  try {
    await call("DELETE", token);
  } catch {
    /* offline: the server forgets it when Expo reports it gone */
  }
}

// Where each kind of notification opens. Workers have no owner pages, so their
// booking reminders open the till's service desk.
export function screenFor(screen: unknown, role: string | undefined): Href | null {
  const owner = role?.toUpperCase() === "OWNER";
  switch (screen) {
    case "devices":
      return "/(owner)/owner/Settings/Devices/DeviceInformation" as Href;
    case "money-checks":
      return "/(owner)/owner/finance/verification" as Href;
    case "bookings":
      return (owner ? "/(owner)/owner/services/bookings" : "/(till)/till/Services") as Href;
    case "day-closing":
      return "/(owner)/owner/finance/close-day" as Href;
    case "subscription":
      return "/(owner)/owner/Settings/CompanyProfile" as Href;
    default:
      return null;
  }
}

// Opens the screen a tapped notification is about, including the one that
// started the app.
export function listenForTaps(roleOf: () => string | undefined) {
  if (Platform.OS === "web") return () => {};
  const open = (response: Notifications.NotificationResponse | null) => {
    const target = screenFor(response?.notification.request.content.data?.screen, roleOf());
    if (target) router.push(target);
  };
  void Notifications.getLastNotificationResponseAsync().then(open);
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}
