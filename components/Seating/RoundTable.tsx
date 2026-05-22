import React from "react";
import { Image, TouchableOpacity, Text } from "react-native";

type RoundTableProps = {
  size?: number;
  onPress?: () => void;
  name?: string;
};

export default function RoundTable({ size = 100, onPress, name }: RoundTableProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="items-center">
      <Image
        source={require("@/assets/images/table/table1.png")}
        style={{ width: size, height: size }}
      />
      
      <Text className="font-semibold text-[12px]">{name}</Text>
    </TouchableOpacity>
  );
}

