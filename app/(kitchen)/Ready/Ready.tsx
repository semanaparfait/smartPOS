import React from "react";
import {
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { orders } from "@/seed/KitchenOrder";

export default function Ready() {
  const readyOrders = orders.filter((order) => order.status === "ready");

  return (
    <ScrollView className="flex-1  pt-5 px-3">
      {/* HEADER */}
      <View className="flex-row justify-between items-center  bg-[#2ECC71] py-2 px-2 rounded-md">
        <View>
          <Text className="text-white text-[20px] font-bold">Ready Orders</Text>
          <Text className="text-[#f2f7fe] ">
            Waiting for pickup by waiters
          </Text>
        </View>

        <View className="w-[44px] h-[44px] rounded-full bg-[#22C55E] justify-center items-center">
          <Text className="text-white font-bold text-lg">
            {readyOrders.length}
          </Text>
        </View>
      </View>

      {/* LIST */}
      <FlatList
        data={readyOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View className="bg-[#0B4A26] rounded-[24px] p-4 my-4 border border-[#2ECC71]">
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

              <View className="flex-row gap-1 bg-[#22C55E] px-3 py-1 rounded-full items-center">
                <MaterialCommunityIcons
                  name="bell-ring"
                  size={18}
                  color="#fff"
                />
                <Text className="text-white font-bold text-xs">READY</Text>
              </View>
            </View>

            {/* ITEMS */}
            <View className="mt-4 p-3">
              <Text className="text-white font-bold mb-3">Ready Items</Text>

              {item.items.map((food) => (
                <View
                  key={food.id}
                  className="flex-row items-center mb-3 gap-2"
                >
                  <View className=" justify-center items-center">
                    <Text className="text-white font-bold">
                      {food.quantity}x
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text className="text-white text-[15px] font-semibold">
                      {food.name}
                    </Text>
                  </View>

                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color="#22C55E"
                  />
                </View>
              ))}
            </View>

            {/* ALERT */}
            <View className="flex-row gap-2 bg-[#3F3F1D] p-3 rounded-[14px]  items-center">
              <MaterialCommunityIcons name="alert" size={18} color="#FACC15" />
              <Text className="text-[#FACC15] flex-1 text-[13px]">
                Order is ready! Please pick up immediately.
              </Text>
            </View>

            {/* ACTIONS */}
            <View className="flex-row gap-3 mt-5">
              <TouchableOpacity className="flex-1 bg-[#22C55E] py-3.5 rounded-[16px] flex-row justify-center items-center gap-1.5">
                <MaterialCommunityIcons name="bell" size={18} color="#fff" />
                <Text className="text-white font-bold">
                  Call {item.waitername}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-[2] bg-[#22C55E] py-3.5 rounded-[16px] flex-row justify-center items-center gap-1 hidden">
                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                <Text className="text-white font-bold">Mark Served</Text>
              </TouchableOpacity>
            </View>

            {/* INFO */}
            <View className="flex-row items-center justify-between  mt-3 gap-2 border-t border-[#2ECC71] pt-3 ">
              <View>

              <View className="flex-row gap-1 items-center">
                <MaterialCommunityIcons
                  name="chef-hat"
                  size={18}
                  color="#fff"
                />
                <Text className="text-white font-semibold">
                  {item.chefAssigned}
                </Text>
              </View>
                  <View className="flex-row gap-1 items-center">
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={18}
                color="white"
              />
                <Text className="text-white font-semibold">
                  {item.kitchenStation}
                </Text>
              </View>
              </View>

              <View className="flex-row gap-1 items-center">
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={18}
                  color="#fff"
                />
                <Text className="text-white font-semibold">
                  {item.estimatedPrepTime} mins
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
}
