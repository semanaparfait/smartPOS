
import React from "react";
import { Image,  TouchableOpacity, Text } from "react-native";

type DoubleDoorProps = {
  size?: number;
  onPress?: () => void;
  name?: string;
};

export default function DoubleDoor({size = 60, onPress, name}: DoubleDoorProps) {


  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} className="items-center">
      <Image
        source={require("@/assets/images/doors/doobledoor.png")}
        style={{ width: size, height: size }}
      />
      <Text className="font-semibold text-[12px]">{name}</Text>
    </TouchableOpacity>
  );
}

