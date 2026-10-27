import { PageHeader } from "@/app/components/ownerComponents/FormKit";
import {
  formatRwf,
  initials,
  orderNumber,
  orderStatus,
  paymentsOf,
  ProductThumb,
  toNumber,
} from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import useOrder from "@/store/Order/Order";
import type { OrderPayment, OrderType } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

type Period = "all" | "30" | "7" | "today";
type Sort = "amount" | "recent" | "oldest";

const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "30", label: "30 days" },
  { key: "7", label: "7 days" },
  { key: "today", label: "Today" },
];

const SORTS: { key: Sort; label: string }[] = [
  { key: "amount", label: "Highest amount" },
  { key: "recent", label: "Most recent" },
  { key: "oldest", label: "Oldest first" },
];

// One credit payment on a completed order.
interface CreditEntry {
  id: string;
  order: OrderType;
  payment: OrderPayment;
  amount: number;
  takenAt: string;
  customerName: string;
  customerPhone: string;
  takenBy: string;
  servedBy: string;
}

// All credit entries for one customer.
interface Customer {
  key: string;
  name: string;
  phone: string;
  entries: CreditEntry[];
  total: number;
  first: string;
  last: string;
}

const takenAtOf = (o: OrderType, p: OrderPayment) => p.createdAt ?? o.updatedAt;

// Same person if the phone matches; otherwise fall back to the name.
const customerKey = (name: string, phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits ? `p:${digits.slice(-9)}` : `n:${name.trim().toLowerCase()}`;
};

const daysSince = (value: string) => Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ago = (value: string) => {
  const d = daysSince(value);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
};

const inPeriod = (value: string, period: Period) => {
  if (period === "all") return true;
  if (period === "today") return new Date(value).toDateString() === new Date().toDateString();
  return daysSince(value) < Number(period);
};

