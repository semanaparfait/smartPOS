import { View, Text } from "react-native";
import React, { useState, useEffect } from 'react';
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { orders } from "@/seed/KitchenOrder";

let newOrder = orders.filter((order) => order.status === "new_order");
let preparingOrders = orders.filter((order) => order.status === "preparing");

let readyOrders = orders.filter((order) => order.status === "ready");

let completedOrders = orders.filter((order) => order.status === "served");

export default function KitchNavbar() {
  const [currentTime, setCurrentTime] = useState(new Date());

useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000); 

  return () => clearInterval(timer); 
}, []);


const timeString = currentTime.toLocaleTimeString('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const dateString = currentTime.toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});
  return (
    <View className="h-16 px-5 flex-row items-center justify-between text-white border-b border-gray-700/50">
      <View className="flex-row items-center gap-4">
        <Ionicons name="menu" size={24} color="white" />
        <View className="flex-row gap-3 ">
          <MaterialCommunityIcons name="chef-hat" size={30} color="white" />
          <View>
            <Text className="text-sm font-bold text-white">Main Kitchen</Text>
            <Text className="text-xs text-gray-500">Station 1</Text>
          </View>
          <Ionicons name="chevron-down" size={24} color="white" />
        </View>
      </View>
      {/* ------time-------- */}
      <View className="flex-row items-center gap-2">
        <Ionicons name="time" size={26} color="white" />
        <View>
        <Text className="text-sm font-medium text-white">{timeString}</Text>
        <Text className="text-xs text-gray-500">{dateString}</Text>
        </View>
      </View>
      {/* ---------orders---------- */}
      <View className="flex-row items-center  py-3 px-4 rounded-xl">

        <View className="flex-1 flex-row items-center justify-between border-r border-gray-700/50 pr-4">
          <View>
            <Text className="text-xs font-medium text-gray-400">
              New Orders
            </Text>
            <Text className="text-2xl font-bold text-[#1E6BFA]">
              {newOrder.length}
            </Text>
          </View>
        </View>


        <View className="flex-1 flex-row items-center justify-between border-r border-gray-700/50 px-4">
          <View>
            <Text className="text-xs font-medium text-gray-400">Preparing</Text>
            <Text className="text-2xl font-bold text-[#D96B00]">
              {preparingOrders.length}
            </Text>
          </View>
        </View>


        <View className="flex-1 flex-row items-center justify-between border-r border-gray-700/50 px-4">
          <View>
            <Text className="text-xs font-medium text-gray-400">Ready</Text>
            <Text className="text-2xl font-bold text-[#107C41]">
              {readyOrders.length}
            </Text>
          </View>
        </View>

        <View className="flex-1 flex-row items-center justify-between pl-4">
          <View>
            <Text className="text-xs font-medium text-gray-400">Completed</Text>
            <Text className="text-2xl font-bold text-[#2D3748]">
              {completedOrders.length}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
