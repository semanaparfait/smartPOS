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
type PaymentMode = "single" | "split";

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
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("single");
  const [splitMethodOne, setSplitMethodOne] = useState<PaymentOption>("cash");
  const [splitMethodTwo, setSplitMethodTwo] = useState<PaymentOption>("card");
  const [splitAmountOne, setSplitAmountOne] = useState("");
  const [creditPrimaryPerson, setCreditPrimaryPerson] = useState("");
  const [creditTakenBy, setCreditTakenBy] = useState("");
  const [creditOwnerPhone, setCreditOwnerPhone] = useState("");

  const splitOneValue = Number(splitAmountOne || 0);
  const splitTwoValue = Math.max(grandTotal - splitOneValue, 0);
  const splitOverpay = Math.max(splitOneValue - grandTotal, 0);
  const splitUsesCredit =
    splitMethodOne === "credit" || splitMethodTwo === "credit";
  const selectedPaymentCard = paymentCards.find(
    (card) => card.key === paymentOption,
  );

  const isCreditDetailsValid = () => {
    if (!creditPrimaryPerson.trim()) {
      Alert.alert(
        "Missing Credit Owner",
        "Enter the primary person for this credit.",
      );
      return false;
    }

    if (!creditTakenBy.trim()) {
      Alert.alert(
        "Missing Staff Name",
        "Enter the name of person who took this credit.",
      );
      return false;
    }

    if (!creditOwnerPhone.trim()) {
      Alert.alert(
        "Missing Phone Number",
        "Enter phone number for the credit owner.",
      );
      return false;
    }

    return true;
  };

  const handleFinishTransaction = () => {
    if (paymentMode === "single") {
      if (paymentOption === "credit" && !isCreditDetailsValid()) {
        return;
      }

      Alert.alert(
        "Success",
        `Transaction complete with ${paymentOption.toUpperCase()} payment.`,
      );
      return;
    }

    if (splitMethodOne === splitMethodTwo) {
      Alert.alert(
        "Choose Different Methods",
        "Pick two different methods for split payment.",
      );
      return;
    }

    if (splitOneValue <= 0) {
      Alert.alert("Invalid Split", "Enter a valid first payment amount.");
      return;
    }

    if (splitOneValue >= grandTotal) {
      Alert.alert(
        "Invalid Split",
        "First amount must be less than total so second method can cover the remainder.",
      );
      return;
    }

    if (splitUsesCredit && !isCreditDetailsValid()) {
      return;
    }

    Alert.alert(
      "Success",
      `${splitMethodOne.toUpperCase()}: ${splitOneValue.toLocaleString()} RWF\n${splitMethodTwo.toUpperCase()}: ${splitTwoValue.toLocaleString()} RWF`,
    );
  };

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
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                Payment Mode
              </Text>
              <View className="flex-row rounded-xl bg-slate-100 p-1">
                <Pressable
                  onPress={() => setPaymentMode("single")}
                  className="px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor:
                      paymentMode === "single" ? "#FFFFFF" : "transparent",
                  }}
                >
                  <Text className="text-xs font-black text-slate-700">
                    Single
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPaymentMode("split")}
                  className="px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor:
                      paymentMode === "split" ? "#FFFFFF" : "transparent",
                  }}
                >
                  <Text className="text-xs font-black text-slate-700">
                    Split
                  </Text>
                </Pressable>
              </View>
            </View>

            {paymentMode === "single" && (
              <>
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
                        className={`p-5 rounded-xl border-2 ${isActive ? "shadow-md" : "border-white bg-white shadow-sm"}`}
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
              </>
            )}

            {/* DYNAMIC INPUTS */}
            <View className="">
              {paymentMode === "single" && selectedPaymentCard && (
                <View
                  className="rounded-2xl border px-4 py-4 hidden "
                  style={{
                    borderColor: selectedPaymentCard.color,
                    backgroundColor: selectedPaymentCard.bg,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons
                        name={selectedPaymentCard.icon}
                        size={22}
                        color={selectedPaymentCard.color}
                      />
                      <View className="ml-3">
                        <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                          Selected Payment
                        </Text>
                        <Text
                          className="text-lg font-black"
                          style={{ color: selectedPaymentCard.color }}
                        >
                          {selectedPaymentCard.label}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={selectedPaymentCard.color}
                    />
                  </View>
                  <Text className="mt-3 text-sm font-semibold text-slate-600">
                    One click selected:{" "}
                    {selectedPaymentCard.label.toUpperCase()} payment.
                  </Text>
                </View>
              )}

              {paymentMode === "split" && (
                <View style={{ gap: 14 }}>
                  <Text className="text-slate-900 font-bold">
                    Split Payment Details
                  </Text>
                  <Text className="text-slate-500 text-xs font-medium">
                    Enter the first amount, second amount is calculated
                    automatically.
                  </Text>

                  <View>
                    <Text className="text-slate-700 font-bold mb-2">
                      First Method
                    </Text>
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {paymentCards.map((card) => {
                        const active = splitMethodOne === card.key;
                        return (
                          <Pressable
                            key={`first-${card.key}`}
                            onPress={() => setSplitMethodOne(card.key)}
                            className="px-3 py-2 rounded-xl border"
                            style={{
                              borderColor: active ? card.color : "#CBD5E1",
                              backgroundColor: active ? card.bg : "#FFFFFF",
                            }}
                          >
                            <Text
                              className="text-xs font-black"
                              style={{ color: active ? card.color : "#334155" }}
                            >
                              {card.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <TextInput
                    value={splitAmountOne}
                    onChangeText={setSplitAmountOne}
                    placeholder="First amount"
                    keyboardType="numeric"
                    className="bg-slate-50 p-4 rounded-2xl text-base font-black text-slate-900"
                  />

                  <View>
                    <Text className="text-slate-700 font-bold mb-2">
                      Second Method
                    </Text>
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {paymentCards.map((card) => {
                        const active = splitMethodTwo === card.key;
                        return (
                          <Pressable
                            key={`second-${card.key}`}
                            onPress={() => setSplitMethodTwo(card.key)}
                            className="px-3 py-2 rounded-xl border"
                            style={{
                              borderColor: active ? card.color : "#CBD5E1",
                              backgroundColor: active ? card.bg : "#FFFFFF",
                            }}
                          >
                            <Text
                              className="text-xs font-black"
                              style={{ color: active ? card.color : "#334155" }}
                            >
                              {card.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    style={{ gap: 6 }}
                  >
                    <View className="flex-row justify-between">
                      <Text className="text-xs font-bold text-slate-600">
                        {splitMethodOne.toUpperCase()}
                      </Text>
                      <Text className="text-sm font-black text-slate-900">
                        {Math.max(splitOneValue, 0).toLocaleString()} RWF
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs font-bold text-slate-600">
                        {splitMethodTwo.toUpperCase()}
                      </Text>
                      <Text className="text-sm font-black text-slate-900">
                        {splitTwoValue.toLocaleString()} RWF
                      </Text>
                    </View>
                    {splitOverpay > 0 && (
                      <Text className="text-xs font-bold text-red-600">
                        First amount is too high by{" "}
                        {splitOverpay.toLocaleString()} RWF
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {paymentMode === "single" && paymentOption === "credit" && (
                <View className="mt-4 bg-white p-6 rounded-xl border border-slate-100 shadow-sm" style={{ gap: 10 }}>
                  <Text className="text-slate-900 font-bold">
                    Credit Details
                  </Text>
                  <TextInput
                    value={creditPrimaryPerson}
                    onChangeText={setCreditPrimaryPerson}
                    placeholder="Primary person for this credit"
                    className="bg-slate-50 p-4 rounded-2xl text-base font-semibold text-slate-900"
                  />
                  <TextInput
                    value={creditTakenBy}
                    onChangeText={setCreditTakenBy}
                    placeholder="Name of person who took this credit"
                    className="bg-slate-50 p-4 rounded-2xl text-base font-semibold text-slate-900"
                  />
                  <TextInput
                    value={creditOwnerPhone}
                    onChangeText={setCreditOwnerPhone}
                    placeholder="Phone number (credit owner only)"
                    keyboardType="phone-pad"
                    className="bg-slate-50 p-4 rounded-2xl text-base font-semibold text-slate-900"
                  />
                </View>
              )}

              {paymentMode === "split" && splitUsesCredit && (
                <View className="mt-4" style={{ gap: 10 }}>
                  <Text className="text-slate-900 font-bold">
                    Credit Details
                  </Text>
                  <Text className="text-xs font-medium text-slate-500">
                    Credit is part of this split payment, fill in these details.
                  </Text>
                  <TextInput
                    value={creditPrimaryPerson}
                    onChangeText={setCreditPrimaryPerson}
                    placeholder="Primary person for this credit"
                    className="bg-slate-50 p-4 rounded-2xl text-base font-semibold text-slate-900"
                  />
                  <TextInput
                    value={creditTakenBy}
                    onChangeText={setCreditTakenBy}
                    placeholder="Name of person who took this credit"
                    className="bg-slate-50 p-4 rounded-2xl text-base font-semibold text-slate-900"
                  />
                  <TextInput
                    value={creditOwnerPhone}
                    onChangeText={setCreditOwnerPhone}
                    placeholder="Phone number (credit owner only)"
                    keyboardType="phone-pad"
                    className="bg-slate-50 p-4 rounded-2xl text-base font-semibold text-slate-900"
                  />
                </View>
              )}
            </View>

            <Pressable
              onPress={handleFinishTransaction}
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
