import React, { useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddProduct() {
  const [product, setProduct] = useState({
    name: "",
    buyPrice: "",
    sellPrice: "",
    inStock: "",
    expireDate: "",
    image: null,
    qrCode: "",
  });

  const handleSave = () => {
    console.log("Product Data:", product);
    // Logic to save to database or API goes here
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 p-5">
      <Text className="text-2xl font-black mb-5 text-slate-800">
        Add New Product
      </Text>

      {/* Image Picker Placeholder */}
      <TouchableOpacity className="h-44 bg-slate-200 rounded-xl justify-center items-center border border-dashed border-slate-300 mb-5">
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            className="w-full h-full rounded-xl"
          />
        ) : (
          <Text className="text-slate-500">+ Tap to Add Product Image</Text>
        )}
      </TouchableOpacity>

      {/* Form Fields */}
      <View className="mb-10">
        <Text className="text-sm font-semibold text-slate-600 mb-2">
          Product Name
        </Text>
        <TextInput
          className="bg-white p-3 rounded-lg border border-slate-200 mb-4 text-base"
          placeholder="e.g. Organic Coffee"
          onChangeText={(val) => setProduct({ ...product, name: val })}
        />

        <View className="flex-row justify-between">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-600 mb-2">
              Buy Price (RWF)
            </Text>
            <TextInput
              className="bg-white p-3 rounded-lg border border-slate-200 mb-4 text-base"
              keyboardType="numeric"
              placeholder="0.00"
              onChangeText={(val) => setProduct({ ...product, buyPrice: val })}
            />
          </View>
          <View className="flex-1 ml-2.5">
            <Text className="text-sm font-semibold text-slate-600 mb-2">
              Sell Price (RWF)
            </Text>
            <TextInput
              className="bg-white p-3 rounded-lg border border-slate-200 mb-4 text-base"
              keyboardType="numeric"
              placeholder="0.00"
              onChangeText={(val) => setProduct({ ...product, sellPrice: val })}
            />
          </View>
        </View>

        <View className="flex-row justify-between">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-600 mb-2">
              In Stock Qty
            </Text>
            <TextInput
              className="bg-white p-3 rounded-lg border border-slate-200 mb-4 text-base"
              keyboardType="number-pad"
              placeholder="0"
              onChangeText={(val) => setProduct({ ...product, inStock: val })}
            />
          </View>
          <View className="flex-1 ml-2.5">
            <Text className="text-sm font-semibold text-slate-600 mb-2">
              Expiry Date
            </Text>
            <TextInput
              className="bg-white p-3 rounded-lg border border-slate-200 mb-4 text-base"
              placeholder="YYYY-MM-DD"
              onChangeText={(val) =>
                setProduct({ ...product, expireDate: val })
              }
            />
          </View>
        </View>

        <Text className="text-sm font-semibold text-slate-600 mb-2">
          QR Code / Barcode
        </Text>
        <TextInput
          className="bg-white p-3 rounded-lg border border-slate-200 mb-4 text-base"
          placeholder="Scan or enter code manually"
          onChangeText={(val) => setProduct({ ...product, qrCode: val })}
        />

        <TouchableOpacity
          className="bg-emerald-600 p-4 rounded-lg items-center mt-2.5"
          onPress={handleSave}
        >
          <Text className="text-white text-lg font-bold">Save Product</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
