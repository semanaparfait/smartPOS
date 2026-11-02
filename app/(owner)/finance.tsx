import { DateField, Tabs } from "@/components/inventory/stockKit";
import { PageHeader } from "@/components/forms/FormKit";
import { PAYMENT_META, PAYMENT_METHODS, formatRwf, orderStatus, paymentsOf, toNumber } from "@/components/orders/orderKit";
import { categoryMeta, costsBetween, owedBack } from "@/config/expenses";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import usePermissions from "@/store/Authentication/usePermissions";
import useExpenses from "@/store/Finance/useExpenses";
import usePayroll from "@/store/Finance/usePayroll";
import useFinanceVerification, { verificationKey } from "@/store/Finance/useFinanceVerification";
import useOrder from "@/store/Order/Order";
import type { OrderType, PaymentMethod } from "@/store/Order/OrderType";
import useProduct from "@/store/products/useProduct";
import type { Booking, CheckedPayment } from "@/store/Services/serviceTypes";
import useServices from "@/store/Services/useServices";
import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

const DAY = 86_400_000;
const PERIODS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
];
const OLD_CREDIT_DAYS = 30;

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// [from, to) covering whole local days, from the first day to the last one.
const rangeOf = (first: string, last: string) => {
  const [a, b] = first <= last ? [first, last] : [last, first];
  const from = new Date(`${a}T00:00:00`);
  const to = new Date(`${b}T00:00:00`);
  to.setDate(to.getDate() + 1);
  return { from, to };
};

// When the money changed hands: the payment time, else when the order was completed.
const paidAt = (o: OrderType) => paymentsOf(o)[0]?.createdAt ?? o.updatedAt;
const signed = (p: CheckedPayment) => (p.isRefund ? -1 : 1) * toNumber(p.amount);
const methods = (): Record<PaymentMethod, number> => ({ CASH: 0, MOMO: 0, CARD: 0, CREDIT: 0 });

function Kpi({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <View className="flex-1 min-w-[190px] bg-white rounded-2xl border border-ink/5 p-4">
      <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-[2px]">{label}</Text>
      <Text numberOfLines={1} className="text-xl font-semibold mt-1.5" style={{ color: color ?? brand.ink }}>
        {value}
      </Text>
      {!!hint && (
        <Text numberOfLines={2} className="text-ink/40 text-[11px] mt-0.5">
          {hint}
        </Text>
      )}
    </View>
  );
}

