import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { services } from "@/seed/services";

export default function Services() {
  return (
    <SafeAreaView className=" flex-1 border border-gray-200 rounded-md ">
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row items-center gap-6 px-6  "
      >
        {services.map((service) => (
          <View
            key={service.id}
            className="bg-white rounded-lg shadow p-4 mb-4 w-72"
          >
            <Image
              source={{ uri: service.imageUrl }}
              className="w-full h-40 object-cover rounded-lg mb-2 relative"
            />
            <Text className="text-lg font-semibold border-b border-gray-200 py-2">
              {service.service_name}
            </Text>
            <View className="flex-row justify-between items-center mt-2 px-6 border-b border-gray-200 py-2">
              <View>
                <Text className="text-gray-300">Units</Text>
                <Text className="font-bold">2</Text>
              </View>
              <View>
                <Text className="text-gray-300">capacity</Text>
                <Text className="font-bold">{service.capacity} people</Text>
              </View>
            </View>
            <View className="flex-row  items-center mt-2 px-6  py-2">
              <Text className="text-lg font-bold">₦{service.price} </Text>
              <Text className="text-gray-500">/ {service.pricing_type}</Text>
            </View>
            <View>
              <TouchableOpacity className="bg-blue-500 text-white py-2 px-4 rounded-lg mt-4">
                <Text className="text-center text-white font-medium">
                  View Units
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="text-gray-500 hidden">{service.description}</Text>
            <Text
              className="text-sm mt-2 absolute px-3 py-1 rounded-lg right-5 text-white font-semibold"
              style={{
                backgroundColor:
                  service.status === "Available"
                    ? "#22c55e"
                    : service.status === "Occupied"
                      ? "#ef4444"
                      : service.status === "Reserved"
                        ? "#3b82f6"
                        : "#f59e0b",
              }}
            >
              {service.status}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
