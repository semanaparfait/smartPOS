import { Stack } from "expo-router";
import '@/global.css';
import Toast from "react-native-toast-message";
import { StatusBar } from 'expo-status-bar';
import * as Device from "expo-device";
import useDeviceHeartbeat from "@/store/Device/useDeviceHeartbeat";
import DialogHost from "@/components/dialog/DialogHost";

// Phones keep the start screens (verification, activation, login, contact) in portrait.
// Tablets use landscape so those screens get their wide, side-by-side layout.
const isTablet = Device.deviceType === Device.DeviceType.TABLET;
const startOrientation = isTablet ? "landscape" : "portrait";

export default function RootLayout() {
  useDeviceHeartbeat();

  return (
    <>
     <StatusBar hidden={true} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false , orientation: startOrientation }} />
        <Stack.Screen name="(owner)" options={{ headerShown: false , orientation: 'landscape' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false , orientation: 'landscape' }} />
        <Stack.Screen name="(kitchen)" options={{ headerShown: false , orientation: 'landscape' }} />
        <Stack.Screen name="LoginPage" options={{ headerShown: false , orientation: startOrientation }} />
        <Stack.Screen name="ContactUs" options={{ headerShown: false , orientation: startOrientation }} />
      </Stack>

      <DialogHost />
      <Toast />
    </>
  );
}