import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import { readScannedCode } from "@/utils/deliveryProof";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

// Full-screen camera that reads the QR on the customer's phone and hands back
// the code inside it. Typing the code stays possible if this doesn't work.
export default function CodeScanner({
  visible,
  orderId,
  onCode,
  onClose,
}: {
  visible: boolean;
  orderId: string;
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [problem, setProblem] = useState<string | null>(null);
  // One QR read per opening: the camera reports the same code many times a second.
  const done = useRef(false);

  useEffect(() => {
    if (!visible) return;
    done.current = false;
    setProblem(null);
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [visible, permission, requestPermission]);

  const onScan = ({ data }: { data: string }) => {
    if (done.current) return;
    const read = readScannedCode(data, orderId);
    if ("code" in read) {
      done.current = true;
      onCode(read.code);
    } else {
      setProblem(read.error);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-ink">
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={onScan}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-8" style={{ gap: 14 }}>
            <Ionicons name="camera-outline" size={36} color={brand.lime} />
            <Text className="text-white text-[15px] text-center">
              {tr("Allow the camera to scan the customer's QR.")}
            </Text>
            <Pressable onPress={requestPermission} className="h-12 px-5 rounded-xl bg-lime items-center justify-center active:bg-lime-dark">
              <Text className="text-ink text-sm font-semibold">{tr("Allow camera")}</Text>
            </Pressable>
          </View>
        )}

        {/* Aim box and help */}
        {permission?.granted && (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <View style={{ width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: brand.lime }} />
            <Text className="text-white text-[14px] mt-5 px-8 text-center">
              {problem ?? tr("Point at the QR on the customer's phone")}
            </Text>
          </View>
        )}

        <Pressable
          onPress={onClose}
          accessibilityLabel={tr("Close")}
          className="absolute top-10 right-6 w-11 h-11 rounded-full bg-white items-center justify-center active:bg-ivory"
        >
          <Ionicons name="close" size={22} color={brand.ink} />
        </Pressable>
        <Pressable
          onPress={onClose}
          className="absolute bottom-10 self-center h-12 px-5 rounded-xl bg-white/15 items-center justify-center active:bg-white/25"
        >
          <Text className="text-white text-sm font-semibold">{tr("Type the code instead")}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
