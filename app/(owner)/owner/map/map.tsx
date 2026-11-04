import React from "react";
import { View } from "react-native";

import VenueMapEditor from "@/components/venueMap/VenueMapEditor";

export default function Map() {
  return (
    <View className="flex-1 bg-ivory">
      <VenueMapEditor />
    </View>
  );
}
