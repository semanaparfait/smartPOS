import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type PaymentMethod = "Cash" | "MoMo" | "Card" | "Credit";

export type PurchasedItem = {
  name: string;
  qty: number;
};

export type Order = {
  id: string;
  customer: string;
  items: number;
  purchasedItems: PurchasedItem[];
  total: number;
  time: string;
  payment: PaymentMethod;
  takenBy?: string; // Staff member who took the credit
};

export const orders: Order[] = [
  {
    id: "ORD-9101",
    customer: "Aline M.",
    items: 3,
    purchasedItems: [
      { name: "Coca Cola 50cl", qty: 1 },
      { name: "Chicken Pie", qty: 2 },
    ],
    total: 22400,
    time: "09:10",
    payment: "Cash",
  },
  {
    id: "ORD-9102",
    customer: "Eric K.",
    items: 2,
    purchasedItems: [
      { name: "Mineral Water", qty: 1 },
      { name: "Rolex", qty: 1 },
    ],
    total: 12800,
    time: "09:28",
    payment: "MoMo",
  },
  {
    id: "ORD-9103",
    customer: "Nadia U.",
    items: 5,
    purchasedItems: [
      { name: "Rice Plate", qty: 2 },
      { name: "Fanta Orange", qty: 2 },
      { name: "Fruit Salad", qty: 1 },
    ],
    total: 46200,
    time: "10:04",
    payment: "Card",
  },
  {
    id: "ORD-9104",
    customer: "Jean P.",
    items: 1,
    purchasedItems: [{ name: "Coffee", qty: 1 }],
    total: 6800,
    time: "10:25",
    payment: "Credit",
    takenBy: "Samuel M.",
  },
  {
    id: "ORD-9105",
    customer: "Diane R.",
    items: 4,
    purchasedItems: [
      { name: "Milk", qty: 2 },
      { name: "Bread", qty: 2 },
    ],
    total: 30500,
    time: "11:16",
    payment: "Cash",
  },
  {
    id: "ORD-9106",
    customer: "Mugisha T.",
    items: 6,
    purchasedItems: [
      { name: "Cooking Oil", qty: 1 },
      { name: "Sugar 1kg", qty: 2 },
      { name: "Soap", qty: 3 },
    ],
    total: 39000,
    time: "11:48",
    payment: "Credit",
    takenBy: "Yvette P.",
  },
  {
    id: "ORD-9107",
    customer: "Sandra N.",
    items: 2,
    purchasedItems: [
      { name: "Fries", qty: 1 },
      { name: "Juice", qty: 1 },
    ],
    total: 15700,
    time: "12:07",
    payment: "MoMo",
  },
];

const paymentMethods: PaymentMethod[] = ["Cash", "MoMo", "Card", "Credit"];

export const paymentTone: Record<
  PaymentMethod,
  {
    bg: string;
    text: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  Cash: {
    bg: "#DDF7E5",
    text: "#166534",
    icon: "cash-outline",
  },
  MoMo: {
    bg: "#E4ECFF",
    text: "#1E40AF",
    icon: "phone-portrait-outline",
  },
  Card: {
    bg: "#FFF3D8",
    text: "#B45309",
    icon: "card-outline",
  },
  Credit: {
    bg: "#FDE2E2",
    text: "#B91C1C",
    icon: "time-outline",
  },
};

