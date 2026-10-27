import { brand } from "@/config/theme";
import type { OrderItemType, OrderPayment, OrderType, PaymentMethod } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, View } from "react-native";

// Shared order helpers and UI for the staff orders list and order details.

export type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED" | "OTHER";

export const STATUS_META: Record<
  OrderStatus,
  { label: string; icon: keyof typeof Ionicons.glyphMap; pill: string; fg: string; accent: string }
> = {
  PENDING: { label: "Pending", icon: "time-outline", pill: "bg-lime", fg: brand.ink, accent: brand.lime },
  COMPLETED: { label: "Completed", icon: "checkmark-circle", pill: "bg-emerald-50", fg: "#047857", accent: "#10B981" },
  CANCELLED: { label: "Cancelled", icon: "close-circle-outline", pill: "bg-red-50", fg: brand.danger, accent: brand.danger },
  OTHER: { label: "Other", icon: "ellipse-outline", pill: "bg-ivory border border-ink/10", fg: brand.inkMuted, accent: "rgba(32,40,59,0.25)" },
};

export const orderStatus = (o: OrderType): OrderStatus => {
  const s = (o.status || "").toUpperCase();
  if (s === "PENDING" || s === "COMPLETED" || s === "CANCELLED") return s;
  return "OTHER";
};

export const toNumber = (value: string | number | null | undefined) => {
  const n = typeof value === "number" ? value : parseFloat(value ?? "");
  return Number.isFinite(n) ? n : 0;
};

export const formatRwf = (amount: string | number) => `${Math.round(toNumber(amount)).toLocaleString()} RWF`;

// Short, readable reference from the UUID, e.g. "#A3F9C2".
export const orderNumber = (o: OrderType) => `#${o.id.replace(/-/g, "").slice(-6).toUpperCase()}`;

export const itemCount = (o: OrderType) => o.items.reduce((sum, i) => sum + (i.quantity || 0), 0);

export const unitPrice = (item: OrderItemType) =>
  item.quantity ? toNumber(item.totalPrice) / item.quantity : toNumber(item.product?.sellingPrice);

export const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const dayLabel = (value: string) => {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short" });
};

export const timeAgo = (value: string) => {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const initials = (name?: string) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export function StatusBadge({ order, size = "sm" }: { order: OrderType; size?: "sm" | "md" }) {
  const meta = STATUS_META[orderStatus(order)];
  const label = orderStatus(order) === "OTHER" ? order.status : meta.label;
  return (
    <View
      className={`flex-row items-center self-start rounded-full ${meta.pill} ${
        size === "md" ? "px-3 py-1.5" : "px-2.5 py-1"
      }`}
    >
      <Ionicons name={meta.icon} size={size === "md" ? 14 : 12} color={meta.fg} />
      <Text
        className={`font-extrabold ml-1 ${size === "md" ? "text-[12px]" : "text-[11px]"}`}
        style={{ color: meta.fg }}
      >
        {label}
      </Text>
    </View>
  );
}

export function ProductThumb({ item, size = 40 }: { item: OrderItemType; size?: number }) {
  const url = item.product?.images?.[0]?.url;
  return (
    <View
      className="rounded-xl bg-ivory items-center justify-center overflow-hidden border border-white"
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text className="text-ink/50 font-extrabold" style={{ fontSize: size * 0.32 }}>
          {initials(item.product?.name)}
        </Text>
      )}
    </View>
  );
}

// ---------- Payments ----------

export const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "MOMO", "CARD", "CREDIT"];

export const PAYMENT_META: Record<
  PaymentMethod,
  { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; dot: string }
> = {
  CASH: { label: "Cash", icon: "cash-outline", bg: "bg-emerald-50", fg: "#047857", dot: "#10B981" },
  MOMO: { label: "MoMo", icon: "phone-portrait-outline", bg: "bg-amber-50", fg: "#B45309", dot: "#F59E0B" },
  CARD: { label: "Card", icon: "card-outline", bg: "bg-sky-50", fg: "#0369A1", dot: "#0EA5E9" },
  CREDIT: { label: "Credit", icon: "time-outline", bg: "bg-red-50", fg: brand.danger, dot: brand.danger },
};

const FALLBACK_PAYMENT = {
  label: "Other",
  icon: "wallet-outline" as const,
  bg: "bg-ivory",
  fg: brand.inkMuted,
  dot: brand.inkDisabled,
};

export const paymentMeta = (method: string) =>
  PAYMENT_META[method?.toUpperCase() as PaymentMethod] ?? { ...FALLBACK_PAYMENT, label: method || "Other" };

export const paymentsOf = (o: OrderType): OrderPayment[] => o.payments ?? [];

export const paidTotal = (o: OrderType) => paymentsOf(o).reduce((sum, p) => sum + toNumber(p.amount), 0);

export const creditTotal = (o: OrderType) =>
  paymentsOf(o)
    .filter((p) => p.method?.toUpperCase() === "CREDIT")
    .reduce((sum, p) => sum + toNumber(p.amount), 0);

// Small method chips, e.g. "Cash 60,000 · MoMo 40,000".
export function PaymentChips({ order, showAmounts }: { order: OrderType; showAmounts?: boolean }) {
  const payments = paymentsOf(order);
  if (payments.length === 0) return null;
  return (
    <View className="flex-row flex-wrap" style={{ gap: 6 }}>
      {payments.map((p, i) => {
        const meta = paymentMeta(p.method);
        return (
          <View key={p.id ?? i} className={`flex-row items-center rounded-full px-2 py-0.5 ${meta.bg}`}>
            <Ionicons name={meta.icon} size={11} color={meta.fg} />
            <Text className="text-[11px] font-bold ml-1" style={{ color: meta.fg }}>
              {meta.label}
              {showAmounts && payments.length > 1 ? ` ${Math.round(toNumber(p.amount)).toLocaleString()}` : ""}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
