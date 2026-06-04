import { Stack } from "expo-router";
import '@/global.css';
import Toast from "react-native-toast-message";
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
     <StatusBar hidden={true} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false , orientation: 'portrait' }} />
        <Stack.Screen name="(owner)" options={{ headerShown: false , orientation: 'landscape' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false , orientation: 'landscape' }} />
        <Stack.Screen name="(kitchen)" options={{ headerShown: false , orientation: 'landscape' }} />
        <Stack.Screen name="LoginPage" options={{ headerShown: false , orientation: 'portrait' }} />
      </Stack>

      <Toast />
    </>
  );
}