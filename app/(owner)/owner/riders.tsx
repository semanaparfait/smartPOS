import { initials, PageHeader } from "@/components/forms/FormKit";
import { Tabs } from "@/components/inventory/stockKit";
import { formatRwf, toNumber } from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import { dayKey } from "@/store/Finance/useFinanceVerification";
import useDelivery, { type Rider } from "@/store/Delivery/useDelivery";
import useOrder from "@/store/Order/Order";
import type { DeliveryStatus, OrderType } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

type Period = "today" | "yesterday" | "week" | "month";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
];

const statusOf = (o: OrderType): DeliveryStatus => o.deliveryStatus ?? "WAITING";
const isPaid = (o: OrderType) => (o.status || "").toUpperCase() === "COMPLETED";

const inPeriod = (iso: string, period: Period) => {
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

const minutesBetween = (from: string, to: string | number) =>
  Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000));

const duration = (min: number | null) => {
  if (min === null) return "—";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
};

type RiderStats = {
  rider: Rider;
  current: OrderType[];
  delivered: number;
  failed: number;
  avgTrip: number | null;
  collected: number;
};

// What each rider carried in the period, and what they carry right now.
const statsFor = (rider: Rider, orders: OrderType[], open: OrderType[]): RiderStats => {
  const mine = orders.filter((o) => o.rider?.id === rider.id);
  const done = mine.filter((o) => statusOf(o) === "DELIVERED");
  const trips = done.filter((o) => o.sentAt && o.deliveredAt).map((o) => minutesBetween(o.sentAt!, o.deliveredAt!));
  return {
    rider,
    current: open.filter((o) => o.rider?.id === rider.id && statusOf(o) === "ON_THE_WAY"),
    delivered: done.length,
    failed: mine.filter((o) => statusOf(o) === "NOT_DELIVERED").length,
    avgTrip: trips.length ? Math.round(trips.reduce((s, m) => s + m, 0) / trips.length) : null,
    collected: done.filter((o) => o.payOnDelivery && isPaid(o)).reduce((s, o) => s + toNumber(o.total), 0),
  };
};

function Avatar({ name, out, size = 48 }: { name: string; out: boolean; size?: number }) {
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: out ? brand.lime : brand.ivory,
        borderWidth: 2,
        borderColor: out ? brand.ink : brand.white,
      }}
    >
      <Text className="font-semibold text-ink" style={{ fontSize: size * 0.34 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View className="flex-1 min-w-[140px]">
      <Text className="text-white/45 text-[11px] font-semibold uppercase tracking-[2px]">{label}</Text>
      <Text numberOfLines={1} className="text-white text-2xl font-semibold mt-1">
        {value}
      </Text>
      {hint ? <Text className="text-white/45 text-xs mt-0.5">{hint}</Text> : null}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-ivory rounded-xl px-3 py-2.5">
      <Text numberOfLines={1} className="text-ink text-[15px] font-semibold">
        {value}
      </Text>
      <Text numberOfLines={1} className="text-ink/45 text-[11px] mt-0.5">
        {label}
      </Text>
    </View>
  );
}

