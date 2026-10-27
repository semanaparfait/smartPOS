import {
  dayLabel,
  formatRwf,
  formatTime,
  initials,
  itemCount,
  orderNumber,
  orderStatus,
  PAYMENT_META,
  PAYMENT_METHODS,
  PaymentChips,
  paymentsOf,
  ProductThumb,
  STATUS_META,
  StatusBadge,
  timeAgo,
  toNumber,
  type OrderStatus,
} from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import useOrder from "@/store/Order/Order";
import type { OrderType, PaymentMethod } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StatusFilter = "ALL" | Exclude<OrderStatus, "OTHER">;
type Period = "today" | "week" | "all";
type Scope = "mine" | "all";

const STATUS_FILTERS: StatusFilter[] = ["ALL", "PENDING", "COMPLETED", "CANCELLED"];
const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 days" },
  { key: "all", label: "All time" },
];

const inPeriod = (o: OrderType, period: Period) => {
  if (period === "all") return true;
  const created = new Date(o.createdAt);
  const now = new Date();
  if (period === "today") return created.toDateString() === now.toDateString();
  return now.getTime() - created.getTime() <= 7 * 24 * 60 * 60 * 1000;
};

function StatTile({
  icon,
  label,
  value,
  hint,
  dark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint?: string;
  dark?: boolean;
}) {
  return (
    <View
      className={`flex-1 min-w-[170px] rounded-2xl p-4 ${dark ? "bg-ink" : "bg-white border border-ink/5"}`}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-[11px] font-bold uppercase tracking-[1.5px] ${dark ? "text-white/50" : "text-ink/50"}`}
        >
          {label}
        </Text>
        <View
          className={`w-8 h-8 rounded-lg items-center justify-center ${dark ? "bg-lime" : "bg-ivory"}`}
        >
          <Ionicons name={icon} size={15} color={brand.ink} />
        </View>
      </View>
      <Text
        numberOfLines={1}
        className={`text-[24px] font-extrabold tracking-tight mt-2 ${dark ? "text-lime" : "text-ink"}`}
      >
        {value}
      </Text>
      {hint && (
        <Text numberOfLines={1} className={`text-[11px] mt-0.5 ${dark ? "text-white/50" : "text-ink/40"}`}>
          {hint}
        </Text>
      )}
    </View>
  );
}

function Chip({
  label,
  count,
  selected,
  onPress,
  dot,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
  dot?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected }}
      className={`flex-row items-center h-9 px-3.5 rounded-full border ${
        selected ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
      }`}
    >
      {dot && <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: dot }} />}
      <Text className={`text-[13px] font-bold ${selected ? "text-white" : "text-ink"}`}>{label}</Text>
      {count !== undefined && (
        <View className={`ml-2 px-1.5 rounded-full ${selected ? "bg-lime" : "bg-ivory"}`}>
          <Text className="text-ink text-[11px] font-extrabold">{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

function OrderCard({
  order,
  showServer,
  onOpen,
  onCheckout,
}: {
  order: OrderType;
  showServer: boolean;
  onOpen: () => void;
  onCheckout: () => void;
}) {
  const status = orderStatus(order);
  const meta = STATUS_META[status];
  const count = itemCount(order);
  const preview = order.items.slice(0, 3);
  const extra = order.items.length - preview.length;
  const summary = order.items
    .slice(0, 2)
    .map((i) => `${i.quantity}× ${i.product?.name ?? "Item"}`)
    .join(" · ");

  return (
    <Pressable
      onPress={onOpen}
      accessibilityLabel={`Open order ${orderNumber(order)}`}
      className={`flex-1 bg-white rounded-2xl overflow-hidden border border-ink/5 active:border-ink/30 ${
        status === "CANCELLED" ? "opacity-75" : ""
      }`}
    >
      <View className="h-1" style={{ backgroundColor: meta.accent }} />

      <View className="p-4" style={{ gap: 14 }}>
        {/* Reference, time, status */}
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-ink text-[17px] font-extrabold tracking-tight">{orderNumber(order)}</Text>
            <Text className="text-ink/40 text-[11px] mt-0.5">
              {formatTime(order.createdAt)} · {timeAgo(order.createdAt)}
            </Text>
          </View>
          <StatusBadge order={order} />
        </View>

        {/* Products */}
        <View className="flex-row items-center">
          <View className="flex-row">
            {preview.map((item, i) => (
              <View key={item.id} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }}>
                <ProductThumb item={item} size={40} />
              </View>
            ))}
            {extra > 0 && (
              <View
                className="w-10 h-10 rounded-xl bg-ink items-center justify-center border border-white"
                style={{ marginLeft: -10 }}
              >
                <Text className="text-lime text-[11px] font-extrabold">+{extra}</Text>
              </View>
            )}
          </View>
          <View className="flex-1 ml-3">
            <Text numberOfLines={1} className="text-ink text-[13px] font-semibold">
              {summary || "No items"}
            </Text>
            <Text className="text-ink/40 text-[11px] mt-0.5">
              {count} item{count === 1 ? "" : "s"}
              {order.items.length > 2 ? ` · ${order.items.length - 2} more product${order.items.length - 2 === 1 ? "" : "s"}` : ""}
            </Text>
          </View>
        </View>

        {paymentsOf(order).length > 0 && (
          <View className="flex-row items-center">
            <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[1.5px] mr-2">Paid with</Text>
            <View className="flex-1">
              <PaymentChips order={order} showAmounts />
            </View>
          </View>
        )}

        {order.note ? (
          <View className="flex-row items-start bg-ivory rounded-xl px-3 py-2">
            <Ionicons name="chatbubble-ellipses-outline" size={13} color={brand.inkMuted} style={{ marginTop: 1 }} />
            <Text numberOfLines={1} className="flex-1 text-ink/60 text-[12px] ml-2">
              {order.note}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Footer */}
      <View className="flex-row items-center px-4 py-3 border-t border-ink/5 bg-ivory/50">
        {showServer ? (
          <View className="flex-row items-center flex-1 pr-2">
            <View className="w-7 h-7 rounded-full bg-ink items-center justify-center">
              <Text className="text-lime text-[10px] font-extrabold">{initials(order.user?.name)}</Text>
            </View>
            <Text numberOfLines={1} className="flex-1 text-ink/60 text-[12px] ml-2">
              {order.user?.name ?? "—"}
            </Text>
          </View>
        ) : (
          <Text className="flex-1 text-ink/40 text-[11px] font-bold uppercase tracking-[1.5px]">Total</Text>
        )}
        {status === "PENDING" ? (
          <Pressable
            onPress={onCheckout}
            className="flex-row items-center h-9 pl-3 pr-2.5 rounded-lg bg-ink active:bg-ink-soft"
          >
            <Text className="text-lime text-[13px] font-extrabold">{formatRwf(order.total)}</Text>
            <Ionicons name="arrow-forward" size={14} color={brand.lime} style={{ marginLeft: 6 }} />
          </Pressable>
        ) : (
          <Text
            className={`text-[16px] font-extrabold ${status === "CANCELLED" ? "text-ink/40 line-through" : "text-ink"}`}
          >
            {formatRwf(order.total)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function Orders() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { orders, fetchOrders } = useOrder();
  const { profile } = useAuth();

  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [period, setPeriod] = useState<Period>("today");
  const [scope, setScope] = useState<Scope>("mine");
  const [method, setMethod] = useState<PaymentMethod | "ALL">("ALL");
  const [gridWidth, setGridWidth] = useState(0);

  const load = async () => {
    setRefreshing(true);
    try {
      await fetchOrders();
      setError(false);
    } catch {
      setError(true);
    }
    setRefreshing(false);
    setLoaded(true);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myId: string | undefined = profile?.id;
  // Only offer "Everyone" when the API returns other people's orders too.
  const hasOthers = !!myId && orders.some((o) => o.user?.id && o.user.id !== myId);
  const effectiveScope: Scope = hasOthers ? scope : "all";

  // Orders in the chosen scope and period; status and search are applied after.
  const scoped = useMemo(
    () =>
      orders
        .filter((o) => (effectiveScope === "mine" ? o.user?.id === myId : true))
        .filter((o) => inPeriod(o, period))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders, effectiveScope, myId, period],
  );

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { ALL: scoped.length, PENDING: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const o of scoped) {
      const s = orderStatus(o);
      if (s !== "OTHER") c[s] += 1;
    }
    return c;
  }, [scoped]);

  const completed = useMemo(() => scoped.filter((o) => orderStatus(o) === "COMPLETED"), [scoped]);
  const sales = completed.reduce((sum, o) => sum + toNumber(o.total), 0);
  const pendingValue = scoped
    .filter((o) => orderStatus(o) === "PENDING")
    .reduce((sum, o) => sum + toNumber(o.total), 0);
  const itemsSold = completed.reduce((sum, o) => sum + itemCount(o), 0);

  // Money collected per method across completed orders in scope.
  const byMethod = useMemo(() => {
    const totals: Record<PaymentMethod, { amount: number; orders: number }> = {
      CASH: { amount: 0, orders: 0 },
      MOMO: { amount: 0, orders: 0 },
      CARD: { amount: 0, orders: 0 },
      CREDIT: { amount: 0, orders: 0 },
    };
    for (const o of completed) {
      const seen = new Set<string>();
      for (const p of paymentsOf(o)) {
        const key = p.method?.toUpperCase() as PaymentMethod;
        if (!totals[key]) continue;
        totals[key].amount += toNumber(p.amount);
        if (!seen.has(key)) totals[key].orders += 1;
        seen.add(key);
      }
    }
    return totals;
  }, [completed]);
  const hasPayments = completed.some((o) => paymentsOf(o).length > 0);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((o) => {
      if (status !== "ALL" && orderStatus(o) !== status) return false;
      if (method !== "ALL" && !paymentsOf(o).some((p) => p.method?.toUpperCase() === method)) return false;
      if (!q) return true;
      return (
        orderNumber(o).toLowerCase().includes(q) ||
        o.items.some((i) => i.product?.name?.toLowerCase().includes(q)) ||
        (o.note ?? "").toLowerCase().includes(q) ||
        (o.user?.name ?? "").toLowerCase().includes(q) ||
        paymentsOf(o).some((p) => (p.creditOwnerName ?? "").toLowerCase().includes(q))
      );
    });
  }, [scoped, status, method, search]);

  // Group by day, keeping newest first.
  const groups = useMemo(() => {
    const out: { day: string; orders: OrderType[]; total: number }[] = [];
    for (const o of visible) {
      const day = dayLabel(o.createdAt);
      let g = out[out.length - 1];
      if (g?.day !== day) {
        g = { day, orders: [], total: 0 };
        out.push(g);
      }
      g.orders.push(o);
      if (orderStatus(o) !== "CANCELLED") g.total += toNumber(o.total);
    }
    return out;
  }, [visible]);

  const GAP = 14;
  const listWidth = gridWidth || width - 140;
  const columns = Math.max(1, Math.floor((listWidth + GAP) / (290 + GAP)));

  const openOrder = (o: OrderType) => router.push({ pathname: "/(tabs)/orders/[id]", params: { id: o.id } });
  const checkout = (o: OrderType) =>
    router.push({ pathname: "/(tabs)/checkout/checkout", params: { orderId: o.id } });

  const periodLabel = PERIODS.find((p) => p.key === period)!.label.toLowerCase();

  return (
    <SafeAreaView className="flex-1 bg-ivory" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 18 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing && loaded} onRefresh={load} />}
      >
        {/* Header */}
        <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 12 }}>
          <View className="flex-1 min-w-[220px]">
            <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2.4px]">Orders</Text>
            <Text className="text-ink text-2xl font-extrabold tracking-tight">
              {effectiveScope === "mine" ? "My orders" : "All orders"}
            </Text>
            <Text className="text-ink/50 text-[13px] mt-0.5">
              {profile?.name ? `Signed in as ${profile.name}. ` : ""}Tap an order to see its details.
            </Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 10 }}>
            {hasOthers && (
              <View className="flex-row bg-white border border-ink/10 rounded-xl p-1">
                {(["mine", "all"] as Scope[]).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setScope(s)}
                    className={`h-8 px-3 rounded-lg items-center justify-center ${scope === s ? "bg-ink" : ""}`}
                  >
                    <Text className={`text-[12px] font-bold ${scope === s ? "text-lime" : "text-ink/60"}`}>
                      {s === "mine" ? "Mine" : "Everyone"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable
              onPress={load}
              disabled={refreshing}
              className="flex-row items-center h-10 px-4 rounded-xl bg-white border border-ink/10 active:bg-ivory"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={brand.ink} />
              ) : (
                <Ionicons name="refresh" size={15} color={brand.ink} />
              )}
              <Text className="text-ink text-[13px] font-bold ml-2">Refresh</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          <StatTile
            dark
            icon="cash-outline"
            label="Sales"
            value={formatRwf(sales)}
            hint={`${completed.length} completed ${periodLabel === "all time" ? "in total" : periodLabel}`}
          />
          <StatTile icon="receipt-outline" label="Orders" value={String(scoped.length)} hint={`${counts.CANCELLED} cancelled`} />
          <StatTile
            icon="time-outline"
            label="Pending"
            value={String(counts.PENDING)}
            hint={counts.PENDING ? `${formatRwf(pendingValue)} to collect` : "Nothing waiting"}
          />
          <StatTile
            icon="cube-outline"
            label="Items sold"
            value={String(itemsSold)}
            hint={completed.length ? `Avg ${formatRwf(sales / completed.length)} per order` : "—"}
          />
        </View>

        {/* Payments by method — tap one to filter */}
        {hasPayments && (
          <View className="bg-white rounded-2xl border border-ink/5 p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-ink text-[15px] font-extrabold tracking-tight">Payments received</Text>
              {method !== "ALL" && (
                <Pressable onPress={() => setMethod("ALL")}>
                  <Text className="text-ink text-xs font-bold underline">Show all methods</Text>
                </Pressable>
              )}
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {PAYMENT_METHODS.map((m) => {
                const meta = PAYMENT_META[m];
                const entry = byMethod[m];
                const share = sales > 0 ? Math.round((entry.amount / sales) * 100) : 0;
                const selected = method === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMethod(selected ? "ALL" : m)}
                    accessibilityState={{ selected }}
                    className={`flex-1 min-w-[150px] rounded-xl p-3 border ${
                      selected ? "border-ink bg-ivory" : "border-ink/5 active:bg-ivory"
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className={`flex-row items-center rounded-full px-2 py-0.5 ${meta.bg}`}>
                        <Ionicons name={meta.icon} size={12} color={meta.fg} />
                        <Text className="text-[11px] font-extrabold ml-1" style={{ color: meta.fg }}>
                          {meta.label}
                        </Text>
                      </View>
                      <Text className="text-ink/40 text-[11px] font-semibold">{share}%</Text>
                    </View>
                    <Text numberOfLines={1} className="text-ink text-[17px] font-extrabold tracking-tight mt-2">
                      {formatRwf(entry.amount)}
                    </Text>
                    <Text className="text-ink/40 text-[11px]">
                      {entry.orders} order{entry.orders === 1 ? "" : "s"}
                      {m === "CREDIT" && entry.amount > 0 ? " · to collect" : ""}
                    </Text>
                    <View className="h-1 rounded-full bg-ink/5 overflow-hidden mt-2">
                      <View className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: meta.dot }} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Filters */}
        <View className="bg-white rounded-2xl border border-ink/5 p-4" style={{ gap: 12 }}>
          <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 10 }}>
            <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3 h-10 flex-1 min-w-[220px] max-w-[380px]">
              <Ionicons name="search" size={16} color={brand.inkMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Order number, product, note or credit owner"
                placeholderTextColor={brand.inkDisabled}
                className="flex-1 ml-2 text-[13px] text-ink"
                style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined}
              />
              {!!search && (
                <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={16} color={brand.inkDisabled} />
                </Pressable>
              )}
            </View>
            <View className="flex-row bg-ivory border border-ink/10 rounded-xl p-1">
              {PERIODS.map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  className={`h-8 px-3 rounded-lg items-center justify-center ${period === p.key ? "bg-white" : ""}`}
                  style={period === p.key ? { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4 } : undefined}
                >
                  <Text className={`text-[12px] font-bold ${period === p.key ? "text-ink" : "text-ink/50"}`}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {STATUS_FILTERS.map((s) => (
              <Chip
                key={s}
                label={s === "ALL" ? "All" : STATUS_META[s].label}
                count={counts[s]}
                selected={status === s}
                dot={s === "ALL" ? undefined : STATUS_META[s].accent}
                onPress={() => setStatus(s)}
              />
            ))}
            {hasPayments && (
              <>
                <View className="w-px bg-ink/10 mx-1" />
                {PAYMENT_METHODS.map((m) => (
                  <Chip
                    key={m}
                    label={PAYMENT_META[m].label}
                    selected={method === m}
                    dot={PAYMENT_META[m].dot}
                    onPress={() => setMethod(method === m ? "ALL" : m)}
                  />
                ))}
              </>
            )}
          </ScrollView>
        </View>

        {/* List */}
        <View onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)} style={{ gap: 22 }}>
          {!loaded ? (
            <View className="bg-white rounded-2xl border border-ink/5 py-16 items-center">
              <ActivityIndicator color={brand.ink} />
              <Text className="text-ink/40 text-xs mt-3">Loading orders…</Text>
            </View>
          ) : error && orders.length === 0 ? (
            <View className="bg-white rounded-2xl border border-ink/5 py-16 items-center px-6">
              <View className="w-14 h-14 rounded-2xl bg-red-50 items-center justify-center mb-3">
                <Ionicons name="cloud-offline-outline" size={24} color={brand.danger} />
              </View>
              <Text className="text-ink text-sm font-bold">Could not load orders</Text>
              <Text className="text-ink/40 text-xs mt-1">Check your connection and try again.</Text>
              <Pressable onPress={load} className="mt-4 h-10 px-4 rounded-xl bg-ink items-center justify-center">
                <Text className="text-white text-[13px] font-bold">Try again</Text>
              </Pressable>
            </View>
          ) : groups.length === 0 ? (
            <View className="bg-white rounded-2xl border border-ink/5 py-16 items-center px-6">
              <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center mb-3">
                <Ionicons name="receipt-outline" size={24} color={brand.inkDisabled} />
              </View>
              <Text className="text-ink text-sm font-bold">
                {scoped.length === 0 ? `No orders ${periodLabel === "all time" ? "yet" : periodLabel}` : "No matching orders"}
              </Text>
              <Text className="text-ink/40 text-xs mt-1 text-center">
                {scoped.length === 0
                  ? "Orders you take will show up here."
                  : "Try another status or search term."}
              </Text>
              {period !== "all" && scoped.length === 0 && (
                <Pressable onPress={() => setPeriod("all")} className="mt-3">
                  <Text className="text-ink text-xs font-bold underline">Show all time</Text>
                </Pressable>
              )}
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.day} style={{ gap: 12 }}>
                <View className="flex-row items-center">
                  <Text className="text-ink text-[13px] font-extrabold">{group.day}</Text>
                  <Text className="text-ink/40 text-[12px] ml-2">
                    {group.orders.length} order{group.orders.length === 1 ? "" : "s"}
                  </Text>
                  <View className="flex-1 h-px bg-ink/10 mx-3" />
                  <Text className="text-ink/60 text-[12px] font-bold">{formatRwf(group.total)}</Text>
                </View>
                <View className="flex-row flex-wrap" style={{ margin: -GAP / 2 }}>
                  {group.orders.map((o) => (
                    <View key={o.id} style={{ width: `${100 / columns}%`, padding: GAP / 2 }}>
                      <OrderCard
                        order={o}
                        showServer={effectiveScope === "all" && hasOthers}
                        onOpen={() => openOrder(o)}
                        onCheckout={() => checkout(o)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
