import { brand } from "@/config/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

// Summary tile used at the top of owner pages (products, categories, workers).
export default function StatCard({
  icon,
  label,
  value,
  hint,
  dark,
  width,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint: string;
  dark?: boolean;
  width: any;
}) {
  return (
    <View
      style={{ width }}
      className={`rounded-2xl p-5 border ${dark ? "bg-ink border-ink" : "bg-white border-ink/5"}`}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-[11px] font-bold uppercase tracking-[2px] ${dark ? "text-white/50" : "text-ink/40"}`}
        >
          {label}
        </Text>
        <View
          className={`w-9 h-9 rounded-xl items-center justify-center ${dark ? "bg-lime" : "bg-ivory"}`}
        >
          <Ionicons name={icon} size={17} color={brand.ink} />
        </View>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        className={`text-[28px] font-extrabold tracking-tight mt-2 ${dark ? "text-lime" : "text-ink"}`}
      >
        {value}
      </Text>
      <Text className={`text-xs mt-1 ${dark ? "text-white/50" : "text-ink/40"}`}>{hint}</Text>
    </View>
  );
}

// Width for a 4-up stat row that collapses to 2-up and 1-up.
export const statCardWidth = (screenWidth: number) =>
  screenWidth >= 1300 ? "23.8%" : screenWidth >= 900 ? "48.9%" : "100%";
