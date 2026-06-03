import { Stack } from "expo-router";
import '@/global.css';
import Toast from "react-native-toast-message";
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
     <StatusBar hidden={true} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(owner)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(kitchen)" options={{ headerShown: false }} />
        <Stack.Screen name="LoginPage" options={{ headerShown: false }} />
      </Stack>

      <Toast />
    </>
  );
}