import React, { useState } from "react";
import { playBeep } from "@/utils/beep";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import ProductImagePicker from "@/app/components/ownerComponents/ProductImagePicker";

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

  const [isScannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Function called when a QR/Barcode is detected
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setProduct({ ...product, qrCode: data });
    setScannerVisible(false); // Close camera after success
    Alert.alert("Success", `Scanned Code: ${data}`);
  };

  const handleSave = async () => {
    console.log("Saving Product:", product);
    await playBeep(); // Play beep sound
    Alert.alert("Saved", `${product.name} has been added to inventory.`);
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 p-5">
      <Text className="text-2xl font-black mb-5 text-slate-800">Add New Product</Text>

      {/* Image Placeholder */}
      <ProductImagePicker />

      <View className="mb-10">
        <Text className="text-sm font-semibold text-slate-600 mb-2">Product Name</Text>
        <TextInput
          className="bg-white p-3 rounded-lg border border-slate-200 mb-4 text-base"
          placeholder="e.g. Organic Coffee"
          onChangeText={(val) => setProduct({ ...product, name: val })}
        />

        {/* Pricing Row */}
        <View className="flex-row justify-between">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-semibold text-slate-600 mb-2">Buy Price (RWF)</Text>
            <TextInput
              className="bg-white p-3 rounded-lg border border-slate-200 mb-4 text-base"
              keyboardType="numeric"
              placeholder="0"
              onChangeText={(val) => setProduct({ ...product, buyPrice: val })}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-600 mb-2">Sell Price (RWF)</Text>
            <TextInput
              className="bg-white p-3 rounded-lg border border-slate-200 mb-4 text-base"
              keyboardType="numeric"
              placeholder="0"
              onChangeText={(val) => setProduct({ ...product, sellPrice: val })}
            />
          </View>
        </View>

        {/* Stock & Date Row */}
        <View className="flex-row justify-between">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-semibold text-slate-600 mb-2">In Stock</Text>
            <TextInput
              className="bg-white p-3 rounded-lg border border-slate-200 mb-4 text-base"
              keyboardType="number-pad"
              placeholder="0"
              onChangeText={(val) => setProduct({ ...product, inStock: val })}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-600 mb-2">Expiry Date</Text>
            <TextInput
              className="bg-white p-3 rounded-lg border border-slate-200 mb-4 text-base"
              placeholder="YYYY-MM-DD"
              onChangeText={(val) => setProduct({ ...product, expireDate: val })}
            />
          </View>
        </View>

        {/* QR CODE INPUT WITH SCANNER BUTTON */}
        <Text className="text-sm font-semibold text-slate-600 mb-2">QR Code / Barcode</Text>
        <View className="flex-row items-center bg-white border border-slate-200 rounded-lg pr-3 mb-6">
          <TextInput
            className="flex-1 p-3 text-base"
            placeholder="Scan or enter code"
            value={product.qrCode}
            onChangeText={(val) => setProduct({ ...product, qrCode: val })}
          />
          <TouchableOpacity 
            onPress={async () => {
              const { status } = await requestPermission();
              if (status === 'granted') {
                setScannerVisible(true);
              } else {
                Alert.alert("Permission Denied", "We need camera access to scan codes.");
              }
            }}
          >
            <Ionicons name="camera" size={28} color="#059669" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-emerald-600 p-4 rounded-xl items-center shadow-lg"
          onPress={handleSave}
        >
          <Text className="text-white text-lg font-bold">Save Product</Text>
        </TouchableOpacity>
      </View>

      {/* CAMERA SCANNER MODAL */}
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
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}