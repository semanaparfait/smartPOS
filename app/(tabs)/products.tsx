import Checkout from "@/app/components/cart";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  Image,
  LayoutChangeEvent,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useProduct from "@/store/products/useProduct";
import useCategory from "@/store/category/useCategory";
import useAuth from "@/store/Authentication/useAuth";
import UseCart from "@/store/Cart/useCart";
import Toast from "react-native-toast-message";
import type { ProductType } from "@/store/products/productsType";


export default function ProductScreen() {
  const { width } = useWindowDimensions();
  
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [failedImages, setFailedImages] = useState<any[]>([]);
  const [productPaneWidth, setProductPaneWidth] = useState<number>(0);
  const { products, getProducts } = useProduct();
  const { categoriesResponse, getCategories } = useCategory();
  const { fetchProfile } = useAuth();
  const { addToCart } = UseCart();
  const profile = useAuth((state) => state.profile);

  const columns = productPaneWidth >= 900 ? 4 : productPaneWidth >= 650 ? 4 : 2;
  const listPadding = 20;
  const cardGap = 12;
  const effectivePaneWidth = productPaneWidth || Math.floor(width * 0.6);
  const availableWidth =
    effectivePaneWidth - listPadding * 2 - cardGap * (columns - 1);
  const cardWidth = Math.floor(availableWidth / columns);
  const formatRwf = (amount: number) => `${amount.toLocaleString()} RWF`;
  useEffect(() => {
    getCategories();
    getProducts();
    fetchProfile();
  }, []);


  // Filter Logic
  const filteredProducts = products.filter((p) =>
    selectedCategory === "All" ? true : p.category.id === selectedCategory,
  );

  const markImageFailed = (id: string) => {
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

  const renderProduct = ({ item }: { item: ProductType }) => (
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
            <Text className="mt-1 text-xs text-gray-400">No image</Text>
          </View>
        ) : (
          <Image
            source={{ uri: item.images[0]?.url }}
            className="h-40 w-full"
            resizeMode="cover"
            onError={() => markImageFailed(item.id)}
          />
        )}

        {/* Category badge */}
        <View className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded-lg">
          <Text className="text-[10px] text-white font-semibold">
            {item.category.name}
          </Text>
        </View>

        {/* Stock badge */}
        {/* <View
          className={`absolute hidden top-2 right-2 px-2 py-1 rounded-lg ${
            item.stock < 20 ? "bg-red-500" : "bg-green-600"
          }`}
        >
          <Text className="text-[10px] text-white font-bold">{item.stock}</Text>
        </View> */}
      </View>

      {/* Product Details */}
      <View className="p-4">
        <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
          {item.name}
        </Text>

        <View className="flex-row items-center justify-between mt-2">
          {/* Price */}
          <Text className="text-lg font-bold text-green-700">
            {formatRwf(parseFloat(item.sellingPrice as any))}
            <Text className="text-xs text-gray-500"> RWF</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // const handleCreateCart = async (seatId?: string) => {
  //   try {
  //     await addToCart();
  //     // await getCart();
  //     Toast.show({
  //       type: "success",
  //       text1: "Product added to cart",
  //     });
  //   } catch (error) {
  //     Toast.show({
  //       type: "error",
  //       text1: "Failed to add product to cart",
  //       text2: error as string,
  //     });
  //   }
  // };

  return (
    <SafeAreaView className="flex-1 bg-surface h-full">
      <View className="flex-1 flex-row ">
        <View style={{ flex: 2 }} onLayout={handleProductPaneLayout}>
          {/* Header */}
          <View className="px-6 py-4 flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-gray-800">
                Inventory
              </Text>

              <Text className="text-xs text-gray-400 mt-1">
                {profile?.name}
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className=" flex-row items-center bg-white rounded-xl border border-gray-100">
                <Ionicons
                  name="search"
                  size={20}
                  color="black"
                  className=" ml-4"
                />
                <TextInput
                  placeholder="Search products..."
                  className="flex-1 ml-2 text-black  px-4 py-3 outline-none"
                  returnKeyType="search"
                />
              </View>
              <TouchableOpacity
                // onPress={() => handleCreateCart()}
               className="ml-4 rounded-xl bg-green-900 px-4 py-3 hidden">
                <Text className="text-white font-bold">Create Cart</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Horizontal Category Filter */}
          <View className="mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {categoriesResponse?.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() =>
                    setSelectedCategory(
                      selectedCategory === cat.id ? "All" : cat.id,
                    )
                  }
                  className={`mr-3 px-6 py-3 rounded-2xl border-gray-300 border ${
                    selectedCategory === cat.id
                      ? "bg-green-900 "
                      : " border-navy-700"
                  }`}
                >
                  <Text
                    className={`font-bold ${selectedCategory === cat.id ? "text-white" : "text-black"}`}
                  >
                    {cat.name}
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
                <Text className=" mt-4">
                  No products found in this category
                </Text>
              </View>
            }
          />
        </View>
        {/* <View className="border-l border-gray-200 "> */}
          <Checkout  />
        {/* </View> */}
      </View>
    </SafeAreaView>
  );
}
