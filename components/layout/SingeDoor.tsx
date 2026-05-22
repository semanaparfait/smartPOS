
import React from "react";
import { Image,  TouchableOpacity, Text } from "react-native";

type SingleDoorProps = {
  size?: number;
  onPress?: () => void;
  name?: string;
};

export default function SingleDoor({size = 50, onPress, name}: SingleDoorProps) {


  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} className="items-center">
      <Image
        source={require("@/assets/images/doors/singledoor.png")}
        style={{ width: size, height: size }}
      />
      <Text className="font-semibold text-[12px]">{name}</Text>
    </TouchableOpacity>
  );
}

