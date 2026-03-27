import Checkout from "@/app/(tabs)/cart";
import { Product, products } from "@/seed/products";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  LayoutChangeEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const categories = [
  "All",
  "Beverage",
  "Food",
  "Snacks",
  "Electronics",
  "Household",
];

export default function ProductScreen() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [failedImages, setFailedImages] = useState<number[]>([]);
  const [productPaneWidth, setProductPaneWidth] = useState<number>(0);
  const { width } = useWindowDimensions();
  const columns = productPaneWidth >= 900 ? 4 : productPaneWidth >= 650 ? 4 : 2;
  const listPadding = 20;
  const cardGap = 12;
  const effectivePaneWidth = productPaneWidth || Math.floor(width * 0.6);
  const availableWidth =
    effectivePaneWidth - listPadding * 2 - cardGap * (columns - 1);
  const cardWidth = Math.floor(availableWidth / columns);

  // Filter Logic
  const filteredProducts = products.filter((p) =>
    selectedCategory === "All" ? true : p.category === selectedCategory,
  );

  const markImageFailed = (id: number) => {
    if (!failedImages.includes(id)) {
      setFailedImages((prev) => [...prev, id]);
    }
  };

  const handleProductPaneLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== productPaneWidth) {
      setProductPaneWidth(nextWidth);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
<TouchableOpacity
  className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm active:scale-[0.97]"
  style={{
    width: cardWidth,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  }}
>
  {/* Product Image */}
  <View className="relative">
    {failedImages.includes(item.id) ? (
      <View className="h-40 w-full items-center justify-center bg-gray-100">
        <Ionicons name="image-outline" size={28} color="#9CA3AF" />
        <Text className="mt-1 text-xs text-gray-400">
          No image
        </Text>
      </View>
    ) : (
      <Image
        source={{ uri: item.imageUrl }}
        className="h-40 w-full"
        resizeMode="cover"
        onError={() => markImageFailed(item.id)}
      />
    )}

    {/* Category badge */}
    <View className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded-lg">
      <Text className="text-[10px] text-white font-semibold">
        {item.category}
      </Text>
    </View>

    {/* Stock badge */}
    <View className={`absolute hidden top-2 right-2 px-2 py-1 rounded-lg ${
      item.stock < 20 ? "bg-red-500" : "bg-green-600"
    }`}>
      <Text className="text-[10px] text-white font-bold">
        {item.stock}
      </Text>
    </View>
  </View>

  {/* Product Details */}
  <View className="p-4">

    <Text
      className="text-sm font-semibold text-gray-800"
      numberOfLines={1}
    >
      {item.name}
    </Text>

    <View className="flex-row items-center justify-between mt-2">

      {/* Price */}
      <Text className="text-lg font-bold text-green-700">
        {item.sellPrice.toLocaleString()}
        <Text className="text-xs text-gray-500">
          {" "}RWF
        </Text>
      </Text>


    </View>

  </View>
</TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 flex-row">
        <View style={{ flex: 3 }} onLayout={handleProductPaneLayout}>
          {/* Header */}
          <View className="px-6 py-4 flex-row justify-between items-center">
            <View>
              <Text className=" text-2xl font-serif font-bold">
                Inventory
              </Text>
              <Text className="text-gray-400 text-xs">
                Kigali General Store
              </Text>
            </View>
            <TouchableOpacity className=" p-3 rounded-2xl border border-navy-700">
              <Ionicons name="search" size={20} color="" />
            </TouchableOpacity>
          </View>

          {/* Horizontal Category Filter */}
          <View className="mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  className={`mr-3 px-6 py-3 rounded-2xl border-gray-300 border ${
                    selectedCategory === cat
                      ? "bg-green-900 "
                      : " border-navy-700"
                  }`}
                >
                  <Text
                    className={`font-bold ${selectedCategory === cat ? "text-white" : "text-black"}`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Product List */}
          <FlatList
            className="flex-1"
            key={columns}
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            numColumns={columns}
            columnWrapperStyle={{
              justifyContent: "space-between",
              marginBottom: cardGap,
            }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            ListEmptyComponent={
              <View className="items-center mt-20">
                <Ionicons name="cube-outline" size={60} color="#D4AF3744" />
                <Text className="text-white/40 mt-4">
                  No products found in this category
                </Text>
              </View>
            }
          />
        </View>
        <View style={{ flex: 2 }} className="border-l border-gray-300">
          <Checkout embedded />
        </View>
      </View>
    </SafeAreaView>
  );
}
