import { PageHeader } from "@/components/forms/FormKit";
import { Tabs } from "@/components/inventory/stockKit";
import { dayLabel, formatRwf, formatTime, paymentMeta, paymentsOf, toNumber } from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import { dayKey } from "@/store/Finance/useFinanceVerification";
import useOrder from "@/store/Order/Order";
import type { DeliveryStatus, OrderType, OrderUser } from "@/store/Order/OrderType";
import { exportCsv } from "@/utils/exportCsv";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

type Period = "today" | "yesterday" | "week" | "month" | "all";
type StatusFilter = "all" | DeliveryStatus;

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All" },
];

const STATUS_META: Record<DeliveryStatus, { label: string; icon: keyof typeof Ionicons.glyphMap; pill: string; fg: string }> = {
  WAITING: { label: "Waiting", icon: "time-outline", pill: "bg-lime/40", fg: brand.ink },
  ON_THE_WAY: { label: "On the way", icon: "bicycle-outline", pill: "bg-ivory border border-ink/10", fg: brand.ink },
  DELIVERED: { label: "Delivered", icon: "checkmark-circle-outline", pill: "bg-ink", fg: brand.lime },
  NOT_DELIVERED: { label: "Not delivered", icon: "close-circle-outline", pill: "bg-danger/10", fg: brand.danger },
};
const STATUS_ORDER: DeliveryStatus[] = ["WAITING", "ON_THE_WAY", "DELIVERED", "NOT_DELIVERED"];

const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;
const nameOf = (u?: OrderUser | null) => u?.employee?.name ?? u?.name ?? null;
const isPaid = (o: OrderType) => (o.status || "").toUpperCase() === "COMPLETED";
const statusOf = (o: OrderType): DeliveryStatus => o.deliveryStatus ?? "WAITING";

const inPeriod = (iso: string, period: Period) => {
  if (period === "all") return true;
  const day = dayKey(new Date(iso));
  const today = new Date();
  const shift = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return dayKey(d);
  };
  if (period === "today") return day === dayKey(today);
  if (period === "yesterday") return day === shift(-1);
  if (period === "week") return day >= shift(-6);
  return day >= dayKey(new Date(today.getFullYear(), today.getMonth(), 1));
};

const at = (iso?: string | null) => (iso ? `${tr(dayLabel(iso))} ${formatTime(iso)}` : null);

function StatusPill({ status }: { status: DeliveryStatus }) {
  const meta = STATUS_META[status];
  return (
    <View className={`flex-row items-center self-start rounded-full px-2.5 py-1 ${meta.pill}`}>
      <Ionicons name={meta.icon} size={12} color={meta.fg} />
      <Text className="text-[11px] font-semibold ml-1" style={{ color: meta.fg }}>
        {tr(meta.label)}
      </Text>
    </View>
  );
}

function Stat({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <View className="flex-1 min-w-[160px] bg-white rounded-2xl border border-ink/5 p-4">
      <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-[2px]">{label}</Text>
      <Text numberOfLines={1} className="text-xl font-semibold mt-1" style={{ color: color ?? brand.ink }}>
        {value}
      </Text>
      {hint ? <Text className="text-ink/40 text-xs mt-0.5">{hint}</Text> : null}
    </View>
  );
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-row items-start py-1" style={{ gap: 8 }}>
      <Ionicons name={icon} size={14} color={brand.inkMuted} style={{ marginTop: 2 }} />
      <Text className="text-ink/50 text-[12px] w-[110px]">{label}</Text>
      <Text className="flex-1 text-ink text-[13px]">{value}</Text>
    </View>
  );
}

