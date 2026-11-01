import { BrandMark, useClock } from "@/components/brand";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import { orderNumber } from "@/components/orders/orderKit";
import useOrder from "@/store/Order/Order";
import type { OrderItemType, OrderType } from "@/store/Order/OrderType";
import { thumbUrl } from "@/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

// Every step shares the same plain card; one thin line of colour and the button
// tell them apart.
const LOOK: Record<
  Column,
  {
    strip: string;
    icon: string;
    text: string;
    muted: string;
    button: string;
    buttonText: string;
    buttonSpinner: string;
  }
> = {
  PENDING: {
    strip: "bg-ink",
    icon: brand.ink,
    text: "text-ink",
    muted: "text-ink/50",
    button: "bg-ink active:bg-ink-soft",
    buttonText: "text-white",
    buttonSpinner: brand.white,
  },
  PREPARING: {
    strip: "bg-lime",
    icon: brand.limeDark,
    text: "text-ink",
    muted: "text-ink/50",
    button: "bg-lime active:bg-lime-dark",
    buttonText: "text-ink",
    buttonSpinner: brand.ink,
  },
  READY: {
    strip: "bg-success",
    icon: brand.success,
    text: "text-ink",
    muted: "text-ink/50",
    button: "",
    buttonText: "",
    buttonSpinner: brand.ink,
  },
  COMPLETED: {
    strip: "bg-ink/20",
    icon: brand.inkDisabled,
    text: "text-ink/50",
    muted: "text-ink/40",
    button: "",
    buttonText: "",
    buttonSpinner: brand.ink,
  },
};

// What the kitchen makes. The server already filters; this also covers a full
// order reaching this screen, e.g. the same account signed in on a till.
const kitchenItems = (order: OrderType) =>
  (order.items ?? []).filter((item) => item.product?.sendToKitchen !== false);

