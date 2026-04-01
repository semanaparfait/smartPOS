import { orders } from "@/seed/orders";
import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

const formatRwf = (amount: number) => `${amount.toLocaleString()} RWF`;

export default function Orders() {
  const summary = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.totalOrders += 1;
        acc.totalRevenue += order.totalAmount;
        if (order.status === "pending") acc.pending += 1;
        if (order.status === "cancelled") acc.cancelled += 1;
        return acc;
      },
      { totalOrders: 0, totalRevenue: 0, pending: 0, cancelled: 0 },
    );
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

        <View className="bg-white border border-slate-100 rounded-3xl p-4 mb-5">
          <Text className="text-slate-900 font-black text-lg mb-3">
            Today Summary
          </Text>
          <View className="flex-row flex-wrap -mx-1">
            <View className="w-1/2 px-1 mb-2">
              <View className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <Text className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  Orders
                </Text>
                <Text className="text-slate-900 text-base font-black mt-1">
                  {summary.totalOrders}
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1 mb-2">
              <View className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <Text className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  Revenue
                </Text>
                <Text className="text-emerald-700 text-base font-black mt-1">
                  {formatRwf(summary.totalRevenue)}
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1 mb-2">
              <View className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <Text className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  Pending
                </Text>
                <Text className="text-amber-700 text-base font-black mt-1">
                  {summary.pending}
                </Text>
              </View>
            </View>
            <View className="w-1/2 px-1 mb-2">
              <View className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <Text className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  Cancelled
                </Text>
                <Text className="text-rose-600 text-base font-black mt-1">
                  {summary.cancelled}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-white border border-slate-100 rounded-3xl p-4">
          <Text className="text-slate-900 font-black text-lg mb-3">
            Order History
          </Text>

          {orders.map((order) => (
            <View
              key={order.id}
              className="mb-3 p-3 rounded-2xl border border-slate-200 bg-slate-50"
            >
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-slate-900 font-bold">{order.id}</Text>
                <Text
                  className={`font-bold text-xs uppercase ${
                    order.status === "completed"
                      ? "text-emerald-700"
                      : order.status === "pending"
                        ? "text-amber-700"
                        : "text-rose-600"
                  }`}
                >
                  {order.status}
                </Text>
              </View>

              <Text className="text-slate-700 text-sm">{order.customer}</Text>
              <Text className="text-slate-600 text-sm mt-1">
                Items: {order.totalItems} | Payment: {order.paymentMethod}
              </Text>
              <Text className="text-slate-600 text-sm">
                Served by: {order.servedBy}
              </Text>
              <Text className="text-slate-600 text-sm">
                Time:{" "}
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>

              <Text className="text-slate-900 font-black mt-2">
                {formatRwf(order.totalAmount)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
