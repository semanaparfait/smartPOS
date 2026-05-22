import type { FloorItem } from "@/components/Details/CompDetails";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";

type Point = {
  x: number;
  y: number;
};

type Wall = {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
};

type TableItem = {
  id: string;
  x: number;
  y: number;
  size: number;
  kind?: "table" | "bar";
};

type FloorGridProps = {
  selectedTool?: "table" | "bar" | null;
  onToolConsumed?: () => void;
  onItemSelect?: (item: FloorItem) => void;
};

const BRICK_SIZE = 14;

export default function FloorGrid({
  selectedTool = null,
  onToolConsumed,
  onItemSelect,
}: FloorGridProps) {
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const gridRef = useRef<View>(null);
  const gridOffset = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  const refreshGridOffset = () => {
    gridRef.current?.measureInWindow((x, y) => {
      gridOffset.current = { x, y };
    });
  };

  const removeTable = (tableId: string) => {
    setTables((prev) => prev.filter((table) => table.id !== tableId));
    setSelectedItemId((current) => (current === tableId ? null : current));
    setActiveDragId((current) => (current === tableId ? null : current));
  };

  useEffect(() => {
    console.log("FloorGrid useEffect selectedTool:", selectedTool);

    if (selectedTool !== "table" && selectedTool !== "bar") {
      return;
    }

    const size = 70;
    const id = Date.now().toString();
    console.log(`FloorGrid placing item type=${selectedTool} id=${id}`);
    setTables((prev) => [
      ...prev,
      {
        id,
        x: 180,
        y: 180,
        size,
        kind: selectedTool ?? "table",
      },
    ]);
    console.log("FloorGrid calling onToolConsumed");
    onToolConsumed?.();
  }, [selectedTool, onToolConsumed]);

  const getPoint = (e: any): Point => {
    const { locationX, locationY } = e.nativeEvent;

    return {
      x: locationX,
      y: locationY,
    };
  };

  const getPointFromPage = (pageX: number, pageY: number): Point => {
    return {
      x: pageX - gridOffset.current.x,
      y: pageY - gridOffset.current.y,
    };
  };

  const getSegmentStyle = (
    startPoint: Point,
    endPoint: Point,
    thickness: number,
  ) => {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    return {
      left: (startPoint.x + endPoint.x) / 2 - length / 2,
      top: (startPoint.y + endPoint.y) / 2 - thickness / 2,
      width: length,
      height: thickness,
      transform: [{ rotate: `${angle}rad` }],
    };
  };

  return (
    <View
      ref={gridRef}
      className="flex-1 bg-[#f8f8f8] relative cursor-crosshair"
      onLayout={refreshGridOffset}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        if (activeDragId) {
          return;
        }

        const p = getPoint(e);
        setStart(p);
        setEnd(p);
      }}
      onResponderMove={(e) => {
        if (activeDragId) {
          const pointer = getPointFromPage(
            e.nativeEvent.pageX,
            e.nativeEvent.pageY,
          );

          setTables((prev) =>
            prev.map((table) => {
              if (table.id !== activeDragId) {
                return table;
              }

              return {
                ...table,
                x: pointer.x - dragOffset.current.x,
                y: pointer.y - dragOffset.current.y,
              };
            }),
          );
          return;
        }

        setEnd(getPoint(e));
      }}
      onResponderRelease={() => {
        if (activeDragId) {
          setActiveDragId(null);
          return;
        }

        if (start && end) {
          setWalls((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              start,
              end,
              thickness: 18,
            },
          ]);
        }

        setStart(null);
        setEnd(null);
      }}
    >
      {/* ================= GRID ================= */}
      {Array.from({ length: 150 }).map((_, i) => (
        <View
          key={`h-${i}`}
          className="absolute h-[1px] bg-gray-200 w-full"
          style={{ top: i * 15 }}
        />
      ))}

      {Array.from({ length: 100 }).map((_, i) => (
        <View
          key={`v-${i}`}
          className="absolute w-[1px] bg-gray-200 h-full"
          style={{ left: i * 15 }}
        />
      ))}

      {tables.map((table) => (
        <View
          className="border border-dashed "
          key={table.id}
          style={{
            position: "absolute",
            left: table.x,
            top: table.y,
            width: table.size,
            height: table.size,
            zIndex: 20,
            borderWidth: selectedItemId === table.id ? 1 : 0,
            borderStyle: "dashed",
            borderColor:
              selectedItemId === table.id ? "#ef4444" : "transparent",
          }}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            refreshGridOffset();
            setSelectedItemId(table.id);
            setActiveDragId(table.id);
            onItemSelect?.({
              id: table.id,
              kind: table.kind ?? "table",
              x: table.x,
              y: table.y,
              width: table.size,
              height: table.size,
              rotation: 0,
            });
            dragOffset.current = {
              x: e.nativeEvent.locationX,
              y: e.nativeEvent.locationY,
            };
          }}
          onResponderMove={(e) => {
            const pointer = getPointFromPage(
              e.nativeEvent.pageX,
              e.nativeEvent.pageY,
            );

            setTables((prev) =>
              prev.map((item) => {
                if (item.id !== table.id) {
                  return item;
                }

                return {
                  ...item,
                  x: pointer.x - dragOffset.current.x,
                  y: pointer.y - dragOffset.current.y,
                };
              }),
            );
          }}
          onResponderRelease={() => {
            setActiveDragId(null);
          }}
        >
          {selectedItemId === table.id && (
            <Pressable
              onPress={() => removeTable(table.id)}
              style={{
                position: "absolute",
                right: -11,
                top: -20,
                zIndex: 50,
                elevation: 50,
                padding: 2,
              }}
            >
              <Ionicons name="close" size={20} color="red" />
            </Pressable>
          )}
          <Image
            source={
              table.kind === "bar"
                ? require("@/assets/images/barcounter/barcounter.png")
                : require("@/assets/images/table/table1.png")
            }
            style={{ width: table.size, height: table.size }}
          />
        </View>
      ))}

      {/* ================= WALLS (BRICKS) ================= */}
      {walls.map((wall) => {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;

        const length = Math.sqrt(dx * dx + dy * dy);

        const bricks = Math.floor(length / BRICK_SIZE);

        return (
          <View key={wall.id}>
            {/* BRICK WALL */}
            <View
              className="absolute overflow-hidden rounded-sm"
              style={{
                ...getSegmentStyle(wall.start, wall.end, wall.thickness),
              }}
            >
              {Array.from({ length: bricks }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    position: "absolute",
                    left: i * BRICK_SIZE,
                    width: BRICK_SIZE - 2,
                    height: wall.thickness,
                    backgroundColor: i % 2 === 0 ? "#c96a3a" : "#b85a33",
                    borderRightWidth: 1,
                    borderColor: "#7a3a1b",
                  }}
                />
              ))}
            </View>
          </View>
        );
      })}

      {/* ================= LIVE PREVIEW ================= */}
      {start && end && (
        <View
          className="absolute overflow-hidden opacity-50"
          style={{
            ...getSegmentStyle(start, end, 18),
          }}
        >
          {Array.from({
            length: Math.floor(
              Math.sqrt(
                Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
              ) / BRICK_SIZE,
            ),
          }).map((_, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: i * BRICK_SIZE,
                width: BRICK_SIZE - 2,
                height: 18,
                backgroundColor: i % 2 === 0 ? "#d07a4a" : "#b85a33",
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
