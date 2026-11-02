// Small pieces shared by the services screens: status pills, steppers, time
// entry and the payment picker.
import { PAYMENT_META } from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import type { BookingPaymentMethod } from "@/store/Services/serviceTypes";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Platform, Pressable, Text, TextInput, View } from "react-native";
import { secureUrl } from "@/utils/imageUrl";

export const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

export const BOOKING_METHODS: BookingPaymentMethod[] = ["CASH", "MOMO", "CARD"];

export function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View className="px-2 py-0.5 rounded-full self-start" style={{ backgroundColor: bg }}>
      <Text className="text-[11px] font-semibold" style={{ color }}>
        {tr(label)}
      </Text>
    </View>
  );
}

export function ServiceThumb({ uri, icon, size = 44 }: { uri?: string | null; icon: keyof typeof Ionicons.glyphMap; size?: number }) {
  return uri ? (
    <Image source={{ uri: secureUrl(uri) }} style={{ width: size, height: size, borderRadius: 10 }} />
  ) : (
    <View
      style={{ width: size, height: size, borderRadius: 10 }}
      className="bg-ivory items-center justify-center"
    >
      <Ionicons name={icon} size={size / 2.2} color={brand.inkMuted} />
    </View>
  );
}

export function Stepper({
  value,
  min = 1,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const set = (next: number) => onChange(Math.max(min, max ? Math.min(max, next) : next));
  return (
    <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl h-12 self-start">
      <Pressable
        onPress={() => set(value - step)}
        accessibilityLabel={tr("Less")}
        className="w-12 h-12 items-center justify-center active:bg-white rounded-l-xl"
      >
        <Ionicons name="remove" size={18} color={brand.ink} />
      </Pressable>
      <Text className="text-ink text-[15px] font-semibold min-w-[72px] text-center">
        {value} {suffix}
      </Text>
      <Pressable
        onPress={() => set(value + step)}
        accessibilityLabel={tr("More")}
        className="w-12 h-12 items-center justify-center active:bg-white rounded-r-xl"
      >
        <Ionicons name="add" size={18} color={brand.ink} />
      </Pressable>
    </View>
  );
}

// "14:30" typed as digits; the colon is added for the user.
export function TimeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const type = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    onChange(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
  };
  return (
    <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px]">
      <Ionicons name="time-outline" size={17} color={brand.inkDisabled} />
      <TextInput
        value={value}
        onChangeText={type}
        keyboardType="number-pad"
        placeholder="14:00"
        placeholderTextColor={brand.inkDisabled}
        className="flex-1 ml-2.5 py-3 text-[15px] text-ink"
        style={webNoOutline}
      />
    </View>
  );
}

// "2026-11-02" + "14:30" -> Date, or null when the time is not a real time.
export function atTime(date: string, time: string): Date | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!date || !match) return null;
  const [hours, minutes] = [Number(match[1]), Number(match[2])];
  if (hours > 23 || minutes > 59) return null;
  const result = new Date(`${date}T00:00:00`);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function MoneyInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px]">
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ""))}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={brand.inkDisabled}
        className="flex-1 py-3 text-[15px] text-ink"
        style={webNoOutline}
      />
      <Text className="text-ink/40 text-xs font-semibold ml-2">RWF</Text>
    </View>
  );
}

export function MethodChips({
  value,
  onChange,
  allowNone,
}: {
  value: BookingPaymentMethod | null;
  onChange: (value: BookingPaymentMethod | null) => void;
  // Shows "Pay later" as a choice.
  allowNone?: boolean;
}) {
  const options: (BookingPaymentMethod | null)[] = allowNone ? [null, ...BOOKING_METHODS] : BOOKING_METHODS;
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map((method) => {
        const active = method === value;
        const meta = method ? PAYMENT_META[method] : null;
        return (
          <Pressable
            key={method ?? "none"}
            onPress={() => onChange(method)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            className={`flex-row items-center px-3.5 h-10 rounded-xl border ${
              active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
            }`}
          >
            <Ionicons
              name={meta?.icon ?? "time-outline"}
              size={15}
              color={active ? brand.lime : brand.inkMuted}
            />
            <Text className={`text-[13px] font-semibold ml-1.5 ${active ? "text-white" : "text-ink"}`}>
              {tr(meta?.label ?? "Pay later")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="text-ink/50 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
      {children}
    </Text>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-ink/50 text-[13px]">{label}</Text>
      <Text className={`text-ink text-[13px] ${strong ? "font-bold" : "font-medium"}`}>{value}</Text>
    </View>
  );
}

// Full-width button used at the bottom of the booking sheets.
export function ActionButton({
  label,
  icon,
  onPress,
  busy,
  tone = "lime",
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  busy?: boolean;
  tone?: "lime" | "ink" | "plain";
}) {
  const styles = {
    lime: { box: "bg-lime active:bg-lime-dark", text: "text-ink", icon: brand.ink },
    ink: { box: "bg-ink active:bg-ink-soft", text: "text-white", icon: brand.lime },
    plain: { box: "bg-white border border-ink/10 active:bg-ivory", text: "text-ink", icon: brand.ink },
  }[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className={`h-12 flex-1 flex-row items-center justify-center rounded-xl px-4 ${styles.box} ${busy ? "opacity-60" : ""}`}
    >
      <Ionicons name={busy ? "hourglass-outline" : icon} size={17} color={styles.icon} />
      <Text className={`text-sm font-semibold ml-2 ${styles.text}`}>{label}</Text>
    </Pressable>
  );
}
