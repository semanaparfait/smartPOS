
import React from "react";
import { Image,  TouchableOpacity, Text } from "react-native";

type RestRoomProps = {
  size?: number;
  onPress?: () => void;
  name?: string;
};

export default function RestRoom({size = 100, onPress, name}: RestRoomProps) {


  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} className="items-center">
      <Image
        source={require("@/assets/images/toilet/toilet.png")}
        style={{ width: size, height: size }}
      />
      <Text className="font-semibold text-[12px]">{name}</Text>
    </TouchableOpacity>
  );
}

