import AddCategory from "@/app/(owner)/categories/addCategory";
import ViewCategories from "@/app/(owner)/categories/viewCategories";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function Categories() {
  const [activeTab, setActiveTab] = useState<"add" | "view">("view");

  return (
    <View className="flex-1 bg-slate-50">
      <View className="px-6 pt-6 pb-4 border-b border-slate-200 bg-slate-50">
        <View className="flex-row justify-between items-center">
          <View className="pr-4">
            <Text className="text-3xl font-black text-slate-900 mb-1">
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
      </View>

      <View className="flex-1">
        {activeTab === "add" ? <AddCategory /> : <ViewCategories />}
      </View>
    </View>
  );
}
