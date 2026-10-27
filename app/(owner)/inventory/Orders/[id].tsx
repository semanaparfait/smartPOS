import { PageHeader } from "@/app/components/ownerComponents/FormKit";
import {
  formatRwf,
  initials,
  orderNumber,
  orderStatus,
  paidTotal,
  paymentMeta,
  paymentsOf,
  ProductThumb,
  STATUS_META,
  toNumber,
  unitPrice,
} from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import useOrder from "@/store/Order/Order";
import type { OrderType } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

const ORDERS_ROUTE = "/(owner)/inventory/Orders/orders";

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-5">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-ink text-[15px] font-bold">{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function Row({ label, value, color, strong }: { label: string; value: string; color?: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className={`text-[13px] ${strong ? "text-ink font-semibold" : "text-ink/50"}`}>{label}</Text>
      <Text className={`text-[13px] ${strong ? "font-bold" : "font-medium"}`} style={{ color: color ?? brand.ink }}>
        {value}
      </Text>
    </View>
  );
}

function Fact({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-1 min-w-[160px] flex-row items-center">
      <View className="w-9 h-9 rounded-lg bg-ivory items-center justify-center">
        <Ionicons name={icon} size={16} color={brand.ink} />
      </View>
      <View className="flex-1 ml-2.5">
        <Text className="text-ink/40 text-[11px]">{label}</Text>
        <Text numberOfLines={1} className="text-ink text-[13px] font-medium mt-0.5">
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function SingleOrder() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { fetchOrderById, orders } = useOrder();

  const [order, setOrder] = useState<OrderType | null>(() => orders.find((o) => o.id === id) ?? null);
  const [loading, setLoading] = useState(true);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace(ORDERS_ROUTE));

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetchOrderById(id).then((fresh) => {
      if (fresh) setOrder(fresh);
      setLoading(false);
    });
  }, [id, fetchOrderById]);

  if (!order) {
    return (
      <View className="flex-1 bg-ivory items-center justify-center p-6">
        {loading ? (
          <>
            <ActivityIndicator color={brand.ink} />
            <Text className="text-ink/40 text-xs mt-3">Loading order…</Text>
          </>
        ) : (
          <View className="items-center bg-white rounded-2xl border border-ink/5 p-8 max-w-[360px] w-full">
            <Ionicons name="receipt-outline" size={26} color={brand.inkDisabled} />
            <Text className="text-ink text-[15px] font-bold mt-3">Order not found</Text>
            <Text className="text-ink/40 text-xs mt-1 text-center">
              It may have been removed, or the connection failed.
            </Text>
            <Pressable onPress={goBack} className="mt-5 h-10 px-5 rounded-xl bg-ink items-center justify-center">
              <Text className="text-white text-[13px] font-semibold">Back to orders</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  const status = orderStatus(order);
  const meta = STATUS_META[status];
  const payments = paymentsOf(order);
  const paid = paidTotal(order);
  const balance = Math.max(toNumber(order.total) - paid, 0);
  const count = order.items.reduce((s, i) => s + i.quantity, 0);
  const wide = width >= 1100;
  const servedBy = order.user;

  // What happened to the order, oldest first.
  const timeline = [
    { icon: "add-circle-outline" as const, label: "Order created", at: order.createdAt },
    ...(status === "COMPLETED"
      ? [{ icon: "checkmark-circle-outline" as const, label: "Paid and completed", at: payments[0]?.createdAt ?? order.updatedAt }]
      : status === "CANCELLED"
        ? [{ icon: "close-circle-outline" as const, label: "Cancelled", at: order.updatedAt }]
        : [{ icon: "hourglass-outline" as const, label: "Waiting for payment", at: null }]),
  ];

  const items = (
    <Card
      title="Items"
      right={
        <Text className="text-ink/40 text-[12px]">
          {order.items.length} product{order.items.length === 1 ? "" : "s"} · {count} item{count === 1 ? "" : "s"}
        </Text>
      }
    >
      <View className="rounded-xl border border-ink/5 overflow-hidden">
        <View className="flex-row bg-ivory px-3 py-2">
          <Text className="flex-1 text-ink/50 text-[11px] font-medium">Product</Text>
          <Text className="w-[110px] text-ink/50 text-[11px] font-medium text-right">Price</Text>
          <Text className="w-[60px] text-ink/50 text-[11px] font-medium text-right">Qty</Text>
          <Text className="w-[120px] text-ink/50 text-[11px] font-medium text-right">Total</Text>
        </View>
        {order.items.map((item) => (
          <View key={item.id} className="flex-row items-center px-3 py-2.5 border-t border-ink/5">
            <View className="flex-1 flex-row items-center pr-2">
              <ProductThumb item={item} size={36} />
              <View className="flex-1 ml-2.5">
                <Text numberOfLines={1} className="text-ink text-[13px] font-medium">
                  {item.product?.name?.trim() || "Item"}
                </Text>
                {item.product?.barCode ? (
                  <Text numberOfLines={1} className="text-ink/40 text-[11px]">
                    {item.product.barCode}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text className="w-[110px] text-ink/60 text-[13px] text-right">{formatRwf(unitPrice(item))}</Text>
            <Text className="w-[60px] text-ink/60 text-[13px] text-right">{item.quantity}</Text>
            <Text className="w-[120px] text-ink text-[13px] font-medium text-right">{formatRwf(item.totalPrice)}</Text>
          </View>
        ))}
        {order.items.length === 0 && (
          <Text className="text-ink/40 text-[13px] px-3 py-5 text-center">This order has no items.</Text>
        )}
      </View>

      <View className="mt-3 ml-auto w-full max-w-[320px]">
        <Row label="Subtotal" value={formatRwf(order.subtotal)} />
        <Row label="Tax" value={formatRwf(order.tax)} />
        <View className="border-t border-ink/10 mt-1.5 pt-1.5">
          <Row
            strong
            label={status === "COMPLETED" ? "Total paid" : status === "PENDING" ? "Amount due" : "Total"}
            value={formatRwf(order.total)}
            color={status === "CANCELLED" ? brand.inkDisabled : undefined}
          />
        </View>
      </View>
    </Card>
  );

  const side = (
    <View style={{ gap: 16 }}>
      <Card title="Payment">
        {payments.length === 0 ? (
          <View className="flex-row items-center bg-ivory rounded-xl p-3">
            <Ionicons name={status === "PENDING" ? "hourglass-outline" : "wallet-outline"} size={15} color={brand.inkMuted} />
            <Text className="flex-1 text-ink/50 text-[12px] ml-2">
              {status === "PENDING"
                ? "Not paid yet."
                : status === "CANCELLED"
                  ? "Cancelled before payment."
                  : "No payment details were recorded for this order."}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {payments.map((p, i) => {
              const pm = paymentMeta(p.method);
              const isCredit = p.method?.toUpperCase() === "CREDIT";
              return (
                <View key={p.id ?? i} className="rounded-xl border border-ink/5 overflow-hidden">
                  <View className="flex-row items-center p-3">
                    <View className={`w-9 h-9 rounded-lg items-center justify-center ${pm.bg}`}>
                      <Ionicons name={pm.icon} size={16} color={pm.fg} />
                    </View>
                    <Text className="flex-1 text-ink text-[13px] font-medium ml-2.5">{pm.label}</Text>
                    <Text className="text-ink text-[13px] font-semibold">{formatRwf(p.amount)}</Text>
                  </View>
                  {isCredit && (
                    <View className="border-t border-danger/20 bg-danger/5 px-3 py-2.5" style={{ gap: 4 }}>
                      {[
                        ["Customer", p.creditOwnerName],
                        ["Phone", p.creditOwnerPhone],
                        ["Taken by", p.takenBy],
                      ].map(([label, value]) => (
                        <View key={label} className="flex-row">
                          <Text className="w-[72px] text-ink/50 text-[12px]">{label}</Text>
                          <Text selectable className="flex-1 text-ink text-[12px] font-medium">
                            {value || "—"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            <View className="border-t border-ink/10 pt-2">
              <Row label="Total received" value={formatRwf(paid)} />
              {balance > 0 && <Row label="Balance" value={formatRwf(balance)} color={brand.danger} />}
            </View>
          </View>
        )}
      </Card>

      <Card title="Served by">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-ink items-center justify-center">
            <Text className="text-lime text-[13px] font-bold">{initials(servedBy?.name)}</Text>
          </View>
          <View className="flex-1 ml-3">
            <Text numberOfLines={1} className="text-ink text-[14px] font-semibold">
              {servedBy?.name ?? "Unknown"}
            </Text>
            <Text numberOfLines={1} className="text-ink/50 text-[12px]">
              {[servedBy?.role?.toLowerCase(), servedBy?.employee?.shift && `${servedBy.employee.shift.toLowerCase()} shift`]
                .filter(Boolean)
                .join(" · ") || "Staff"}
            </Text>
          </View>
        </View>
        {(servedBy?.phone || servedBy?.email) && (
          <View className="mt-3 rounded-xl bg-ivory px-3 py-2" style={{ gap: 4 }}>
            {servedBy?.phone ? <Text className="text-ink/60 text-[12px]">{servedBy.phone}</Text> : null}
            {servedBy?.email ? <Text className="text-ink/60 text-[12px]">{servedBy.email}</Text> : null}
          </View>
        )}
      </Card>

      <Card title="History">
        {timeline.map((t, i) => (
          <View key={t.label} className="flex-row">
            <View className="items-center mr-3">
              <View className="w-8 h-8 rounded-lg bg-ivory items-center justify-center">
                <Ionicons name={t.icon} size={15} color={brand.ink} />
              </View>
              {i < timeline.length - 1 && <View className="w-px flex-1 bg-ink/10 my-1" />}
            </View>
            <View className={`flex-1 ${i < timeline.length - 1 ? "pb-4" : ""}`}>
              <Text className="text-ink text-[13px] font-medium mt-1">{t.label}</Text>
              <Text className="text-ink/40 text-[12px]">{t.at ? formatDateTime(t.at) : "—"}</Text>
            </View>
          </View>
        ))}
      </Card>

      {order.note ? (
        <Card title="Note">
          <Text className="text-ink/70 text-[13px] leading-5">{order.note}</Text>
        </Card>
      ) : null}
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        eyebrow="Orders"
        title={`Order ${orderNumber(order)}`}
        subtitle={formatDateTime(order.createdAt)}
        onBack={goBack}
        right={loading ? <ActivityIndicator color={brand.ink} /> : undefined}
      />

      {/* Summary */}
      <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
        <View className="h-1" style={{ backgroundColor: meta.accent }} />
        <View className="p-5 flex-row flex-wrap items-center" style={{ gap: 16 }}>
          <View className={`flex-row items-center rounded-full px-3 py-1.5 ${status === "PENDING" ? "bg-lime/40" : meta.pill}`}>
            <Ionicons name={meta.icon} size={14} color={meta.fg} />
            <Text className="text-[12px] font-semibold ml-1.5" style={{ color: meta.fg }}>
              {status === "OTHER" ? order.status : meta.label}
            </Text>
          </View>
          <Fact icon="person-outline" label="Served by" value={servedBy?.name ?? "Unknown"} />
          <Fact icon="cube-outline" label="Items" value={`${count} item${count === 1 ? "" : "s"}`} />
          <Fact
            icon="wallet-outline"
            label="Paid with"
            value={payments.length ? payments.map((p) => paymentMeta(p.method).label).join(" + ") : "—"}
          />
          <View className="items-end ml-auto">
            <Text className="text-ink/40 text-[11px]">Total</Text>
            <Text
              className={`text-xl font-bold ${status === "CANCELLED" ? "line-through" : ""}`}
              style={{ color: status === "CANCELLED" ? brand.inkDisabled : brand.ink }}
            >
              {formatRwf(order.total)}
            </Text>
          </View>
        </View>
      </View>

      <View className={wide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
        <View className={wide ? "flex-1 min-w-0" : ""}>{items}</View>
        <View style={wide ? { width: 360 } : undefined}>{side}</View>
      </View>

      <Text selectable className="text-ink/30 text-[11px] text-center">
        Reference {order.id}
      </Text>
    </ScrollView>
  );
}
