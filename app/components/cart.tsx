import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {products} from '@/seed/products'
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CheckoutProps = {
  embedded?: boolean;
};

export default function Cart({ embedded = false }: CheckoutProps) {
  const router = useRouter();
  console.log(products)

  // Mock Cart Data (In the next step, we'll pull this from CartContext)
  const cartItems = [
    {
      id: 1,
      image:
        "https://i.pinimg.com/736x/cc/fb/cf/ccfbcf047b8cac8f1ab9ad713f6ab989.jpg",
      name: "Inyange Milk 500ml",
      price: 800,
      qty: 2,
    },
    {
      id: 2,
      image:
        "https://i.pinimg.com/736x/02/55/cd/0255cd96ba0ce828bf72326a3ff69c47.jpg",
      name: "Skol Lager 33cl",
      price: 1000,
      qty: 6,
    },
    {
      id: 3,
      image:
        "https://i.pinimg.com/736x/cc/fb/cf/ccfbcf047b8cac8f1ab9ad713f6ab989.jpg",
      name: "Inyange Milk 500ml",
      price: 800,
      qty: 2,
    },
    {
      id: 4,
      image:
        "https://i.pinimg.com/736x/02/55/cd/0255cd96ba0ce828bf72326a3ff69c47.jpg",
      name: "Skol Lager 33cl",
      price: 1000,
      qty: 6,
    },
  ];

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0,
  );
  const totalItems = cartItems.reduce((acc, item) => acc + item.qty, 0);

  const handleCompleteSale = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const receiptItems = cartItems.map((item) => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
    }));

    router.push({
      pathname: "/(tabs)/checkout",
      params: {
        total: subtotal.toString(),
        items: totalItems.toString(),
        lines: JSON.stringify(receiptItems),
      },
    });
  };

  const RootContainer = embedded ? View : SafeAreaView;

  return (
    <RootContainer className="flex-1 ">
      {/* 1. Header */}
      <View className="px-6 py-4 border-b border-gray-300 flex-row justify-between items-center">
        <Text
          className={`${embedded ? "text-xl" : "text-2xl"}  font-serif font-bold`}
        >
          Cart
        </Text>
        <TouchableOpacity className="bg-green-900 p-2 rounded-lg">
          <Text className="text-white text-xs font-bold">HOLD SALE</Text>
        </TouchableOpacity>
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
            className="flex-row gap-4 justify-between items-center mb-4  p-4 rounded-2xl bg-white shadow-inner"
          >
            <View>
              <Image
                source={{ uri: item.image }}
                className="h-16 w-16 rounded-lg bg-navy-900"
                resizeMode="cover"
              />
            </View>

            <View className="flex-1">
              <Text className={`${embedded ? "text-base" : "text-lg"}  `}>
                {item.name}
              </Text>
              <Text
                className={`${embedded ? "text-base" : "text-lg"}  font-semibold`}
              >
                {(item.price * item.qty).toLocaleString()} RWF
              </Text>
            </View>
            <View className="items-end justify-end gap-1">
              <View>
                <TouchableOpacity className="p-1 rounded-lg bg-red-500">
                  <Ionicons name="trash-outline" size={18} color="white" />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center gap-3">
                <TouchableOpacity className="border border-gray-300 p-2 rounded-lg">
                  <Ionicons name="remove" size={16} color="#333" />
                </TouchableOpacity>
                <Text className="text-base font-bold">{item.qty}</Text>
                <TouchableOpacity className="border border-gray-300 p-2 rounded-lg">
                  <Ionicons name="add" size={16} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 3. Payment Method Switcher */}
      <View className="px-6 mb-4"></View>

      {/* 4. Bottom Summary Bar */}
      <View
        className={`${embedded ? "p-5 rounded-t-3xl" : "p-8 rounded-t-[40px]"}  shadow-2xl border-t border-gray-300`}
      >
        <View
          className={`flex-row justify-between items-center ${embedded ? "mb-4" : "mb-6"}`}
        >
          <Text className={`${embedded ? "text-base" : "text-lg"} `}>
            Total Amount
          </Text>
          <Text className={`${embedded ? "text-2xl" : "text-3xl"}  font-black`}>
            {subtotal.toLocaleString()} RWF
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleCompleteSale}
          className={`${embedded ? "py-3" : "py-4"} bg-green-900 w-full rounded-2xl shadow-lg active:scale-95 flex-row justify-center items-center`}
        >
          <Text
            className={`${embedded ? "text-lg" : "text-xl"} text-white text-center font-black mr-2`}
          >
            COMPLETE SALE
          </Text>
          <Ionicons name="checkmark-circle" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </RootContainer>
  );
}
