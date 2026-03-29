import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ReceiptCard, { ReceiptLine } from "../components/receipt-card";

type PaymentOption = "cash" | "momo" | "card" | "credit";

const paymentCards: Array<{
  key: PaymentOption;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}> = [
  {
    key: "cash",
    label: "Cash",
    subtitle: "Physical cash",
    icon: "cash-outline",
    color: "#065F46",
    bg: "#F0FDF4",
  },
  {
    key: "momo",
    label: "MoMo",
    subtitle: "Mobile transfer",
    icon: "phone-portrait-outline",
    color: "#1D4ED8",
    bg: "#EFF6FF",
  },
  {
    key: "card",
    label: "Card",
    subtitle: "POS Terminal",
    icon: "card-outline",
    color: "#7C2D12",
    bg: "#FFF7ED",
  },
  {
    key: "credit",
    label: "Credit",
    subtitle: "Pay Later",
    icon: "time-outline",
    color: "#991B1B",
    bg: "#FEF2F2",
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { total, items, lines } = useLocalSearchParams<{
    total?: string | string[];
    items?: string | string[];
    lines?: string | string[];
  }>();

  const totalParam = Array.isArray(total) ? total[0] : total;
  const itemsParam = Array.isArray(items) ? items[0] : items;
  const linesParam = Array.isArray(lines) ? lines[0] : lines;

  const totalAmount = Number(totalParam) || 0;
  const totalItems = Number(itemsParam) || 0;
  const receiptLines = useMemo<ReceiptLine[]>(() => {
    if (!linesParam) {
      return [];
    }

    try {
      const parsed = JSON.parse(linesParam) as ReceiptLine[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((line) => line && typeof line.name === "string")
        .map((line) => ({
          name: line.name,
          qty: Number(line.qty) || 0,
          price: Number(line.price) || 0,
        }));
    } catch {
      return [];
    }
  }, [linesParam]);

  const vat = Math.round(totalAmount * 0.18);
  const grandTotal = totalAmount + vat;
  const saleCode = useMemo(
    () => `SL-${Math.floor(100000 + Math.random() * 900000)}`,
    [],
  );

  const [paymentOption, setPaymentOption] = useState<PaymentOption>("cash");
  const [cashReceived, setCashReceived] = useState("");
  // ... other states as you had them

  const change = Math.max(Number(cashReceived || 0) - grandTotal, 0);

  // Landscape detection
  const isLandscape = width > 768;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 32,
          paddingVertical: 24,
          paddingBottom: 40,
        }}
      >
        {/* TOP BAR */}
        <View className="flex-row justify-between items-center mb-8">
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mr-4"
            >
              <Ionicons name="arrow-back" size={24} color="#1E293B" />
            </Pressable>
            <View>
              <Text className="text-3xl font-black text-slate-900">
                Finalize Sale
              </Text>
              <Text className="text-slate-500 font-medium">
                Verify details and choose payment
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">
              Grand Total
            </Text>
            <Text className="text-3xl font-black text-green-700">
              {grandTotal.toLocaleString()} RWF
            </Text>
          </View>
        </View>

        <View
          className={`${isLandscape ? "flex-row" : "flex-col"}`}
          style={{ gap: 24 }}
        >
          {/* LEFT: RECEIPT */}
          <View className={`${isLandscape ? "w-[40%]" : "w-full"} mb-6`}>
            <ReceiptCard
              saleCode={saleCode}
              totalItems={totalItems}
              totalAmount={totalAmount}
              vat={vat}
              grandTotal={grandTotal}
              receiptLines={receiptLines}
            />
          </View>

          {/* RIGHT: PAYMENT OPTIONS */}
          <View className="flex-1">
            <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-4">
              Payment Method
            </Text>
            <View className="flex-row flex-wrap gap-4">
              {paymentCards.map((card) => {
                const isActive = paymentOption === card.key;
                return (
                  <Pressable
                    key={card.key}
                    onPress={() => setPaymentOption(card.key)}
                    className={`p-5 rounded-3xl border-2 ${isActive ? "shadow-md" : "border-white bg-white shadow-sm"}`}
                    style={{
                      borderColor: isActive ? card.color : "transparent",
                      width: isLandscape ? "47%" : "100%",
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View
                        className="p-2 rounded-xl"
                        style={{ backgroundColor: card.bg }}
                      >
                        <Ionicons
                          name={card.icon}
                          size={24}
                          color={card.color}
                        />
                      </View>
                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={card.color}
                        />
                      )}
                    </View>
                    <Text className="text-lg font-black text-slate-900">
                      {card.label}
                    </Text>
                    <Text className="text-slate-400 text-xs font-medium">
                      {card.subtitle}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* DYNAMIC INPUTS */}
            <View className="mt-8 bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
              {paymentOption === "cash" && (
                <View>
                  <Text className="text-slate-900 font-bold mb-3">
                    Amount Received
                  </Text>
                  <TextInput
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    className="bg-slate-50 p-5 rounded-2xl text-xl font-black text-slate-900"
                    onChangeText={setCashReceived}
                  />
                  <View className="mt-6 flex-row justify-between items-center bg-green-50 p-4 rounded-2xl border border-green-100">
                    <Text className="text-green-700 font-bold">
                      Return Change:
                    </Text>
                    <Text className="text-xl font-black text-green-800">
                      {change.toLocaleString()} RWF
                    </Text>
                  </View>
                </View>
              )}
              {/* Add other payment cases here... */}
            </View>

            <Pressable
              onPress={() => Alert.alert("Success", "Transaction Complete")}
              className="mt-8 bg-green-700 py-5 rounded-[28px] shadow-xl shadow-green-200 active:bg-green-800"
            >
              <Text className="text-center text-white text-lg font-black uppercase tracking-widest">
                Print & Finish
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
