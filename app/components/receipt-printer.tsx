import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { brand } from "@/config/theme";
import {
  playPrintSound,
  preloadPrintSound,
  stopPrintSound,
} from "@/utils/printSound";
import ReceiptCard from "./receipt-card";

type Stage = "processing" | "printing" | "complete";

// Timing mirrors a thermal printer: a short "processing" pause, then the
// paper feeds out in discrete line steps instead of one smooth slide.
const PROCESSING_MS = 900;
const FEED_MS = 1750;
const FEED_STEPS = 20;

const statusCopy: Record<Stage, string> = {
  processing: "Processing order...",
  printing: "Printing receipt...",
  complete: "Receipt printed",
};

type ReceiptPrinterProps = {
  order?: any;
  cashierName?: string;
  shiftName?: string;
  paymentLabel?: string;
  cutoutColor?: string;
};

export default function ReceiptPrinter({
  order,
  cashierName,
  shiftName,
  paymentLabel,
  cutoutColor = brand.ivory,
}: ReceiptPrinterProps) {
  const [stage, setStage] = useState<Stage>("processing");
  const [paperHeight, setPaperHeight] = useState(0);
  const [runId, setRunId] = useState(0);
  const feed = useRef(new Animated.Value(0)).current;
  const statusAnim = useRef(new Animated.Value(1)).current;

  const measured = paperHeight > 0;
  const canHaptic = Platform.OS !== "web";

  useEffect(() => {
    preloadPrintSound();
  }, []);

  // Run the print sequence once the paper is measured, and again on reprint.
  useEffect(() => {
    if (!order || !measured) return;

    let cancelled = false;
    let feedAnimation: Animated.CompositeAnimation | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;

    feed.setValue(0);
    setStage("processing");

    const startTimer = setTimeout(async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(
        () => false,
      );
      if (cancelled) return;

      if (reduceMotion) {
        feed.setValue(1);
        setStage("complete");
        return;
      }

      setStage("printing");
      playPrintSound();
      const stepMs = FEED_MS / FEED_STEPS;

      if (canHaptic) {
        tickTimer = setInterval(() => {
          Haptics.selectionAsync().catch(() => {});
        }, stepMs);
      }

      feedAnimation = Animated.sequence(
        Array.from({ length: FEED_STEPS }).flatMap((_, i) => [
          Animated.timing(feed, {
            toValue: (i + 1) / FEED_STEPS,
            duration: stepMs * 0.55,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.delay(stepMs * 0.45),
        ]),
      );

      feedAnimation.start(({ finished }) => {
        if (tickTimer) clearInterval(tickTimer);
        if (!finished || cancelled) return;
        setStage("complete");
        if (canHaptic) {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
        }
      });
    }, PROCESSING_MS);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (tickTimer) clearInterval(tickTimer);
      feedAnimation?.stop();
      stopPrintSound();
    };
  }, [order?.id, measured, runId]);

  // Fade + nudge the status line whenever the stage changes.
  useEffect(() => {
    statusAnim.setValue(0);
    Animated.timing(statusAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [stage]);

  const paperTranslate = feed.interpolate({
    inputRange: [0, 1],
    outputRange: [-paperHeight, 0],
  });
  const paperOpacity = feed.interpolate({
    inputRange: [0, 0.02],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const isComplete = stage === "complete";

  return (
    <View>
      {/* Printer housing */}
      <View
        className="bg-ink rounded-3xl px-4 pt-4 pb-3"
        style={{
          shadowColor: brand.ink,
          shadowOpacity: 0.25,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        }}
      >
        {/* Display */}
        <View className="bg-navy-950 rounded-xl px-4 py-3 flex-row items-center justify-between border border-white/5">
          <Animated.View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              opacity: statusAnim,
              transform: [
                {
                  translateY: statusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 0],
                  }),
                },
                {
                  scale: statusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            }}
          >
            {isComplete ? (
              <Ionicons name="checkmark-circle" size={18} color={brand.lime} />
            ) : (
              <ActivityIndicator size="small" color={brand.lime} />
            )}
            <Text
              className={`text-xs font-bold ml-2.5 tracking-wide ${isComplete ? "text-lime" : "text-white/80"}`}
              accessibilityLiveRegion="polite"
            >
              {statusCopy[stage]}
            </Text>
          </Animated.View>

          {isComplete ? (
            <Pressable
              onPress={() => setRunId((id) => id + 1)}
              className="flex-row items-center rounded-lg bg-white/10 px-2.5 py-1.5 active:bg-white/20"
            >
              <Ionicons name="refresh" size={12} color={brand.white} />
              <Text className="text-white text-[11px] font-bold ml-1">
                Reprint
              </Text>
            </Pressable>
          ) : (
            <View className="flex-row" style={{ gap: 4 }}>
              <View className="w-1.5 h-1.5 rounded-full bg-lime" />
              <View
                className={`w-1.5 h-1.5 rounded-full ${stage === "printing" ? "bg-lime" : "bg-white/20"}`}
              />
            </View>
          )}
        </View>

        {/* Paper slot */}
        <View className="mt-4 mx-2 h-2.5 rounded-full bg-navy-950 border-t border-black/40" />
      </View>

      {/* Paper output — clipped at the slot so the receipt feeds out of it */}
      <View className="mx-4 overflow-hidden pb-6">
        <Animated.View
          onLayout={(e) => setPaperHeight(e.nativeEvent.layout.height)}
          style={{
            opacity: measured ? paperOpacity : 0,
            transform: [{ translateY: measured ? paperTranslate : 0 }],
          }}
          accessibilityElementsHidden={!isComplete}
          importantForAccessibility={isComplete ? "auto" : "no-hide-descendants"}
        >
          <ReceiptCard
            order={order}
            cashierName={cashierName}
            shiftName={shiftName}
            paymentLabel={paymentLabel}
            cutoutColor={cutoutColor}
          />
        </Animated.View>

        {/* Shadow cast by the slot onto the emerging paper */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(32,40,59,0.28)", "rgba(32,40,59,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18 }}
        />
      </View>
    </View>
  );
}
