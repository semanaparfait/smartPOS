import TrendChart, { type TrendPoint } from "@/components/dashboard/TrendChart";
import { deviceState } from "@/components/devices/deviceKit";
import {
  formatRwf,
  formatTime,
  initials,
  itemCount,
  orderNumber,
  orderStatus,
  PAYMENT_META,
  PAYMENT_METHODS,
  paymentsOf,
  ProductThumb,
  STATUS_META,
  toNumber,
} from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import useDeviceInfo from "@/store/Device/useDeviceInfo";
import useFinanceVerification, { verificationKey } from "@/store/Finance/useFinanceVerification";
import useOrder from "@/store/Order/Order";
import type { OrderItemType, OrderType, PaymentMethod } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";

type Period = "today" | "7d" | "30d";

const PERIODS: { key: Period; label: string; days: number; previous: string }[] = [
  { key: "today", label: "Today", days: 1, previous: "Yesterday" },
  { key: "7d", label: "7 days", days: 7, previous: "Previous 7 days" },
  { key: "30d", label: "30 days", days: 30, previous: "Previous 30 days" },
];

const DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// When an order "happened": the payment time for completed orders, otherwise when it was created.
const orderTime = (o: OrderType) =>
  new Date(orderStatus(o) === "COMPLETED" ? (paymentsOf(o)[0]?.createdAt ?? o.updatedAt) : o.createdAt).getTime();

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

// ---------- Pieces ----------

function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`bg-white rounded-2xl border border-ink/5 p-5 ${className}`}>
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1 pr-3">
          <Text className="text-ink text-[15px] font-bold">{title}</Text>
          {subtitle ? <Text className="text-ink/50 text-[12px] mt-0.5">{subtitle}</Text> : null}
        </View>
        {action && (
          <Pressable onPress={action.onPress} className="flex-row items-center">
            <Text className="text-ink text-[12px] font-semibold">{action.label}</Text>
            <Ionicons name="chevron-forward" size={14} color={brand.ink} />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (previous === 0 && current === 0) return <Text className="text-ink/40 text-[12px]">No sales {label} either</Text>;
  if (previous === 0) return <Text className="text-ink/50 text-[12px]">Nothing {label} to compare</Text>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <View className="flex-row items-center">
      <View
        className={`flex-row items-center rounded-full px-1.5 py-0.5 ${up ? "bg-success/10" : "bg-danger/10"}`}
      >
        <Ionicons name={up ? "arrow-up" : "arrow-down"} size={11} color={up ? brand.success : brand.danger} />
        <Text className="text-[11px] font-semibold ml-0.5" style={{ color: up ? brand.success : brand.danger }}>
          {Math.abs(pct)}%
        </Text>
      </View>
      <Text className="text-ink/40 text-[12px] ml-1.5">vs {label}</Text>
    </View>
  );
}

function Kpi({
  icon,
  label,
  value,
  footer,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  footer: React.ReactNode;
}) {
  return (
    <View className="flex-1 min-w-[200px] bg-white rounded-2xl border border-ink/5 p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-ink/50 text-[13px]">{label}</Text>
        <View className="w-9 h-9 rounded-xl bg-ivory items-center justify-center">
          <Ionicons name={icon} size={17} color={brand.ink} />
        </View>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit className="text-ink text-[26px] font-bold mt-2">
        {value}
      </Text>
      <View className="mt-1.5">{footer}</View>
    </View>
  );
}

