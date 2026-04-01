import { categories } from "@/seed/categories";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, ScrollView, Text, View } from "react-native";

export default function ViewCategories() {
  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="p-6">
        <Text className="text-3xl font-black text-slate-900">
          All Categories
        </Text>
        <Text className="text-slate-500 mt-1 mb-5">
          {categories.length} categories available
        </Text>

        {categories.length === 0 ? (
          <View className="bg-white border border-slate-100 rounded-2xl p-6 items-center">
            <Ionicons name="pricetags-outline" size={28} color="#94a3b8" />
            <Text className="text-slate-500 mt-2">No categories found</Text>
          </View>
        ) : (
          <View>
            {categories.map((category) => (
              <View key={category.id} className="mb-3">
                <View className="bg-white border border-slate-100 rounded-2xl p-3 flex-row items-center">
                  <Image
                    source={{ uri: category.imageUrl }}
                    className="w-16 h-16 rounded-xl"
                    resizeMode="cover"
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-slate-900 font-bold text-base"
                      numberOfLines={1}
                    >
                      {category.name}
                    </Text>
                    <Text className="text-slate-500 text-xs mt-1">
                      Category #{category.id}
                    </Text>
                  </View>
                  <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#64748b"
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
