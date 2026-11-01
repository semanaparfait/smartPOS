// Shared pieces of the stock screens: restocking, history rows and the date field.
import { timeAgo } from "@/components/devices/deviceKit";
import { brand } from "@/config/theme";
import type {
  AuditEntry,
  ProductType,
  StockMovement,
} from "@/store/products/productsType";
import useProduct from "@/store/products/useProduct";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

const webNoOutline =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

export const formatQty = (value: number | string | null | undefined) =>
  Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

// "Added by Alice · Edited by Jean, 2h ago"
export const whoLine = (product: ProductType) =>
  [
    product.createdBy?.name
      ? `Added by ${product.createdBy.name}`
      : `Added ${timeAgo(product.createdAt)}`,
    product.updatedBy?.name &&
      `Edited by ${product.updatedBy.name}, ${timeAgo(product.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
}) {
  return (
    <View className="py-14 items-center">
      <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center mb-3">
        <Ionicons name={icon} size={26} color={brand.inkDisabled} />
      </View>
      <Text className="text-ink text-sm font-bold">{title}</Text>
      <Text className="text-ink/40 text-xs mt-1 text-center">{hint}</Text>
    </View>
  );
}

export function Tabs({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`px-3.5 py-1.5 rounded-full border ${
              active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
            }`}
          >
            <Text className={`text-xs font-bold ${active ? "text-lime" : "text-ink/60"}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Adds a delivery to the stock. Closes on `onClose`; `product` null means hidden.
export function RestockModal({
  product,
  onClose,
}: {
  product: ProductType | null;
  onClose: () => void;
}) {
  const restockProduct = useProduct((s) => s.restockProduct);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setQuantity("");
    setNote("");
  }, [product?.id]);

  const save = async () => {
    const amount = Number(quantity);
    if (!product || !(amount > 0)) {
      Toast.show({ type: "error", text1: "Enter how much arrived" });
      return;
    }
    setSaving(true);
    try {
      await restockProduct(product.id, amount, note.trim() || undefined);
      Toast.show({
        type: "success",
        text1: "Stock added",
        text2: `${formatQty(amount)} ${product.unit} of ${product.name}.`,
      });
      onClose();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not add stock",
        text2: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!product} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-ink/50 items-center justify-center p-4">
        <View className="bg-white rounded-2xl p-5 w-full" style={{ maxWidth: 400, gap: 14 }}>
          <View>
            <Text className="text-ink text-lg font-extrabold">Restock</Text>
            <Text numberOfLines={1} className="text-ink/50 text-[13px] mt-0.5">
              {product?.name} · {formatQty(product?.stockQuantity)} {product?.unit} now
            </Text>
          </View>
          <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px]">
            <TextInput
              value={quantity}
              onChangeText={(val) => setQuantity(val.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="How much arrived"
              placeholderTextColor={brand.inkDisabled}
              className="flex-1 py-3 text-[15px] text-ink"
              style={webNoOutline}
            />
            <Text className="text-ink/40 text-xs font-bold ml-2">{product?.unit}</Text>
          </View>
          <View className="bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px] justify-center">
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={255}
              placeholder="Note, e.g. Delivery"
              placeholderTextColor={brand.inkDisabled}
              className="py-3 text-[15px] text-ink"
              style={webNoOutline}
            />
          </View>
          <View className="flex-row" style={{ gap: 10 }}>
            <Pressable
              onPress={onClose}
              disabled={saving}
              className="h-12 px-5 rounded-xl border border-ink/10 items-center justify-center active:bg-ivory"
            >
              <Text className="text-ink text-sm font-bold">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving}
              className="h-12 flex-1 rounded-xl bg-lime items-center justify-center active:bg-lime-dark"
            >
              {saving ? (
                <ActivityIndicator size="small" color={brand.ink} />
              ) : (
                <Text className="text-ink text-sm font-bold">Add stock</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const REASON: Record<StockMovement["reason"], string> = {
  SALE: "Sale",
  RESTOCK: "Restock",
  ADJUSTMENT: "Stock count",
  REFUND: "Refund",
};

export function MovementRow({ movement, unit }: { movement: StockMovement; unit: string }) {
  const change = Number(movement.change);
  return (
    <View className="flex-row items-center py-3 border-b border-ink/5">
      <View className="flex-1 pr-3">
        <Text className="text-ink text-sm font-semibold">{REASON[movement.reason]}</Text>
        <Text numberOfLines={2} className="text-ink/50 text-xs mt-0.5">
          {[movement.user?.name, timeAgo(movement.createdAt), movement.note]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <View className="items-end">
        <Text
          className="text-sm font-semibold"
          style={{ color: change < 0 ? brand.danger : brand.ink }}
        >
          {change > 0 ? "+" : ""}
          {formatQty(change)}
        </Text>
        <Text className="text-ink/40 text-xs mt-0.5">
          {formatQty(movement.quantityAfter)} {unit} left
        </Text>
      </View>
    </View>
  );
}

const ACTION: Record<AuditEntry["action"], string> = {
  CREATE: "Added",
  UPDATE: "Edited",
  DELETE: "Deleted",
};

const FIELD: Record<string, string> = {
  name: "Name",
  buyingPrice: "Buy price",
  sellingPrice: "Sell price",
  barCode: "Barcode",
  ingredients: "Ingredients",
  active: "Active",
  unit: "Unit",
  sku: "SKU",
  supplier: "Supplier",
  description: "Description",
  trackStock: "Track stock",
  lowStockLevel: "Low-stock alert",
  expiryDate: "Expiry date",
  sendToKitchen: "Show in kitchen",
};

const shown = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return value ? "on" : "off";
  return String(value);
};

// `name` is left out on the product's own history page.
export function AuditRow({
  entry,
  name,
  onPress,
}: {
  entry: AuditEntry;
  name?: string;
  onPress?: () => void;
}) {
  // Only an edit lists field by field; the others hold the whole record.
  const changes =
    entry.action === "UPDATE"
      ? Object.entries(entry.changes ?? {}).filter(([field]) => FIELD[field])
      : [];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="py-3 border-b border-ink/5 active:bg-ivory"
    >
      <Text className="text-ink text-sm font-semibold">
        {ACTION[entry.action]}
        {name ? ` ${name}` : ""}
      </Text>
      <Text className="text-ink/50 text-xs mt-0.5">
        {entry.actor?.name ?? "System"} · {timeAgo(entry.createdAt)}
      </Text>
      {changes.map(([field, change]) => (
        <Text key={field} className="text-ink/70 text-xs mt-1">
          {FIELD[field]}: {shown(change?.from)} → {shown(change?.to)}
        </Text>
      ))}
    </Pressable>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const pad = (n: number) => String(n).padStart(2, "0");

// Picks a date as YYYY-MM-DD. Plain views, so it works the same on web and devices.
export function DateField({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const date = value ? new Date(`${value}T00:00:00`) : new Date();
    return { year: date.getFullYear(), index: date.getMonth() };
  });

  const blanks = new Date(month.year, month.index, 1).getDay();
  const days = new Date(month.year, month.index + 1, 0).getDate();
  const move = (by: number) => {
    const date = new Date(month.year, month.index + by, 1);
    setMonth({ year: date.getFullYear(), index: date.getMonth() });
  };
  const iso = (day: number) => `${month.year}-${pad(month.index + 1)}-${pad(day)}`;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px]"
      >
        <Ionicons name="calendar-outline" size={17} color={brand.inkDisabled} />
        <Text className={`flex-1 ml-2.5 text-[15px] ${value ? "text-ink" : "text-ink/40"}`}>
          {value || placeholder}
        </Text>
        {!!value && (
          <Pressable onPress={() => onChange("")} accessibilityLabel="Clear date" hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={brand.inkDisabled} />
          </Pressable>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 bg-ink/50 items-center justify-center p-4"
        >
          <Pressable className="bg-white rounded-2xl p-4 w-full" style={{ maxWidth: 340 }}>
            <View className="flex-row items-center justify-between mb-3">
              <Pressable
                onPress={() => move(-1)}
                accessibilityLabel="Previous month"
                className="w-9 h-9 rounded-lg items-center justify-center active:bg-ivory"
              >
                <Ionicons name="chevron-back" size={18} color={brand.ink} />
              </Pressable>
              <Text className="text-ink text-sm font-bold">
                {MONTHS[month.index]} {month.year}
              </Text>
              <Pressable
                onPress={() => move(1)}
                accessibilityLabel="Next month"
                className="w-9 h-9 rounded-lg items-center justify-center active:bg-ivory"
              >
                <Ionicons name="chevron-forward" size={18} color={brand.ink} />
              </Pressable>
            </View>
            <View className="flex-row flex-wrap">
              {Array.from({ length: blanks }, (_, i) => (
                <View key={`blank-${i}`} style={{ width: "14.28%", height: 40 }} />
              ))}
              {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
                const active = iso(day) === value;
                return (
                  <Pressable
                    key={day}
                    onPress={() => {
                      onChange(iso(day));
                      setOpen(false);
                    }}
                    style={{ width: "14.28%", height: 40 }}
                    className={`items-center justify-center rounded-lg ${
                      active ? "bg-ink" : "active:bg-ivory"
                    }`}
                  >
                    <Text className={`text-sm ${active ? "text-lime font-bold" : "text-ink"}`}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