// A labeled row with a thin bar showing its share of the largest row.
function BarRow({
  leading,
  title,
  subtitle,
  value,
  ratio,
}: {
  leading: React.ReactNode;
  title: string;
  subtitle?: string;
  value: string;
  ratio: number;
}) {
  return (
    <View className="flex-row items-center">
      {leading}
      <View className="flex-1 ml-3">
        <View className="flex-row items-baseline justify-between">
          <Text numberOfLines={1} className="flex-1 text-ink text-[13px] font-medium pr-2">
            {title}
          </Text>
          <Text className="text-ink text-[13px] font-semibold">{value}</Text>
        </View>
        <View className="flex-row items-center mt-1.5">
          <View className="flex-1 h-1.5 rounded-full bg-ivory overflow-hidden">
            <View className="h-full rounded-full bg-ink" style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 2 : 0)}%` }} />
          </View>
          {subtitle ? <Text className="text-ink/40 text-[11px] ml-2 min-w-[64px] text-right">{subtitle}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function AttentionRow({
  icon,
  title,
  detail,
  count,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  count: number;
  onPress: () => void;
  danger?: boolean;
}) {
  const clear = count === 0;
  return (
    <Pressable onPress={onPress} className="flex-row items-center py-3 border-t border-ink/5 active:bg-ivory">
      <View className={`w-9 h-9 rounded-xl items-center justify-center ${clear ? "bg-ivory" : danger ? "bg-danger/10" : "bg-lime/40"}`}>
        <Ionicons
          name={clear ? "checkmark" : icon}
          size={16}
          color={clear ? brand.success : danger ? brand.danger : brand.ink}
        />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-ink text-[13px] font-medium">{title}</Text>
        <Text numberOfLines={1} className="text-ink/50 text-[12px]">
          {clear ? "All clear" : detail}
        </Text>
      </View>
      {!clear && (
        <View className={`min-w-[26px] h-6 px-2 rounded-full items-center justify-center ${danger ? "bg-danger" : "bg-ink"}`}>
          <Text className={`text-[12px] font-semibold ${danger ? "text-white" : "text-lime"}`}>{count}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={15} color={brand.inkDisabled} style={{ marginLeft: 8 }} />
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  return <Text className="text-ink/40 text-[13px] py-6 text-center">{text}</Text>;
}

// ---------- Page ----------

export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { orders, fetchOrders } = useOrder();
  const { deviceListType, getDevices } = useDeviceInfo();
  const { records, loaded: recordsLoaded, load: loadRecords } = useFinanceVerification();
  const profile = useAuth((s) => s.profile);

  const [period, setPeriod] = useState<Period>("today");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = async (pull = false) => {
    const setBusy = pull ? setRefreshing : setLoading;
    setBusy(true);
    await Promise.allSettled([fetchOrders(), getDevices()]);
    setNow(Date.now());
    setBusy(false);
  };

  useEffect(() => {
    refresh();
    if (!recordsLoaded) loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cfg = PERIODS.find((p) => p.key === period)!;
  const go = (route: string) => router.push(route as Href);

  // Current window and the same-length window before it ("vs same time yesterday" for Today).
  const windowStart = startOfDay(new Date(now)).getTime() - (cfg.days - 1) * DAY;
  const span = cfg.days * DAY;

  const stats = useMemo(() => {
    const inRange = (o: OrderType, from: number, to: number) => {
      const t = orderTime(o);
      return t >= from && t <= to;
    };
    const cur = orders.filter((o) => inRange(o, windowStart, now));
    const prev = orders.filter((o) => inRange(o, windowStart - span, now - span));
    const completed = (list: OrderType[]) => list.filter((o) => orderStatus(o) === "COMPLETED");
    const sum = (list: OrderType[]) => list.reduce((s, o) => s + toNumber(o.total), 0);

    const curDone = completed(cur);
    const prevDone = completed(prev);

    // Payment split
    const methods: Record<PaymentMethod, number> = { CASH: 0, MOMO: 0, CARD: 0, CREDIT: 0 };
    let unrecorded = 0;
    for (const o of curDone) {
      const ps = paymentsOf(o);
      if (ps.length === 0) unrecorded += toNumber(o.total);
      for (const p of ps) {
        const m = p.method?.toUpperCase() as PaymentMethod;
        if (m in methods) methods[m] += toNumber(p.amount);
      }
    }

    // Top products by revenue
    const products = new Map<string, { item: OrderItemType; name: string; qty: number; revenue: number }>();
    for (const o of curDone) {
      for (const item of o.items) {
        const id = item.product?.id ?? item.id;
        const row = products.get(id) ?? { item, name: item.product?.name?.trim() || "Item", qty: 0, revenue: 0 };
        row.qty += item.quantity;
        row.revenue += toNumber(item.totalPrice);
        products.set(id, row);
      }
    }

    // Staff by sales
    const staff = new Map<string, { name: string; sales: number; orders: number }>();
    for (const o of curDone) {
      const id = o.user?.id ?? "unknown";
      const row = staff.get(id) ?? { name: o.user?.name ?? "Unknown", sales: 0, orders: 0 };
      row.sales += toNumber(o.total);
      row.orders += 1;
      staff.set(id, row);
    }

    // Trend buckets: hours for Today, days otherwise.
    let points: TrendPoint[];
    if (period === "today") {
      const hours = Array.from({ length: 24 }, (_, h) => h);
      const curH = new Array(24).fill(0);
      const prevH = new Array(24).fill(0);
      const yStart = windowStart - DAY;
      for (const o of completed(orders)) {
        const t = orderTime(o);
        if (t >= windowStart && t <= now) curH[new Date(t).getHours()] += toNumber(o.total);
        else if (t >= yStart && t < windowStart) prevH[new Date(t).getHours()] += toNumber(o.total);
      }
      const nowH = new Date(now).getHours();
      // Show the trading day: 6:00 to 22:00, widened if sales happened outside it.
      const active = hours.filter((h) => curH[h] || prevH[h]);
      const from = Math.min(6, ...active);
      const to = Math.max(22, ...active);
      points = hours.slice(from, to + 1).map((h) => ({
        label: `${String(h).padStart(2, "0")}:00`,
        current: h <= nowH ? curH.slice(from, h + 1).reduce((a, b) => a + b, 0) : null,
        previous: prevH.slice(from, h + 1).reduce((a, b) => a + b, 0),
      }));
    } else {
      const curD = new Array(cfg.days).fill(0);
      const prevD = new Array(cfg.days).fill(0);
      for (const o of completed(orders)) {
        const t = orderTime(o);
        if (t >= windowStart && t <= now) curD[Math.floor((t - windowStart) / DAY)] += toNumber(o.total);
        else if (t >= windowStart - span && t < windowStart) prevD[Math.floor((t - (windowStart - span)) / DAY)] += toNumber(o.total);
      }
      points = curD.map((v, i) => {
        const d = new Date(windowStart + i * DAY);
        return {
          label: d.toLocaleDateString("en-GB", cfg.days <= 7 ? { weekday: "short" } : { day: "numeric", month: "short" }),
          current: v,
          previous: prevD[i],
        };
      });
    }

    return {
      sales: sum(curDone),
      prevSales: sum(prevDone),
      paidOrders: curDone.length,
      prevPaidOrders: prevDone.length,
      items: curDone.reduce((s, o) => s + itemCount(o), 0),
      pendingInPeriod: cur.filter((o) => orderStatus(o) === "PENDING").length,
      cancelled: cur.filter((o) => orderStatus(o) === "CANCELLED").length,
      methods,
      unrecorded,
      products: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      staff: [...staff.values()].sort((a, b) => b.sales - a.sales).slice(0, 5),
      points,
      recent: [...cur].sort((a, b) => orderTime(b) - orderTime(a)).slice(0, 6),
    };
  }, [orders, windowStart, span, now, period, cfg.days]);

  // Things the owner should act on, regardless of period.
  const attention = useMemo(() => {
    const pending = orders.filter((o) => orderStatus(o) === "PENDING");
    const today = dayKey(new Date(now));
    const todayStart = startOfDay(new Date(now)).getTime();
    const sellersToday = new Set(
      orders
        .filter((o) => orderStatus(o) === "COMPLETED" && orderTime(o) >= todayStart && o.user?.id)
        .map((o) => o.user.id),
    );
    const toVerify = [...sellersToday].filter((id) => !records[verificationKey(today, id)]).length;
    const devices = deviceListType ?? [];
    return {
      pending: pending.length,
      pendingValue: pending.reduce((s, o) => s + toNumber(o.total), 0),
      toVerify,
      sellersToday: sellersToday.size,
      devicesPending: devices.filter((d) => deviceState(d) === "pending").length,
      devicesOffline: devices.filter((d) => deviceState(d) === "active" && !d.online).length,
      devicesOnline: devices.filter((d) => d.online).length,
    };
  }, [orders, records, deviceListType, now]);

  const avg = stats.paidOrders ? stats.sales / stats.paidOrders : 0;
  const prevAvg = stats.prevPaidOrders ? stats.prevSales / stats.prevPaidOrders : 0;
  const paymentTotal = PAYMENT_METHODS.reduce((s, m) => s + stats.methods[m], 0);
  const maxMethod = Math.max(...PAYMENT_METHODS.map((m) => stats.methods[m]), 1);
  const wide = width >= 1100;
  const firstName = (profile?.name ?? "").split(" ")[0];
  const compareLabel = period === "today" ? "same time yesterday" : cfg.previous.toLowerCase();

  if (loading && orders.length === 0) {
    return (
      <View className="flex-1 bg-ivory items-center justify-center">
        <ActivityIndicator color={brand.ink} />
        <Text className="text-ink/40 text-xs mt-3">Loading your dashboard…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} />}
    >
      {/* Header */}
      <View className="flex-row flex-wrap items-end justify-between" style={{ gap: 12 }}>
        <View>
          <Text className="text-ink/50 text-[13px]">
            {new Date(now).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </Text>
          <Text className="text-ink text-2xl font-bold mt-0.5">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </Text>
          <Text className="text-ink/50 text-[13px] mt-0.5">Here is how your business is doing.</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className="flex-row bg-white border border-ink/10 rounded-xl p-1">
            {PERIODS.map((p) => {
              const on = period === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  accessibilityState={{ selected: on }}
                  className={`h-8 px-3.5 rounded-lg items-center justify-center ${on ? "bg-ink" : ""}`}
                >
                  <Text className={`text-[12px] font-medium ${on ? "text-lime" : "text-ink/60"}`}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => refresh()}
            disabled={loading}
            accessibilityLabel="Refresh"
            className="w-10 h-10 rounded-xl bg-white border border-ink/10 items-center justify-center active:bg-ivory"
          >
            {loading ? <ActivityIndicator size="small" color={brand.ink} /> : <Ionicons name="refresh" size={16} color={brand.ink} />}
          </Pressable>
        </View>
      </View>

      {/* KPIs */}
      <View className="flex-row flex-wrap" style={{ gap: 12 }}>
        <Kpi
          icon="cash-outline"
          label="Sales"
          value={formatRwf(stats.sales)}
          footer={<Delta current={stats.sales} previous={stats.prevSales} label={compareLabel} />}
        />
        <Kpi
          icon="receipt-outline"
          label="Paid orders"
          value={String(stats.paidOrders)}
          footer={
            <Text className="text-ink/50 text-[12px]">
              {stats.pendingInPeriod} pending · {stats.cancelled} cancelled
            </Text>
          }
        />
        <Kpi
          icon="pricetag-outline"
          label="Average sale"
          value={formatRwf(avg)}
          footer={<Delta current={avg} previous={prevAvg} label={compareLabel} />}
        />
        <Kpi
          icon="cube-outline"
          label="Items sold"
          value={stats.items.toLocaleString()}
          footer={
            <Text className="text-ink/50 text-[12px]">
              {stats.paidOrders ? `${(stats.items / stats.paidOrders).toFixed(1)} per order` : "No sales yet"}
            </Text>
          }
        />
      </View>

      {/* Trend + payments */}
      <View className={wide ? "flex-row items-stretch" : ""} style={{ gap: 16 }}>
        <Card
          className={wide ? "flex-[2]" : ""}
          title={period === "today" ? "Sales through the day" : "Sales per day"}
          subtitle={
            period === "today"
              ? "Running total, compared with yesterday at the same hour"
              : `Each day, compared with the ${cfg.previous.toLowerCase()}`
          }
        >
          <TrendChart
            points={stats.points}
            currentLabel={cfg.label === "Today" ? "Today" : `Last ${cfg.label}`}
            previousLabel={cfg.previous}
            labelEvery={period === "today" ? 3 : period === "7d" ? 1 : 5}
          />
        </Card>

        <Card
          className={wide ? "flex-1" : ""}
          title="How customers paid"
          subtitle={paymentTotal ? `${formatRwf(paymentTotal)} in recorded payments` : undefined}
          action={{ label: "Verify", onPress: () => go("/(owner)/finance/verification") }}
        >
          {paymentTotal === 0 && stats.unrecorded === 0 ? (
            <Empty text="No payments in this period." />
          ) : (
            <View style={{ gap: 14 }}>
              {PAYMENT_METHODS.map((m) => {
                const meta = PAYMENT_META[m];
                const amount = stats.methods[m];
                const share = paymentTotal ? Math.round((amount / paymentTotal) * 100) : 0;
                return (
                  <BarRow
                    key={m}
                    leading={
                      <View className={`w-9 h-9 rounded-xl items-center justify-center ${meta.bg}`}>
                        <Ionicons name={meta.icon} size={16} color={meta.fg} />
                      </View>
                    }
                    title={meta.label}
                    value={formatRwf(amount)}
                    subtitle={`${share}%`}
                    ratio={amount / maxMethod}
                  />
                );
              })}
              {stats.unrecorded > 0 && (
                <Text className="text-ink/40 text-[11px]">
                  {formatRwf(stats.unrecorded)} of sales has no payment method recorded.
                </Text>
              )}
              {stats.methods.CREDIT > 0 && (
                <Pressable
                  onPress={() => go("/(owner)/finance/credits")}
                  className="flex-row items-center justify-between rounded-xl bg-danger/5 border border-danger/20 px-3 py-2.5"
                >
                  <Text className="text-ink text-[12px]">
                    <Text style={{ color: brand.danger }} className="font-semibold">
                      {formatRwf(stats.methods.CREDIT)}
                    </Text>{" "}
                    given on credit
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={brand.danger} />
                </Pressable>
              )}
            </View>
          )}
        </Card>
      </View>

      {/* Products, staff, attention */}
      <View className={wide ? "flex-row items-stretch" : ""} style={{ gap: 16 }}>
        <Card className={wide ? "flex-1" : ""} title="Best-selling products" subtitle="By sales value">
          {stats.products.length === 0 ? (
            <Empty text="No products sold in this period." />
          ) : (
            <View style={{ gap: 14 }}>
              {stats.products.map((p) => (
                <BarRow
                  key={p.name}
                  leading={<ProductThumb item={p.item} size={36} />}
                  title={p.name}
                  value={formatRwf(p.revenue)}
                  subtitle={`${p.qty} sold`}
                  ratio={p.revenue / (stats.products[0]?.revenue || 1)}
                />
              ))}
            </View>
          )}
        </Card>

        <Card
          className={wide ? "flex-1" : ""}
          title="Staff sales"
          subtitle="Who sold the most"
          action={{ label: "Workers", onPress: () => go("/(owner)/workers/workers") }}
        >
          {stats.staff.length === 0 ? (
            <Empty text="No sales in this period." />
          ) : (
            <View style={{ gap: 14 }}>
              {stats.staff.map((s, i) => (
                <BarRow
                  key={`${s.name}-${i}`}
                  leading={
                    <View className="w-9 h-9 rounded-full bg-ink items-center justify-center">
                      <Text className="text-lime text-[12px] font-semibold">{initials(s.name)}</Text>
                    </View>
                  }
                  title={s.name}
                  value={formatRwf(s.sales)}
                  subtitle={`${s.orders} order${s.orders === 1 ? "" : "s"}`}
                  ratio={s.sales / (stats.staff[0]?.sales || 1)}
                />
              ))}
            </View>
          )}
        </Card>

        <Card className={wide ? "flex-1" : ""} title="Needs your attention" subtitle="Right now">
          <View className="-mt-3">
            <AttentionRow
              icon="hourglass-outline"
              title="Unpaid orders"
              detail={`${formatRwf(attention.pendingValue)} waiting at checkout`}
              count={attention.pending}
              onPress={() => go("/(owner)/inventory/Orders/orders")}
            />
            <AttentionRow
              icon="shield-checkmark-outline"
              title="Takings to verify today"
              detail={`${attention.toVerify} of ${attention.sellersToday} workers not checked`}
              count={attention.toVerify}
              onPress={() => go("/(owner)/finance/verification")}
            />
            <AttentionRow
              icon="hardware-chip-outline"
              title="Devices waiting for approval"
              detail="New terminals asking to join"
              count={attention.devicesPending}
              onPress={() => go("/(owner)/Settings/Devices/DeviceInformation")}
            />
            <AttentionRow
              icon="cloud-offline-outline"
              title="Approved devices offline"
              detail={`${attention.devicesOnline} online right now`}
              count={attention.devicesOffline}
              onPress={() => go("/(owner)/Settings/Devices/DeviceInformation")}
              danger
            />
          </View>
        </Card>
      </View>

      {/* Recent orders */}
      <Card
        title="Latest orders"
        subtitle={`In the ${period === "today" ? "day so far" : `last ${cfg.label}`}`}
        action={{ label: "All orders", onPress: () => go("/(owner)/inventory/Orders/orders") }}
      >
        {stats.recent.length === 0 ? (
          <Empty text="No orders in this period yet." />
        ) : (
          <View className="rounded-xl border border-ink/5 overflow-hidden">
            <View className="flex-row bg-ivory px-4 py-2">
              <Text className="flex-[1.1] text-ink/50 text-[11px] font-medium">Order</Text>
              <Text className="flex-[1.4] text-ink/50 text-[11px] font-medium">Served by</Text>
              <Text className="flex-[1.2] text-ink/50 text-[11px] font-medium">Paid with</Text>
              <Text className="flex-1 text-ink/50 text-[11px] font-medium">Status</Text>
              <Text className="flex-1 text-ink/50 text-[11px] font-medium text-right">Total</Text>
            </View>
            {stats.recent.map((o) => {
              const status = orderStatus(o);
              const meta = STATUS_META[status];
              const methods = paymentsOf(o).map((p) => PAYMENT_META[p.method?.toUpperCase() as PaymentMethod]?.label ?? p.method);
              return (
                <Pressable
                  key={o.id}
                  onPress={() => router.push({ pathname: "/(owner)/inventory/Orders/[id]", params: { id: o.id } })}
                  className="flex-row items-center px-4 py-3 border-t border-ink/5 active:bg-ivory"
                >
                  <View className="flex-[1.1]">
                    <Text className="text-ink text-[13px] font-medium">{orderNumber(o)}</Text>
                    <Text className="text-ink/40 text-[11px]">{formatTime(new Date(orderTime(o)).toISOString())}</Text>
                  </View>
                  <Text numberOfLines={1} className="flex-[1.4] text-ink/70 text-[13px] pr-2">
                    {o.user?.name ?? "—"}
                  </Text>
                  <Text numberOfLines={1} className="flex-[1.2] text-ink/70 text-[13px] pr-2">
                    {methods.length ? methods.join(" + ") : "—"}
                  </Text>
                  <View className="flex-1">
                    <View className={`flex-row items-center self-start rounded-full px-2 py-0.5 ${status === "PENDING" ? "bg-lime/40" : meta.pill}`}>
                      <Ionicons name={meta.icon} size={11} color={meta.fg} />
                      <Text className="text-[11px] font-medium ml-1" style={{ color: meta.fg }}>
                        {status === "OTHER" ? o.status : meta.label}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className={`flex-1 text-[13px] font-semibold text-right ${status === "CANCELLED" ? "text-ink/40 line-through" : "text-ink"}`}
                  >
                    {formatRwf(o.total)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}
