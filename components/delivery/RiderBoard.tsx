import { ActionSheet, isPaid, rwf, type Sheet } from "@/components/delivery/DeliveryActionSheet";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useAuth from "@/store/Authentication/useAuth";
import useDelivery from "@/store/Delivery/useDelivery";
import type { OrderType } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type Tab = "open" | "mine" | "done";

const REFRESH_MS = 30_000;

const minutesSince = (iso: string | null | undefined, now: number) =>
  iso ? Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000)) : 0;

const ago = (min: number) => (min < 1 ? tr("just now") : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`);

const place = (o: OrderType) => [o.deliveryAddress, o.deliveryArea].filter(Boolean).join(" · ");

// Still in the kitchen: the rider can take it but not leave with it yet.
const cooking = (o: OrderType) => {
  if (!o.items?.some((i) => i.product?.sendToKitchen)) return false;
  const step = (o.status || "").toUpperCase();
  return isPaid(o) ? !!o.kitchenStatus : step === "PENDING" || step === "PREPARING";
};

const openMap = (o: OrderType) => {
  const q = encodeURIComponent(place(o));
  Linking.openURL(Platform.OS === "ios" ? `maps:?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`);
};

function Chip({ icon, label, tone = "muted" }: { icon?: keyof typeof Ionicons.glyphMap; label: string; tone?: "muted" | "lime" | "ink" | "danger" }) {
  const style = {
    muted: { pill: "bg-ivory", fg: brand.inkMuted },
    lime: { pill: "bg-lime/40", fg: brand.ink },
    ink: { pill: "bg-ink", fg: brand.lime },
    danger: { pill: "bg-danger/10", fg: brand.danger },
  }[tone];
  return (
    <View className={`flex-row items-center self-start rounded-full px-2.5 py-1 ${style.pill}`} style={{ gap: 4 }}>
      {icon ? <Ionicons name={icon} size={12} color={style.fg} /> : null}
      <Text className="text-[11px] font-semibold" style={{ color: style.fg }}>
        {label}
      </Text>
    </View>
  );
}

function Action({
  label,
  icon,
  onPress,
  kind = "outline",
  busy,
  disabled,
  grow,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  kind?: "lime" | "ink" | "outline" | "danger";
  busy?: boolean;
  disabled?: boolean;
  grow?: boolean;
}) {
  const style = {
    lime: { box: "bg-lime active:bg-lime-dark", fg: brand.ink },
    ink: { box: "bg-ink active:bg-ink/90", fg: brand.white },
    outline: { box: "border border-ink/10 active:bg-ivory", fg: brand.ink },
    danger: { box: "border border-danger/20 active:bg-danger/5", fg: brand.danger },
  }[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      className={`h-12 px-4 rounded-xl flex-row items-center justify-center ${style.box} ${grow ? "flex-1" : ""} ${disabled ? "opacity-50" : ""}`}
      style={{ gap: 8 }}
    >
      {busy ? (
        <ActivityIndicator color={style.fg} />
      ) : (
        <>
          <Ionicons name={icon} size={17} color={style.fg} />
          <Text className="text-[14px] font-semibold" style={{ color: style.fg }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// Who, where, what and the money: the same top for every card.
function JobHead({ order, now, accent }: { order: OrderType; now: number; accent: string }) {
  const count = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const toCollect = order.payOnDelivery && !isPaid(order);
  return (
    <View style={{ gap: 10 }}>
      <View className="flex-row items-start" style={{ gap: 12 }}>
        <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: accent }}>
          <Ionicons name="location" size={20} color={brand.ink} />
        </View>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-ink text-[16px] font-semibold">
            {order.deliveryArea || order.deliveryAddress || tr("No place given")}
          </Text>
          <Text numberOfLines={2} className="text-ink/55 text-[13px] mt-0.5">
            {order.customerName ?? tr("Customer")}
            {order.deliveryArea && order.deliveryAddress ? ` · ${order.deliveryAddress}` : ""}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-ink text-[16px] font-semibold">{rwf(order.total)}</Text>
          <Text className="text-ink/40 text-[11px] mt-0.5">
            {count} {tr("items")}
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap" style={{ gap: 6 }}>
        {toCollect ? (
          <Chip icon="cash-outline" label={`${tr("Collect")} ${rwf(order.total)}`} tone="lime" />
        ) : isPaid(order) ? (
          <Chip icon="checkmark-circle" label={tr("Paid")} tone="ink" />
        ) : (
          <Chip icon="alert-circle-outline" label={tr("Not paid yet")} tone="danger" />
        )}
        {order.deliveryStatus === "WAITING" && order.items?.some((i) => i.product?.sendToKitchen) ? (
          <Chip icon="restaurant-outline" label={cooking(order) ? tr("Kitchen is preparing") : tr("Food ready")} />
        ) : null}
        {order.deliveryStatus === "ON_THE_WAY" ? (
          <Chip icon="bicycle-outline" label={`${tr("On the way")} · ${ago(minutesSince(order.sentAt, now))}`} />
        ) : (
          <Chip icon="time-outline" label={`${tr("Placed")} ${ago(minutesSince(order.createdAt, now))}`} />
        )}
      </View>

      {order.items?.length ? (
        <Text numberOfLines={2} className="text-ink/50 text-[12px]">
          {order.items.map((i) => `${i.quantity} × ${i.product?.name}`).join(", ")}
        </Text>
      ) : null}
      {order.note ? <Text className="text-ink/60 text-[12px]">“{order.note}”</Text> : null}
    </View>
  );
}

function OpenJob({ order, now, onTake, busy }: { order: OrderType; now: number; onTake: () => void; busy: boolean }) {
  return (
    <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
      <View className="h-1 bg-lime" />
      <View className="p-4" style={{ gap: 14 }}>
        <JobHead order={order} now={now} accent={brand.lime} />
        <Action label={tr("Take this delivery")} icon="hand-right-outline" kind="ink" onPress={onTake} busy={busy} />
      </View>
    </View>
  );
}

function MyJob({
  order,
  now,
  busy,
  onLeave,
  onGiveBack,
  onSheet,
}: {
  order: OrderType;
  now: number;
  busy: boolean;
  onLeave: () => void;
  onGiveBack: () => void;
  onSheet: (sheet: Exclude<Sheet, null>) => void;
}) {
  const waiting = order.deliveryStatus === "WAITING";
  const unpaid = !order.payOnDelivery && !isPaid(order);
  return (
    <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
      <View className="h-1" style={{ backgroundColor: waiting ? brand.inkDisabled : brand.ink }} />
      <View className="p-4" style={{ gap: 14 }}>
        <JobHead order={order} now={now} accent={waiting ? brand.ivory : brand.lime} />

        {/* Reach the customer */}
        <View className="flex-row" style={{ gap: 8 }}>
          {order.customerPhone ? (
            <Action label={tr("Call")} icon="call-outline" onPress={() => Linking.openURL(`tel:${order.customerPhone}`)} grow />
          ) : null}
          {place(order) ? <Action label={tr("Map")} icon="navigate-outline" onPress={() => openMap(order)} grow /> : null}
        </View>

        {waiting ? (
          <View style={{ gap: 8 }}>
            {unpaid ? (
              <Text className="text-ink/50 text-[12px]">{tr("Waiting for payment at the till before you leave.")}</Text>
            ) : cooking(order) ? (
              <Text className="text-ink/50 text-[12px]">{tr("The kitchen is still preparing it.")}</Text>
            ) : null}
            <View className="flex-row" style={{ gap: 8 }}>
              <Action label={tr("Give back")} icon="arrow-undo-outline" onPress={onGiveBack} />
              <Action label={tr("I'm leaving now")} icon="bicycle" kind="lime" onPress={onLeave} busy={busy} disabled={unpaid} grow />
            </View>
          </View>
        ) : (
          <View className="flex-row" style={{ gap: 8 }}>
            <Action label={tr("Not delivered")} icon="close-circle-outline" kind="danger" onPress={() => onSheet({ kind: "failed", order })} />
            <Action label={tr("Delivered")} icon="checkmark-circle" kind="lime" onPress={() => onSheet({ kind: "delivered", order })} grow />
          </View>
        )}
      </View>
    </View>
  );
}

function DoneJob({ order }: { order: OrderType }) {
  const ok = order.deliveryStatus === "DELIVERED";
  return (
    <View className="bg-white rounded-2xl border border-ink/5 px-4 py-3 flex-row items-center" style={{ gap: 12 }}>
      <Ionicons name={ok ? "checkmark-circle" : "close-circle"} size={22} color={ok ? brand.success : brand.danger} />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-ink text-[14px] font-semibold">
          {order.customerName ?? tr("Customer")}
        </Text>
        <Text numberOfLines={1} className="text-ink/50 text-[12px]">
          {ok ? place(order) || tr("Delivered") : order.deliveryProblem || tr("Not delivered")}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-ink text-[13px] font-semibold">{rwf(order.total)}</Text>
        {ok && order.payOnDelivery ? <Text className="text-ink/40 text-[11px]">{tr("at the door")}</Text> : null}
      </View>
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text numberOfLines={1} className="text-white text-[18px] font-semibold">
        {value}
      </Text>
      <Text numberOfLines={1} className="text-white/45 text-[11px] mt-0.5">
        {label}
      </Text>
    </View>
  );
}

// A rider's own screen: deliveries nobody has taken yet to pick from, the ones
// they took, and how their day went.
export default function RiderBoard() {
  const me = useAuth((s) => s.profile?.id);
  const myName = useAuth((s) => (s.profile as { name?: string } | null)?.name);
  const deliveries = useDelivery((s) => s.deliveries);
  const load = useDelivery((s) => s.load);
  const take = useDelivery((s) => s.take);
  const giveBack = useDelivery((s) => s.giveBack);
  const send = useDelivery((s) => s.send);
  const [tab, setTab] = useState<Tab>("open");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    try {
      await load();
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not load deliveries"), text2: (error as Error).message });
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  const open = deliveries
    .filter((d) => d.deliveryStatus === "WAITING" && !d.rider && !d.outsideRider && d.status !== "CANCELLED")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const mineAll = deliveries.filter((d) => d.rider?.id === me);
  const mine = mineAll
    .filter((d) => d.deliveryStatus === "WAITING" || d.deliveryStatus === "ON_THE_WAY")
    .sort((a, b) => (a.deliveryStatus === b.deliveryStatus ? a.createdAt.localeCompare(b.createdAt) : a.deliveryStatus === "ON_THE_WAY" ? -1 : 1));
  const done = mineAll
    .filter((d) => d.deliveryStatus === "DELIVERED" || d.deliveryStatus === "NOT_DELIVERED")
    .sort((a, b) => (b.deliveredAt ?? b.updatedAt).localeCompare(a.deliveredAt ?? a.updatedAt));

  const onRoad = mine.filter((d) => d.deliveryStatus === "ON_THE_WAY");
  const toCollect = mine.filter((d) => d.payOnDelivery && !isPaid(d)).reduce((s, d) => s + Number(d.total || 0), 0);
  const deliveredToday = done.filter((d) => d.deliveryStatus === "DELIVERED");
  const collected = deliveredToday.filter((d) => d.payOnDelivery).reduce((s, d) => s + Number(d.total || 0), 0);

  const act = async (order: OrderType, run: () => Promise<void>, success: string, next?: Tab) => {
    setBusyId(order.id);
    try {
      await run();
      Toast.show({ type: "success", text1: success, text2: order.customerName ?? undefined });
      if (next) setTab(next);
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Something went wrong"), text2: (error as Error).message });
      // Someone else may have taken it.
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const TABS: { value: Tab; label: string; count: number }[] = [
    { value: "open", label: tr("Open jobs"), count: open.length },
    { value: "mine", label: tr("My deliveries"), count: mine.length },
    { value: "done", label: tr("Done today"), count: done.length },
  ];

  const empty = {
    open: { icon: "cafe-outline" as const, title: tr("No open jobs"), text: tr("New deliveries show up here the moment the till places them.") },
    mine: { icon: "bicycle-outline" as const, title: tr("Nothing to carry"), text: tr("Take a delivery from Open jobs.") },
    done: { icon: "flag-outline" as const, title: tr("No deliveries finished today yet."), text: "" },
  }[tab];

  const list = tab === "open" ? open : tab === "mine" ? mine : done;

  return (
    <SafeAreaView className="flex-1 bg-ivory" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
          />
        }
      >
        <View>
          <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-[2.4px]">{tr("Rider")}</Text>
          <Text className="text-2xl font-semibold text-ink mt-1.5">
            {myName ? `${tr("Hello")}, ${myName.split(" ")[0]}` : tr("Your deliveries")}
          </Text>
          <Text className="text-ink/50 text-[13px] mt-1">
            {open.length > 0
              ? `${open.length} ${open.length === 1 ? tr("delivery is waiting for a rider") : tr("deliveries are waiting for a rider")}`
              : tr("Pick a delivery, take it to the customer, mark it done.")}
          </Text>
        </View>

        {/* The rider's day */}
        <View className="bg-ink rounded-3xl p-5 overflow-hidden" style={{ gap: 16 }}>
          <View
            className="absolute rounded-full"
            style={{ width: 200, height: 200, right: -70, top: -90, backgroundColor: brand.lime, opacity: 0.12 }}
          />
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: onRoad.length ? brand.lime : brand.success }} />
            <Text className="text-white text-[15px] font-semibold flex-1">
              {onRoad.length ? `${tr("On the road")} · ${onRoad.length}` : tr("Ready for a delivery")}
            </Text>
            {toCollect > 0 ? <Chip icon="cash-outline" label={`${tr("Collect")} ${rwf(toCollect)}`} tone="lime" /> : null}
          </View>
          <View className="flex-row" style={{ gap: 12 }}>
            <Summary label={tr("Delivered today")} value={deliveredToday.length.toLocaleString()} />
            <Summary label={tr("Collected at doors")} value={rwf(collected)} />
            <Summary label={tr("To carry")} value={mine.length.toLocaleString()} />
          </View>
        </View>

        <View className="flex-row bg-white rounded-2xl border border-ink/5 p-1" style={{ gap: 4 }}>
          {TABS.map((t) => {
            const on = tab === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => setTab(t.value)}
                accessibilityState={{ selected: on }}
                className={`flex-1 h-11 rounded-xl flex-row items-center justify-center ${on ? "bg-ink" : "active:bg-ivory"}`}
                style={{ gap: 6 }}
              >
                <Text numberOfLines={1} className={`text-[13px] font-semibold ${on ? "text-white" : "text-ink"}`}>
                  {t.label}
                </Text>
                {t.count > 0 ? (
                  <View className={`min-w-[20px] h-5 px-1.5 rounded-full items-center justify-center ${on ? "bg-lime" : "bg-ivory"}`}>
                    <Text className="text-ink text-[11px] font-semibold">{t.count}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={brand.ink} />
          </View>
        ) : list.length === 0 ? (
          <View className="bg-white rounded-2xl border border-ink/5 py-12 items-center px-6">
            <View className="w-14 h-14 rounded-full bg-ivory items-center justify-center">
              <Ionicons name={empty.icon} size={26} color={brand.inkMuted} />
            </View>
            <Text className="text-ink text-[15px] font-semibold mt-3 text-center">{empty.title}</Text>
            {empty.text ? <Text className="text-ink/50 text-[13px] mt-1 text-center">{empty.text}</Text> : null}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {list.map((order) =>
              tab === "open" ? (
                <OpenJob
                  key={order.id}
                  order={order}
                  now={now}
                  busy={busyId === order.id}
                  onTake={() => act(order, () => take(order.id), tr("It's yours"), "mine")}
                />
              ) : tab === "mine" ? (
                <MyJob
                  key={order.id}
                  order={order}
                  now={now}
                  busy={busyId === order.id}
                  onLeave={() => act(order, () => send(order.id, {}), tr("On the way"))}
                  onGiveBack={() => act(order, () => giveBack(order.id), tr("Given back"))}
                  onSheet={setSheet}
                />
              ) : (
                <DoneJob key={order.id} order={order} />
              ),
            )}
          </View>
        )}
      </ScrollView>
      <ActionSheet sheet={sheet} hasRiders onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}
