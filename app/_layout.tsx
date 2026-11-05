import { Stack } from "expo-router";
import * as Sentry from "@sentry/react-native";
import '@/global.css';
import Toast from "react-native-toast-message";
import { StatusBar } from 'expo-status-bar';
import * as Device from "expo-device";
import useDeviceHeartbeat from "@/store/Device/useDeviceHeartbeat";
import DialogHost from "@/components/dialog/DialogHost";
import ReadyAlerts from "@/components/kitchen/ReadyAlerts";
import BookingAlerts from "@/components/services/BookingAlerts";
import useRealtime from "@/store/Realtime/useRealtime";
import { useDeviceSocket } from "@/store/Realtime/useDeviceSocket";
import { endSession } from "@/utils/endSession";
import { installSessionGuard } from "@/utils/sessionGuard";

// A deactivated or removed worker (or an expired session) is signed out right
// away by the realtime socket; if it's down, on their next request.
installSessionGuard(endSession);

// Phones keep the start screens (verification, activation, login, contact) in portrait.
// Tablets use landscape so those screens get their wide, side-by-side layout.
const isTablet = Device.deviceType === Device.DeviceType.TABLET;
const startOrientation = isTablet ? "landscape" : "portrait";

// Error tracking (Sentry). Without EXPO_PUBLIC_SENTRY_DSN nothing is sent.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN)
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? "development" : "production",
    // A tenth of screens are timed, to spot slow ones.
    tracesSampleRate: 0.1,
  });

function RootLayout() {
  useDeviceHeartbeat();
  useRealtime();
  useDeviceSocket();

  return (
    <>
     <StatusBar hidden={true} />
      <Stack>
        {/* One group per kind of screen; each layout lets in only who belongs there. */}
        <Stack.Screen name="(start)" options={{ headerShown: false , orientation: startOrientation }} />
        <Stack.Screen name="(owner)" options={{ headerShown: false , orientation: 'landscape' }} />
        <Stack.Screen name="(till)" options={{ headerShown: false , orientation: 'landscape' }} />
        <Stack.Screen name="(kitchen)" options={{ headerShown: false , orientation: 'landscape' }} />
        {/* Riders use their phone: any orientation. */}
        <Stack.Screen name="(rider)" options={{ headerShown: false }} />
      </Stack>

      <ReadyAlerts />
      <BookingAlerts />
      <DialogHost />
      <Toast />
    </>
  );
}

export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
