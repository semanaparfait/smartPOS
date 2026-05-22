
import React from "react";
import { Image,  TouchableOpacity, Text } from "react-native";

type kitchenAreaProps = {
  size?: number;
  onPress?: () => void;
  name?: string;
};

export default function KitchenArea({size = 100, onPress, name}: kitchenAreaProps) {


  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} className="items-center">
      <Image
        source={require("@/assets/images/kitchen/kitchennn.png")}
        style={{ width: size, height: 50 }}
      />
      <Text className="font-semibold text-[12px]">{name}</Text>
    </TouchableOpacity>
  );
}

