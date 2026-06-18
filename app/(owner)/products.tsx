import AddProduct from "@/app/(owner)/Products/addProduct";
import ViewProduct from "@/app/(owner)/Products/viewProduct";
import { products } from "@/seed/products";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import UseProduct from "@/store/products/useProduct";


const formatRwf = (amount: number) => `${amount.toLocaleString()} RWF`;

export default function Products() {
  const [activeTab, setActiveTab] = useState<"view" | "add">("view");
  const router = useRouter();
  // const [getProducts] = useProduct()
  const totalStockValue = products.reduce((sum, product) => {
    return sum + product.buyPrice * product.stock;
  }, 0);

  const lowStockCount = products.filter(
    (product) => product.stock <= 25,
  ).length;

  const tabs = [
    {
      icon: "cube-outline",
      label: "Total Products",
      value: products.length,
      description: "All products",
      bgClass: "bg-indigo-50",
      iconColor: "#6366f1",
    },
    {
      icon: "checkbox-outline",
      label: "In Stock",
      value: 186, // Replace with your actual dynamic value calculation
      description: "Products in stock",
      bgClass: "bg-emerald-50",
      iconColor: "#10b981",
    },
    {
      icon: "alert-circle-outline",
      label: "Low Stock",
      value: lowStockCount,
      description: "Low stock products",
      bgClass: "bg-orange-50",
      iconColor: "#f97316",
    },
    {
      icon: "wallet-outline",
      label: "Total Value",
      value: formatRwf(totalStockValue),
      description: "Inventory value",
      bgClass: "bg-blue-50",
      iconColor: "#3b82f6",
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-slate-50 w-full"
      contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
      showsVerticalScrollIndicator={true}
      scrollEnabled={true}
      nestedScrollEnabled={true}
    >
      <View className="p-8">
      
        <View>
          <View className=" ">
            <View className="flex-row flex-wrap gap-3 justify-between items-center w-full md:mb-6">
              <View>
                <Text className="text-2xl font-black text-slate-900 tracking-tight">
                  Products
                </Text>
                <Text className="text-slate-400 font-medium mt-1">
                  Manage all products and inventory
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-4">
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

            <View className="flex-row flex-wrap justify-between items-center w-full gap-3 mb-6">
              {tabs.map((tab) => (
                <View
                  key={tab.label}
                  className="flex-1 min-w-[22%] bg-white border border-slate-100 rounded-md mt-5 p-5 "
                >
                 
                  <View className="flex-row gap-4 items-center">
                    <View
                      style={{ backgroundColor: tab.iconColor + "15" }} 
                      className="w-12 h-12 rounded-xl items-center justify-center shrink-0"
                    >
                      <Ionicons
                        name={tab.icon as any}
                        size={22}
                        color={tab.iconColor}
                      />
                    </View>
                    <View>
                      <Text className="text-slate-400 font-semibold text-xs tracking-tight">
                        {tab.label}
                      </Text>
                      <Text
                        className="text-slate-900 font-black text-xl mt-1 tracking-tight"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {tab.value}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="text-slate-400 text-[11px] font-medium mt-3"
                    numberOfLines={1}
                  >
                    {tab.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View>{activeTab === "view" ? <ViewProduct /> : <AddProduct />}</View>
      </View>
    </ScrollView>
  );
}
