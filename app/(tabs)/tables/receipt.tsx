import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { tr } from "@/i18n";

export default function Receipt() {
  return (
    <SafeAreaView className="  w-[25%] rounded-2xl shadow-sm p-5 ">
      {/* <ScrollView className="p-4"> */}
        <View className="bg-white rounded-2xl shadow-sm p-5">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-5">
            <View>
              <Text className="text-xl font-bold text-slate-900">{tr("Table A5")}</Text>
              <Text className="text-sm text-slate-500 mt-1">{tr("Order #12345")}</Text>
            </View>

            <View className="items-end">
              <View className="flex-row items-center gap-2 mb-1">
                <Ionicons name="ellipse" size={10} color="#dc2626" />
                <Text className="text-red-600 font-medium">{tr("Occupied")}</Text>
              </View>
              <Text className="text-sm text-slate-500">{tr("12:00 PM")}</Text>
            </View>
          </View>

          {/* Divider */}
          <View className="border-t border-dashed border-slate-300 pt-4">
            {/* Table Head */}
            <View className="flex-row justify-between mb-3">
              <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">{tr("Item")}</Text>

              <View className="flex-row gap-8">
                <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">{tr("Qty")}</Text>
                <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">{tr("Price")}</Text>
              </View>
            </View>

            {/* Sample Items */}
            <View className="gap-3">
              <View className="flex-row justify-between">
                <Text className="text-slate-700 font-medium">{tr("Brochette")}</Text>
                <View className="flex-row gap-10">
                  <Text className="text-slate-600">2</Text>
                  <Text className="text-slate-800 font-semibold">6,000</Text>
                </View>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-slate-700 font-medium">{tr("Soda")}</Text>
                <View className="flex-row gap-10">
                  <Text className="text-slate-600">3</Text>
                  <Text className="text-slate-800 font-semibold">3,000</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Summary */}
          <View className="mt-3 border-t border-b border-dashed border-slate-300 py-5 gap-4">
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">{tr("Total Items")}</Text>
              <Text className="text-slate-900 font-bold">5</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">{tr("Subtotal")}</Text>
              <Text className="text-slate-900 font-bold">{tr("9,000 RWF")}</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-medium">{tr("VAT (18%)")}</Text>
              <Text className="text-slate-900 font-bold">{tr("1,620 RWF")}</Text>
            </View>

            <View className="flex-row justify-between pt-2">
              <Text className="text-green-700 font-bold text-xl">{tr("Total")}</Text>
              <Text className="text-green-700 font-bold text-xl">{tr("10,620 RWF")}</Text>
            </View>
          </View>
        </View>
        <View className="flex-row justify-between mt-5 px-1">
          <TouchableOpacity className="bg-white flex-1 mx-1 py-2 rounded-xl border border-slate-200 items-center shadow-sm">
            <View className="bg-green-100 p-1 rounded-full mb-1">
              <Ionicons name="add" size={15} color="#16a34a" />
            </View>
            <Text className="text-sm font-semibold text-slate-700">{tr("Add Item")}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white flex-1 mx-1 py-2 rounded-xl border border-slate150 items-center shadow-sm">
            <View className="bg-red-100 p-1 rounded-full mb-1">
              <Ionicons name="remove" size={15} color="#dc2626" />
            </View>
            <Text className="text-sm font-semibold text-slate-700">{tr("Remove")}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white flex-1 mx-1 py-2 rounded-xl border border-slate-200 items-center shadow-sm">
            <View className="bg-blue-100 p-1 rounded-full mb-1">
              <Ionicons name="print" size={15} color="#2563eb" />
            </View>
            <Text className="text-sm font-semibold text-slate-700">{tr("Print Bill")}</Text>
          </TouchableOpacity>
        </View>

        {/* -------------pay btn----------- */}
        <TouchableOpacity className="w-full mt-6 py-3 bg-green-600 rounded-lg shadow-lg items-center">
          <Text className="text-white font-bold text-lg">{tr("Pay Now")}</Text>
        </TouchableOpacity>
      {/* </ScrollView> */}
      {/* -------------actions-------------- */}
    </SafeAreaView>
  );
}
