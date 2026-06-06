import useDeviceInfo from "@/store/Device/useDeviceInfo";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StatusBar,
  Text,
  View,
} from "react-native";
import DeviceInfo from "react-native-device-info";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  onComplete?: (result: { registered: boolean; company: boolean }) => void;
};

export default function DeviceVerification({ onComplete }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const { checkDevice } = useDeviceInfo();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.04,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fade, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 900,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fade, {
            toValue: 0.9,
            duration: 900,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, [scale, fade]);

  useEffect(() => {
    const verifyDevice = async () => {
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        const result = await checkDevice(deviceId);
        onComplete?.(result);
        if (!result.registered || !result.company) {
          console.warn("Device not recognized or missing company access");
        } else {
          console.log("Device verified successfully");
        }
      } catch (error) {
        console.log("Verification error:", error);
        onComplete?.({ registered: false, company: false });
      }
    };

    verifyDevice();
  }, [checkDevice, onComplete]);

  return (
    <SafeAreaView className="flex-1 bg-navy-900 items-center justify-center px-6">
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={{ transform: [{ scale }], opacity: fade }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-navy-900/70 to-slate-900/60 p-8"
      >
        <View className="items-center">
          <View className="rounded-full bg-gold-500/10 p-4 mb-4 border border-gold-600/20">
            <Ionicons name="shield-checkmark" size={64} color="#D4AF37" />
          </View>

          <Text className="text-3xl font-serif text-white text-center">
            We are Verifying
          </Text>
          <Text className="text-3xl font-serif text-white text-center -mt-2">
            Your Device
          </Text>

          <Text className="mt-3 text-center text-slate-300 px-7 leading-6">
            Please wait while we securely verify your device. This should only
            take a few seconds.
          </Text>

          <View className="mt-6 items-center">
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text className="mt-3 text-xs text-slate-400 tracking-wider">
              Checking device integrity
            </Text>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
