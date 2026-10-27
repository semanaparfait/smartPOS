import {
  formatDateTime,
  formatRwf,
  initials,
  itemCount,
  orderNumber,
  orderStatus,
  paidTotal,
  paymentMeta,
  paymentsOf,
  ProductThumb,
  STATUS_META,
  StatusBadge,
  timeAgo,
  toNumber,
  unitPrice,
} from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import { confirmDialog, notify } from "@/store/Dialog/useDialog";
import useOrder from "@/store/Order/Order";
import type { OrderType } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ORDERS_ROUTE = "/(tabs)/orders/orders";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className={`text-[13px] ${strong ? "text-ink font-bold" : "text-ink/50"}`}>{label}</Text>
      <Text className={`text-[13px] ${strong ? "text-ink font-extrabold" : "text-ink font-semibold"}`}>{value}</Text>
    </View>
  );
}

function InfoTile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-1 min-w-[150px] bg-ivory rounded-xl p-3">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={13} color={brand.inkMuted} />
        <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[1.5px] ml-1.5">{label}</Text>
      </View>
      <Text numberOfLines={1} className="text-ink text-[13px] font-bold mt-1.5">
        {value}
      </Text>
    </View>
  );
}

function PaymentsCard({ order }: { order: OrderType }) {
  const payments = paymentsOf(order);
  const status = orderStatus(order);
  const paid = paidTotal(order);
  const balance = Math.max(toNumber(order.total) - paid, 0);

  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px]">Payments</Text>
        {payments.length > 1 && (
          <Text className="text-ink/40 text-[11px]">Split · {payments.length} methods</Text>
        )}
      </View>

      {payments.length === 0 ? (
        <View className="flex-row items-center bg-ivory rounded-xl p-3 mt-3">
          <Ionicons
            name={status === "PENDING" ? "hourglass-outline" : "wallet-outline"}
            size={15}
            color={brand.inkMuted}
          />
          <Text className="flex-1 text-ink/50 text-[12px] ml-2">
            {status === "PENDING"
              ? "Not paid yet. Payments are recorded at checkout."
              : status === "CANCELLED"
                ? "This order was cancelled before payment."
                : "No payment details were returned for this order."}
          </Text>
        </View>
      ) : (
        <View className="mt-3" style={{ gap: 10 }}>
          {payments.map((p, i) => {
            const meta = paymentMeta(p.method);
            const isCredit = p.method?.toUpperCase() === "CREDIT";
            return (
              <View key={p.id ?? i} className="rounded-xl border border-ink/5 overflow-hidden">
                <View className="flex-row items-center p-3">
                  <View className={`w-10 h-10 rounded-xl items-center justify-center ${meta.bg}`}>
                    <Ionicons name={meta.icon} size={18} color={meta.fg} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-ink text-[14px] font-bold">{meta.label}</Text>
                    <Text className="text-ink/40 text-[11px]">
                      {isCredit ? "To be paid later" : "Received"}
                    </Text>
                  </View>
                  <Text className="text-ink text-[15px] font-extrabold">{formatRwf(p.amount)}</Text>
                </View>
                {isCredit && (
                  <View className="bg-red-50/60 border-t border-red-100 px-3 py-2.5" style={{ gap: 6 }}>
                    {[
                      { icon: "person-outline" as const, label: "Owner", value: p.creditOwnerName },
                      { icon: "call-outline" as const, label: "Phone", value: p.creditOwnerPhone },
                      { icon: "people-outline" as const, label: "Taken by", value: p.takenBy },
                    ].map((row) => (
                      <View key={row.label} className="flex-row items-center">
                        <Ionicons name={row.icon} size={13} color={brand.danger} />
                        <Text className="text-ink/50 text-[12px] ml-2 w-[64px]">{row.label}</Text>
                        <Text selectable numberOfLines={1} className="flex-1 text-ink text-[12px] font-semibold">
                          {row.value || "—"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          <View className="border-t border-dashed border-ink/15 pt-3 mt-1">
            <View className="flex-row justify-between py-1">
              <Text className="text-ink/50 text-[13px]">Total paid</Text>
              <Text className="text-ink text-[13px] font-extrabold">{formatRwf(paid)}</Text>
            </View>
            {balance > 0 && (
              <View className="flex-row justify-between py-1">
                <Text className="text-[13px]" style={{ color: brand.danger }}>
                  Balance
                </Text>
                <Text className="text-[13px] font-extrabold" style={{ color: brand.danger }}>
                  {formatRwf(balance)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function OrderDetailsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const orderId = Array.isArray(id) ? id[0] : id;
  const { orders, fetchOrderById, fetchOrders, cancelOrder } = useOrder();

  const [order, setOrder] = useState<OrderType | null>(() => orders.find((o) => o.id === orderId) ?? null);
  const [loading, setLoading] = useState(!order);
  const [cancelling, setCancelling] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace(ORDERS_ROUTE));

  // Always fetch the latest copy; the list version may be stale.
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    fetchOrderById(orderId).then((fresh) => {
      if (fresh) setOrder(fresh);
      setLoading(false);
    });
  }, [orderId, fetchOrderById]);

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-ivory items-center justify-center p-6" edges={["top"]}>
        {loading ? (
          <ActivityIndicator color={brand.ink} />
        ) : (
          <View className="items-center bg-white rounded-2xl border border-ink/5 p-8 max-w-[360px] w-full">
            <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center mb-3">
              <Ionicons name="receipt-outline" size={24} color={brand.inkDisabled} />
            </View>
            <Text className="text-ink text-base font-extrabold">Order not found</Text>
            <Text className="text-ink/40 text-xs mt-1 text-center">
              It may have been removed, or the connection failed.
            </Text>
            <Pressable onPress={goBack} className="mt-5 h-11 px-6 rounded-xl bg-ink items-center justify-center">
              <Text className="text-white text-[13px] font-bold">Back to orders</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const status = orderStatus(order);
  const meta = STATUS_META[status];
  const count = itemCount(order);
  const wide = width >= 1000;

  const handleCancel = async () => {
    const ok = await confirmDialog({
      title: "Cancel this order?",
      message: `${orderNumber(order)} for ${formatRwf(order.total)} will be cancelled. This cannot be undone.`,
      tone: "danger",
      confirmLabel: "Cancel order",
      cancelLabel: "Keep order",
    });
    if (!ok) return;
    setCancelling(true);
    try {
      await cancelOrder(order.id);
      const fresh = await fetchOrderById(order.id);
      if (fresh) setOrder(fresh);
      fetchOrders().catch(() => {});
      notify({ title: "Order cancelled", message: `${orderNumber(order)} has been cancelled.`, tone: "success" });
    } catch {
      notify({
        title: "Could not cancel order",
        message: "Check your connection and try again.",
        tone: "danger",
      });
    }
    setCancelling(false);
  };

  const continueCheckout = () =>
    router.push({ pathname: "/(tabs)/checkout/checkout", params: { orderId: order.id } });

  const receipt = (
    <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
      <View className="h-1" style={{ backgroundColor: meta.accent }} />
      <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
        <Text className="text-ink text-[15px] font-extrabold tracking-tight">Items</Text>
        <Text className="text-ink/40 text-xs">
          {order.items.length} product{order.items.length === 1 ? "" : "s"} · {count} item{count === 1 ? "" : "s"}
        </Text>
      </View>

      <View className="px-5">
        {order.items.map((item, i) => (
          <View
            key={item.id}
            className={`flex-row items-center py-3 ${i === 0 ? "" : "border-t border-ink/5"}`}
          >
            <ProductThumb item={item} size={48} />
            <View className="flex-1 ml-3 pr-3">
              <Text numberOfLines={1} className="text-ink text-[14px] font-bold">
                {item.product?.name ?? "Item"}
              </Text>
              <Text className="text-ink/40 text-[12px] mt-0.5">
                {formatRwf(unitPrice(item))} each
              </Text>
            </View>
            <View className="bg-ivory rounded-lg px-2.5 py-1 mr-4">
              <Text className="text-ink text-[12px] font-extrabold">× {item.quantity}</Text>
            </View>
            <Text className="text-ink text-[14px] font-extrabold min-w-[96px] text-right">
              {formatRwf(item.totalPrice)}
            </Text>
          </View>
        ))}
        {order.items.length === 0 && (
          <Text className="text-ink/40 text-[13px] py-6 text-center">This order has no items.</Text>
        )}
      </View>

      {/* Totals — dashed tear line like a printed receipt */}
      <View className="mx-5 mt-2 border-t border-dashed border-ink/15" />
      <View className="px-5 pt-3 pb-5">
        <Row label="Subtotal" value={formatRwf(order.subtotal)} />
        <Row label="Tax" value={formatRwf(order.tax)} />
        <View className="flex-row items-center justify-between bg-ink rounded-xl px-4 py-3.5 mt-3">
          <Text className="text-white/60 text-[12px] font-bold uppercase tracking-[2px]">
            {status === "COMPLETED" ? "Total paid" : status === "PENDING" ? "Amount due" : "Total"}
          </Text>
          <Text
            className={`text-[22px] font-extrabold tracking-tight ${
              status === "CANCELLED" ? "text-white/40 line-through" : "text-lime"
            }`}
          >
            {formatRwf(order.total)}
          </Text>
        </View>
      </View>
    </View>
  );

  const side = (
    <View style={{ gap: 16 }}>
      {/* Served by */}
      <View className="bg-white rounded-2xl border border-ink/5 p-5">
        <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px]">Served by</Text>
        <View className="flex-row items-center mt-3">
          <View className="w-11 h-11 rounded-full bg-ink items-center justify-center">
            <Text className="text-lime text-[13px] font-extrabold">{initials(order.user?.name)}</Text>
          </View>
          <View className="flex-1 ml-3">
            <Text numberOfLines={1} className="text-ink text-[14px] font-bold">
              {order.user?.name ?? "Unknown"}
            </Text>
            <Text numberOfLines={1} className="text-ink/50 text-[12px]">
              {[order.user?.role, order.user?.employee?.shift && `${order.user.employee.shift} shift`]
                .filter(Boolean)
                .join(" · ") || "Staff"}
            </Text>
          </View>
        </View>
      </View>

      <PaymentsCard order={order} />

      {/* Note */}
      <View className="bg-white rounded-2xl border border-ink/5 p-5">
        <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px]">Note</Text>
        {order.note ? (
          <View className="flex-row items-start bg-ivory rounded-xl p-3 mt-3">
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={brand.inkMuted} />
            <Text className="flex-1 text-ink text-[13px] leading-5 ml-2">{order.note}</Text>
          </View>
        ) : (
          <Text className="text-ink/40 text-[13px] mt-2">No note on this order.</Text>
        )}
      </View>

      {/* Actions */}
      {status === "PENDING" && (
        <View className="bg-white rounded-2xl border border-ink/5 p-5" style={{ gap: 10 }}>
          <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px]">Actions</Text>
          <Pressable
            onPress={continueCheckout}
            className="flex-row items-center justify-center h-12 rounded-xl bg-lime active:bg-lime-dark"
          >
            <Ionicons name="card-outline" size={17} color={brand.ink} />
            <Text className="text-ink text-[14px] font-extrabold ml-2">Continue to checkout</Text>
          </Pressable>
          <Pressable
            onPress={handleCancel}
            disabled={cancelling}
            className="flex-row items-center justify-center h-12 rounded-xl border border-ink/10 active:bg-red-50"
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={brand.danger} />
            ) : (
              <Ionicons name="close-circle-outline" size={17} color={brand.danger} />
            )}
            <Text className="text-[14px] font-bold ml-2" style={{ color: brand.danger }}>
              Cancel order
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-ivory" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 18 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center">
          <Pressable
            onPress={goBack}
            accessibilityLabel="Back to orders"
            className="w-10 h-10 rounded-xl bg-white border border-ink/10 items-center justify-center mr-3 active:bg-ivory"
          >
            <Ionicons name="arrow-back" size={18} color={brand.ink} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2.4px]">Order details</Text>
            <Text className="text-ink text-2xl font-extrabold tracking-tight">Order {orderNumber(order)}</Text>
          </View>
          {loading && <ActivityIndicator color={brand.ink} />}
        </View>

        {/* Summary banner */}
        <View className="bg-ink rounded-2xl p-5 flex-row flex-wrap items-center justify-between" style={{ gap: 16 }}>
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-2xl bg-lime items-center justify-center">
              <Ionicons name="receipt" size={26} color={brand.ink} />
            </View>
            <View className="ml-4">
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <Text className="text-white text-xl font-extrabold tracking-tight">{orderNumber(order)}</Text>
                <StatusBadge order={order} size="md" />
              </View>
              <Text className="text-white/50 text-[13px] mt-1">
                {formatDateTime(order.createdAt)} · {timeAgo(order.createdAt)}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-white/50 text-[11px] font-bold uppercase tracking-[2px]">Total</Text>
            <Text className="text-lime text-[28px] font-extrabold tracking-tight">{formatRwf(order.total)}</Text>
          </View>
        </View>

        {/* Quick facts */}
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          <InfoTile icon="cube-outline" label="Items" value={`${count} item${count === 1 ? "" : "s"}`} />
          <InfoTile icon="pricetag-outline" label="Subtotal" value={formatRwf(order.subtotal)} />
          <InfoTile icon="calculator-outline" label="Tax" value={formatRwf(toNumber(order.tax))} />
          <InfoTile icon="refresh-outline" label="Last update" value={timeAgo(order.updatedAt)} />
        </View>

        <View className={wide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
          <View className={wide ? "flex-1 min-w-0" : ""}>{receipt}</View>
          <View style={wide ? { width: 340 } : undefined}>{side}</View>
        </View>

        <Text selectable className="text-ink/30 text-[10px] text-center">
          Reference {order.id}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
