import AreaGate from "@/components/AreaGate";
import { Slot } from "expo-router";
import React from "react";

// Only kitchen staff, owners and kitchen displays open the kitchen screen.
export default function KitchenLayout() {
  return (
    <AreaGate area="kitchen">
      <Slot />
    </AreaGate>
  );
}
