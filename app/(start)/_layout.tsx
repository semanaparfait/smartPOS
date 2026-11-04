import { Stack } from "expo-router";
import React from "react";

// Device check, activation and sign-in: open to anyone.
export default function StartLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
