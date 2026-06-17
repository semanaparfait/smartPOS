import AddProduct from "@/app/(owner)/Products/addProduct";
import ViewProduct from "@/app/(owner)/Products/viewProduct";
import { products } from "@/seed/products";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const formatRwf = (amount: number) => `${amount.toLocaleString()} RWF`;

export default function Products() {
  const [activeTab, setActiveTab] = useState<"view" | "add">("view");
  const router = useRouter();
  console.log("Products in Dashboard:", products); // Debugging log
  const totalStockValue = products.reduce((sum, product) => {
    return sum + product.buyPrice * product.stock;
  }, 0);

  const lowStockCount = products.filter(
    (product) => product.stock <= 25,
  ).length;

  return (
    <ScrollView
      className="flex-1 bg-slate-50 w-full"
      contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
      showsVerticalScrollIndicator={true}
      scrollEnabled={true}
      nestedScrollEnabled={true}
    >
      <View className="p-8">
        {/* TOP OVERVIEW CARD */}
        <View className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 mb-8">
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-3xl font-black text-slate-900 tracking-tight">
                Inventory Insight
              </Text>
              <Text className="text-slate-400 font-medium mt-1">
                Real-time status of your product catalog
              </Text>
            </View>
            <View className="flex-row ">
              <TouchableOpacity
                className={`px-6 py-3 rounded-l-xl flex-row items-center ${
                  activeTab === "view"
                    ? "bg-emerald-600 shadow-md shadow-emerald-200"
                    : "shadow-md shadow-slate-200"
                }`}
                onPress={() => setActiveTab("view")}
              >
                <Ionicons
                  name="eye"
                  size={20}
                  color={activeTab === "view" ? "white" : "#047857"}
                />
                <Text
                  className={`font-bold ml-2 ${activeTab === "view" ? "text-white" : "text-emerald-700"}`}
                >
                  View Products
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-6 py-3 rounded-r-xl flex-row items-center  ${
                  activeTab === "add"
                    ? "bg-emerald-600 shadow-md shadow-emerald-200"
                    : "shadow-md shadow-slate-200"
                }`}
                onPress={() => setActiveTab("add")}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={activeTab === "add" ? "white" : "#047857"}
                />
                <Text
                  className={`font-bold ml-2 ${activeTab === "add" ? "text-white" : "text-emerald-700"}`}
                >
                  New Product
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* STATS GRID */}
          <View className="flex-row space-x-4">
            <View className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <View className="bg-emerald-100 w-10 h-10 rounded-xl items-center justify-center mb-4">
                <Ionicons name="cube" size={20} color="#059669" />
              </View>
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Total SKUs
              </Text>
              <Text className="text-3xl font-black text-slate-900 mt-1">
                {products.length}
              </Text>
            </View>

            <View className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <View className="bg-amber-100 w-10 h-10 rounded-xl items-center justify-center mb-4">
                <Ionicons name="warning" size={20} color="#D97706" />
              </View>
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Low Stock
              </Text>
              <Text className="text-3xl font-black text-slate-900 mt-1">
                {lowStockCount}
              </Text>
            </View>

            <View className="flex-1 bg-slate-900 p-6 rounded-3xl">
              <View className="bg-slate-800 w-10 h-10 rounded-xl items-center justify-center mb-4">
                <Ionicons name="stats-chart" size={20} color="#10B981" />
              </View>
              <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Asset Value
              </Text>
              <Text className="text-xl font-black text-white mt-1">
                {formatRwf(totalStockValue)}
              </Text>
            </View>
          </View>
        </View>

        <View>{activeTab === "view" ? <ViewProduct /> : <AddProduct />}</View>
      </View>
    </ScrollView>
  );
}
