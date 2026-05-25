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

export default function Preparing() {
  const preparingOrders = orders.filter(
    (order) => order.status === "preparing",
  );

  return (
    <ScrollView className="flex-1  pt-5 px-3">
      {/* HEADER */}
      <View className="flex-row justify-between items-center mb-5 bg-[#D96B00] py-2 px-3 rounded-md">
        <View>
          <Text className="text-white text-[20px] font-bold">
            Preparing Orders
          </Text>
          <Text className="text-[#94A3B8] ">Kitchen currently cooking</Text>
        </View>

        <View className="w-[44px] h-[44px] rounded-full bg-[#F97316] justify-center items-center">
          <Text className="text-white font-bold text-lg">
            {preparingOrders.length}
          </Text>
        </View>
      </View>

      {/* ORDERS */}
      <FlatList
        data={preparingOrders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View className="bg-[#FF9F43] rounded-[15px] p-4 mb-4 border border-[#D96B00]">
            {/* TOP */}
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-white text-lg font-bold">
                  # {item.orderNumber}
                </Text>
                <Text className="text-[#CBD5E1] mt-1 text-[15px]">
                  Table {item.table.tableNumber}
                </Text>
              </View>

              <View className="flex-row items-center gap-1.5 bg-[#EA580C] px-3.5 py-2.5 rounded-full">
                <MaterialCommunityIcons
                  name="chef-hat"
                  size={18}
                  color="#fff"
                />
                <Text className="text-white text-xs font-bold">PREPARING</Text>
              </View>
            </View>



            {/* ITEMS */}
            <View className="mt-4 p-3">
              <Text className="text-white text-base font-bold mb-3.5">
                Cooking Items
              </Text>

              <ScrollView
                className="max-h-[180px]"
                showsVerticalScrollIndicator={false}
              >
                {item.items.map((food) => (
                  <View
                    key={food.id}
                    className="flex-row justify-between items-center mb-3"
                  >
                    {/* LEFT */}
                    <View className="flex-row gap-3 flex-1">
                      <View className=" justify-center items-center">
                        <Text className="text-white font-bold">
                          {food.quantity}x
                        </Text>
                      </View>

                      <View className="flex-1 justify-center">
                        <Text className="text-white font-semibold text-[15px]">
                          {food.name}
                        </Text>

                        {food.note && (
                          <Text className="text-[#FDA4AF] mt-1 text-[13px]">
                            {food.note}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* ACTIONS */}
            <View className="flex-row gap-3 hidden">
              <TouchableOpacity className="flex-1 bg-[#334155] py-[15px] rounded-[16px] justify-center items-center flex-row gap-2">
                <MaterialCommunityIcons name="pause" size={18} color="#fff" />
                <Text className="text-white font-bold">Pause</Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-[2] bg-[#22C55E] py-[15px] rounded-[16px] justify-center items-center flex-row gap-2">
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color="#fff"
                />
                <Text className="text-white font-bold">Mark as Ready</Text>
              </TouchableOpacity>
            </View>

            {/* TIME + CHEF */}
            <View className="flex-row items-center justify-between  mt-3 gap-2 border-t border-[#D96B00] pt-3">
            {/* STATION */}
            <View className="flex-row items-center gap-2 ">
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={18}
                color="white"
              />
              <Text className="text-white font-semibold">
                {item.kitchenStation}
              </Text>
            </View>

              <View className="flex-row items-center gap-1">
                <MaterialCommunityIcons
                  name="account-tie-hat"
                  size={18}
                  color="#fff"
                />
                <Text className="text-white font-semibold">
                  {item.chefAssigned || "No Chef"}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
}
