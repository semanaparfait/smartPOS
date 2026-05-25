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

export default function NewOrder() {
  const newOrders = orders.filter(
    (order) => order.status === "new_order"
  );

  return (
    <ScrollView className="flex-1  px-3 pt-5">
      {/* HEADER */}
      <View className="flex-row justify-between items-center  bg-[#1752C7] py-2 px-2 rounded-md">
        <View>
          <Text className="text-white text-[20px] font-bold">New Orders</Text>
          <Text className="text-[#CBD5E1]">Waiting for preparation</Text>
        </View>

        <View className="w-[44px] h-[44px]  rounded-full bg-[#2b62d0] justify-center items-center">
          <Text className="text-white text-lg font-bold">{newOrders.length}</Text>
        </View>
      </View>

      {/* ORDER LIST */}
      <FlatList
        data={newOrders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            className="bg-[#164399] rounded-[15px] p-4  my-4 border border-[#2b62d0]"
          >
            {/* TOP */}
            <View className="flex-row justify-between items-center ">
              <View>
                <Text className="text-white font-medium text-lg">
                  # {item.orderNumber}
                </Text>
                <Text className="text-[#CBD5E1] mt-1 text-[15px]">
                  Table {item.table.tableNumber}
                </Text>
              </View>

              <View className="">
                <Text className="text-white font-bold text-xs">10: 24 AM</Text>

              </View>
            </View>



            {/* ITEMS */}
            <View className="mt-2  rounded-[18px] p-3 ">
              <Text className="text-white text-base font-bold mb-2">Items</Text>

              <ScrollView
                className="max-h-[180px]"
                showsVerticalScrollIndicator={false}
              >
                {item.items.map((food) => (
                  <View key={food.id} className="flex-row items-start mb-3 gap-3">
                    <View className=" justify-center items-center">
                      <Text className="text-white font-bold">
                        {food.quantity}x
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text className="text-white text-[15px] font-semibold">
                        {food.name}
                      </Text>

                      {food.note && (
                        <Text className="text-[#FCA5A5] mt-1 text-[13px]">
                          {food.note}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* NOTES */}
            {item.notes && (
              <View className="flex-row items-center gap-2 mb-4 bg-[#3F1D1D] p-3 rounded-[14px]">
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={18}
                  color="#FACC15"
                />
                <Text className="text-[#FDE68A] flex-1 text-[13px]">
                  {item.notes}
                </Text>
              </View>
            )}

            {/* ACTIONS */}
            <View className="flex-row gap-3 ">

              <TouchableOpacity className="flex-[2]  bg-[#3B82F6] py-[15px] rounded-[10px] justify-center items-center">
                <Text className="text-white font-bold text-[15px]">
                  Start Preparing
                </Text>
              </TouchableOpacity>
            </View>
            {/* INFO */}
            <View className="flex-row items-center justify-between  mt-3 gap-2 border-t border-[#2b62d0] pt-3">
              <View className="flex-row items-center   gap-1">
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={18}
                  color="#fff"
                />
                <Text className="text-white font-semibold">
                  {item.estimatedPrepTime} mins
                </Text>
              </View>

              <View className="flex-row items-center  gap-1.5">
                <MaterialCommunityIcons
                  name="account-outline"
                  size={18}
                  color="#fff"
                />
                <Text className="text-white font-semibold">
                  {item.waiter.name}
                </Text>
              </View>

            </View>
          </TouchableOpacity>
        )}
      />
    </ScrollView>
  );
}