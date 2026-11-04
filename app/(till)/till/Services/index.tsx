import ServicesBoard from "@/components/services/ServicesBoard";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ServicesTab() {
  return (
    <SafeAreaView className="flex-1 bg-ivory" edges={["top"]}>
      <ServicesBoard />
    </SafeAreaView>
  );
}
