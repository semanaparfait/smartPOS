import React, { useState } from "react";
import { View } from "react-native";


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

const BRICK_SIZE = 14;

export default function FloorGrid() {
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [walls, setWalls] = useState<Wall[]>([]);

  const getPoint = (e: any): Point => {
    const { locationX, locationY } = e.nativeEvent;

    return {
      x: locationX,
      y: locationY,
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
      className="flex-1 bg-[#f8f8f8] relative"
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        const p = getPoint(e);
        setStart(p);
        setEnd(p);
      }}
      onResponderMove={(e) => {
        setEnd(getPoint(e));
      }}
      onResponderRelease={() => {
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
