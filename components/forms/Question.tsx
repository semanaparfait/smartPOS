import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

// One yes/no question, with what each answer means.
export default function Question({
  icon,
  title,
  yes,
  no,
  value,
  onChange,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  yes: string;
  no: string;
  value: boolean;
  onChange: (value: boolean) => void;
  children?: React.ReactNode;
}) {
  const answer = (on: boolean, label: string, hint: string, v: boolean) => (
    <Pressable
      onPress={() => onChange(v)}
      accessibilityState={{ selected: on }}
      className={`flex-1 min-w-[160px] rounded-xl border p-3.5 ${on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
    >
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={16} color={on ? brand.lime : brand.inkMuted} />
        <Text className={`text-[14px] font-semibold ${on ? "text-white" : "text-ink"}`}>{label}</Text>
      </View>
      <Text className={`text-xs mt-1 ${on ? "text-white/60" : "text-ink/50"}`}>{hint}</Text>
    </Pressable>
  );

  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-5" style={{ gap: 14 }}>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View className="w-9 h-9 rounded-xl bg-ivory items-center justify-center">
          <Ionicons name={icon} size={17} color={brand.ink} />
        </View>
        <Text className="text-ink text-[15px] font-semibold flex-1">{title}</Text>
      </View>
      <View className="flex-row flex-wrap" style={{ gap: 10 }}>
        {answer(value, tr("Yes"), yes, true)}
        {answer(!value, tr("No"), no, false)}
      </View>
      {children}
    </View>
  );
}