function Card({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-5" style={{ gap: 12 }}>
      <View className="flex-row items-start justify-between" style={{ gap: 12 }}>
        <View className="flex-1">
          <Text className="text-ink text-[15px] font-semibold">{title}</Text>
          {!!subtitle && <Text className="text-ink/40 text-xs mt-0.5">{subtitle}</Text>}
        </View>
        {action && (
          <Pressable onPress={action.onPress} className="flex-row items-center h-8 px-3 rounded-lg border border-ink/10 active:bg-ivory">
            <Text className="text-ink text-xs font-semibold">{action.label}</Text>
            <Ionicons name="chevron-forward" size={13} color={brand.ink} />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

// One line of the profit and loss statement.
function Line({
  label,
  value,
  minus,
  strong,
  indent,
  color,
  icon,
}: {
  label: string;
  value: number;
  minus?: boolean;
  strong?: boolean;
  indent?: boolean;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className={`flex-row items-center justify-between ${strong ? "py-2 border-t border-ink/10 mt-1" : "py-1"}`}>
      <View className="flex-row items-center flex-1" style={{ paddingLeft: indent ? 14 : 0 }}>
        {icon && <Ionicons name={icon} size={14} color={brand.inkMuted} style={{ marginRight: 8 }} />}
        <Text className={`text-[13px] ${strong ? "text-ink font-semibold" : "text-ink/70"}`}>{label}</Text>
      </View>
      <Text className={`text-[13px] ${strong ? "font-semibold" : ""}`} style={{ color: color ?? brand.ink }}>
        {minus && value ? "- " : ""}
        {formatRwf(Math.abs(value))}
      </Text>
    </View>
  );
}

function Attention({ icon, color, text, onPress }: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-center py-2.5 border-t border-ink/5 active:bg-ivory">
      <Ionicons name={icon} size={16} color={color} />
      <Text className="flex-1 text-ink text-[13px] ml-2.5">{text}</Text>
      {onPress && <Ionicons name="chevron-forward" size={14} color={brand.inkMuted} />}
    </Pressable>
  );
}

// The company's money: what came in, what it cost, what is left as profit or
// loss, and what the company holds.
export default function FinanceOverview() {
  const router = useRouter();
  const { can } = usePermissions();
  const { orders, fetchOrders } = useOrder();
  const products = useProduct((s) => s.products);
  const getProducts = useProduct((s) => s.getProducts);
  const { expenses, salaries, load: loadExpenses } = useExpenses();
  const { records, loaded: recordsLoaded, load: loadRecords } = useFinanceVerification();
  const getReceipts = useServices((s) => s.getReceipts);
  const getOwedBookings = useServices((s) => s.getOwedBookings);
  const staff = usePayroll((s) => s.workers);
  const loadPayroll = usePayroll((s) => s.load);
  const canPayroll = can("payroll.manage");

  const [firstDay, setFirstDay] = useState(() => dayKey(new Date()));
  const [lastDay, setLastDay] = useState(() => dayKey(new Date()));
  const [services, setServices] = useState<CheckedPayment[]>([]);
  const [waiting, setWaiting] = useState<CheckedPayment[]>([]);
  const [owedBookings, setOwedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { from, to } = useMemo(() => rangeOf(firstDay, lastDay), [firstDay, lastDay]);
  const go = (route: string) => router.push(route as Href);

  const todayKey = dayKey(new Date());
  const yesterdayKey = dayKey(new Date(startOfDay(new Date()).getTime() - DAY));
  const shortcut =
    firstDay === lastDay && firstDay === todayKey ? "today" : firstDay === lastDay && firstDay === yesterdayKey ? "yesterday" : "";
  const pickShortcut = (value: string) => {
    const day = value === "today" ? todayKey : yesterdayKey;
    setFirstDay(day);
    setLastDay(day);
  };

  const load = useCallback(async () => {
    // Each source stands alone: one failing should not blank the whole page.
    await Promise.allSettled([
      fetchOrders(),
      getProducts(),
      loadExpenses(),
      getReceipts({ from, to }).then(setServices),
      getReceipts({ receipt: "PENDING" }).then(setWaiting),
      getOwedBookings().then(setOwedBookings),
      ...(canPayroll ? [loadPayroll()] : []),
    ]);
    setLoading(false);
  }, [fetchOrders, getProducts, loadExpenses, getReceipts, getOwedBookings, loadPayroll, canPayroll, from, to]);

  useEffect(() => {
    load();
    if (!recordsLoaded) loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const money = useMemo(() => {
    const inRange = (value: string) => {
      const t = new Date(value).getTime();
      return t >= from.getTime() && t < to.getTime();
    };

    // Product sales and what the goods cost.
    const paid = orders.filter((o) => orderStatus(o) === "COMPLETED" && inRange(paidAt(o)));
    const byMethod = methods();
    let sales = 0;
    let goods = 0;
    let costKnown = true;
    let unrecorded = 0;
    const workerDays = new Set<string>();
    for (const o of paid) {
      sales += toNumber(o.total);
      for (const item of o.items) {
        const unit = item.unitCost ?? item.product?.buyingPrice;
        if (unit === null || unit === undefined) costKnown = false;
        goods += toNumber(unit) * item.quantity;
      }
      if (o.user) workerDays.add(`${dayKey(new Date(paidAt(o)))}|${o.user.id}`);
      const ps = paymentsOf(o);
      if (!ps.length) unrecorded += 1;
      for (const p of ps) {
        const m = p.method?.toUpperCase() as PaymentMethod;
        if (m in byMethod) byMethod[m] += toNumber(p.amount);
      }
    }

    // Service money, after refunds.
    let serviceIn = 0;
    let refunds = 0;
    for (const p of services) {
      if (p.isRefund) refunds += toNumber(p.amount);
      else serviceIn += toNumber(p.amount);
      byMethod[p.method] += signed(p);
      if (p.takenBy) workerDays.add(`${dayKey(new Date(p.createdAt))}|${p.takenBy.id}`);
    }

    const income = sales + serviceIn - refunds;
    const gross = income - goods;
    const costs = costsBetween(expenses, salaries.monthly, from, to);
    const net = gross - costs.total;

    // What the company holds now: stock at cost, and money owed to it.
    const stockValue = products
      .filter((p) => p.trackStock)
      .reduce((sum, p) => sum + Math.max(0, toNumber(p.stockQuantity)) * toNumber(p.buyingPrice), 0);
    const now = Date.now();
    let credits = 0;
    let oldCredits = 0;
    for (const o of orders) {
      if (orderStatus(o) !== "COMPLETED") continue;
      for (const p of paymentsOf(o)) {
        if (p.method?.toUpperCase() !== "CREDIT") continue;
        credits += toNumber(p.amount);
        if (now - new Date(paidAt(o)).getTime() > OLD_CREDIT_DAYS * DAY) oldCredits += 1;
      }
    }
    const serviceOwed = owedBookings.reduce((sum, b) => sum + b.balance, 0);

    // Checks: worker days counted (saved on this device) and flagged ones.
    let olderUnchecked = 0;
    const flagged: { date: string; difference: number; note: string }[] = [];
    for (const key of workerDays) {
      const [date, userId] = key.split("|");
      const record = records[verificationKey(date, userId)];
      if (!record && date < todayKey) olderUnchecked += 1;
      if (record?.status === "flagged") flagged.push({ date, difference: record.difference, note: record.note });
    }

    return {
      sales,
      serviceIn,
      refunds,
      income,
      goods,
      costKnown,
      gross,
      costs,
      net,
      margin: income > 0 ? Math.round((net / income) * 100) : 0,
      byMethod,
      received: byMethod.CASH + byMethod.MOMO + byMethod.CARD,
      stockValue,
      credits,
      oldCredits,
      serviceOwed,
      unrecorded,
      olderUnchecked,
      flagged,
      missing: services.filter((p) => p.receipt === "MISSING"),
    };
  }, [orders, services, expenses, salaries, products, owedBookings, records, from, to, todayKey]);

  const profit = money.net >= 0;
  const methodMax = Math.max(1, ...PAYMENT_METHODS.map((m) => Math.abs(money.byMethod[m])));
  const waitingTotal = waiting.reduce((sum, p) => sum + signed(p), 0);
  const owedToWorkers = expenses.filter(owedBack).reduce((sum, e) => sum + toNumber(e.amount), 0);
  const owedByWorkers = canPayroll ? staff.reduce((sum, w) => sum + w.owed, 0) : 0;
  const debtPaymentsWaiting = canPayroll ? staff.reduce((n, w) => n + w.payments.filter((p) => p.status === "PENDING").length, 0) : 0;
  const holds = money.stockValue + money.credits + money.serviceOwed + owedByWorkers - owedToWorkers;

  const attention: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string; route?: string }[] = [
    ...(money.net < 0
      ? [{ icon: "trending-down" as const, color: brand.danger, text: `${tr("These dates end in a loss of")} ${formatRwf(-money.net)}` }]
      : []),
    ...money.missing.map((p) => ({
      icon: "alert-circle" as const,
      color: brand.danger,
      text: `${tr("Service money not received")}: ${formatRwf(p.amount)} · ${p.takenBy?.name ?? "—"}${p.receiptNote ? ` · ${p.receiptNote}` : ""}`,
      route: "/(owner)/finance/service-money",
    })),
    ...money.flagged.map((f) => ({
      icon: "flag" as const,
      color: brand.danger,
      text: `${tr("Flagged count")} ${f.date}: ${f.difference < 0 ? tr("short") : tr("over")} ${formatRwf(Math.abs(f.difference))}${f.note ? ` · ${f.note}` : ""}`,
      route: "/(owner)/finance/verification",
    })),
    ...(money.olderUnchecked
      ? [{ icon: "time-outline" as const, color: brand.ink, text: `${money.olderUnchecked} ${tr("worker days from before today are not checked yet")}`, route: "/(owner)/finance/verification" }]
      : []),
    ...(waiting.length
      ? [{ icon: "hourglass-outline" as const, color: brand.ink, text: `${tr("Service money waiting to confirm")}: ${formatRwf(waitingTotal)} (${waiting.length})`, route: "/(owner)/finance/service-money" }]
      : []),
    ...(money.oldCredits
      ? [{ icon: "time" as const, color: brand.danger, text: `${money.oldCredits} ${tr("credits are older than 30 days")}`, route: "/(owner)/finance/credits" }]
      : []),
    ...(!money.costKnown
      ? [{ icon: "pricetag-outline" as const, color: brand.ink, text: tr("Some products have no cost, so the profit is too high"), route: "/(owner)/products" }]
      : []),
    ...(money.unrecorded
      ? [{ icon: "help-circle-outline" as const, color: brand.ink, text: `${money.unrecorded} ${tr("paid orders have no payment method recorded")}` }]
      : []),
    ...(expenses.some((e) => e.status === "PENDING")
      ? [
          {
            icon: "receipt-outline" as const,
            color: brand.ink,
            text: `${expenses.filter((e) => e.status === "PENDING").length} ${tr("expenses sent by workers are waiting for approval")}`,
            route: "/(owner)/finance/expenses",
          },
        ]
      : []),
    ...(debtPaymentsWaiting
      ? [
          {
            icon: "people-outline" as const,
            color: brand.ink,
            text: `${debtPaymentsWaiting} ${tr("payments from workers for their debts are waiting for approval")}`,
            route: "/(owner)/finance/payroll",
          },
        ]
      : []),
    ...(owedToWorkers > 0
      ? [
          {
            icon: "person-outline" as const,
            color: brand.danger,
            text: `${tr("Owed back to workers")}: ${formatRwf(owedToWorkers)}`,
            route: "/(owner)/finance/expenses",
          },
        ]
      : []),
    ...(!expenses.length && can("expenses.manage")
      ? [{ icon: "receipt-outline" as const, color: brand.ink, text: tr("No expenses recorded yet, so the profit leaves out rent and bills"), route: "/(owner)/finance/expenses" }]
      : []),
  ];

  return (
    <ScrollView
      className="flex-1 bg-ivory w-full"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <PageHeader
        eyebrow={tr("Finance")}
        title={tr("Overview")}
        subtitle={tr("The company's money: what came in, what it cost to run, and the profit or loss that is left.")}
        right={
          <Pressable onPress={refresh} className="flex-row items-center h-10 px-4 rounded-xl bg-white border border-ink/10 active:bg-ivory">
            {refreshing ? <ActivityIndicator size="small" color={brand.ink} /> : <Ionicons name="refresh" size={15} color={brand.ink} />}
            <Text className="text-ink text-[13px] font-semibold ml-2">{tr("Refresh")}</Text>
          </Pressable>
        }
      />

      <View className="bg-white rounded-2xl border border-ink/5 p-4 flex-row flex-wrap items-end" style={{ gap: 12 }}>
        <View style={{ gap: 6 }}>
          <Text className="text-ink/50 text-[11px] font-semibold uppercase tracking-wider">{tr("Quick")}</Text>
          <Tabs options={PERIODS} value={shortcut} onChange={pickShortcut} />
        </View>
        <View style={{ width: 200, gap: 6 }}>
          <Text className="text-ink/50 text-[11px] font-semibold uppercase tracking-wider">{tr("From")}</Text>
          <DateField
            value={firstDay}
            placeholder={tr("Date")}
            onChange={(value) => {
              const day = value || todayKey;
              setFirstDay(day);
              // Picking a start after the end moves the end with it.
              if (day > lastDay) setLastDay(day);
            }}
          />
        </View>
        <View style={{ width: 200, gap: 6 }}>
          <Text className="text-ink/50 text-[11px] font-semibold uppercase tracking-wider">{tr("To")}</Text>
          <DateField
            value={lastDay}
            placeholder={tr("Date")}
            onChange={(value) => {
              const day = value || todayKey;
              setLastDay(day);
              if (day < firstDay) setFirstDay(day);
            }}
          />
        </View>
        <Text className="text-ink/40 text-xs pb-3">
          {firstDay === lastDay ? tr("One day") : `${Math.round((to.getTime() - from.getTime()) / DAY)} ${tr("days")}`}
        </Text>
      </View>

      {loading && !orders.length ? (
        <View className="bg-white rounded-2xl border border-ink/5 py-16 items-center">
          <ActivityIndicator color={brand.ink} />
        </View>
      ) : (
        <>
          {/* The answer first: profit or loss. */}
          <View className={`rounded-2xl p-6 ${profit ? "bg-ink" : "bg-white border border-danger/30"}`}>
            <Text className={`text-[11px] font-semibold uppercase tracking-[2px] ${profit ? "text-lime" : ""}`} style={profit ? undefined : { color: brand.danger }}>
              {tr(profit ? "Net profit" : "Net loss")}
            </Text>
            <Text className={`text-4xl font-semibold mt-2 ${profit ? "text-white" : ""}`} style={profit ? undefined : { color: brand.danger }}>
              {profit ? "" : "- "}
              {formatRwf(Math.abs(money.net))}
            </Text>
            <Text className={`text-[13px] mt-2 ${profit ? "text-white/60" : "text-ink/60"}`}>
              {tr("Income")} {formatRwf(money.income)} − {tr("goods")} {formatRwf(money.goods)} − {tr("expenses")} {formatRwf(money.costs.total)}
              {money.income > 0 ? ` · ${money.margin}% ${tr("of income")}` : ""}
            </Text>
          </View>

          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            <Kpi label={tr("Income")} value={formatRwf(money.income)} hint={tr("Sales and services, after refunds")} />
            <Kpi label={tr("Expenses")} value={formatRwf(money.goods + money.costs.total)} hint={tr("Goods sold, bills, rent and salaries")} color={brand.danger} />
            <Kpi label={tr("Money received")} value={formatRwf(money.received)} hint={tr("Cash, MoMo and card")} />
            <Kpi label={tr("Owed to you")} value={formatRwf(money.credits + money.serviceOwed)} hint={tr("Credits and unpaid services, all dates")} color={money.credits + money.serviceOwed ? brand.danger : undefined} />
          </View>

          <View className="flex-row flex-wrap items-start" style={{ gap: 16 }}>
            <View className="flex-1 min-w-[340px]">
              <Card
                title={tr("Profit and loss")}
                subtitle={tr("Repeating costs and salaries count their share of each day")}
                action={{ label: tr("Expenses"), onPress: () => go("/(owner)/finance/expenses") }}
              >
                <View>
                  <Line label={tr("Product sales")} value={money.sales} />
                  <Line label={tr("Services")} value={money.serviceIn} />
                  {money.refunds > 0 && <Line label={tr("Refunds")} value={money.refunds} minus color={brand.danger} />}
                  <Line label={tr("Income")} value={money.income} strong />
                  <Line label={tr("Cost of goods sold")} value={money.goods} minus />
                  <Line label={tr("Gross profit")} value={money.gross} strong color={money.gross < 0 ? brand.danger : undefined} />
                  <Line label={tr("Salaries")} value={money.costs.salaries} minus indent icon="people-outline" />
                  {money.costs.categories.map((c) => (
                    <Line key={c.category} label={tr(categoryMeta(c.category).label)} value={c.amount} minus indent icon={categoryMeta(c.category).icon} />
                  ))}
                  <Line label={tr("Total expenses")} value={money.costs.total} minus strong />
                  <Line
                    label={tr(profit ? "Net profit" : "Net loss")}
                    value={money.net}
                    minus={!profit}
                    strong
                    color={profit ? brand.success : brand.danger}
                  />
                </View>
              </Card>
            </View>

            <View className="flex-1 min-w-[300px]" style={{ gap: 16 }}>
              <Card title={tr("What the company holds")} subtitle={tr("Right now, whatever the dates")}>
                <View>
                  <Line label={tr("Stock, at what it cost")} value={money.stockValue} icon="cube-outline" />
                  <Line label={tr("Credits owed by customers")} value={money.credits} icon="time-outline" />
                  <Line label={tr("Unpaid services")} value={money.serviceOwed} icon="bed-outline" />
                  {owedByWorkers > 0 && (
                    <Line label={tr("Owed by workers")} value={owedByWorkers} icon="people-outline" />
                  )}
                  {owedToWorkers > 0 && (
                    <Line label={tr("Owed back to workers")} value={owedToWorkers} minus icon="person-outline" color={brand.danger} />
                  )}
                  <Line label={tr("Total")} value={holds} strong />
                </View>
                <Text className="text-ink/40 text-[11px]">{tr("Cash in hand and in the bank are not tracked in the app.")}</Text>
              </Card>

              <Card title={tr("How the money came in")}>
                <View style={{ gap: 10 }}>
                  {PAYMENT_METHODS.map((m) => {
                    const meta = PAYMENT_META[m];
                    const value = money.byMethod[m];
                    return (
                      <View key={m}>
                        <View className="flex-row items-center justify-between mb-1">
                          <View className="flex-row items-center">
                            <Ionicons name={meta.icon} size={14} color={m === "CREDIT" ? brand.danger : brand.ink} />
                            <Text className="text-ink text-[13px] ml-2">
                              {tr(meta.label)}
                              {m === "CREDIT" ? ` (${tr("not paid yet")})` : ""}
                            </Text>
                          </View>
                          <Text className="text-ink text-[13px] font-semibold">{formatRwf(value)}</Text>
                        </View>
                        <View className="h-1.5 rounded-full bg-ivory overflow-hidden">
                          <View style={{ width: `${(Math.max(0, value) / methodMax) * 100}%`, height: "100%", backgroundColor: m === "CREDIT" ? brand.danger : brand.ink }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </View>
          </View>

          <Card title={tr("Needs attention")}>
            {attention.length === 0 ? (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={18} color={brand.success} />
                <Text className="text-ink/70 text-[13px] ml-2">{tr("Nothing needs attention.")}</Text>
              </View>
            ) : (
              <View>
                {attention.map((a, i) => (
                  <Attention key={`${a.text}-${i}`} icon={a.icon} color={a.color} text={a.text} onPress={a.route ? () => go(a.route!) : undefined} />
                ))}
              </View>
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
