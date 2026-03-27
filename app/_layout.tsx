import { Stack } from "expo-router";
import {  Tabs } from "expo-router";
import '@/global.css';
import Toast from "react-native-toast-message"
export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Toast />
    </Stack>
  );
}