function Kpi({ icon, label, value, hint }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; hint?: string }) {
  return (
    <View className="flex-1 min-w-[170px] bg-white rounded-2xl border border-ink/5 p-4">
      <View className="flex-row items-center">
        <View className="w-8 h-8 rounded-lg bg-ivory items-center justify-center">
          <Ionicons name={icon} size={15} color={brand.ink} />
        </View>
        <Text className="text-ink/50 text-[12px] font-medium ml-2.5">{label}</Text>
      </View>
      <Text numberOfLines={1} className="text-ink text-lg font-bold mt-3">
        {value}
      </Text>
      {hint && (
        <Text numberOfLines={1} className="text-ink/40 text-[11px] mt-0.5">
          {hint}
        </Text>
      )}
    </View>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row bg-ivory border border-ink/10 rounded-xl p-1">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            className={`h-8 px-3 rounded-lg items-center justify-center ${on ? "bg-white border border-ink/10" : ""}`}
          >
            <Text className={`text-[12px] font-medium ${on ? "text-ink" : "text-ink/50"}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CreditRow({ entry, onOpen }: { entry: CreditEntry; onOpen: () => void }) {
  const { order } = entry;
  const count = order.items.reduce((s, i) => s + i.quantity, 0);
  const otherPayments = paymentsOf(order).filter((p) => p !== entry.payment);

  return (
    <View className="rounded-xl border border-ink/5 bg-white p-4" style={{ gap: 12 }}>
      {/* When + amount */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Text className="text-ink text-[13px] font-semibold">{formatDateTime(entry.takenAt)}</Text>
            <Text className="text-ink/40 text-[12px]">{ago(entry.takenAt)}</Text>
          </View>
          <Text className="text-ink/50 text-[12px] mt-0.5">
            Order {orderNumber(order)} · {count} item{count === 1 ? "" : "s"}
          </Text>
        </View>
        <Text className="text-[14px] font-semibold" style={{ color: brand.danger }}>
          {formatRwf(entry.amount)}
        </Text>
      </View>

      {/* People */}
      <View className="flex-row flex-wrap rounded-lg bg-ivory p-3" style={{ gap: 14 }}>
        <View className="flex-1 min-w-[150px]">
          <Text className="text-ink/40 text-[11px]">Served by</Text>
          <View className="flex-row items-center mt-1">
            <View className="w-6 h-6 rounded-full bg-ink items-center justify-center">
              <Text className="text-lime text-[9px] font-bold">{initials(entry.servedBy)}</Text>
            </View>
            <Text numberOfLines={1} className="flex-1 text-ink text-[13px] font-medium ml-2">
              {entry.servedBy}
            </Text>
          </View>
        </View>
        <View className="flex-1 min-w-[150px]">
          <Text className="text-ink/40 text-[11px]">Goods taken by</Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="bag-handle-outline" size={15} color={brand.inkMuted} />
            <Text numberOfLines={1} className="flex-1 text-ink text-[13px] font-medium ml-2">
              {entry.takenBy || "Not recorded"}
            </Text>
          </View>
        </View>
      </View>

      {/* Items */}
      <View style={{ gap: 8 }}>
        {order.items.map((item) => (
          <View key={item.id} className="flex-row items-center">
            <ProductThumb item={item} size={30} />
            <Text numberOfLines={1} className="flex-1 text-ink text-[13px] ml-2.5">
              {item.product?.name ?? "Item"}
            </Text>
            <Text className="text-ink/50 text-[12px] mr-3">× {item.quantity}</Text>
            <Text className="text-ink/70 text-[12px]">{formatRwf(item.totalPrice)}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap items-center justify-between border-t border-ink/5 pt-3" style={{ gap: 8 }}>
        <Text className="text-ink/50 text-[12px]">
          Order total {formatRwf(order.total)}
          {otherPayments.length
            ? ` · rest paid by ${otherPayments.map((p) => p.method.toLowerCase()).join(" + ")}`
            : " · all on credit"}
        </Text>
        <Pressable onPress={onOpen} className="flex-row items-center">
          <Text className="text-ink text-[12px] font-semibold underline">Open order</Text>
          <Ionicons name="arrow-forward" size={13} color={brand.ink} style={{ marginLeft: 4 }} />
        </Pressable>
      </View>
    </View>
  );
}

function CustomerCard({
  customer,
  open,
  onToggle,
  onOpenOrder,
}: {
  customer: Customer;
  open: boolean;
  onToggle: () => void;
  onOpenOrder: (o: OrderType) => void;
}) {
  const servers = [...new Set(customer.entries.map((e) => e.servedBy))];
  const oldestDays = daysSince(customer.first);

  return (
    <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
      <Pressable onPress={onToggle} className="flex-row flex-wrap items-center px-5 py-4 active:bg-ivory" style={{ gap: 12 }}>
        <View className="flex-row items-center flex-1 min-w-[220px]">
          <View className="w-10 h-10 rounded-full bg-danger/10 items-center justify-center">
            <Text className="text-[13px] font-bold" style={{ color: brand.danger }}>
              {initials(customer.name)}
            </Text>
          </View>
          <View className="flex-1 ml-3">
            <Text numberOfLines={1} className="text-ink text-[14px] font-bold">
              {customer.name}
            </Text>
            {customer.phone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${customer.phone}`)} className="flex-row items-center self-start mt-0.5">
                <Ionicons name="call-outline" size={12} color={brand.inkMuted} />
                <Text className="text-ink/60 text-[12px] ml-1">{customer.phone}</Text>
              </Pressable>
            ) : (
              <Text className="text-ink/40 text-[12px] mt-0.5">No phone recorded</Text>
            )}
          </View>
        </View>

        <View className="min-w-[110px]">
          <Text className="text-ink/40 text-[11px]">Credits</Text>
          <Text className="text-ink text-[13px] font-medium mt-0.5">
            {customer.entries.length} time{customer.entries.length === 1 ? "" : "s"}
          </Text>
        </View>
        <View className="min-w-[130px]">
          <Text className="text-ink/40 text-[11px]">Last taken</Text>
          <Text className="text-ink text-[13px] font-medium mt-0.5">{formatDate(customer.last)}</Text>
        </View>
        <View className="min-w-[140px]">
          <Text className="text-ink/40 text-[11px]">Served by</Text>
          <Text numberOfLines={1} className="text-ink text-[13px] font-medium mt-0.5">
            {servers.length === 1 ? servers[0] : `${servers[0]} +${servers.length - 1}`}
          </Text>
        </View>
        <View className="items-end min-w-[120px]">
          <Text className="text-ink/40 text-[11px]">Total owed</Text>
          <Text className="text-[15px] font-bold mt-0.5" style={{ color: brand.danger }}>
            {formatRwf(customer.total)}
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={brand.inkDisabled} />
      </Pressable>

      {open && (
        <View className="border-t border-ink/5 bg-ivory/60 p-4" style={{ gap: 10 }}>
          {oldestDays >= 30 && (
            <View className="flex-row items-center bg-white border border-ink/10 rounded-lg px-3 py-2">
              <Ionicons name="alert-circle-outline" size={14} color={brand.danger} />
              <Text className="flex-1 text-ink/70 text-[12px] ml-2">
                The oldest credit is {oldestDays} days old (since {formatDate(customer.first)}).
              </Text>
            </View>
          )}
          {customer.entries.map((e) => (
            <CreditRow key={e.id} entry={e} onOpen={() => onOpenOrder(e.order)} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function Credits() {
  const router = useRouter();
  const { orders, fetchOrders } = useOrder();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [sort, setSort] = useState<Sort>("amount");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      await fetchOrders();
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every credit payment on a completed order.
  const entries = useMemo<CreditEntry[]>(() => {
    const out: CreditEntry[] = [];
    for (const o of orders) {
      if (orderStatus(o) !== "COMPLETED") continue;
      paymentsOf(o).forEach((p, i) => {
        if (p.method?.toUpperCase() !== "CREDIT") return;
        out.push({
          id: p.id ?? `${o.id}-${i}`,
          order: o,
          payment: p,
          amount: toNumber(p.amount),
          takenAt: takenAtOf(o, p),
          customerName: p.creditOwnerName?.trim() || "Unknown customer",
          customerPhone: p.creditOwnerPhone?.trim() || "",
          takenBy: p.takenBy?.trim() || "",
          servedBy: o.user?.name ?? "Unknown",
        });
      });
    }
    return out;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (!inPeriod(e.takenAt, period)) return false;
      if (!q) return true;
      return [e.customerName, e.customerPhone, e.takenBy, e.servedBy, orderNumber(e.order)].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [entries, period, search]);

  const customers = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const e of filtered) {
      const key = customerKey(e.customerName, e.customerPhone);
      let c = map.get(key);
      if (!c) {
        c = { key, name: e.customerName, phone: e.customerPhone, entries: [], total: 0, first: e.takenAt, last: e.takenAt };
        map.set(key, c);
      }
      c.entries.push(e);
      c.total += e.amount;
      if (e.takenAt < c.first) c.first = e.takenAt;
      if (e.takenAt > c.last) c.last = e.takenAt;
      if (!c.phone && e.customerPhone) c.phone = e.customerPhone;
    }
    const list = [...map.values()];
    for (const c of list) c.entries.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
    return list.sort((a, b) =>
      sort === "amount" ? b.total - a.total : sort === "recent" ? b.last.localeCompare(a.last) : a.first.localeCompare(b.first),
    );
  }, [filtered, sort]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const oldest = filtered.reduce<string | null>((min, e) => (!min || e.takenAt < min ? e.takenAt : min), null);
  const topServer = useMemo(() => {
    const byServer = new Map<string, number>();
    for (const e of filtered) byServer.set(e.servedBy, (byServer.get(e.servedBy) ?? 0) + e.amount);
    return [...byServer.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [filtered]);

  const openOrder = (o: OrderType) =>
    router.push({ pathname: "/(owner)/inventory/Orders/[id]", params: { id: o.id } });

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <PageHeader
        eyebrow="Finance"
        title="Credits"
        subtitle="Customers who took goods on credit, when they took them and who served them."
        right={
          <Pressable
            onPress={refresh}
            disabled={loading}
            className="flex-row items-center h-10 px-4 rounded-xl bg-white border border-ink/10 active:bg-ivory"
          >
            {loading ? <ActivityIndicator size="small" color={brand.ink} /> : <Ionicons name="refresh" size={15} color={brand.ink} />}
            <Text className="text-ink text-[13px] font-semibold ml-2">Refresh</Text>
          </Pressable>
        }
      />

      {/* KPIs */}
      <View className="flex-row flex-wrap" style={{ gap: 12 }}>
        <Kpi icon="time-outline" label="Total on credit" value={formatRwf(total)} hint={`${filtered.length} credit sale${filtered.length === 1 ? "" : "s"}`} />
        <Kpi icon="people-outline" label="Customers" value={String(customers.length)} hint="With at least one credit" />
        <Kpi icon="hourglass-outline" label="Oldest credit" value={oldest ? `${daysSince(oldest)} days` : "—"} hint={oldest ? `Since ${formatDate(oldest)}` : "No credits"} />
        <Kpi icon="person-outline" label="Most credit given by" value={topServer ? topServer[0] : "—"} hint={topServer ? formatRwf(topServer[1]) : undefined} />
      </View>

      {/* Toolbar */}
      <View className="bg-white rounded-2xl border border-ink/5 p-4 flex-row flex-wrap items-center" style={{ gap: 10 }}>
        <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3 h-10 flex-1 min-w-[240px]">
          <Ionicons name="search" size={16} color={brand.inkMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Customer, phone, worker or order number"
            placeholderTextColor={brand.inkDisabled}
            className="flex-1 ml-2 text-[13px] text-ink"
            style={webNoOutline}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={16} color={brand.inkDisabled} />
            </Pressable>
          )}
        </View>
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
        <Segmented options={SORTS} value={sort} onChange={setSort} />
      </View>

      {/* List */}
      {loading && orders.length === 0 ? (
        <View className="bg-white rounded-2xl border border-ink/5 py-16 items-center">
          <ActivityIndicator color={brand.ink} />
          <Text className="text-ink/40 text-xs mt-3">Loading credits…</Text>
        </View>
      ) : error && orders.length === 0 ? (
        <View className="bg-white rounded-2xl border border-ink/5 py-16 items-center px-6">
          <Ionicons name="cloud-offline-outline" size={24} color={brand.danger} />
          <Text className="text-ink text-[13px] font-semibold mt-2">Could not load orders</Text>
          <Pressable onPress={refresh} className="mt-2">
            <Text className="text-ink text-xs font-semibold underline">Try again</Text>
          </Pressable>
        </View>
      ) : customers.length === 0 ? (
        <View className="bg-white rounded-2xl border border-ink/5 py-16 items-center px-6">
          <Ionicons name="checkmark-circle-outline" size={26} color={brand.inkDisabled} />
          <Text className="text-ink text-[13px] font-semibold mt-2">
            {entries.length === 0 ? "No credit sales yet" : "No credits match"}
          </Text>
          <Text className="text-ink/40 text-xs mt-1 text-center">
            {entries.length === 0
              ? "When a sale is paid with credit at checkout, the customer appears here."
              : "Try another period or search term."}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Text className="text-ink/50 text-[12px]">
            {customers.length} customer{customers.length === 1 ? "" : "s"} · tap one to see each credit
          </Text>
          {customers.map((c) => (
            <CustomerCard
              key={c.key}
              customer={c}
              open={openKey === c.key}
              onToggle={() => setOpenKey(openKey === c.key ? null : c.key)}
              onOpenOrder={openOrder}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
