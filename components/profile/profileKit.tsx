// Shared pieces for the self-service profile pages (staff and owner).
import { PageHeader } from "@/app/components/ownerComponents/FormKit";
import { brand } from "@/config/theme";
import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

export const PIN_LENGTH = 6;

// Same rule as the backend: repeated (111111) or sequential (123456, 987654).
export const isWeakPin = (pin: string) => {
  const digits = [...pin].map(Number);
  const steps = new Set(digits.slice(1).map((d, i) => d - digits[i]));
  return steps.size === 1 && [0, 1, -1].includes([...steps][0]);
};

// Page frame for a single profile task: back button, title, narrow form column.
export function ProfilePage({
  eyebrow = "My profile",
  title,
  subtitle,
  fallback = "/(tabs)/profile/profile",
  wide,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  // Where Back goes when the page was opened directly (no history).
  fallback?: Href;
  // Room for a two-column layout instead of a single form column.
  wide?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(fallback));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-ivory"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} onBack={goBack} />
        <View style={{ maxWidth: wide ? 1080 : 560, width: "100%", gap: 12 }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View className="flex-row items-center">
      <Ionicons
        name={ok ? "checkmark-circle" : "ellipse-outline"}
        size={14}
        color={ok ? brand.success : brand.inkDisabled}
      />
      <Text className={`text-xs ml-2 ${ok ? "text-ink" : "text-ink/50"}`}>{label}</Text>
    </View>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View className="flex-row items-start bg-danger/10 rounded-xl px-3.5 py-3">
      <Ionicons name="alert-circle-outline" size={16} color={brand.danger} />
      <Text className="flex-1 text-[13px] ml-2" style={{ color: brand.danger }}>
        {message}
      </Text>
    </View>
  );
}
