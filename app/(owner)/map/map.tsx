import { ScrollView, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import RoundTable from "@/components/Seating/RoundTable";
import BarCounter from "@/components/Service/BarCounter";
import FloorGrid from "@/components/floorPlan/FloorGrid";
import Wall from "@/components/layout/wall";

export default function Map() {
  return (
    <SafeAreaView className="flex-1">
      <View className="bg-gray-200 w-full py-3 px-4 flex-row gap-4">
        <RoundTable size={60} />
        <BarCounter size={60} />
        {/* <Wall wall={{  width: 100, height: 20 }} /> */}
      </View>

      <ScrollView horizontal>
        <ScrollView>
          <View style={{ width: 1500, height: 1500 , cursor: "crosshair"}}>
            <FloorGrid />
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
