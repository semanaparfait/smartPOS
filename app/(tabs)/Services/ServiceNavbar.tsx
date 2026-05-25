import { View, Text, Image, TextInput } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ServiceNavbar() {
  return (
    <SafeAreaView >
        <View className=" px-4 py-2 bg-white border-b border-gray-200 flex-row items-center justify-between">

      <View>
        <Text className="text-2xl font-bold">Services</Text>
        <Text className="text-sm text-gray-500">
          Manage your service settings and alerts
        </Text>
      </View>
      <View className="flex-row items-center gap-4 mt-4">
        <View className="relative flex-1">
            <Ionicons name="search" size={20} color="#9CA3AF" className="absolute left-3 top-3 hidden" />
          <TextInput
            placeholder="Search services..."
            className="bg-gray-100 text-gray-500 placeholder:text-gray-500 border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </View>
        <View>
            <Ionicons name="notifications" size={20} color="#9CA3AF" />
        </View>
        <View className="flex-row gap-2">
          <Image
            source={{
                uri: "https://i.pinimg.com/736x/f1/19/b0/f119b05a186ca53790dd4eb8ebe4a735.jpg",
            }}
            className="w-10 h-10 rounded-full"
            />
          <View>
            <Text className="text-sm font-medium">John Doe</Text>
            <Text className="text-xs text-gray-500">Waiter</Text>
          </View>
        </View>
        <View className="hidden">
            <Ionicons name="cog" size={20} color="#9CA3AF" />
        </View>
      </View>
            </View>
    </SafeAreaView>
  );
}
