import { View } from "react-native";
import React from "react";

export default function Wall({ wall }: { wall: { x: number; y: number; width: number; height: number } }) {
  return (
    <View
      style={{
        position: "absolute",
        left: wall.x,
        top: wall.y,
        width: wall.width,
        height: wall.height,
        backgroundColor: "#333",
      }}
    />
  );
}