export default function Orders() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<"All" | PaymentMethod>(
    "All",
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const bySearch =
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.customer.toLowerCase().includes(search.toLowerCase());
      const byPayment =
        selectedPayment === "All" ? true : order.payment === selectedPayment;

      return bySearch && byPayment;
    });
  }, [search, selectedPayment]);

  const grossSales = filteredOrders.reduce(
    (sum, order) => sum + order.total,
    0,
  );
  const creditAmount = filteredOrders
    .filter((order) => order.payment === "Credit")
    .reduce((sum, order) => sum + order.total, 0);
  const netCollected = grossSales - creditAmount;

  const byMethod = paymentMethods.map((method) => {
    return {
      method,
      amount: filteredOrders
        .filter((order) => order.payment === method)
        .reduce((sum, order) => sum + order.total, 0),
    };
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7FE]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 26 }}
      >
        <View className="px-5 pt-4">
          <View className="overflow-hidden rounded-[28px] bg-[#13243C] p-5">
            <View className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#2C4B76]" />
            <View className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[#214066]" />

            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[29px] font-black tracking-tight text-white">
                  Payments Ledger
                </Text>
                <Text className="mt-1 text-sm font-semibold text-[#BFD2ED]">
                  Cash, MoMo, Card, and Credit performance in one view.
                </Text>
              </View>
              <View className="rounded-xl bg-[#F59E0B] px-3 py-2">
                <Text className="text-[10px] font-black uppercase tracking-widest text-[#51290B]">
                  Net Collected
                </Text>
                <Text className="text-sm font-black text-[#1F1306]">
                  {netCollected.toLocaleString()} RWF
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row items-center rounded-2xl bg-white px-4 py-2">
              <Ionicons name="search-outline" size={20} color="#6B7280" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Find customer or order"
                placeholderTextColor="#9CA3AF"
                className="ml-3 flex-1 text-[15px] font-semibold text-[#111827]"
              />
            </View>

            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <View className="flex-1 rounded-2xl bg-[#0B4A6F] px-4 py-3">
                <Text className="text-[11px] font-bold uppercase tracking-widest text-[#BFE9FF]">
                  Gross Sales
                </Text>
                <Text className="mt-1 text-xl font-black text-white">
                  {grossSales.toLocaleString()} RWF
                </Text>
              </View>
              <View className="flex-1 rounded-2xl bg-[#7F1D1D] px-4 py-3">
                <Text className="text-[11px] font-bold uppercase tracking-widest text-[#FECACA]">
                  Credits
                </Text>
                <Text className="mt-1 text-xl font-black text-white">
                  {creditAmount.toLocaleString()} RWF
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingVertical: 14,
              gap: 10,
              paddingRight: 8,
            }}
          >
            {(["All", ...paymentMethods] as const).map((method) => {
              const selected = selectedPayment === method;
              return (
                <Pressable
                  key={method}
                  onPress={() => setSelectedPayment(method)}
                  className="rounded-full px-5 py-3"
                  style={{
                    backgroundColor: selected ? "#0F172A" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: selected ? "#0F172A" : "#D1D5DB",
                  }}
                >
                  <Text
                    className="text-sm font-black"
                    style={{ color: selected ? "#FFFFFF" : "#334155" }}
                  >
                    {method}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View className="px-5">
          <View className="rounded-3xl border border-[#D9E2F3] bg-white p-4">
            <Text className="text-xs font-black uppercase tracking-[2px] text-[#475569]">
              By Payment Method
            </Text>

            <View className="mt-3 flex-row" style={{ gap: 10 }}>
              {byMethod.map((entry) => {
                const tone = paymentTone[entry.method];
                return (
                  <View
                    key={entry.method}
                    className="flex-1 rounded-2xl p-3"
                    style={{ backgroundColor: tone.bg }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name={tone.icon} size={14} color={tone.text} />
                      <Text
                        className="ml-1 text-[11px] font-black uppercase"
                        style={{ color: tone.text }}
                      >
                        {entry.method}
                      </Text>
                    </View>
                    <Text className="mt-2 text-base font-black text-[#0F172A]">
                      {entry.amount.toLocaleString()} RWF
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="mt-4 rounded-3xl border border-[#D9E2F3] bg-white p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-black text-[#0F172A]">
                Order Payments
              </Text>
              <Text className="text-xs font-bold uppercase tracking-[1px] text-[#64748B]">
                {filteredOrders.length} entries
              </Text>
            </View>

            <FlatList
              data={filteredOrders}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) => {
                const tone = paymentTone[item.payment];
                return (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/orders/[id]",
                        params: { id: item.id },
                      })
                    }
                  >
                    <View className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 active:opacity-60">
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-sm font-black text-[#111827]">
                            {item.id}
                          </Text>
                          <Text className="mt-1 text-xs font-semibold text-[#64748B]">
                            {item.customer}
                          </Text>
                        </View>

                        <View
                          className="flex-row items-center rounded-xl px-2 py-1"
                          style={{ backgroundColor: tone.bg }}
                        >
                          <Ionicons
                            name={tone.icon}
                            size={14}
                            color={tone.text}
                          />
                          <Text
                            className="ml-1 text-[11px] font-black"
                            style={{ color: tone.text }}
                          >
                            {item.payment}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-3 flex-row items-center justify-between rounded-xl bg-white px-3 py-2">
                        <Text className="text-xs font-bold text-[#475569]">
                          {item.items} items
                        </Text>
                        <Text className="text-xs font-bold text-[#475569]">
                          {item.time}
                        </Text>
                        <Text className="text-base font-black text-[#0F766E]">
                          {item.total.toLocaleString()} RWF
                        </Text>
                      </View>

                      <View className="mt-2 rounded-xl bg-white px-3 py-2">
                        <Text className="text-[11px] font-black uppercase tracking-[1px] text-[#64748B]">
                          Products Bought
                        </Text>
                        <Text className="mt-1 text-xs font-semibold leading-5 text-[#334155]">
                          {item.purchasedItems
                            .map((product) => `${product.qty}x ${product.name}`)
                            .join(" • ")}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View className="items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8">
                  <Ionicons name="receipt-outline" size={30} color="#94A3B8" />
                  <Text className="mt-2 text-sm font-bold text-[#475569]">
                    No payments match this filter.
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
