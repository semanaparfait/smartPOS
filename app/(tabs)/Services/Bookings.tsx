import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  FlatList,
  Image,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Calendar, ChevronDown, SlidersHorizontal } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { services } from "@/seed/services";

export default function Bookings() {
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const formatDate = (date: Date) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleConfirm = (date: Date) => {
    setSelectedDate(date);
    setDatePickerVisibility(false);
  };
  return (
    <View className="border border-gray-200 rounded-md">
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-200">
        <Text className="text-lg font-bold px-4 py-2 ">Active Bookings</Text>
        <View className="flex-row items-center p-4 ">
          {/* 1. Date Picker Button */}
          <TouchableOpacity
            className="flex-row items-center border border-slate-200 rounded-xl py-2 px-3  mr-3 "
            onPress={() => setDatePickerVisibility(true)}
            activeOpacity={0.7}
          >
            <Calendar size={18} color="#4A5568" className="mr-2" />
            <Text className="text-sm font-medium text-slate-800">
              {formatDate(selectedDate)}
            </Text>
            <ChevronDown size={16} color="#4A5568" className="ml-3" />
          </TouchableOpacity>

          {/* 2. Filter Button */}
          <TouchableOpacity
            className="flex-row items-center border border-slate-200 rounded-xl py-2 px-3  "
            onPress={() => console.log("Filter pressed")}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={16} color="#4A5568" className="mr-2" />
            <Text className="text-sm font-medium text-slate-800">Filter</Text>
          </TouchableOpacity>

          {/* Hidden Date Picker Modal */}
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            date={selectedDate}
            onConfirm={handleConfirm}
            onCancel={() => setDatePickerVisibility(false)}
          />
        </View>
      </View>
      <View className="flex-row gap-3 py-4">
        {[
          "All services",
          ...new Set(services.map((service) => service.status)),
        ].map((status) => {
          const statusColor =
            status === "Available"
              ? "#22c55e"
              : status === "Occupied"
                ? "#ef4444"
                : status === "Reserved"
                  ? "#3b82f6"
                  : status === "Maintenance"
                    ? "#f59e0b"
                    : "#6366f1";

          const count =
            status === "All services"
              ? services.length
              : services.filter((service) => service.status === status).length;

          return (
            <View key={status} className="flex-row items-center px-4 py-2  ">
              {/* Bullet Point */}
              <View
                style={{ backgroundColor: statusColor }}
                className="w-3 h-3 rounded-full mr-2"
              />

              {/* Status Name */}
              <Text className="text-black font-semibold mr-2">{status}</Text>
            </View>
          );
        })}
      </View>
      {/* ----------table--------- */}
      <View>
        {/* HEADER */}
        <View className="flex-row bg-gray-100 px-4 py-3 border-b border-gray-300">
          <Text className="flex-1 font-bold">Service</Text>
          <Text className="flex-1 font-bold">Customer</Text>
          <Text className="flex-1 font-bold">Time</Text>
          <Text className="flex-1 font-bold">Duration</Text>
          <Text className="flex-1 font-bold">Amount</Text>
          <Text className="flex-1 font-bold">Status</Text>
          <Text className="flex-1 font-bold hidden">Action</Text>
        </View>

        {/* BODY */}
        <FlatList
          data={services.slice(0, 5)}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const time = new Date(item.created_at).toLocaleTimeString();
            const date = new Date(item.created_at).toLocaleDateString();

            return (
              <View className="flex-row px-4 py-3 border-b border-gray-200 items-center">
                <View className="flex-1 flex-row items-center">
                  <Image
                    source={{ uri: item.imageUrl }}
                    className="w-10 h-10 rounded-md mr-2"
                  />
                  <Text>{item.service_name.split(" ").join("\n")}</Text>
                </View>

                <Text className="flex-1">{item.customer}</Text>
                <View className="flex-1">
                  <Text className="text-xs font-medium">{time}</Text>
                  <Text className="text-xs text-gray-500">{date}</Text>
                </View>

                <Text className="flex-1">{item.pricing_type}</Text>

                <Text className="flex-1 font-medium">{item.price} RWF</Text>

                <Text className="flex-1">
                  {item.status === "Available" ? (
                    <View className="bg-green-100 px-2 py-1 rounded-full">
                      <Text className="text-xs font-bold text-green-600">
                        {item.status}
                      </Text>
                    </View>
                  ) : (
                    <Text>
                      {item.status === "Occupied" ? (
                        <View className="bg-red-100 px-2 py-1 rounded-full">
                          <Text className="text-xs font-bold text-red-600">
                            {item.status}
                          </Text>
                        </View>
                      ) : (
                        <View className="bg-yellow-100 px-2 py-1 rounded-full">
                          <Text className="text-xs font-bold text-yellow-600">
                            {item.status}
                          </Text>
                        </View>
                      )}
                    </Text>
                  )}
                </Text>

                {/* ACTION */}
                <Text className="flex-1 text-blue-500 hidden">Actions</Text>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}
