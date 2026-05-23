import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {
  loadFloorPlan,
  type FloorPlanItem,
  type FloorPlanWall,
} from "@/utils/floorPlanStorage";

const CANVAS_SIZE = 1500;

function getItemSource(kind: FloorPlanItem["kind"]) {
  switch (kind) {
    case "bar":
      return require("@/assets/images/barcounter/barcounter.png");
    case "restroom":
      return require("@/assets/images/toilet/toilet.png");
    case "kitchen":
      return require("@/assets/images/kitchen/kitchen.jpg");
    case "singledoor":
      return require("@/assets/images/doors/singledoor.png");
    case "doubledoor":
      return require("@/assets/images/doors/doobledoor.png");
    case "table":
    default:
      return require("@/assets/images/table/table1.png");
  }
}

function getWallStyle(wall: FloorPlanWall) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  return {
    left: (wall.start.x + wall.end.x) / 2 - length / 2,
    top: (wall.start.y + wall.end.y) / 2 - wall.thickness / 2,
    width: length,
    height: wall.thickness,
    transform: [{ rotate: `${angle}rad` }],
  };
}

export default function WorkerView() {
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<FloorPlanItem[]>([]);
  const [walls, setWalls] = useState<FloorPlanWall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      console.log("[WorkersView] loading saved floor plan...");
      const snapshot = await loadFloorPlan();

      if (!mounted) {
        return;
      }

      console.log("[WorkersView] loaded counts:", {
        items: snapshot.items.length,
        walls: snapshot.walls.length,
      });

      setItems(snapshot.items);
      setWalls(snapshot.walls);
      setLoading(false);
    };

    void restore();

    return () => {
      mounted = false;
    };
  }, []);

  const canvasScale = useMemo(() => {
    const availableWidth = Math.max(width - 24, 320);
    return Math.min(1, availableWidth / CANVAS_SIZE);
  }, [width]);

  return (
    <View className="flex-1 bg-[#0f172a]">
      <View className="px-4 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold">Floor View</Text>
        <Text className="text-slate-300 text-sm mt-1">
          Saved layout for workers and waiters
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View
            style={{
              width: CANVAS_SIZE * canvasScale,
              height: CANVAS_SIZE * canvasScale,
              margin: 12,
              borderRadius: 28,
              backgroundColor: "#f8fafc",
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 8,
            }}
          >
            <View
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "#f8fafc",
              }}
            />

            <View
              style={{
                position: "absolute",
                left: 18,
                top: 18,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(15, 23, 42, 0.78)",
                zIndex: 40,
              }}
            >
              <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>
                {loading ? "Loading floor plan..." : `${items.length} items`}
              </Text>
            </View>

            {walls.map((wall) => (
              <View
                key={wall.id}
                style={{
                  position: "absolute",
                  ...getWallStyle(wall),
                  borderRadius: 999,
                  backgroundColor: "#334155",
                  shadowColor: "#000",
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                }}
              />
            ))}

            {items.map((item) => (
              <View
                key={item.id}
                style={{
                  position: "absolute",
                  left: item.x,
                  top: item.y,
                  width: item.width,
                  height: item.height,
                  transform: [{ rotate: `${item.rotation}deg` }],
                  borderRadius: item.kind === "bar" ? 18 : 16,
                  backgroundColor:
                    item.kind === "restroom"
                      ? "#e2e8f0"
                      : item.kind === "kitchen"
                        ? "#fff7ed"
                        : "#ffffff",
                  shadowColor: "#0f172a",
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(15, 23, 42, 0.08)",
                }}
              >
                <Image
                  source={getItemSource(item.kind)}
                  style={{
                    width: Math.max(24, item.width - 10),
                    height: Math.max(24, item.height - 10),
                    borderRadius: 12,
                  }}
                  resizeMode="contain"
                />

                <View
                  style={{
                    position: "absolute",
                    bottom: -10,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 999,
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 10, fontWeight: "700" }}
                  >
                    {item.kind}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}
