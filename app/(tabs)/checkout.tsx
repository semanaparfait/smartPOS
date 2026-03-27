import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CheckoutProps = {
  embedded?: boolean;
};

export default function Checkout({ embedded = false }: CheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MOBILE_MONEY">(
    "CASH",
  );

  // Mock Cart Data (In the next step, we'll pull this from CartContext)
  const cartItems = [
    { id: 1, name: "Inyange Milk 500ml", price: 800, qty: 2 },
    { id: 2, name: "Skol Lager 33cl", price: 1000, qty: 6 },
  ];

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0,
  );

  const handleCompleteSale = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Sale Successful",
      `Receipt sent for ${subtotal.toLocaleString()} RWF`,
    );
  };

  const RootContainer = embedded ? View : SafeAreaView;

  return (
    <RootContainer className="flex-1 bg-navy-900">
      {/* 1. Header */}
      <View className="px-6 py-4 border-b border-navy-800 flex-row justify-between items-center">
        <Text
          className={`${embedded ? "text-xl" : "text-2xl"} text-gold-500 font-serif font-bold`}
        >
          Checkout
        </Text>
        <TouchableOpacity className="bg-red-500/10 p-2 rounded-lg">
          <Text className="text-red-400 text-xs font-bold">CANCEL SALE</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Cart Items List */}
      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {cartItems.map((item) => (
          <View
            key={item.id}
            className="flex-row justify-between items-center mb-4 bg-navy-800/40 p-4 rounded-2xl border border-navy-800"
          >
            <View className="flex-1">
              <Text
                className={`${embedded ? "text-base" : "text-lg"} text-white font-bold`}
              >
                {item.name}
              </Text>
              <Text className="text-white/40 text-xs">
                {item.qty} x {item.price.toLocaleString()} RWF
              </Text>
            </View>
            <Text
              className={`${embedded ? "text-base" : "text-lg"} text-gold-500 font-bold`}
            >
              {(item.price * item.qty).toLocaleString()}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* 3. Payment Method Switcher */}
      <View className="px-6 mb-4">
        <Text className="text-white/40 uppercase text-[10px] tracking-widest mb-3">
          Payment Method
        </Text>
        <View className="flex-row space-x-4">
          <TouchableOpacity
            onPress={() => setPaymentMethod("CASH")}
            className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl border ${paymentMethod === "CASH" ? "bg-gold-500 border-gold-500" : "bg-navy-800 border-navy-700"}`}
          >
            <Ionicons
              name="cash-outline"
              size={20}
              color={paymentMethod === "CASH" ? "#001F3F" : "#D4AF37"}
            />
            <Text
              className={`ml-2 font-bold ${paymentMethod === "CASH" ? "text-navy-900" : "text-white"}`}
            >
              CASH
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPaymentMethod("MOBILE_MONEY")}
            className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl border ${paymentMethod === "MOBILE_MONEY" ? "bg-gold-500 border-gold-500" : "bg-navy-800 border-navy-700"}`}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={paymentMethod === "MOBILE_MONEY" ? "#001F3F" : "#D4AF37"}
            />
            <Text
              className={`ml-2 font-bold ${paymentMethod === "MOBILE_MONEY" ? "text-navy-900" : "text-white"}`}
            >
              M-MONEY
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Bottom Summary Bar */}
      <View
        className={`${embedded ? "p-5 rounded-t-3xl" : "p-8 rounded-t-[40px]"} bg-navy-800 shadow-2xl border-t border-navy-700`}
      >
        <View
          className={`flex-row justify-between items-center ${embedded ? "mb-4" : "mb-6"}`}
        >
          <Text
            className={`${embedded ? "text-base" : "text-lg"} text-white/60`}
          >
            Total Amount
          </Text>
          <Text
            className={`${embedded ? "text-2xl" : "text-3xl"} text-gold-500 font-black`}
          >
            {subtotal.toLocaleString()} RWF
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleCompleteSale}
          className={`${embedded ? "py-4" : "py-5"} bg-gold-500 w-full rounded-2xl shadow-lg active:scale-95 flex-row justify-center items-center`}
        >
          <Text
            className={`${embedded ? "text-lg" : "text-xl"} text-navy-900 text-center font-black mr-2`}
          >
            COMPLETE SALE
          </Text>
          <Ionicons name="checkmark-circle" size={24} color="#001F3F" />
        </TouchableOpacity>
      </View>
    </RootContainer>
  );
}
