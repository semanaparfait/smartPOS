import ViewRole from "@/app/(owner)/workers/roles/ViewRole";
import ViewUsers from "@/app/(owner)/workers/employees/ViewUsers";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CreditCard,
  Users,
} from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";

export default function Workers() {
  const workersData = [
    {
      icon: Users,
      title: "Total Employees",
      value: 25,
    },
    {
      icon: BriefcaseBusiness,
      title: "Total Role",
      value: 20,
    },
    {
      icon: BadgeDollarSign,
      title: "Total Payroll",
      value: 15000000,
    },
    {
      icon: CreditCard,
      title: "Upcoming Payments",
      value: 5,
    },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-50 px-5 pt-4">
      <View className="flex-row justify-between items-center mb-2 gap-4">
        {workersData.map((item, index) => (
          <View
            key={index}
            className="bg-white gap-2 p-4 rounded-2xl mb-4 flex-row items-center shadow-sm border border-slate-100"
          >
            <View className="p-3 rounded-full bg-green-300">
              <item.icon size={20} color="green" />
            </View>
            <View className="ml-4">
              <Text className="text-sm text-slate-500 font-medium">
                {item.title}
              </Text>
              <Text className="text-lg font-bold text-slate-800">
                {item.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <ViewRole />

      {/* Search Bar */}

      {/* User List */}
      <ViewUsers />
    </ScrollView>
  );
}
