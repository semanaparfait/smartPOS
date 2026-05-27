import { View, Text, Image, TouchableOpacity } from "react-native";
import React from "react";
import { services, Service } from "@/seed/services";
import {
  CalendarDays,
  CalendarPlus,
  Flame,
  Users,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react-native";

export default function Aside() {
  const generateNotifications = (data: Service[]) => {
    return data
      .filter((item) => item.status !== "Available")
      .map((item) => {
        let text = "";
        let icon = Info;
        let iconColor = "#3b82f6";
        let iconBg = "bg-blue-50";

        switch (item.status) {
          case "Maintenance":
            text = `${item.service_name} needs urgent cleaning / checkup`;
            icon = AlertTriangle;
            iconColor = "#d97706";
            iconBg = "bg-amber-50";
            break;

          case "Occupied":
            text = `${item.customer || "Guest"} in ${item.service_name} requested room service`;
            icon = Info;
            iconColor = "#6366f1";
            iconBg = "bg-purple-50";
            break;

          case "Reserved":
            text = `${item.service_name} booking for ${item.customer || "client"} starts soon`;
            icon = CheckCircle2;
            iconColor = "#22c55e";
            iconBg = "bg-emerald-50";
            break;

          default:
            text = `Update on ${item.service_name}`;
        }

        const minutesAgo =
          item.id === "2"
            ? "10 min ago"
            : item.id === "3"
              ? "15 min ago"
              : "25 min ago";

        return {
          id: item.id,
          text,
          time: minutesAgo,
          icon,
          iconBg,
          iconColor,
        };
      })
      .slice(0, 4);
  };

  const notifications = generateNotifications(services);
  return (
    <View>
      {/* <-------todays summary-------> */}
      <View className="border border-gray-200 rounded-lg ">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold px-4 py-2 ">
            Today's Summary
          </Text>
          <Text className="text-sm text-green-500 px-4 py-2">View Report</Text>
        </View>
        <View className="flex-row ">
          <View className="py-2 px-3 gap-3">
            <View className="flex-row items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg ">
              <View className="bg-green-900 rounded-full w-10 h-10 flex items-center justify-center">
                <CalendarDays size={18} color="white" />
              </View>
              <View>
                <Text className="text-lg font-bold">{services.length}</Text>
                <Text className="text-sm text-gray-500">Total Services</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg ">
              <View className="bg-[#1e3a8a] rounded-full w-10 h-10 flex items-center justify-center">
                <CalendarPlus size={18} color="white" />
              </View>
              <View>
                <Text className="text-lg font-bold">
                  {services.filter((s) => s.status === "Available").length}
                </Text>
                <Text className="text-sm text-gray-500">Available</Text>
              </View>
            </View>
          </View>
          <View className="py-2 px-3 gap-3">
            <View className="flex-row items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg">
              <View className="bg-red-900 rounded-full w-10 h-10 flex items-center justify-center">
                <Flame size={18} color="white" />
              </View>
              <View>
                <Text className="text-lg font-bold">
                  {services.filter((s) => s.status === "Reserved").length}
                </Text>
                <Text className="text-sm text-gray-500">Reserved</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg">
              <View className="bg-purple-900 rounded-full w-10 h-10 flex items-center justify-center">
                <Users size={18} color="white" />
              </View>
              <View>
                <Text className="text-lg font-bold">
                  {services.filter((s) => s.status === "Occupied").length}
                </Text>
                <Text className="text-sm text-gray-500">Occupied</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      {/* -----------active bookings---------------- */}
      <View className="border border-gray-200 rounded-lg my-3 ">
        <View className="flex-row items-center justify-between border-b border-gray-200 py-2">
          <Text className="text-base font-bold px-4 py-2 ">
            Active Bookings
          </Text>
          <Text className="text-sm text-green-500 px-4 py-2">View All</Text>
        </View>

        <View className="px-2">
          {services.slice(0, 5).map((service) => (
            <View
              key={service.id}
              className="border-b border-gray-200 px-4 py-2 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <Image
                  source={{ uri: service.imageUrl }}
                  className="w-11 h-11 rounded-lg"
                />
                <View>
                  <Text className="text-base font-bold">
                    {service.service_name}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {service.capacity} People
                  </Text>
                </View>
              </View>
              <View>
                <Text className=" font-medium">
                  {new Date(service.created_at).toLocaleTimeString()}
                </Text>
                <Text
                  className="text-sm  rounded-lg  text-white font-semibold"
                  style={{
                    color:
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
            </View>
          ))}
        </View>
      </View>
      {/* -------------alets---------------- */}
      <View className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden m-4">
        <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <Text className="text-base font-bold text-slate-800">
            Alerts & Notifications
          </Text>
          <TouchableOpacity activeOpacity={0.6}>
            <Text className="text-sm font-bold text-indigo-600">View All</Text>
          </TouchableOpacity>
        </View>

        <View className="px-5 py-2">
          {notifications.map((item) => {
            const IconComponent = item.icon;
            return (
              <View
                key={item.id}
                className="flex-row items-center justify-between py-3.5 border-b border-slate-50 last:border-b-0"
              >
                <View className="flex-row items-center flex-1 pr-4">
                  <View
                    className={`${item.iconBg} w-9 h-9 rounded-full items-center justify-center mr-3.5`}
                  >
                    <IconComponent size={18} color={item.iconColor} />
                  </View>
                  <Text
                    className="text-sm font-medium text-slate-700 flex-1 leading-5"
                    numberOfLines={1}
                  >
                    {item.text}
                  </Text>
                </View>

                <Text className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                  {item.time}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
