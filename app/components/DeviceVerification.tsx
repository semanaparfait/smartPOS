import { BrandMark, Rise } from "@/components/brand";
import { brand, brandLogos } from "@/config/theme";
import useDeviceInfo, { type DeviceCheckResult } from "@/store/Device/useDeviceInfo";
import { fetchUniversalDeviceInfo } from "@/utils/device";
import { Check, Lock } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StatusBar,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  onComplete?: (result: DeviceCheckResult) => void;
};

const STEPS = ["Identifying device", "Verifying with SmartPOS"];
const RING_DURATION = 2400;
const BAR_WIDTH = 160;

// One lime ring that grows and fades out, looping forever.
function PulseRing({ delay }: { delay: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: RING_DURATION,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, progress]);

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute w-32 h-32 rounded-[36px] border-2 border-lime"
      style={{
        opacity: progress.interpolate({
          inputRange: [0, 0.15, 1],
          outputRange: [0, 0.5, 0],
        }),
        transform: [
          {
            scale: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.9],
            }),
          },
        ],
      }}
    />
  );
}

// Indeterminate progress bar: a lime segment sliding across a faint track.
function LoadingBar() {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(slide, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [slide]);

  return (
    <View
      className="h-1 rounded-full bg-white/10 overflow-hidden"
      style={{ width: BAR_WIDTH }}
    >
      <Animated.View
        className="h-1 rounded-full bg-lime"
        style={{
          width: BAR_WIDTH * 0.4,
          transform: [
            {
              translateX: slide.interpolate({
                inputRange: [0, 1],
                outputRange: [-BAR_WIDTH * 0.4, BAR_WIDTH],
              }),
            },
          ],
        }}
      />
    </View>
  );
}

export default function DeviceVerification({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();

  const { checkDevice } = useDeviceInfo();

  useEffect(() => {
    let isMounted = true;

    const verifyDevice = async () => {
      try {
        // Fetch hardware machine ID on desktop or mobile device ID on Android
        const info = await fetchUniversalDeviceInfo();
        console.log("Verifying hardware ID:", info.deviceId);
        if (isMounted) setStep(1);

        const result = await checkDevice(info.deviceId);

        if (isMounted) {
          setStep(2);
          onComplete?.(result);
          if (!result.registered || !result.company) {
            console.warn("Device not recognized or missing company access");
          } else {
            console.log("Device verified successfully");
          }
        }
      } catch (error) {
        console.error("Verification error:", error);
        if (isMounted) {
          onComplete?.({ registered: false, company: false, deviceType: useDeviceInfo.getState().deviceType });
        }
      }
    };

    verifyDevice();

    return () => {
      isMounted = false;
    };
  }, [checkDevice, onComplete]);

  return (
    <View
      className="flex-1 bg-ink items-center justify-center px-6 overflow-hidden"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <StatusBar barStyle="light-content" backgroundColor={brand.ink} />

      {/* Faint oversized mark in the corner, like the other brand screens */}
      <View className="absolute -right-24 -bottom-28 opacity-[0.05]">
        <View style={{ transform: [{ rotate: "-12deg" }] }}>
          <BrandMark size={380} receipt={brand.lime} check={brand.ink} />
        </View>
      </View>
      <View className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full border border-white/5" />

      <View className="items-center">
        {/* Mark with pulsing rings */}
        <View className="w-32 h-32 items-center justify-center">
          <PulseRing delay={0} />
          <PulseRing delay={RING_DURATION / 2} />
          <View className="w-32 h-32 rounded-[36px] bg-white/5 border border-white/10 items-center justify-center">
            <BrandMark size={72} receipt={brand.lime} check={brand.ink} />
          </View>
        </View>

        <Rise delay={100}>
          <Image
            source={brandLogos.dark}
            style={{ width: 168, height: 49, marginTop: 40 }}
            resizeMode="contain"
            accessibilityLabel="SmartPOS"
          />
        </Rise>

        <Rise delay={200}>
          <View className="mt-10 w-64 gap-3.5">
            {STEPS.map((label, i) => {
              const done = step > i;
              const active = step === i;
              return (
                <View key={label} className="flex-row items-center gap-3">
                  <View className="w-6 h-6 items-center justify-center">
                    {done ? (
                      <View className="w-5 h-5 rounded-full bg-lime items-center justify-center">
                        <Check size={12} color={brand.ink} strokeWidth={3} />
                      </View>
                    ) : active ? (
                      <ActivityIndicator size="small" color={brand.lime} />
                    ) : (
                      <View className="w-2 h-2 rounded-full bg-white/25" />
                    )}
                  </View>
                  <Text
                    className={`text-sm font-semibold ${
                      done
                        ? "text-white/60"
                        : active
                          ? "text-white"
                          : "text-white/35"
                    }`}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </Rise>
      </View>

      <View
        className="absolute left-0 right-0 items-center gap-3"
        style={{ bottom: insets.bottom + 32 }}
      >
        <LoadingBar />
        <View className="flex-row items-center gap-1.5">
          <Lock size={11} color="rgba(255,255,255,0.4)" />
          <Text className="text-white/40 text-[11px] font-medium">
            Secure connection
          </Text>
        </View>
      </View>
    </View>
  );
}
