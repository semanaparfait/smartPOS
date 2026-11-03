import { PageHeader } from "@/components/forms/FormKit";
import {
  dayLabel,
  formatRwf,
  formatTime,
  initials,
  itemCount,
  orderNumber,
  StatusBadge,
  toNumber,
} from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import useFinanceVerification, {
  dayKey,
  orderCheck,
  orderCheckRecord,
  type OrderCheck,
} from "@/store/Finance/useFinanceVerification";
import useOrder from "@/store/Order/Order";
import type { OrderType, OrderUser } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { tr } from "@/i18n";

type CheckFilter = "all" | "awaiting" | "verified" | "flagged";

const CHECK_META: Record<OrderCheck, { label: string; icon: keyof typeof Ionicons.glyphMap; pill: string; fg: string }> = {
  verified: { label: "Money checked", icon: "checkmark-circle-outline", pill: "bg-ink", fg: brand.lime },
  flagged: { label: "Money flagged", icon: "flag-outline", pill: "bg-danger/10", fg: brand.danger },
  awaiting: { label: "Not checked", icon: "time-outline", pill: "bg-lime/40", fg: brand.ink },
  unpaid: { label: "Not paid yet", icon: "ellipse-outline", pill: "bg-ivory border border-ink/10", fg: brand.inkMuted },
};

const CHECK_FILTERS: { value: CheckFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "awaiting", label: "Not checked" },
  { value: "verified", label: "Checked" },
  { value: "flagged", label: "Flagged" },
];

const workerName = (u?: OrderUser | null) => u?.employee?.name ?? u?.name ?? "Unknown";

function Chip({
  label,
  count,
  active,
  onPress,
  avatar,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  avatar?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected: active }}
      className={`h-10 flex-row items-center rounded-xl px-3 mr-2 border ${
        active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
      }`}
      style={{ gap: 8 }}
    >
      {avatar !== undefined && (
        <View
          className={`w-6 h-6 rounded-full items-center justify-center ${active ? "bg-lime" : "bg-ivory"}`}
        >
          <Text className="text-ink text-[10px] font-bold">{avatar}</Text>
        </View>
      )}
      <Text numberOfLines={1} className={`text-[13px] font-semibold ${active ? "text-white" : "text-ink"}`}>
        {label}
      </Text>
      <Text className={`text-xs font-bold ${active ? "text-lime" : "text-ink/35"}`}>{count}</Text>
    </Pressable>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View className="flex-1 min-w-[150px] bg-white rounded-2xl border border-ink/5 p-4">
      <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-wider">{label}</Text>
      <Text className="text-ink text-lg font-extrabold mt-1">{value}</Text>
      {hint ? <Text className="text-ink/40 text-xs mt-0.5">{hint}</Text> : null}
    </View>
  );
}

function CheckBadge({ check }: { check: OrderCheck }) {
  const meta = CHECK_META[check];
  return (
    <View className={`flex-row items-center self-start rounded-full px-2.5 py-1 ${meta.pill}`}>
      <Ionicons name={meta.icon} size={12} color={meta.fg} />
      <Text className="text-[11px] font-bold ml-1" style={{ color: meta.fg }}>
        {tr(meta.label)}
      </Text>
    </View>
  );
}

