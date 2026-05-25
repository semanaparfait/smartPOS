import React from "react";
import {
  FlatList,
  ScrollView,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { orders } from "@/seed/KitchenOrder";

export default function Served() {
  const servedOrders = orders.filter(
    (order) => order.status === "served"
  );

  return (
    <ScrollView className="flex-1  pt-5 px-3">
      {/* HEADER */}
      <View className="flex-row justify-between mb-5 bg-[#111827] py-2 px-3 rounded-md">
        <View>
          <Text className="text-white text-[20px] font-bold">Served Orders</Text>
          <Text className="text-[#94A3B8] mt-1">
            Completed & delivered orders history
          </Text>
        </View>

        <View className="w-11 h-11 rounded-full bg-[#64748B] justify-center items-center">
          <Text className="text-white font-bold text-lg">
            {servedOrders.length}
          </Text>
        </View>
      </View>

      {/* LIST */}
      <FlatList
        data={servedOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View className="bg-[#111827] rounded-[24px] p-4 mb-4 border border-[#2D3748]">
            {/* TOP */}
            <View className="flex-row justify-between">
              <View>
                <Text className="text-white text-xl font-bold">
                  # {item.orderNumber}
                </Text>
                <Text className="text-[#CBD5E1] mt-1">
                  Table {item.table.tableNumber}
                </Text>
              </View>

              <View className="flex-row gap-1 bg-[#64748B] px-3 py-2 rounded-full items-center">
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color="#fff"
                />
                <Text className="text-white font-bold text-xs">
                  SERVED
                </Text>
              </View>
            </View>

            {/* TIMELINE */}
            <View className="mt-4 bg-[#111827] p-3 rounded-[16px]">
              <View className="flex-row items-center gap-2 mb-2">
                <MaterialCommunityIcons
                  name="clock-plus-outline"
                  size={16}
                  color="#94A3B8"
                />
                <Text className="text-[#94A3B8] text-[13px]">
                  Created: {new Date(item.createdAt).toLocaleTimeString()}
                </Text>
              </View>

              <View className="flex-row items-center gap-2 mb-2">
                <MaterialCommunityIcons
                  name="chef-hat"
                  size={16}
                  color="#94A3B8"
                />
                <Text className="text-[#94A3B8] text-[13px]">
                  Ready: {item.readyAt ? new Date(item.readyAt).toLocaleTimeString() : "N/A"}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons
                  name="silverware-fork-knife"
                  size={16}
                  color="#94A3B8"
                />
                <Text className="text-[#94A3B8] text-[13px]">
                  Served: {item.servedAt ? new Date(item.servedAt).toLocaleTimeString() : "N/A"}
                </Text>
              </View>
            </View>

            {/* ITEMS */}
            <View className="mt-4 bg-[#0B1220] p-3 rounded-[16px]">
              <Text className="text-white font-bold mb-3">
                Delivered Items
              </Text>

              {item.items.map((food) => (
                <View key={food.id} className="flex-row items-center gap-2 mb-3">
                  <View className=" justify-center items-center">
                    <Text className="text-white font-bold">
                      {food.quantity}x
                    </Text>
                  </View>

                  <Text className="text-white text-[15px] font-semibold flex-1">
                    {food.name}
                  </Text>

                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={20}
                    color="#22C55E"
                  />
                </View>
              ))}
            </View>

            {/* FOOTER SUMMARY */}
            <View className="flex-row justify-between mt-4.5 bg-[#111827] p-3 rounded-[16px]">
              <View className="items-center">
                <Text className="text-[#94A3B8] text-xs">
                  Status
                </Text>
                <Text className="text-white font-bold mt-1">
                  COMPLETED
                </Text>
              </View>

              <View className="items-center">
                <Text className="text-[#94A3B8] text-xs">
                  Table
                </Text>
                <Text className="text-white font-bold mt-1">
                  {item.table.tableNumber}
                </Text>
              </View>

              <View className="items-center">
                <Text className="text-[#94A3B8] text-xs">
                  Waiter
                </Text>
                <Text className="text-white font-bold mt-1">
                  {item.waiter.name}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
}