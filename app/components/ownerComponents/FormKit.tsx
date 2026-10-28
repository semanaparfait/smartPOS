// Shared form building blocks for owner screens (employees, roles, ...).
import { brand } from "@/config/theme";
import type { ShiftType } from "@/store/Employee/EmployeeType";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, Image, Platform, Pressable, Text, TextInput, View } from "react-native";

const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

export const SHIFT_OPTIONS: { value: ShiftType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "DAY", label: "Day", icon: "sunny-outline" },
  { value: "EVENING", label: "Evening", icon: "partly-sunny-outline" },
  { value: "NIGHT", label: "Night", icon: "moon-outline" },
  { value: "HYBRID", label: "Hybrid", icon: "swap-horizontal-outline" },
];

export const initials = (name?: string) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  onBack,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 12 }}>
      <View className="flex-row items-center flex-1">
        {onBack && (
          <Pressable
            onPress={onBack}
            accessibilityLabel="Go back"
            className="w-10 h-10 rounded-xl bg-white border border-ink/10 items-center justify-center mr-3 active:bg-ivory"
          >
            <Ionicons name="arrow-back" size={18} color={brand.ink} />
          </Pressable>
        )}
        <View className="flex-1">
          <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2.4px]">{eyebrow}</Text>
          <Text numberOfLines={1} className="text-ink text-2xl font-extrabold tracking-tight">
            {title}
          </Text>
          {subtitle && <Text className="text-ink/50 text-[13px] mt-0.5">{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

export function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-5">
      <View className="flex-row items-center mb-4">
        <View className="w-9 h-9 rounded-xl bg-ivory items-center justify-center">
          <Ionicons name={icon} size={17} color={brand.ink} />
        </View>
        <View className="ml-3">
          <Text className="text-ink text-[15px] font-extrabold tracking-tight">{title}</Text>
          {subtitle && <Text className="text-ink/40 text-[11px] mt-0.5">{subtitle}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

export function Label({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text className="text-ink/60 text-[11px] font-bold uppercase tracking-wider mb-1.5">
      {children}
      {required && <Text style={{ color: brand.danger }}> *</Text>}
    </Text>
  );
}

export function Input({
  icon,
  suffix,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  icon?: keyof typeof Ionicons.glyphMap;
  suffix?: string;
}) {
  return (
    <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px]">
      {icon && <Ionicons name={icon} size={17} color={brand.inkDisabled} />}
      <TextInput
        placeholderTextColor={brand.inkDisabled}
        className={`flex-1 py-3 text-[15px] text-ink ${icon ? "ml-2.5" : ""}`}
        style={webNoOutline}
        {...props}
      />
      {suffix && <Text className="text-ink/40 text-xs font-bold ml-2">{suffix}</Text>}
    </View>
  );
}

export function TextArea(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View className="bg-ivory border border-ink/10 rounded-xl px-3.5">
      <TextInput
        placeholderTextColor={brand.inkDisabled}
        multiline
        textAlignVertical="top"
        className="py-3 text-[15px] text-ink min-h-[100px]"
        style={webNoOutline}
        {...props}
      />
    </View>
  );
}

// Single-choice pills, used instead of native pickers.
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: keyof typeof Ionicons.glyphMap }[];
  value: T | "";
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            className={`flex-row items-center px-3.5 h-10 rounded-xl border ${
              active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
            }`}
          >
            {option.icon && (
              <Ionicons name={option.icon} size={15} color={active ? brand.lime : brand.inkMuted} />
            )}
            <Text
              className={`text-[13px] font-bold ${option.icon ? "ml-1.5" : ""} ${active ? "text-white" : "text-ink"}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PrimaryButton({
  label,
  busyLabel,
  icon,
  busy,
  onPress,
}: {
  label: string;
  busyLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className={`h-14 flex-1 flex-row items-center justify-center rounded-xl ${
        busy ? "bg-lime-dark" : "bg-lime active:bg-lime-dark"
      }`}
    >
      <Ionicons name={busy ? "hourglass-outline" : icon} size={19} color={brand.ink} />
      <Text className="text-ink text-[15px] font-bold ml-2">{busy ? busyLabel : label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="h-14 px-5 flex-row items-center justify-center rounded-xl bg-white border border-ink/10 active:bg-ivory"
    >
      <Ionicons name={icon} size={16} color={brand.ink} />
      <Text className="text-ink text-sm font-bold ml-2">{label}</Text>
    </Pressable>
  );
}

// Round profile photo picker; reports the uri and (on web) the File blob.
export function AvatarPicker({
  uri,
  name,
  onChange,
  title = "Profile photo",
  hint = "A clear, front-facing photo helps teammates recognise each other.",
  square,
  removable = true,
}: {
  uri: string;
  name?: string;
  onChange: (uri: string, file: Blob | null) => void;
  title?: string;
  hint?: string;
  // Rounded square instead of a circle, e.g. for logos.
  square?: boolean;
  removable?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setFailed(false);
      onChange(result.assets[0].uri, (result.assets[0] as any).file ?? null);
    }
  };

  const hasPhoto = !!uri && !failed;

  return (
    <View className="flex-row items-center" style={{ gap: 16 }}>
      <Pressable
        onPress={pick}
        accessibilityRole="button"
        accessibilityLabel={hasPhoto ? "Change photo" : "Upload photo"}
        className={`w-24 h-24 ${square ? "rounded-2xl" : "rounded-full"} items-center justify-center overflow-hidden bg-ivory border-2 border-dashed border-ink/15`}
      >
        {hasPhoto ? (
          <Image source={{ uri }} style={{ width: 96, height: 96 }} onError={() => setFailed(true)} />
        ) : name?.trim() ? (
          <Text className="text-ink/40 text-2xl font-extrabold">{initials(name)}</Text>
        ) : (
          <Ionicons name="person-outline" size={30} color={brand.inkDisabled} />
        )}
        <View className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-ink items-center justify-center border-2 border-white">
          <Ionicons name="camera" size={13} color={brand.lime} />
        </View>
      </Pressable>
      <View className="flex-1" style={{ gap: 8 }}>
        <Text className="text-ink text-sm font-bold">{title}</Text>
        <Text className="text-ink/40 text-xs leading-4">{hint}</Text>
        {hasPhoto && (
          <View className="flex-row" style={{ gap: 8 }}>
            <Pressable
              onPress={pick}
              className="flex-row items-center h-8 px-3 rounded-lg border border-ink/10 active:bg-ivory"
            >
              <Ionicons name="swap-horizontal" size={13} color={brand.ink} />
              <Text className="text-ink text-xs font-bold ml-1.5">Change</Text>
            </Pressable>
            {removable && (
              <Pressable
                onPress={() => onChange("", null)}
                className="flex-row items-center h-8 px-3 rounded-lg border border-ink/10 active:bg-red-50"
              >
                <Ionicons name="trash-outline" size={13} color={brand.danger} />
                <Text className="text-xs font-bold ml-1.5" style={{ color: brand.danger }}>
                  Remove
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
