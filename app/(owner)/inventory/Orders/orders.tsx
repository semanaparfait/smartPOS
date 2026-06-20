// import { orders } from "@/seed/orders";
import React, { useMemo, useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import useOrder from "@/store/Order/Order";

import { useRouter } from "expo-router";



export default function Orders() {
  const { orders, fetchOrders, fetchOrderById } = useOrder();
  const router = useRouter();

  useEffect(() => {
    const fetchAllOrders = async () => {
      try {
        await fetchOrders();
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };
    fetchAllOrders();
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="p-6">
        <Text className="text-3xl font-black text-slate-900">Orders</Text>
        <Text className="text-slate-500 mt-1 mb-4">
          Track all transactions and current order status.
        </Text>

        <View className="bg-white border border-slate-100 rounded-lg p-4 mb-5">
          <Text className="text-slate-900 font-black text-lg mb-3">
            Today Summary
          </Text>
          <View className="flex-row flex-wrap -mx-1">
            <View className="w-1/2 px-1 mb-2">
              <View className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <Text className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  Orders
                </Text>
                <Text className="text-slate-900 text-base font-black mt-1">
                  {Object.keys(orders).length}
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1 mb-2">
              <View className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <Text className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  Revenue
                </Text>
                <Text className="text-emerald-700 text-base font-black mt-1">
                  {orders
                    .filter((order) => order.status === "COMPLETED")
                    .reduce((total, order) => total + Number(order.total), 0)
                    .toLocaleString()}{" "}
                  RWF
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1 mb-2">
              <View className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <Text className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  Pending
                </Text>
                <Text className="text-amber-700 text-base font-black mt-1">
                  {orders.filter((order) => order.status === "PENDING").length}
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1 mb-2">
              <View className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <Text className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  Cancelled
                </Text>
                <Text className="text-rose-600 text-base font-black mt-1">
                  {
                    orders.filter((order) => order.status === "CANCELLED")
                      .length
                  }
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-white border border-slate-100 rounded-lg p-4">
          <Text className="text-slate-900 font-black text-lg mb-3">
            Order History
          </Text>

          {orders.slice(0, 5).map((order) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(owner)/inventory/Orders/[id]",
                  params: { id: order.id },
                })
              }
              key={order.id}
              className="mb-3 p-3 rounded-lg border border-slate-200 bg-slate-50"
            >
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-slate-900 font-bold">
                  #ORD- {order.id.slice(0, 8)}
                </Text>
                <Text
                  className={`font-bold text-xs uppercase ${
                    order.status === "COMPLETED"
                      ? "text-emerald-700"
                      : order.status === "PENDING"
                        ? "text-yellow-500"
                        : "text-rose-600"
                  }`}
                >
                  {order.status}
                </Text>
              </View>

              {/* <Text className="text-slate-700 text-sm">{order.customer}</Text> */}
              <Text className="text-slate-600 text-sm mt-1">
                {/* Items: {order.totalItems} | Payment: {order.paymentMethod} */}
              </Text>
              <Text className="text-slate-600 text-sm">
                {/* Served by: {order.servedBy} */}
              </Text>
              <Text className="text-slate-600 text-sm">
                Time: {new Date(order.createdAt).toLocaleDateString()}
              </Text>

              <Text className="text-slate-900 font-black mt-2">
                {order.total.toLocaleString()} RWF
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