// Everything about one delivery, so the owner never has to open anything else.
function DeliveryDetails({ order, onOpen }: { order: OrderType; onOpen: () => void }) {
  const status = statusOf(order);
  const payments = paymentsOf(order);
  const paid = isPaid(order);
  const fee = toNumber(order.deliveryFee);
  const rider = nameOf(order.rider) ?? order.outsideRider;
  const placedBy = nameOf(order.user);
  const collectedBy = nameOf(order.collectedBy);
  const paidAt = payments[0]?.createdAt;

  const steps = [
    { label: tr("Placed"), when: at(order.createdAt), by: placedBy },
    paid ? { label: order.payOnDelivery ? tr("Paid at the door") : tr("Paid"), when: at(paidAt), by: collectedBy ?? placedBy } : null,
    order.sentAt ? { label: tr("On the way"), when: at(order.sentAt), by: rider } : null,
    order.deliveredAt ? { label: tr("Delivered"), when: at(order.deliveredAt), by: rider } : null,
    status === "NOT_DELIVERED" ? { label: tr("Not delivered"), when: at(order.updatedAt), by: order.deliveryProblem } : null,
  ].filter(Boolean) as { label: string; when: string | null; by: string | null | undefined }[];

  return (
    <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
      <View className="h-1" style={{ backgroundColor: status === "NOT_DELIVERED" ? brand.danger : status === "DELIVERED" ? brand.ink : brand.lime }} />
      <View className="p-4" style={{ gap: 12 }}>
        {/* Who and where */}
        <View className="flex-row items-start" style={{ gap: 12 }}>
          <View className="flex-1">
            <Text className="text-ink text-[16px] font-semibold">{order.customerName ?? tr("Customer")}</Text>
            {order.deliveryAddress || order.deliveryArea ? (
              <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
                <Ionicons name="location-outline" size={13} color={brand.inkMuted} />
                <Text className="text-ink/60 text-[13px] flex-1">
                  {[order.deliveryAddress, order.deliveryArea].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ) : null}
            {order.customerPhone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${order.customerPhone}`)} className="flex-row items-center mt-1" style={{ gap: 4 }}>
                <Ionicons name="call-outline" size={13} color={brand.inkMuted} />
                <Text className="text-ink text-[13px] underline">{order.customerPhone}</Text>
              </Pressable>
            ) : null}
          </View>
          <View className="items-end" style={{ gap: 6 }}>
            <StatusPill status={status} />
            <Text className="text-ink text-[16px] font-semibold">{formatRwf(order.total)}</Text>
          </View>
        </View>

        {/* What */}
        <View className="bg-ivory rounded-xl p-3" style={{ gap: 4 }}>
          {order.items?.map((item) => (
            <View key={item.id} className="flex-row justify-between" style={{ gap: 8 }}>
              <Text className="text-ink text-[13px] flex-1" numberOfLines={1}>
                {item.quantity} × {item.product?.name}
              </Text>
              <Text className="text-ink/70 text-[13px]">{formatRwf(item.totalPrice)}</Text>
            </View>
          ))}
          <View className="flex-row justify-between pt-1 mt-1 border-t border-ink/10">
            <Text className="text-ink/60 text-[13px]">{tr("Delivery fee")}</Text>
            <Text className="text-ink/70 text-[13px]">{fee > 0 ? formatRwf(fee) : tr("Free")}</Text>
          </View>
        </View>

        {/* Money and people */}
        <View>
          <Row
            icon="wallet-outline"
            label={tr("Payment")}
            value={
              paid
                ? `${payments.map((p) => `${paymentMeta(p.method).label} ${formatRwf(p.amount)}`).join(" + ")}${order.payOnDelivery ? ` · ${tr("at the door")}` : ""}`
                : order.payOnDelivery
                  ? status === "NOT_DELIVERED"
                    ? tr("Not paid (cancelled)")
                    : `${tr("To collect at the door")}: ${formatRwf(order.total)}`
                  : tr("Not paid yet")
            }
          />
          {collectedBy ? <Row icon="hand-left-outline" label={tr("Money with")} value={collectedBy} /> : null}
          <Row icon="person-outline" label={tr("Placed by")} value={placedBy ?? "—"} />
          <Row icon="bicycle-outline" label={tr("Taken by")} value={rider ?? tr("Not recorded")} />
          {order.note ? <Row icon="chatbox-outline" label={tr("Note")} value={order.note} /> : null}
          {order.deliveryProblem ? <Row icon="alert-circle-outline" label={tr("Problem")} value={order.deliveryProblem} /> : null}
        </View>

        {/* When */}
        <View className="border-t border-ink/5 pt-3" style={{ gap: 6 }}>
          {steps.map((s, i) => (
            <View key={i} className="flex-row items-center" style={{ gap: 8 }}>
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: i === steps.length - 1 ? brand.ink : brand.inkDisabled }} />
              <Text className="text-ink text-[12px] font-semibold w-[120px]">{s.label}</Text>
              <Text className="text-ink/50 text-[12px] flex-1">
                {[s.when, s.by].filter(Boolean).join(" · ")}
              </Text>
            </View>
          ))}
        </View>

        <Pressable onPress={onOpen} className="self-start flex-row items-center" style={{ gap: 4 }}>
          <Text className="text-ink/60 text-xs underline">{tr("Open order")}</Text>
          <Ionicons name="chevron-forward" size={12} color={brand.inkMuted} />
        </Pressable>
      </View>
    </View>
  );
}

export default function OwnerDeliveries() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const orders = useOrder((s) => s.orders);
  const fetchOrders = useOrder((s) => s.fetchOrders);
  const [period, setPeriod] = useState<Period>("today");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(orders.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      await fetchOrders();
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not load deliveries"), text2: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Keeps up with deliveries moving along.
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inRange = useMemo(
    () =>
      orders
        .filter((o) => o.type === "DELIVERY" && inPeriod(o.createdAt, period))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders, period],
  );

  const query = search.trim().toLowerCase();
  const visible = inRange.filter(
    (o) =>
      (status === "all" || statusOf(o) === status) &&
      (!query ||
        [o.customerName, o.customerPhone, o.deliveryAddress, o.deliveryArea, nameOf(o.rider), o.outsideRider]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query))),
  );

  const counts = { all: inRange.length } as Record<StatusFilter, number>;
  for (const s of STATUS_ORDER) counts[s] = inRange.filter((o) => statusOf(o) === s).length;

  const delivered = inRange.filter((o) => statusOf(o) === "DELIVERED");
  const fees = delivered.reduce((s, o) => s + toNumber(o.deliveryFee), 0);
  const atDoor = delivered.filter((o) => o.payOnDelivery && isPaid(o)).reduce((s, o) => s + toNumber(o.total), 0);
  const toCollect = inRange
    .filter((o) => o.payOnDelivery && !isPaid(o) && (statusOf(o) === "WAITING" || statusOf(o) === "ON_THE_WAY"))
    .reduce((s, o) => s + toNumber(o.total), 0);

  const download = async () => {
    if (visible.length === 0) {
      Toast.show({ type: "info", text1: tr("Nothing to export") });
      return;
    }
    try {
      await exportCsv(`deliveries-${dayKey(new Date())}.csv`, [
        ["Placed", "Customer", "Phone", "Address", "Area", "Items", "Fee", "Total", "Payment", "Paid", "Status", "Placed by", "Taken by", "Money with", "On the way", "Delivered", "Problem", "Note"],
        ...visible.map((o) => [
          new Date(o.createdAt).toLocaleString("en-GB"),
          o.customerName,
          o.customerPhone,
          o.deliveryAddress,
          o.deliveryArea,
          o.items?.map((i) => `${i.quantity} x ${i.product?.name}`).join("; "),
          toNumber(o.deliveryFee),
          toNumber(o.total),
          o.payOnDelivery ? "At the door" : "Paid now",
          isPaid(o) ? paymentsOf(o).map((p) => `${p.method} ${toNumber(p.amount)}`).join(" + ") : "No",
          STATUS_META[statusOf(o)].label,
          nameOf(o.user),
          nameOf(o.rider) ?? o.outsideRider,
          nameOf(o.collectedBy),
          o.sentAt ? new Date(o.sentAt).toLocaleString("en-GB") : "",
          o.deliveredAt ? new Date(o.deliveredAt).toLocaleString("en-GB") : "",
          o.deliveryProblem,
          o.note,
        ]),
      ]);
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not export"), text2: (error as Error).message });
    }
  };

  const twoCols = width >= 1200;

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 18 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <PageHeader
        eyebrow={tr("Sales")}
        title={tr("Deliveries")}
        subtitle={tr("Every delivery: who ordered, what, where, who took it and the money.")}
        right={
          <Pressable onPress={download} className="flex-row items-center h-10 px-4 rounded-xl bg-ink active:bg-ink/90">
            <Ionicons name="download-outline" size={16} color={brand.lime} />
            <Text className="text-white text-[13px] font-semibold ml-2">{tr("Export")}</Text>
          </Pressable>
        }
      />

      <Tabs options={PERIODS.map((p) => ({ ...p, label: tr(p.label) }))} value={period} onChange={(v) => setPeriod(v as Period)} />

      <View className="flex-row flex-wrap" style={{ gap: 12 }}>
        <Stat label={tr("Deliveries")} value={inRange.length.toLocaleString()} hint={`${counts.DELIVERED} ${tr("delivered")} · ${counts.NOT_DELIVERED} ${tr("not delivered")}`} />
        <Stat label={tr("Still going")} value={(counts.WAITING + counts.ON_THE_WAY).toLocaleString()} hint={toCollect > 0 ? `${formatRwf(toCollect)} ${tr("to collect at doors")}` : undefined} />
        <Stat label={tr("Delivery fees")} value={formatRwf(fees)} hint={tr("From delivered orders")} />
        <Stat label={tr("Collected at doors")} value={formatRwf(atDoor)} color={brand.success} />
      </View>

      <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
        {(["all", ...STATUS_ORDER] as StatusFilter[]).map((s) => {
          const on = status === s;
          return (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              accessibilityState={{ selected: on }}
              className={`h-10 flex-row items-center rounded-xl px-3.5 border ${on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
              style={{ gap: 8 }}
            >
              <Text className={`text-[13px] font-semibold ${on ? "text-white" : "text-ink"}`}>
                {s === "all" ? tr("All") : tr(STATUS_META[s].label)}
              </Text>
              <Text className={`text-xs font-semibold ${on ? "text-lime" : "text-ink/35"}`}>{counts[s]}</Text>
            </Pressable>
          );
        })}
        <View className="flex-row items-center h-10 flex-1 min-w-[200px] max-w-[320px] rounded-xl bg-white border border-ink/10 px-3" style={{ gap: 8 }}>
          <Ionicons name="search-outline" size={16} color={brand.inkMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={tr("Customer, phone, place or rider")}
            placeholderTextColor={brand.inkDisabled}
            className="flex-1 text-[13px] text-ink"
            style={webNoOutline}
          />
        </View>
      </View>

      {loading ? (
        <View className="py-16 items-center">
          <ActivityIndicator color={brand.ink} />
        </View>
      ) : visible.length === 0 ? (
        <View className="bg-white rounded-2xl border border-ink/5 py-14 items-center px-6">
          <Ionicons name="bicycle-outline" size={28} color={brand.inkDisabled} />
          <Text className="text-ink text-[15px] font-semibold mt-3">{tr("No deliveries here")}</Text>
          <Text className="text-ink/50 text-[13px] mt-1 text-center">{tr("Try another day or filter.")}</Text>
        </View>
      ) : (
        <View className={twoCols ? "flex-row flex-wrap" : ""} style={{ gap: 14 }}>
          {visible.map((o) => (
            <View key={o.id} style={twoCols ? { width: "49%" } : undefined} className={twoCols ? "flex-grow" : ""}>
              <DeliveryDetails
                order={o}
                onOpen={() => router.push({ pathname: "/(owner)/owner/inventory/Orders/[id]", params: { id: o.id } })}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
