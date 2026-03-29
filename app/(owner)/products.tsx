import { products } from "@/seed/products";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

const formatRwf = (amount: number) => `${amount.toLocaleString()} RWF`;

export default function Products() {
  const router = useRouter();
  console.log("Products in Dashboard:", products); // Debugging log
  const totalStockValue = products.reduce((sum, product) => {
    return sum + product.buyPrice * product.stock;
  }, 0);

  const lowStockCount = products.filter(
    (product) => product.stock <= 25,
  ).length;

  return (
    <ScrollView
      className="flex-1 bg-slate-50 w-full"
      contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
      showsVerticalScrollIndicator={true}
      scrollEnabled={true}
      nestedScrollEnabled={true}
    >
      <View className="p-8">
        {/* TOP OVERVIEW CARD */}
        <View className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 mb-8">
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-3xl font-black text-slate-900 tracking-tight">
                Inventory Insight
              </Text>
              <Text className="text-slate-400 font-medium mt-1">
                Real-time status of your product catalog
              </Text>
            </View>
            <TouchableOpacity
              className="bg-emerald-600 px-6 py-3 rounded-2xl flex-row items-center shadow-md shadow-emerald-200"
              onPress={() => router.push("/(owner)/products")}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-bold ml-2">New Product</Text>
            </TouchableOpacity>
          </View>

          {/* STATS GRID */}
          <View className="flex-row space-x-4">
            <View className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <View className="bg-emerald-100 w-10 h-10 rounded-xl items-center justify-center mb-4">
                <Ionicons name="cube" size={20} color="#059669" />
              </View>
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Total SKUs
              </Text>
              <Text className="text-3xl font-black text-slate-900 mt-1">
                {products.length}
              </Text>
            </View>

            <View className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <View className="bg-amber-100 w-10 h-10 rounded-xl items-center justify-center mb-4">
                <Ionicons name="warning" size={20} color="#D97706" />
              </View>
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Low Stock
              </Text>
              <Text className="text-3xl font-black text-slate-900 mt-1">
                {lowStockCount}
              </Text>
            </View>

            <View className="flex-1 bg-slate-900 p-6 rounded-3xl">
              <View className="bg-slate-800 w-10 h-10 rounded-xl items-center justify-center mb-4">
                <Ionicons name="stats-chart" size={20} color="#10B981" />
              </View>
              <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Asset Value
              </Text>
              <Text className="text-xl font-black text-white mt-1">
                {formatRwf(totalStockValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* RECENT PRODUCTS TABLE-STYLE LIST */}
        <View className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
          <View className="flex-row items-center justify-between mb-8">
            <View className="flex-row items-center">
              <View className="w-1.5 h-6 bg-emerald-600 rounded-full mr-3" />
              <Text className="text-xl font-black text-slate-900">
                Recent Catalog
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(owner)/products")}>
              <Text className="text-emerald-700 font-bold">
                View Full Registry
              </Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            {products.map((product) => {
              const isLow = product.stock <= 25;
              return (
                <View
                  key={product.id}
                  className="flex-row items-center bg-white border-b border-slate-50 pb-4 mb-4"
                >
                  <Image
                    source={{ uri: product.imageUrl }}
                    className="h-16 w-16 rounded-2xl bg-slate-100"
                  />

                  <View className="flex-1 ml-5">
                    <Text className="text-base font-bold text-slate-900">
                      {product.name}
                    </Text>
                    <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                      {product.category} • SKU: {product.code}
                    </Text>
                    <View className="flex-row items-center mt-2">
                      <Text className="text-xs font-bold text-slate-700">
                        Buy: {formatRwf(product.buyPrice)}
                      </Text>
                      <Text className="text-slate-300 mx-2">|</Text>
                      <Text className="text-xs font-bold text-emerald-700">
                        Sell: {formatRwf(product.sellPrice)}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <View
                      className={`px-4 py-2 rounded-xl ${isLow ? "bg-rose-50" : "bg-slate-50"}`}
                    >
                      <Text
                        className={`text-xs font-black ${isLow ? "text-rose-600" : "text-slate-900"}`}
                      >
                        {product.stock} Units
                      </Text>
                    </View>
                    {isLow && (
                      <Text className="text-[9px] font-black text-rose-400 uppercase mt-1">
                        Reorder Soon
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
