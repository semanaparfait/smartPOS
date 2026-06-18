import useCategory from "@/store/category/useCategory";
import useProduct from "@/store/products/useProduct";
import { playBeep } from "@/utils/beep";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function AddProduct() {
  const { categoriesResponse } = useCategory();
  const { addProduct } = useProduct();

  const [product, setProduct] = useState({
    name: "",
    buyingPrice: 0,
    categoryId: "",
    sellingPrice: 0,
    pictures: [] as any[],
    barCode: "",
    // inStock: "0",
    // expireDate: "",
  });

  const [isScannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const image = result.assets[0];
      setProduct((prev) => ({
        ...prev,
        pictures: [...prev.pictures, image],
      }));
    }
  };

  const removeImage = (indexToRemove: number) => {
    setProduct((prev) => ({
      ...prev,
      pictures: prev.pictures.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    await playBeep();
    setProduct({ ...product, barCode: data });
    setScannerVisible(false);
    setScanned(false);
  };

  const handleSave = async () => {
    if (!product.name || !product.categoryId) {
      Toast.show({
        type: "error",
        text1: "Missing information",
        text2: "Please fill in the product name and select a category.",
      });
      return;
    }

    if (product.pictures.length === 0) {
      Toast.show({
        type: "error",
        text1: "Image Required",
        text2: "Please select at least one product picture.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", product.name);
      formData.append("buyingPrice", String(product.buyingPrice));
      formData.append("sellingPrice", String(product.sellingPrice));
      formData.append("categoryId", product.categoryId);
      formData.append("barCode", product.barCode);

      // If backend handles multiple images:
      product.pictures.forEach((img: any, i) => {
        formData.append("pictures", {
          uri: img.uri,
          name: `product_${i}.jpg`,
          type: "image/jpeg",
        } as any);
      });

      await addProduct(formData);
      Alert.alert("Success", "Product saved successfully!");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong while saving the product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="p-5">
        <Text className="text-2xl font-black mb-6 text-slate-900 tracking-tight">
          Add New Product
        </Text>

        {/* Product Media Manager Section */}
        <Text className="text-sm font-bold text-slate-700 mb-2">
          Product Images
        </Text>
        <View className="flex-row flex-wrap gap-3 mb-5">
          <TouchableOpacity
            onPress={pickImage}
            className="w-20 h-20 bg-slate-200/60 border border-dashed border-slate-300 rounded-xl items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="camera-outline" size={26} color="#64748b" />
            <Text className="text-[10px] text-slate-500 font-medium mt-1">
              Add Photo
            </Text>
          </TouchableOpacity>

          {product.pictures.map((img: any, index) => (
            <View
              key={index}
              className="w-20 h-20 relative bg-white border border-slate-100 rounded-xl shadow-sm"
            >
              <Image
                source={{ uri: img.uri }} // Fixed nesting issue
                className="w-full h-full rounded-xl"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => removeImage(index)}
                className="absolute -top-1.5 -right-1.5 bg-rose-500 w-5 h-5 rounded-full items-center justify-center shadow-md"
              >
                <Ionicons name="close" size={12} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Core Info Input Fields */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-slate-700 mb-1.5">
            Product Name
          </Text>
          <TextInput
            className="bg-white p-3.5 rounded-xl outline-none border border-slate-200 text-slate-900 text-base shadow-sm"
            placeholder="e.g. Organic Coffee"
            placeholderTextColor="#94a3b8"
            onChangeText={(val) => setProduct({ ...product, name: val })}
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-bold text-slate-700 mb-1.5">
            Category
          </Text>
          <View className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <Picker
              className="bg-white p-3 rounded-lg border border-slate-200  text-base flex-1 mt-6"
              selectedValue={product.categoryId}
              onValueChange={(val: string) =>
                setProduct({ ...product, categoryId: val })
              }
              style={{ marginVertical: -2 }}
            >
              <Picker.Item label="Select Category" value="" color="#94a3b8" />
              {categoriesResponse?.map((category) => (
                <Picker.Item
                  key={category.id}
                  label={category.name}
                  value={category.id}
                  color="#0f172a"
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Pricing Rows Grid */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-700 mb-1.5">
              Buy Price (RWF)
            </Text>
            <TextInput
              className="bg-white p-3.5 rounded-xl outline-none border border-slate-200 text-base text-slate-900 shadow-sm"
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              onChangeText={(val) =>
                setProduct({ ...product, buyingPrice: Number(val) || 0 })
              }
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-700 mb-1.5">
              Sell Price (RWF)
            </Text>
            <TextInput
              className="bg-white p-3.5 rounded-xl outline-none border border-slate-200 text-base text-slate-900 shadow-sm"
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              onChangeText={(val) =>
                setProduct({ ...product, sellingPrice: Number(val) || 0 })
              }
            />
          </View>
        </View>

        {/* Inventory Rows Grid */}
        {/* <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-700 mb-1.5">Quantity In Stock</Text>
            <TextInput
              className="bg-white p-3.5 rounded-xl border border-slate-200 text-base text-slate-900 shadow-sm"
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              value={product.inStock}
              onChangeText={(val) => setProduct({ ...product, inStock: val })}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-700 mb-1.5">Expiry Date</Text>
            <TextInput
              className="bg-white p-3.5 rounded-xl border border-slate-200 text-base text-slate-900 shadow-sm"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              value={product.expireDate}
              onChangeText={(val) => setProduct({ ...product, expireDate: val })}
            />
          </View>
        </View> */}

        {/* Scan & Barcode Input Field Row */}
        {/* Scan & Barcode Input Field Row */}
        <View className="mb-6">
          <Text className="text-sm font-bold text-slate-700 mb-1.5">
            QR Code / Barcode
          </Text>

          <View className="flex-row items-center bg-white border border-slate-200 rounded-xl pr-4 shadow-sm">
            <TextInput
              className="flex-1 p-3.5 text-base text-slate-900 outline-none"
              placeholder="Scan or enter code"
              placeholderTextColor="#94a3b8"
              value={product.barCode}
              onChangeText={(val) => setProduct({ ...product, barCode: val })}
            />

            <TouchableOpacity
              onPress={async () => {
                const { status } = await requestPermission();
                if (status === "granted") {
                  setScannerVisible(true);
                } else {
                  Alert.alert(
                    "Permission Denied",
                    "We need camera access to scan codes.",
                  );
                }
              }}
              className="p-1"
            >
              <Ionicons name="camera-outline" size={24} color="#059669" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Submission Action Control Button */}
        <TouchableOpacity
          className={`p-4 rounded-xl items-center shadow-md ${isSubmitting ? "bg-emerald-700" : "bg-emerald-600 active:bg-emerald-700"}`}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-lg font-bold">Save Product</Text>
          )}
        </TouchableOpacity>
      </View>
      {/* MODAL SCANNER OVERLAY SYSTEM */}     {" "}
      <Modal visible={isScannerVisible} animationType="slide">
        <View className="flex-1 bg-black">
           
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "code128"],
            }}
          />
                    {/* Overlay UI */} 
          <View className="flex-1 justify-center items-center">
               
            <View className="w-64 h-64 border-2 border-white/50 rounded-3xl" /> 
             
            <Text className="text-white mt-5 bg-black/40 px-4 py-2 rounded-full">
                            Align code within the frame    
            </Text>
             
          </View>
           
          <TouchableOpacity
            className="absolute top-12 left-6 bg-white/20 p-2 rounded-full"
            onPress={() => setScannerVisible(false)}
          >
                        <Ionicons name="close" size={30} color="white" />       
             {" "}
          </TouchableOpacity>
        </View>
             {" "}
      </Modal>
    </ScrollView>
  );
}
