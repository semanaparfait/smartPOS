import { View, Text } from 'react-native'
import React from 'react'
import { Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { products } from '@/seed/products';

const formatRwf = (amount: number) => `${amount.toLocaleString()} RWF`;
export default function ViewProduct() {
  const router = useRouter();

  return (
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
  )
}