import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import RoundTable from "@/components/Seating/RoundTable";
import BarCounter from "@/components/Service/BarCounter";
import FloorGrid from "@/components/floorPlan/FloorGrid";

export default function Map() {
  const [selectedTool, setSelectedTool] = useState<"table" | "bar" | null>(
    null,
  );
  const FloorGridCanvas = FloorGrid as React.ComponentType<{
    selectedTool?: "table" | "bar" | null;
    onToolConsumed?: () => void;
  }>;

  useEffect(() => {
    console.log("Map selectedTool changed:", selectedTool);
  }, [selectedTool]);

  return (
    <SafeAreaView className="flex-1">
      <View className="bg-gray-200 w-full py-3 px-4 flex-row gap-4">
        <RoundTable
          size={60}
          onPress={() => {
            console.log("Toolbar: select table");
            setSelectedTool("table");
          }}
          name="Table"
        />
        <BarCounter
          size={60}
          onPress={() => {
            console.log("Toolbar: select bar");
            setSelectedTool("bar");
          }}
          name="Bar Counter"
        />
        {/* <Wall wall={{  width: 100, height: 20 }} /> */}
      </View>

      <ScrollView horizontal>
        <ScrollView>
          <View style={{ width: 1500, height: 1500 }}>
            <FloorGridCanvas
              selectedTool={selectedTool}
              onToolConsumed={() => setSelectedTool(null)}
            />
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