export default function Orders() {
  const orders = useOrder((s) => s.orders);
  const fetchOrders = useOrder((s) => s.fetchOrders);
  const records = useFinanceVerification((s) => s.records);
  const loadChecks = useFinanceVerification((s) => s.load);
  const router = useRouter();
  const [loading, setLoading] = useState(orders.length === 0);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [check, setCheck] = useState<CheckFilter>("all");

  useEffect(() => {
    loadChecks();
    fetchOrders()
      .catch((error) => console.error("Error fetching orders:", error))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Newest first, each with its money check worked out once.
  const rows = useMemo(
    () =>
      [...orders]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((order) => ({
          order,
          check: orderCheck(order, records),
          checkedBy: orderCheckRecord(order, records)?.decidedBy,
        })),
    [orders, records],
  );

  const workers = useMemo(() => {
    const byId = new Map<string, { user: OrderUser; count: number }>();
    for (const { order } of rows) {
      if (!order.user) continue;
      const w = byId.get(order.user.id) ?? { user: order.user, count: 0 };
      w.count += 1;
      byId.set(order.user.id, w);
    }
    return [...byId.values()].sort((a, b) => workerName(a.user).localeCompare(workerName(b.user)));
  }, [rows]);

  const byWorker = rows.filter((r) => !workerId || r.order.user?.id === workerId);
  const checkCounts = { all: byWorker.length, awaiting: 0, verified: 0, flagged: 0 } as Record<CheckFilter, number>;
  for (const r of byWorker) if (r.check !== "unpaid") checkCounts[r.check] += 1;
  const visible = byWorker.filter((r) => check === "all" || r.check === check);

  const sumOf = (list: typeof rows) => list.reduce((sum, r) => sum + toNumber(r.order.total), 0);
  const paid = byWorker.filter((r) => r.check !== "unpaid");
  const checkedMoney = sumOf(paid.filter((r) => r.check === "verified"));
  const uncheckedMoney = sumOf(paid.filter((r) => r.check === "awaiting"));
  const flaggedMoney = sumOf(paid.filter((r) => r.check === "flagged"));

  // Day headings keep a long list readable.
  const groups: { day: string; label: string; rows: typeof rows }[] = [];
  for (const r of visible) {
    const day = dayKey(new Date(r.order.createdAt));
    const last = groups[groups.length - 1];
    if (last?.day === day) last.rows.push(r);
    else groups.push({ day, label: dayLabel(r.order.createdAt), rows: [r] });
  }

  const selected = workers.find((w) => w.user.id === workerId)?.user;

  const openOrder = (order: OrderType) =>
    router.push({ pathname: "/(owner)/inventory/Orders/[id]", params: { id: order.id } });

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        eyebrow={tr("Sales")}
        title={tr("Orders")}
        subtitle={tr("See each worker's orders and whether their money was checked.")}
        right={
          <Pressable
            onPress={() => router.push("/(owner)/finance/verification")}
            className="flex-row items-center h-10 px-4 rounded-xl bg-ink active:bg-ink/90"
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={brand.lime} />
            <Text className="text-white text-[13px] font-semibold ml-2">{tr("Check money")}</Text>
          </Pressable>
        }
      />

      {/* Who */}
      <View style={{ gap: 8 }}>
        <Text className="text-ink/50 text-[11px] font-bold uppercase tracking-wider">{tr("Worker")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label={tr("All workers")} count={rows.length} active={!workerId} onPress={() => setWorkerId(null)} />
          {workers.map((w) => (
            <Chip
              key={w.user.id}
              label={workerName(w.user)}
              avatar={initials(workerName(w.user))}
              count={w.count}
              active={workerId === w.user.id}
              onPress={() => setWorkerId(w.user.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Totals for the selection */}
      <View className="flex-row flex-wrap" style={{ gap: 12 }}>
        <Stat
          label={selected ? workerName(selected) : tr("All orders")}
          value={byWorker.length.toLocaleString()}
          hint={`${formatRwf(sumOf(paid))} ${tr("paid")}`}
        />
        <Stat label={tr("Money checked")} value={formatRwf(checkedMoney)} hint={`${checkCounts.verified} ${tr("orders")}`} />
        <Stat label={tr("Not checked")} value={formatRwf(uncheckedMoney)} hint={`${checkCounts.awaiting} ${tr("orders")}`} />
        {checkCounts.flagged > 0 && (
          <Stat label={tr("Money flagged")} value={formatRwf(flaggedMoney)} hint={`${checkCounts.flagged} ${tr("orders")}`} />
        )}
      </View>

      {/* Checked or not */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {CHECK_FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={tr(f.label)}
            count={checkCounts[f.value]}
            active={check === f.value}
            onPress={() => setCheck(f.value)}
          />
        ))}
      </ScrollView>

      {/* Orders */}
      {loading ? (
        <View className="py-16 items-center">
          <ActivityIndicator color={brand.ink} />
        </View>
      ) : groups.length === 0 ? (
        <View className="bg-white rounded-2xl border border-ink/5 py-14 items-center px-6">
          <Ionicons name="receipt-outline" size={28} color={brand.inkDisabled} />
          <Text className="text-ink text-[15px] font-semibold mt-3">{tr("No orders here")}</Text>
          <Text className="text-ink/50 text-[13px] mt-1 text-center">
            {tr("Try another worker or filter.")}
          </Text>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.day} style={{ gap: 8 }}>
            <Text className="text-ink/50 text-[11px] font-bold uppercase tracking-wider">
              {tr(g.label)} · {g.rows.length}
            </Text>
            <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
              {g.rows.map(({ order, check: c, checkedBy }, i) => (
                <Pressable
                  key={order.id}
                  onPress={() => openOrder(order)}
                  className={`flex-row flex-wrap items-center px-4 py-3.5 active:bg-ivory ${
                    i === 0 ? "" : "border-t border-ink/5"
                  }`}
                  style={{ gap: 12 }}
                >
                  <View className="flex-1 min-w-[160px]">
                    <Text className="text-ink text-[14px] font-semibold">
                      {orderNumber(order)}
                      <Text className="text-ink/40 font-normal"> · {formatTime(order.createdAt)}</Text>
                    </Text>
                    <Text numberOfLines={1} className="text-ink/50 text-xs mt-0.5">
                      {workerName(order.user)} · {itemCount(order)} {tr("items")}
                    </Text>
                    {checkedBy ? (
                      <Text numberOfLines={1} className="text-ink/40 text-xs mt-0.5">
                        {tr("Checked by")} {checkedBy}
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge order={order} />
                  <CheckBadge check={c} />
                  <Text className="text-ink text-[15px] font-extrabold min-w-[110px] text-right">
                    {formatRwf(order.total)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
