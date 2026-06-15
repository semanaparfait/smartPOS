import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Pen, Trash } from "lucide-react-native";
import useProduct from "@/store/products/useProduct";
import useCategory from "@/store/category/useCategory";
import { Picker } from "@react-native-picker/picker";

const formatRwf = (amount: number) => `${amount.toLocaleString()} RWF`;

export default function ViewProduct() {
  const { products, getProducts } = useProduct();
  const { categories, getCategories } = useCategory();
  const router = useRouter();

  useEffect(() => {
    const fetchProducts = async () => {
      await getProducts();
      await getCategories();
    };
    fetchProducts();
  }, []);

  const colors = [
    "text-blue-500",
    "text-green-500",
    "text-orange-500",
    "text-emerald-600",
    "text-purple-500",
    "text-pink-500",
    "text-yellow-500",
    "text-red-500",
  ];

  const getCategoryColor = (name?: string) => {
    if (!name) return "text-slate-400";

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash % colors.length);
    return colors[index];
  };

  return (
    <View className="bg-white rounded-md p-6 shadow-sm border border-slate-100 ">
      {/* Header Section */}
      <View className="flex-row flex-wrap items-center justify-between mb-6">
        <View className="flex-row items-center">
          <View className="w-1.5 h-6 bg-emerald-600 rounded-full mr-3" />
          <Text className="text-xl font-black text-slate-900">
            Recent Catalog
          </Text>
        </View>

        <View className="flex-row items-center gap-3 flex-wrap">
          <TextInput
            placeholder="Search products..."
            className="bg-slate-100  text-slate-500 placeholder:text-slate-400 border border-slate-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {categories.length > 0 && (
            <Picker className="bg-slate-100 text-slate-500 border border-slate-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <Picker.Item label="All Categories" value="all" />
              {categories.map((category) => (
                <Picker.Item
                  key={category.id}
                  label={category.name}
                  value={category.name}
                />
              ))}
            </Picker>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="min-w-[900px] ">
          {/* Table Header Line */}
          <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-3 mb-3 border border-slate-100">
            <Text className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Product{" "}
            </Text>
            <Text className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Category
            </Text>
            <Text className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider hidden">
              Quantity
            </Text>
            <Text className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
              Buy Price
            </Text>
            <Text className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
              Sell Price
            </Text>
            <Text className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
              {" "}
              Status
            </Text>
            <Text className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider text-right hidden">
              Expiry Date
            </Text>
            <Text className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
              Created At
            </Text>
            <Text className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
              Updated At
            </Text>
            <Text className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
              Actions
            </Text>
          </View>

          {/* Table Body Content Rows */}
          <View>
            {products.map((product) => {
              // const isLow = product.stock <= 25;
              return (
                <View
                  key={product.id}
                  className="flex-row items-center px-4 py-3 border-b border-slate-100"
                >
                  {/* Column 1: Core Product Meta (Image + Name) */}
                  <View className="flex-1 flex-row items-center pr-2">
                    <Image
                      source={{ uri: product.images[0]?.url }}
                      className="h-10 w-10 rounded-sm bg-slate-100"
                    />
                    <View className="ml-3">
                      <Text className="text-sm font-bold text-slate-900  numberOfLines={1}">
                        {product.name}
                      </Text>
                      <Text className="text-[10px] font-semibold text-gray-500">
                        SKU: {product.barCode}
                      </Text>
                    </View>
                  </View>

                  <Text
                    className={`text-[10px] font-medium bg-gray-200 py-1 rounded-md px-2 ${getCategoryColor(product.category?.name)}`}
                  >
                    {product.category?.name}
                  </Text>

                  <Text className="flex-1 text-xs font-medium text-slate-600 text-right pr-2">
                    {formatRwf(parseFloat(product.buyingPrice))}
                  </Text>

                  <Text className="flex-1 text-xs font-bold text-emerald-700 text-right pr-2">
                    {formatRwf(parseFloat(product.sellingPrice))}
                  </Text>

                  <Text
                    className={`text-[10px] font-medium bg-gray-200 py-1 rounded-md px-2 ${
                      product.active ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {product.active ? "Active" : "Inactive"}
                  </Text>
                  <Text className="flex-1 text-xs font-medium text-slate-600 text-right pr-2">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </Text>
                  <Text className="flex-1 text-xs font-medium text-slate-600 text-right pr-2">
                    {new Date(product.updatedAt).toLocaleDateString()}
                  </Text>

                  <View className="flex-row items-end gap-2">
                    <TouchableOpacity className="p-2 bg-gray-50 active:bg-gray-100 rounded-lg">
                      <Pen size={14} color="#4b5563" />
                    </TouchableOpacity>
                    <TouchableOpacity className="p-2 bg-gray-50 active:bg-gray-100 rounded-lg">
                      <Trash size={14} color="#4b5563" />
                    </TouchableOpacity>
                  </View>

                  {/* Column 5: Inventory Metric Tag */}
                  {/* <View className="flex-1 items-end">
                    <View
                      className={`px-2.5 py-1 rounded-lg ${isLow ? "bg-rose-50" : "bg-slate-50"}`}
                    >
                      <Text
                        className={`text-xs font-bold ${isLow ? "text-rose-600" : "text-slate-800"}`}
                      >
                        {product.stock} Pcs
                      </Text>
                    </View>
                    {isLow && (
                      <Text className="text-[8px] font-black text-rose-400 uppercase mt-0.5 tracking-tighter">
                        Low Stock
                      </Text>
                    )}
                  </View> */}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
