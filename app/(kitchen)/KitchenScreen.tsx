import { BrandMark, useClock } from "@/components/brand";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import { orderNumber } from "@/components/orders/orderKit";
import useOrder from "@/store/Order/Order";
import type { OrderType } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type Column = "PENDING" | "PREPARING" | "READY" | "COMPLETED";

const COLUMNS: {
  key: Column;
  title: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: "PENDING",
    title: "New",
    hint: "Waiting to start",
    icon: "notifications-outline",
  },
  {
    key: "PREPARING",
    title: "Preparing",
    hint: "Being made",
    icon: "flame-outline",
  },
  {
    key: "READY",
    title: "Ready",
    hint: "Waiting to be served",
    icon: "checkmark-circle-outline",
  },
  {
    key: "COMPLETED",
    title: "Served",
    hint: "Paid today",
    icon: "bag-check-outline",
  },
];

// The next step for each column's button.
const NEXT: Partial<
  Record<Column, { status: "PREPARING" | "READY"; label: string }>
> = {
  PENDING: { status: "PREPARING", label: "Start preparing" },
  PREPARING: { status: "READY", label: "Mark ready" },
};

// Orders still waiting this long are flagged.
const LATE_MINUTES = 15;
// Paid orders shown at the end, newest first.
const SERVED_SHOWN = 12;

const minutesSince = (value: string, now: number) =>
  Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));
const isToday = (value: string) =>
  new Date(value).toDateString() === new Date().toDateString();

