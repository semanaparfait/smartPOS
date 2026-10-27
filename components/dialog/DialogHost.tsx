import { brand } from "@/config/theme";
import useDialog, { type DialogTone } from "@/store/Dialog/useDialog";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, Text, View } from "react-native";

const TONE: Record<
  DialogTone,
  {
    icon: keyof typeof Ionicons.glyphMap;
    ring: string;
    badge: string;
    fg: string;
    confirm: string;
    confirmText: string;
  }
> = {
  danger: {
    icon: "trash-outline",
    ring: "bg-danger/10",
    badge: "bg-danger/20",
    fg: brand.danger,
    confirm: "bg-danger active:opacity-80",
    confirmText: "text-white",
  },
  warning: {
    icon: "warning-outline",
    ring: "bg-ivory",
    badge: "bg-ink",
    fg: brand.lime,
    confirm: "bg-ink active:bg-ink-soft",
    confirmText: "text-white",
  },
  success: {
    icon: "checkmark-circle-outline",
    ring: "bg-success/10",
    badge: "bg-success/20",
    fg: brand.success,
    confirm: "bg-ink active:bg-ink-soft",
    confirmText: "text-white",
  },
  info: {
    icon: "information-circle-outline",
    ring: "bg-lime/20",
    badge: "bg-lime",
    fg: brand.ink,
    confirm: "bg-lime active:bg-lime-dark",
    confirmText: "text-ink",
  },
};

// Renders the active dialog from useDialog. Mount once at the app root.
export default function DialogHost() {
  const { current, close } = useDialog();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [current, anim]);

  if (!current) return null;

  const tone = TONE[current.tone ?? "info"];
  const hasCancel = !!current.cancelLabel;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => close(false)}>
      <Pressable
        onPress={() => close(false)}
        accessibilityLabel="Dismiss"
        className="flex-1 bg-ink/60 items-center justify-center p-6"
      >
        <Animated.View
          style={{
            width: "100%",
            maxWidth: 400,
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
          }}
        >
          {/* Stops taps on the card from dismissing it */}
          <Pressable
            accessibilityRole="alert"
            className="bg-white rounded-3xl overflow-hidden"
            onPress={() => {}}
          >
            <View className="items-center px-6 pt-7 pb-5">
              <View className={`w-16 h-16 rounded-full items-center justify-center ${tone.ring}`}>
                <View className={`w-11 h-11 rounded-full items-center justify-center ${tone.badge}`}>
                  <Ionicons name={tone.icon} size={22} color={tone.fg} />
                </View>
              </View>
              <Text className="text-ink text-[18px] font-extrabold tracking-tight text-center mt-4">
                {current.title}
              </Text>
              <Text className="text-ink/55 text-[13px] leading-5 text-center mt-1.5">
                {current.message}
              </Text>
            </View>

            <View
              className={`px-6 pb-6 ${hasCancel ? "flex-row" : ""}`}
              style={{ gap: 10 }}
            >
              {hasCancel && (
                <Pressable
                  onPress={() => close(false)}
                  className="flex-1 h-12 rounded-xl items-center justify-center border border-ink/10 active:bg-ivory"
                >
                  <Text className="text-ink text-[14px] font-bold">{current.cancelLabel}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => close(true)}
                className={`${hasCancel ? "flex-1" : ""} h-12 rounded-xl items-center justify-center ${tone.confirm}`}
              >
                <Text className={`text-[14px] font-bold ${tone.confirmText}`}>
                  {current.confirmLabel ?? "OK"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
