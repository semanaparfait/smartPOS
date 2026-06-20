import { View, Text } from "react-native";
import React from "react";
import { Icon, DollarSign, ShoppingBag, Users, Box } from "lucide-react-native";
// import {HorizontalBarChart} from 'react-native-gifted-charts'
import useOrder from "@/store/Order/Order";

export default function Dashboard() {
  const { orders } = useOrder();
  const DasboardData = [
    {
      id: 1,
      Icon: DollarSign,
      title: "Total Revenue",
      value: "$ 2,000",
      desc: "from yesterday",
      iconColor: "#3b82f6", // Blue
    },
    {
      id: 2,
      Icon: ShoppingBag,
      title: "Total Orders",
      value: "200",
      desc: "from yesterday",
      iconColor: "#10b981",
    },
    {
      id: 3,
      Icon: Users,
      title: "Total Customers",
      value: "150",
      desc: "from yesterday",
      iconColor: "#6366f1",
    },
    {
      id: 4,
      Icon: Box,
      title: "Inventory",
      value: "150",
      desc: "from yesterday",
      iconColor: "#f97316",
    },
  ];
  return (
    <View className=" p-5">
      <View>
        <Text className="font-bold text-lg">Dashboard 👋</Text>
        <Text>Welcome back , Semana ! Here's What's happening Today </Text>
      </View>
      <View className="flex-row flex-wrap items-center justify-between mt-5 w-full gap-y-4">
        {DasboardData.map((item) => (
          <View
            key={item.id}
            className="bg-white flex-row gap-3 border border-slate-100 rounded-2xl p-5 w-[48%] md:w-[23.5%] shadow-sm"
          >
           
            <View className="flex-row items-center gap-3 mb-4">
              <View
                style={{ backgroundColor: item.iconColor + "15" }} 
                className="w-11 h-11 rounded-xl items-center justify-center shrink-0"
              >
                <item.Icon size={20} color={item.iconColor} />
              </View>
            </View>


            <View>
              <Text
                className="text-slate-400 font-bold text-xs tracking-tight flex-1"
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                className="text-2xl font-black text-slate-900 tracking-tight"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {item.value}
              </Text>
              <Text
                className="text-slate-400 text-[11px] font-medium mt-1"
                numberOfLines={1}
              >
                {item.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>
      {/* --------top moving product---------- */}
    </View>
  );
}