function OrderCard({
  order,
  column,
  now,
  busy,
  onMove,
}: {
  order: OrderType;
  column: Column;
  now: number;
  busy: boolean;
  onMove: (status: "PENDING" | "PREPARING" | "READY") => void;
}) {
  // Time in this step: the last change for orders on the move, otherwise since it was placed.
  const since = column === "PENDING" ? order.createdAt : order.updatedAt;
  const minutes = minutesSince(since, now);
  const late =
    (column === "PENDING" || column === "PREPARING") && minutes >= LATE_MINUTES;
  const next = NEXT[column];
  const served = column === "COMPLETED";

  return (
    <View
      className={`rounded-2xl p-4 border ${served ? "bg-white/[0.03] border-white/5" : "bg-white/5 border-white/10"}`}
      style={{ gap: 12 }}
    >
      <View className="flex-row items-start justify-between">
        <View>
          <Text
            className={`text-lg font-bold ${served ? "text-white/50" : "text-white"}`}
          >
            {orderNumber(order)}
          </Text>
          <Text className="text-white/40 text-xs mt-0.5">
            {order.user?.name ?? "—"}
          </Text>
        </View>
        <View
          className={`flex-row items-center rounded-full px-2.5 py-1 ${late ? "bg-danger" : "bg-white/10"}`}
        >
          <Ionicons name="time-outline" size={12} color={brand.white} />
          <Text className="text-white text-xs font-semibold ml-1">
            {served
              ? new Date(order.updatedAt).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : minutes < 1
                ? "Just now"
                : `${minutes} min`}
          </Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        {(order.items ?? []).map((item) => (
          <View key={item.id} className="flex-row items-start">
            <Text
              className={`w-9 text-base font-bold ${served ? "text-white/40" : "text-lime"}`}
            >
              {item.quantity}×
            </Text>
            <Text
              className={`flex-1 text-base ${served ? "text-white/40" : "text-white"}`}
            >
              {item.product?.name ?? "Item"}
            </Text>
          </View>
        ))}
      </View>

      {!!order.note && (
        <View className="flex-row items-start bg-lime/10 rounded-xl px-3 py-2">
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={14}
            color={brand.lime}
            style={{ marginTop: 2 }}
          />
          <Text className="flex-1 text-lime text-[13px] ml-2">
            {order.note}
          </Text>
        </View>
      )}

      {next ? (
        <Pressable
          onPress={() => onMove(next.status)}
          disabled={busy}
          className="h-12 rounded-xl bg-lime items-center justify-center active:bg-lime-dark"
        >
          {busy ? (
            <ActivityIndicator color={brand.ink} />
          ) : (
            <Text className="text-ink text-[15px] font-bold">{next.label}</Text>
          )}
        </Pressable>
      ) : column === "READY" ? (
        <Pressable
          onPress={() => onMove("PREPARING")}
          disabled={busy}
          hitSlop={6}
          className="self-start"
        >
          <Text className="text-white/50 text-xs font-semibold underline">
            Back to preparing
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Kitchen display: today's orders by step, updated live (order.created / order.updated).
export default function KitchenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { time, date } = useClock();
  const orders = useOrder((s) => s.orders);
  const fetchOrders = useOrder((s) => s.fetchOrders);
  const setOrderStatus = useOrder((s) => s.setOrderStatus);
  const name = useAuth((s) => s.profile?.name);
  const companyName = useAuth((s) => s.profile?.company?.name);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchOrders()
      .catch(() =>
        Toast.show({ type: "error", text1: "Could not load orders" }),
      )
      .finally(() => setLoading(false));
    // Keeps the minute counters current.
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  const byColumn = useMemo(() => {
    const groups: Record<Column, OrderType[]> = {
      PENDING: [],
      PREPARING: [],
      READY: [],
      COMPLETED: [],
    };
    for (const order of orders) {
      if (!isToday(order.createdAt) && order.status === "COMPLETED") continue;
      if (order.status in groups) groups[order.status as Column].push(order);
    }
    // Oldest first, so the longest-waiting order is on top.
    for (const key of ["PENDING", "PREPARING", "READY"] as const)
      groups[key].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    groups.COMPLETED = groups.COMPLETED.filter((o) => isToday(o.updatedAt))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, SERVED_SHOWN);
    return groups;
  }, [orders]);

  const move = async (
    order: OrderType,
    status: "PENDING" | "PREPARING" | "READY",
  ) => {
    setBusyId(order.id);
    try {
      await setOrderStatus(order.id, status);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not update the order",
        text2: (error as Error).message,
      });
    } finally {
      setBusyId(null);
    }
  };

  const signOut = async () => {
    await useAuth.getState().logout();
    router.replace("/");
  };

  // Side by side on wide screens; narrower ones scroll sideways.
  const columnWidth = Math.max(280, (width - 48 - 3 * 14) / 4);

  return (
    <View
      className="flex-1 bg-ink"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pb-4 border-b border-white/10">
        <View className="flex-row items-center">
          <BrandMark size={32} receipt={brand.lime} check={brand.ink} />
          <View className="ml-3">
            <Text className="text-white text-lg font-bold">Kitchen</Text>
            <Text className="text-white/40 text-xs">
              {companyName ?? "SmartPOS"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center" style={{ gap: 20 }}>
          {COLUMNS.slice(0, 3).map((c) => (
            <View key={c.key} className="items-center">
              <Text className="text-white text-xl font-bold">
                {byColumn[c.key].length}
              </Text>
              <Text className="text-white/40 text-[11px]">{c.title}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row items-center" style={{ gap: 16 }}>
          <View className="items-end">
            <Text className="text-white text-base font-semibold">{time}</Text>
            <Text className="text-white/40 text-[11px]">{date}</Text>
          </View>
          <Pressable
            onPress={signOut}
            accessibilityLabel="Sign out"
            className="flex-row items-center h-10 px-3 rounded-xl bg-white/5 border border-white/10 active:bg-white/10"
          >
            <Ionicons name="log-out-outline" size={17} color={brand.white} />
            <Text
              numberOfLines={1}
              className="text-white/80 text-xs font-semibold ml-2 max-w-[120px]"
            >
              {name ? `${name.split(" ")[0]} · Sign out` : "Sign out"}
            </Text>
          </Pressable>
        </View>
      </View>

      {loading && orders.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brand.lime} />
        </View>
      ) : (
        <ScrollView
          horizontal
          contentContainerStyle={{ padding: 24, gap: 14 }}
          showsHorizontalScrollIndicator={false}
        >
          {COLUMNS.map((column) => (
            <View key={column.key} style={{ width: columnWidth }}>
              <View className="flex-row items-center mb-3">
                <Ionicons
                  name={column.icon}
                  size={16}
                  color={
                    column.key === "COMPLETED" ? brand.inkDisabled : brand.lime
                  }
                />
                <Text className="text-white text-[15px] font-bold ml-2">
                  {column.title}
                </Text>
                <Text className="text-white/40 text-xs ml-2">
                  {column.hint}
                </Text>
                <View className="ml-auto min-w-[26px] h-6 px-2 rounded-full bg-white/10 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {byColumn[column.key].length}
                  </Text>
                </View>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
              >
                {byColumn[column.key].length === 0 ? (
                  <View className="rounded-2xl border border-dashed border-white/10 py-10 items-center">
                    <Text className="text-white/30 text-xs">Nothing here</Text>
                  </View>
                ) : (
                  byColumn[column.key].map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      column={column.key}
                      now={now}
                      busy={busyId === order.id}
                      onMove={(status) => move(order, status)}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