function FoodImage({ item, faded }: { item: OrderItemType; faded: boolean }) {
  const [failed, setFailed] = useState(false);
  const uri = thumbUrl(item.product?.images?.[0]);
  return (
    <View
      className="rounded-xl overflow-hidden items-center justify-center bg-ivory"
      style={{ width: 56, height: 56, opacity: faded ? 0.5 : 1 }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={{ width: 56, height: 56 }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons name="restaurant-outline" size={22} color={brand.inkDisabled} />
      )}
    </View>
  );
}

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

  const look = LOOK[column];

  return (
    <View
      className={`rounded-xl overflow-hidden border bg-white ${late ? "border-danger" : "border-ink/10"}`}
    >
      <View className={`h-1 ${late ? "bg-danger" : look.strip}`} />
      <View className="p-4" style={{ gap: 12 }}>
        <View className="flex-row items-start justify-between">
          <View>
            <Text className={`text-lg font-bold ${look.text}`}>
              {orderNumber(order)}
            </Text>
            <Text className={`text-xs mt-0.5 ${look.muted}`}>
              {order.user?.name ?? "—"}
            </Text>
          </View>
          <View
            className={`flex-row items-center rounded-full px-2.5 py-1 ${late ? "bg-danger" : "bg-ivory"}`}
          >
            <Ionicons
              name="time-outline"
              size={12}
              color={late ? brand.white : brand.inkMuted}
            />
            <Text
              className={`text-xs font-semibold ml-1 ${late ? "text-white" : look.text}`}
            >
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

        <View style={{ gap: 10 }}>
          {(order.items ?? []).map((item) => (
            <View key={item.id} className="flex-row items-center">
              <FoodImage item={item} faded={served} />
              <View className="flex-1 ml-3">
                <Text className={`text-base font-semibold ${look.text}`}>
                  {item.product?.name ?? "Item"}
                </Text>
                {!!item.note && (
                  <Text className={`text-[13px] font-medium mt-0.5 ${look.text}`}>
                    {item.note}
                  </Text>
                )}
              </View>
              <Text className={`text-lg font-semibold ml-3 ${look.text}`}>
                {item.quantity}×
              </Text>
            </View>
          ))}
        </View>

        {!!order.note && (
          <View className="flex-row items-start rounded-lg px-3 py-2 bg-ivory">
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={14}
              color={brand.inkMuted}
              style={{ marginTop: 2 }}
            />
            <Text className={`flex-1 text-[13px] ml-2 ${look.text}`}>
              {order.note}
            </Text>
          </View>
        )}

        {next ? (
          <Pressable
            onPress={() => onMove(next.status)}
            disabled={busy}
            className={`h-12 rounded-lg items-center justify-center ${look.button}`}
          >
            {busy ? (
              <ActivityIndicator color={look.buttonSpinner} />
            ) : (
              <Text className={`text-[15px] font-bold ${look.buttonText}`}>
                {next.label}
              </Text>
            )}
          </Pressable>
        ) : column === "READY" ? (
          <Pressable
            onPress={() => onMove("PREPARING")}
            disabled={busy}
            hitSlop={6}
            className="self-start"
          >
            <Text className={`text-xs font-semibold underline ${look.muted}`}>
              Back to preparing
            </Text>
          </Pressable>
        ) : null}
      </View>
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
  const [showHistory, setShowHistory] = useState(false);

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
      // Earlier days are only in History.
      if (!isToday(order.createdAt)) continue;
      const items = kitchenItems(order);
      if (items.length && order.status in groups)
        groups[order.status as Column].push({ ...order, items });
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
    // `now` moves the board on to the new day at midnight.
  }, [orders, now]);

  // Earlier days, newest first, one group per day.
  const history = useMemo(() => {
    const days = new Map<string, OrderType[]>();
    [...orders]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .forEach((order) => {
        const items = kitchenItems(order);
        if (
          isToday(order.createdAt) ||
          !items.length ||
          !COLUMNS.some((c) => c.key === order.status)
        )
          return;
        const day = new Date(order.createdAt).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        days.set(day, [...(days.get(day) ?? []), { ...order, items }]);
      });
    return [...days.entries()];
  }, [orders, now]);

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
    <View className="flex-1 bg-ivory" style={{ paddingBottom: insets.bottom }}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-6 pb-4 bg-ink"
        style={{ paddingTop: insets.top + 12 }}
      >
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
            onPress={() => setShowHistory((open) => !open)}
            className={`flex-row items-center h-10 px-3 rounded-xl border ${
              showHistory
                ? "bg-lime border-lime"
                : "bg-white/5 border-white/10 active:bg-white/10"
            }`}
          >
            <Ionicons
              name={showHistory ? "today-outline" : "time-outline"}
              size={17}
              color={showHistory ? brand.ink : brand.white}
            />
            <Text
              className={`text-xs font-semibold ml-2 ${showHistory ? "text-ink" : "text-white/80"}`}
            >
              {showHistory ? "Today" : "History"}
            </Text>
          </Pressable>
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
          <ActivityIndicator color={brand.ink} />
        </View>
      ) : showHistory ? (
        <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }}>
          {history.length === 0 ? (
            <View className="rounded-xl border border-dashed border-ink/15 py-10 items-center">
              <Text className="text-ink/40 text-xs">No orders from earlier days</Text>
            </View>
          ) : (
            history.map(([day, dayOrders]) => (
              <View key={day} style={{ gap: 12 }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-ink text-base font-bold">{day}</Text>
                  <Text className="text-ink/50 text-xs">
                    {dayOrders.length} order{dayOrders.length === 1 ? "" : "s"}
                  </Text>
                </View>
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {dayOrders.map((order) => (
                    <View key={order.id} style={{ width: columnWidth }}>
                      <OrderCard
                        order={order}
                        column="COMPLETED"
                        now={now}
                        busy={false}
                        onMove={() => {}}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          contentContainerStyle={{ padding: 24, gap: 14 }}
          showsHorizontalScrollIndicator={false}
        >
          {COLUMNS.map((column) => (
            <View key={column.key} style={{ width: columnWidth }}>
              <View className="mb-3">
                <View className="flex-row items-center pb-2.5">
                  <Ionicons
                    name={column.icon}
                    size={18}
                    color={LOOK[column.key].icon}
                  />
                  <View className="flex-1 ml-2.5">
                    <Text className="text-ink text-base font-bold">
                      {column.title}
                    </Text>
                    <Text className="text-ink/50 text-xs">{column.hint}</Text>
                  </View>
                  <Text className="text-ink text-xl font-semibold">
                    {byColumn[column.key].length}
                  </Text>
                </View>
                <View className={`h-0.5 ${LOOK[column.key].strip}`} />
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
              >
                {byColumn[column.key].length === 0 ? (
                  <View className="rounded-xl border border-dashed border-ink/15 py-10 items-center">
                    <Text className="text-ink/40 text-xs">Nothing here</Text>
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
