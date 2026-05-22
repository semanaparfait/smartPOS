import { MaterialCommunityIcons, Octicons } from "@expo/vector-icons";
import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export type FloorItem = {
  id: string;
  kind: "table" | "bar";

  x: number;
  y: number;

  width: number;
  height: number;

  rotation: number;
};
type CompDetailsProps = {
  item: FloorItem | null;
  onClose: () => void;
};

export default function CompDetails({ item, onClose }: CompDetailsProps) {
  if (!item) {
    return null;
  }

  return (
    <View className="absolute right-0 top-0 bottom-0 w-[280px] bg-[#222222] z-40 border-l border-[#333333]">
      <View>
        <View className="p-4 rounded-lg">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-2xl font-bold">Details</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>
          <Text className="text-gray-400 text-sm font-semibold mb-1">
            Selected component
          </Text>
          <Text className="text-white text-xl font-bold mb-4 capitalize">
            {item.kind}
          </Text>
          <Text className="text-white text-xl font-bold mb-4">Position</Text>

          <Text className="text-gray-400 text-sm font-semibold mb-2">
            Position
          </Text>
          <View className="flex-row items-center space-x-3 mb-4">
            {/* X Input Box */}
            <View className="flex-1 flex-row items-center bg-[#333333] h-11 rounded-xl px-3 space-x-2">
              <Text className="text-gray-500 text-base font-medium">X</Text>
              <TextInput
                keyboardType="numeric"
                value={String(Math.round(item.x))}
                placeholderTextColor="#ffffff"
                className="flex-1 text-white text-base font-medium p-0"
              />
            </View>

            {/* Y Input Box */}
            <View className="flex-1 flex-row items-center bg-[#333333] h-11 rounded-xl px-3 space-x-2">
              <Text className="text-gray-500 text-base font-medium">Y</Text>
              <TextInput
                keyboardType="numeric"
                value={String(Math.round(item.y))}
                placeholderTextColor="#ffffff"
                className="flex-1 text-white text-base font-medium p-0"
              />
            </View>
          </View>

          <Text className="text-gray-400 text-sm font-semibold mb-2">
            Rotation
          </Text>
          <View className="flex-row items-center space-x-3">
            <View className="flex-1 flex-row items-center bg-[#333333] h-11 rounded-xl px-3 space-x-2">
              <MaterialCommunityIcons
                name="angle-obtuse"
                size={18}
                color="#888"
              />
              <TextInput
                keyboardType="numeric"
                value={`${Math.round(item.rotation)}°`}
                placeholderTextColor="#ffffff"
                className="flex-1 text-white text-base font-medium p-0"
              />
            </View>

            {/* Flip & Transform Actions Group */}
            <View className="flex-row bg-[#2a2a2a] p-[2px] rounded-lg flex-1">
              <TouchableOpacity className="flex-1 items-center justify-center py-2">
                <MaterialCommunityIcons
                  name="rotate-right"
                  size={18}
                  color="#888"
                />
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 items-center justify-center py-2">
                <Octicons name="mirror" size={16} color="#888" />
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 items-center justify-center py-2">
                <MaterialCommunityIcons
                  name="flip-vertical"
                  size={18}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="p-4 rounded-lg">
          {/* Header Titles */}
          <Text className="text-white text-xl font-bold mb-3">Layout</Text>
          <Text className="text-gray-400 text-sm font-semibold mb-2">
            Dimensions
          </Text>

          {/* Row Container */}
          <View className="flex-row items-center space-x-3">
            {/* Width Input Box */}
            <View className="flex-1 flex-row items-center bg-[#333333] h-12 rounded-xl px-3 space-x-2">
              <Text className="text-gray-500 text-lg font-medium">W</Text>
              <TextInput
                keyboardType="numeric"
                value={String(Math.round(item.width))}
                placeholderTextColor="#ffffff"
                className="flex-1 text-white text-lg font-medium p-0"
              />
            </View>

            {/* Height Input Box */}
            <View className="flex-1 flex-row items-center bg-[#333333] h-12 rounded-xl px-3 space-x-2">
              <Text className="text-gray-500 text-lg font-medium">H</Text>
              <TextInput
                keyboardType="numeric"
                value={String(Math.round(item.height))}
                placeholderTextColor="#ffffff"
                className="flex-1 text-white text-lg font-medium p-0"
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
