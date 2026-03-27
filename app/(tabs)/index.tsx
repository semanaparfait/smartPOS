import Checkout from "@/app/(tabs)/checkout";
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
  const columns = productPaneWidth >= 900 ? 4 : productPaneWidth >= 650 ? 3 : 2;
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
      className="mb-3 overflow-hidden rounded-md   shadow-lg active:scale-[0.98]"
      style={{ elevation: 5, width: cardWidth }}
    >
      {/* Product Image */}
      {failedImages.includes(item.id) ? (
        <View className="h-32 w-full items-center justify-center ">
          <Ionicons name="image-outline" size={26} color="#D4AF37" />
          <Text className="mt-1 text-[10px] text-white/60">No image</Text>
        </View>
      ) : (
        <Image
          source={{ uri: item.imageUrl }}
          className="h-32 w-full "
          resizeMode="cover"
          onError={() => markImageFailed(item.id)}
        />
      )}

      {/* Product Details */}
      <View className="p-3">
        <View>
          <Text className="text-sm font-bold " numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-[10px] font-bold uppercase tracking-wider ">
            {item.category}
          </Text>
        </View>

        <View className="mt-1">
          <View>
            <Text className="text-base font-semibold ">
              {item.sellPrice.toLocaleString()} RWF
            </Text>
            <Text
              className={`text-[10px] hidden font-bold ${item.stock < 20 ? "text-red-400" : "text-green-400"}`}
            >
              STOCK: {item.stock}
            </Text>
          </View>
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
