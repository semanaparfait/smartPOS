import AddCategory from "@/app/(owner)/categories/addCategory";
import ViewCategories from "@/app/(owner)/categories/viewCategories";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function Categories() {
  const [activeTab, setActiveTab] = useState<"add" | "view">("view");

  const categoryTabs = [
    {
      icon: "cube-outline",
      label: "Total Categories",
      value: 12,
      description: "All categories",
      bgClass: "bg-indigo-50",
      iconColor: "#6366f1",
    },
    {
      icon: "checkbox-outline",
      label: "In Stock",
      value: 186,
      description: "Categories in stock",
      bgClass: "bg-emerald-50",
      iconColor: "#10b981",
    },
    {
      icon: "alert-circle-outline",
      label: "Low Stock",
      value: 12,
      description: "Low stock categories",
      bgClass: "bg-orange-50",
      iconColor: "#f97316",
    },
    {
      icon: "wallet-outline",
      label: "Total Product ",
      value: 120000,
      description: "Across all categories",
      bgClass: "bg-blue-50",
      iconColor: "#3b82f6",
    },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      <View className=" p-6 bg-slate-50">
        <View className="flex-row justify-between items-center">
          <View className="pr-4">
            <Text className="text-2xl font-black text-slate-900 mb-1">
              Categories
            </Text>
            <Text className="text-slate-500">
              Manage categories from one place.
            </Text>
          </View>
          <View className="flex-row bg-white rounded-xl border border-slate-200 p-1">
            <TouchableOpacity
              className={`flex-row items-center px-3 py-2 rounded-lg ${
                activeTab === "add" ? "bg-emerald-600" : "bg-transparent"
              }`}
              onPress={() => setActiveTab("add")}
            >
              <Ionicons
                name="add"
                size={18}
                color={activeTab === "add" ? "white" : "#64748b"}
              />
              <Text
                className={`ml-1.5 font-semibold ${
                  activeTab === "add" ? "text-white" : "text-slate-600"
                }`}
              >
                Add
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-row items-center px-3 py-2 rounded-lg ${
                activeTab === "view" ? "bg-emerald-600" : "bg-transparent"
              }`}
              onPress={() => setActiveTab("view")}
            >
              <Ionicons
                name="eye-outline"
                size={18}
                color={activeTab === "view" ? "white" : "#64748b"}
              />
              <Text
                className={`ml-1.5 font-semibold ${
                  activeTab === "view" ? "text-white" : "text-slate-600"
                }`}
              >
                View
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row flex-wrap justify-between items-center w-full gap-3 ">
          {categoryTabs.map((tab) => (
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

      <View className="flex-1">
        {activeTab === "add" ? <AddCategory /> : <ViewCategories />}
      </View>
    </View>
  );
}
