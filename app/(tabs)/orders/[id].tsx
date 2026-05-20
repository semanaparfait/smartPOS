import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { orders, paymentTone } from "@/data/orders-data";

export default function OrderDetailsPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const orderId = Array.isArray(id) ? id[0] : id;

  const selectedOrder = orders.find((order) => order.id === orderId);

  if (!selectedOrder) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] px-6 justify-center">
        <View className="items-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
          <Ionicons name="search-outline" size={48} color="#94A3B8" />
          <Text className="text-xl font-bold text-slate-900 mt-4">
            Order Not Found
          </Text>
          <Text className="text-slate-500 text-center mt-2">
            The requested transaction details are unavailable.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 bg-slate-900 px-8 py-3 rounded-xl"
          >
            <Text className="text-white font-bold">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* HEADER */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-100 bg-white">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">
          Transaction Details
        </Text>
        <Pressable className="p-2">
          <Ionicons name="share-outline" size={22} color="#1E293B" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24 }}
      >
        {/* MAIN RECEIPT CARD */}
        <View className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          {/* STATUS BANNER */}
          <View
            className="py-3 items-center"
            style={{
              backgroundColor: paymentTone[selectedOrder.payment].bg + "40",
            }} // Lower opacity
          >
            <Text
              className="text-[10px] font-black uppercase tracking-[2px]"
              style={{ color: paymentTone[selectedOrder.payment].text }}
            >
              {selectedOrder.payment} Transaction
            </Text>
          </View>

          <View className="p-6">
            {/* ORDER ID & DATE */}
            <View className="flex-row justify-between items-start mb-8">
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Reference No.
                </Text>
                <Text className="text-xl font-black text-slate-900 mt-1">
                  #{selectedOrder.id}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Date & Time
                </Text>
                <Text className="text-sm font-bold text-slate-700 mt-1">
                  {selectedOrder.time}
                </Text>
              </View>
            </View>

            {/* CUSTOMER & CASHIER INFO */}
            <View className="flex-row gap-4 mb-8">
              <View className="flex-1 bg-slate-50 p-4 rounded-2xl">
                <Text className="text-[9px] font-bold text-slate-400 uppercase mb-1">
                  Customer
                </Text>
                <Text className="text-sm font-bold text-slate-800">
                  {selectedOrder.customer}
                </Text>
              </View>
              <View className="flex-1 bg-slate-50 p-4 rounded-2xl">
                <Text className="text-[9px] font-bold text-slate-400 uppercase mb-1">
                  Served By
                </Text>
                <Text className="text-sm font-bold text-slate-800">
                  {selectedOrder.takenBy || "System"}
                </Text>
              </View>
            </View>

            {/* ITEM LIST SECTION */}
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Order Summary
            </Text>
            <View className="border-t border-b border-slate-50 py-2">
              {selectedOrder.purchasedItems.map((item, index) => (
                <View key={index} className="flex-row justify-between py-3">
                  <View className="flex-row">
                    <Text className="font-bold text-slate-800 w-8">
                      {item.qty}x
                    </Text>
                    <Text className="font-medium text-slate-600">
                      {item.name}
                    </Text>
                  </View>
                  <Text className="font-bold text-slate-900">
                    Items: {item.qty}
                  </Text>
                </View>
              ))}
            </View>

            {/* TOTAL AMOUNT */}
            <View className="mt-6 flex-row justify-between items-center bg-teal-50 p-5 rounded-2xl border border-teal-100">
              <Text className="text-teal-700 font-bold">Total Paid</Text>
              <Text className="text-2xl font-black text-teal-900">
                {selectedOrder.total.toLocaleString()} RWF
              </Text>
            </View>

            {/* QR CODE SECTION */}
            <View className="mt-10 items-center border-t border-dashed border-slate-200 pt-8">
              <View className="p-4 bg-white border border-slate-100 shadow-sm rounded-3xl">
                {/* Replace with actual QR Component like react-native-qrcode-svg later */}
                <Ionicons name="qr-code" size={120} color="#0F172A" />
              </View>
              <Text className="text-[10px] font-bold text-slate-400 uppercase mt-4 tracking-[3px]">
                Scan to Verify Transaction
              </Text>
            </View>
          </View>

          {/* DECORATIVE BOTTOM NOTCH */}
          <View className="h-2 bg-slate-900" />
        </View>

        {/* PRINT BUTTON */}
        <Pressable className="mt-8 bg-slate-900 flex-row items-center justify-center py-4 rounded-2xl shadow-lg active:opacity-90">
          <Ionicons name="print-outline" size={20} color="white" />
          <Text className="text-white font-bold ml-2">Print Receipt</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
