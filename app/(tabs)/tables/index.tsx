import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Receipt from "@/app/(tabs)/tables/receipt";
import Map from "./WorkersView";

export default function index() {
  const now = new Date();

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayName = days[now.getDay()];
  const date = now.getDate();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();

  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;
  const hoursStr = hours.toString().padStart(2, "0");

  const formattedDate = `${dayName}, ${date} ${monthName} ${year} ${hoursStr}:${minutes} ${ampm}`;

  const tables = [
    { label: "All Tables", value: 24, color: "#111827" },
    { label: "Available", value: 9, color: "#16a34a" },
    { label: "Occupied", value: 15, color: "#dc2626" },
    { label: "Reserved", value: 5, color: "#2563eb" },
    { label: " Cleaning", value: 3, color: "#f59e0b" },
  ];
  return (
    <SafeAreaView className="h-full ">
      <ScrollView>

      <View className="flex-row items-center justify-between px-4  bg-gray-100 rounded-lg mb-4">
        <View>
          <Text className="text-xl font-bold">Floor Plan</Text>
          <Text className="text-sm text-gray-500 mb-2">
            Tap on a table to view details
          </Text>
        </View>
        <View></View>
        <View className="flex-row items-center gap-4">
          <Text>{formattedDate}</Text> 
          <View className="flex-row items-center ">
            <Ionicons name="wifi" size={20} color="#15803d" />
            <Text className="font-semibold text-green-700"> Online</Text>
          </View>
          <TouchableOpacity className="p-1 rounded-lg bg-gray-100 border border-gray-300">
            <Ionicons name="notifications-outline" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row gap-2">
            <img
              src="https://i.pinimg.com/736x/f7/41/7e/f7417ef3aa9e82c123ea2f0abb21e48c.jpg"
              alt=""
              className="rounded-full w-10"
            />
            <View>
              <Text className=" font-semibold">SEMANA SHEMA Parfait</Text>
              <Text className="text-xs text-gray-400">Manager</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <View className="flex-row px-4 gap-4">
        <View className=" w-[75%]">

        <View className="flex-row flex-wrap -mx-2 ">
          {tables.map((table) => (
            <View key={table.label} className="px-2 mb-4 ">
              <View className="bg-white rounded-lg shadow px-5 py-2 rounded-tl-3xl ">
                <Text
                  className="text-lg font-semibold "
                  style={{ color: table.color }}
                  >
                  {table.label}
                </Text>

                <Text
                  style={{ color: table.color }}
                  className="text-xl font-bold"
                  >
                  {table.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
        {/* -----------map of the restaurant floor plan---------------- */}
        <View className=" bg-white rounded-lg shadow p-4 w-full">
          <Map />
        </View>
        </View>
      {/* ------------reciept of the active table------------ */}
          {/* <View> */}
            <Receipt />
          {/* </View> */}
      </View>
      {/* ----------3d map design of bar------- */}
                  </ScrollView>
    </SafeAreaView>
  );
}