function RiderCard({ stats, top, now }: { stats: RiderStats; top: boolean; now: number }) {
  const { rider, current, delivered, failed, avgTrip, collected } = stats;
  const out = current.length > 0;
  const tried = delivered + failed;
  const rate = tried ? Math.round((delivered / tried) * 100) : null;

  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-4" style={{ gap: 14 }}>
      {/* Who */}
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <Avatar name={rider.name} out={out} />
        <View className="flex-1">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text numberOfLines={1} className="text-ink text-[16px] font-semibold flex-shrink">
              {rider.name}
            </Text>
            {top ? (
              <View className="flex-row items-center rounded-full bg-lime/40 px-2 py-0.5" style={{ gap: 3 }}>
                <Ionicons name="trophy" size={10} color={brand.ink} />
                <Text className="text-ink text-[10px] font-semibold">{tr("Most deliveries")}</Text>
              </View>
            ) : null}
          </View>
          {rider.phone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${rider.phone}`)} className="flex-row items-center mt-0.5" style={{ gap: 4 }}>
              <Ionicons name="call-outline" size={12} color={brand.inkMuted} />
              <Text className="text-ink/60 text-[12px] underline">{rider.phone}</Text>
            </Pressable>
          ) : (
            <Text className="text-ink/40 text-[12px] mt-0.5">{tr("No phone saved")}</Text>
          )}
        </View>
        <View className={`flex-row items-center rounded-full px-2.5 py-1 ${out ? "bg-ink" : "bg-ivory"}`} style={{ gap: 6 }}>
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: out ? brand.lime : brand.success }} />
          <Text className={`text-[11px] font-semibold ${out ? "text-lime" : "text-ink"}`}>
            {out ? tr("Out now") : tr("Available")}
          </Text>
        </View>
      </View>

      {/* What they carry now */}
      {out ? (
        <View className="bg-ink rounded-xl p-3" style={{ gap: 8 }}>
          {current.map((o) => {
            const toCollect = o.payOnDelivery && !isPaid(o);
            return (
              <View key={o.id} className="flex-row items-center" style={{ gap: 10 }}>
                <Ionicons name="bicycle" size={16} color={brand.lime} />
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-white text-[13px] font-semibold">
                    {o.customerName ?? tr("Customer")}
                  </Text>
                  <Text numberOfLines={1} className="text-white/50 text-[11px]">
                    {[o.deliveryAddress, o.deliveryArea].filter(Boolean).join(" · ") || tr("No place given")}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-lime text-[12px] font-semibold">
                    {o.sentAt ? duration(minutesBetween(o.sentAt, now)) : "—"}
                  </Text>
                  <Text className="text-white/50 text-[11px]">
                    {toCollect ? `${tr("Collect")} ${formatRwf(o.total)}` : tr("Paid")}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* How they did */}
      <View className="flex-row" style={{ gap: 8 }}>
        <MiniStat label={tr("Delivered")} value={delivered.toLocaleString()} />
        <MiniStat label={tr("Average trip")} value={duration(avgTrip)} />
        <MiniStat label={tr("Collected at doors")} value={collected > 0 ? formatRwf(collected) : "—"} />
      </View>

      <View style={{ gap: 6 }}>
        <View className="flex-row justify-between">
          <Text className="text-ink/50 text-[12px]">{tr("Delivered as planned")}</Text>
          <Text className="text-ink text-[12px] font-semibold">
            {rate === null ? tr("No trips yet") : `${rate}%${failed ? ` · ${failed} ${tr("not delivered")}` : ""}`}
          </Text>
        </View>
        <View className="h-2 rounded-full bg-ivory overflow-hidden">
          <View
            className="h-2 rounded-full"
            style={{ width: `${rate ?? 0}%`, backgroundColor: rate !== null && rate < 80 ? brand.danger : brand.ink }}
          />
        </View>
      </View>
    </View>
  );
}

export default function OwnerRiders() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const orders = useOrder((s) => s.orders);
  const fetchOrders = useOrder((s) => s.fetchOrders);
  const riders = useDelivery((s) => s.riders);
  const loadRiders = useDelivery((s) => s.loadRiders);
  const [period, setPeriod] = useState<Period>("today");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      await Promise.all([fetchOrders(), loadRiders()]);
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not load riders"), text2: (error as Error).message });
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  };

  useEffect(() => {
    load();
    // Keeps trips and their timers moving.
    const refresh = setInterval(load, 60_000);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deliveries = useMemo(() => orders.filter((o) => o.type === "DELIVERY"), [orders]);
  const inRange = useMemo(() => deliveries.filter((o) => inPeriod(o.createdAt, period)), [deliveries, period]);
  // Trips on the road count whatever day they started.
  const open = useMemo(() => deliveries.filter((o) => statusOf(o) === "ON_THE_WAY"), [deliveries]);

  const team = useMemo(
    () =>
      riders
        .map((r) => statsFor(r, inRange, open))
        .sort((a, b) => b.current.length - a.current.length || b.delivered - a.delivered || a.rider.name.localeCompare(b.rider.name)),
    [riders, inRange, open],
  );
  const topId = team.reduce<RiderStats | null>((best, s) => (s.delivered > (best?.delivered ?? 0) ? s : best), null)?.rider.id;

  const outNow = team.filter((s) => s.current.length > 0);
  const delivered = team.reduce((s, r) => s + r.delivered, 0);
  const collected = team.reduce((s, r) => s + r.collected, 0);
  const tripTimes = inRange
    .filter((o) => o.rider && statusOf(o) === "DELIVERED" && o.sentAt && o.deliveredAt)
    .map((o) => minutesBetween(o.sentAt!, o.deliveredAt!));
  const avgTrip = tripTimes.length ? Math.round(tripTimes.reduce((s, m) => s + m, 0) / tripTimes.length) : null;
  const waiting = deliveries.filter((o) => statusOf(o) === "WAITING" && o.status !== "CANCELLED");
  const carrying = outNow.reduce(
    (s, r) => s + r.current.filter((o) => o.payOnDelivery && !isPaid(o)).reduce((t, o) => t + toNumber(o.total), 0),
    0,
  );

  // Outside services typed at the till, by name.
  const outside = useMemo(() => {
    const byName = new Map<string, { trips: number; delivered: number }>();
    for (const o of inRange) {
      if (!o.outsideRider || o.rider) continue;
      const entry = byName.get(o.outsideRider) ?? { trips: 0, delivered: 0 };
      entry.trips += 1;
      if (statusOf(o) === "DELIVERED") entry.delivered += 1;
      byName.set(o.outsideRider, entry);
    }
    return [...byName.entries()].sort((a, b) => b[1].trips - a[1].trips);
  }, [inRange]);

  const columns = width >= 1280 ? 3 : width >= 820 ? 2 : 1;

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
        eyebrow={tr("Deliveries")}
        title={tr("Riders")}
        subtitle={tr("Your delivery team: who is out now, what they carry and how they did.")}
        right={
          <Pressable
            onPress={() => router.push("/(owner)/owner/deliveries")}
            className="flex-row items-center h-10 px-4 rounded-xl bg-white border border-ink/10 active:bg-ivory"
          >
            <Ionicons name="list-outline" size={16} color={brand.ink} />
            <Text className="text-ink text-[13px] font-semibold ml-2">{tr("All deliveries")}</Text>
          </Pressable>
        }
      />

      {loading ? (
        <View className="py-16 items-center">
          <ActivityIndicator color={brand.ink} />
        </View>
      ) : riders.length === 0 ? (
        <View className="bg-white rounded-2xl border border-ink/5 py-14 items-center px-6">
          <View className="w-14 h-14 rounded-full bg-lime/40 items-center justify-center">
            <Ionicons name="bicycle" size={26} color={brand.ink} />
          </View>
          <Text className="text-ink text-[16px] font-semibold mt-4">{tr("No riders yet")}</Text>
          <Text className="text-ink/50 text-[13px] mt-1 text-center max-w-[420px]">
            {tr("Give a worker a role with the \"Deliver orders\" permission and they show up here.")}
          </Text>
          <Pressable
            onPress={() => router.push("/(owner)/owner/workers/workers")}
            className="mt-5 flex-row items-center h-10 px-4 rounded-xl bg-ink active:bg-ink/90"
          >
            <Ionicons name="people-outline" size={16} color={brand.lime} />
            <Text className="text-white text-[13px] font-semibold ml-2">{tr("Open workers")}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* The team at a glance */}
          <View className="bg-ink rounded-3xl p-6 overflow-hidden" style={{ gap: 20 }}>
            <View
              className="absolute rounded-full"
              style={{ width: 260, height: 260, right: -80, top: -120, backgroundColor: brand.lime, opacity: 0.12 }}
            />
            <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 16 }}>
              <View>
                <Text className="text-lime text-[11px] font-semibold uppercase tracking-[2.4px]">{tr("Right now")}</Text>
                <Text className="text-white text-[28px] font-semibold mt-1">
                  {outNow.length} {tr("of")} {riders.length} {tr("riders out")}
                </Text>
                <Text className="text-white/50 text-[13px] mt-0.5">
                  {carrying > 0
                    ? `${formatRwf(carrying)} ${tr("to collect at doors")}`
                    : tr("No money to collect on the road")}
                </Text>
              </View>
              <View className="flex-row">
                {team.slice(0, 6).map((s, i) => (
                  <View key={s.rider.id} style={{ marginLeft: i ? -10 : 0 }}>
                    <Avatar name={s.rider.name} out={s.current.length > 0} size={40} />
                  </View>
                ))}
              </View>
            </View>
            <View className="h-px bg-white/10" />
            <View className="flex-row flex-wrap" style={{ gap: 16 }}>
              <HeroStat label={tr("Delivered")} value={delivered.toLocaleString()} hint={tr(PERIODS.find((p) => p.value === period)!.label)} />
              <HeroStat label={tr("Average trip")} value={duration(avgTrip)} hint={tr("From leaving to the door")} />
              <HeroStat label={tr("Collected at doors")} value={formatRwf(collected)} />
              <HeroStat
                label={tr("Waiting for a rider")}
                value={waiting.length.toLocaleString()}
                hint={waiting.length ? tr("Ready to send from the till") : tr("Nothing waiting")}
              />
            </View>
          </View>

          <Tabs options={PERIODS.map((p) => ({ ...p, label: tr(p.label) }))} value={period} onChange={(v) => setPeriod(v as Period)} />

          {/* Each rider */}
          <View className="flex-row flex-wrap" style={{ gap: 14 }}>
            {team.map((s) => (
              <View key={s.rider.id} style={{ width: columns === 1 ? "100%" : `${100 / columns - 1.5}%` }} className="flex-grow">
                <RiderCard stats={s} top={s.rider.id === topId} now={now} />
              </View>
            ))}
          </View>

          {outside.length > 0 ? (
            <View className="bg-white rounded-2xl border border-ink/5 p-4" style={{ gap: 10 }}>
              <View>
                <Text className="text-ink text-[15px] font-semibold">{tr("Outside riders")}</Text>
                <Text className="text-ink/50 text-[12px] mt-0.5">{tr("Names typed at the till for deliveries your team didn't take.")}</Text>
              </View>
              {outside.map(([name, s]) => (
                <View key={name} className="flex-row items-center border-t border-ink/5 pt-2.5" style={{ gap: 10 }}>
                  <Avatar name={name} out={false} size={32} />
                  <Text className="flex-1 text-ink text-[13px] font-semibold">{name}</Text>
                  <Text className="text-ink/50 text-[12px]">
                    {s.delivered}/{s.trips} {tr("delivered")}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
