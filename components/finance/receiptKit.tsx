// Receipt photos for expenses: take or choose one, and look at it full size.
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import { secureUrl } from "@/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Image, Modal, Platform, Pressable, View, useWindowDimensions } from "react-native";
import Toast from "react-native-toast-message";

export type ReceiptPhoto = { uri: string; file: Blob | null };

// Receipts are long and narrow, so the photo is kept as taken (no square crop).
export async function pickReceipt(source: "camera" | "library"): Promise<ReceiptPhoto | null> {
  const useCamera = source === "camera" && Platform.OS !== "web";
  const { status } = useCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Toast.show({ type: "error", text1: tr(useCamera ? "Allow the camera to take a photo" : "Allow photo access to choose one") });
    return null;
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7 };
  const result = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  return { uri: result.assets[0].uri, file: (result.assets[0] as any).file ?? null };
}

// Small tap-to-open thumbnail of a proof.
export function ProofThumb({ url, onOpen, size = 44 }: { url: string; onOpen: () => void; size?: number }) {
  return (
    <Pressable onPress={onOpen} accessibilityLabel={tr("See the receipt")} className="rounded-lg overflow-hidden border border-ink/10 active:opacity-80">
      <Image source={{ uri: secureUrl(url) }} style={{ width: size, height: size }} resizeMode="cover" />
    </Pressable>
  );
}

// The receipt full screen. `url` null = hidden.
export function ProofViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-ink/90 items-center justify-center p-4">
        {url && (
          <Image source={{ uri: secureUrl(url) }} style={{ width: width - 32, height: height - 96 }} resizeMode="contain" />
        )}
        <View className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white items-center justify-center">
          <Ionicons name="close" size={20} color={brand.ink} />
        </View>
      </Pressable>
    </Modal>
  );
}
