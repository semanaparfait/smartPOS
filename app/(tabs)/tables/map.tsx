import React from "react";
import { Image, View } from "react-native";

export default function Map() {
  return (
    <View className="w-full  overflow-hidden rounded-lg">
      <Image
        source={require("@/assets/images/map.png")}
        className="w-full h-full"
        resizeMode="contain"
      />
    </View>
  );
}
