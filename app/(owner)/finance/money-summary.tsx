import { buildWorkerDays, COUNTED } from "@/components/finance/workerDays";
import { PageHeader } from "@/components/forms/FormKit";
import { DateField, Tabs } from "@/components/inventory/stockKit";
import { dayLabel, formatRwf, initials } from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useExpenses from "@/store/Finance/useExpenses";
import useFinanceVerification, {
  dayKey,
  verificationKey,
  type VerificationRecord,
} from "@/store/Finance/useFinanceVerification";
import useOrder from "@/store/Order/Order";
import type { PaymentMethod } from "@/store/Order/OrderType";
import type { CheckedPayment } from "@/store/Services/serviceTypes";
import useServices from "@/store/Services/useServices";
import { exportCsv } from "@/utils/exportCsv";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";

type Period = "today" | "yesterday" | "week" | "month" | "custom";
type Check = "verified" | "flagged" | "awaiting";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Pick days" },
];

const MAX_DAYS = 92;

// One worker's money for one day: what they should hand in, and what was counted.
interface Row {
  day: string;
  userId: string;
  name: string;
  expected: number;
  byMethod: Record<PaymentMethod, number>;
  check: Check;
  counted: number | null;
  difference: number | null;
  record?: VerificationRecord;
}

const shift = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(d.getDate() + days);
  return next;
};

// The days a period covers, oldest first.
const daysOf = (period: Period, from: string, to: string): string[] => {
  const today = new Date();
  let first: Date;
  let last = today;
  if (period === "today") first = today;
  else if (period === "yesterday") first = last = shift(today, -1);
  else if (period === "week") first = shift(today, -6);
  else if (period === "month") first = new Date(today.getFullYear(), today.getMonth(), 1);
  else {
    if (!from || !to) return [];
    const [a, b] = from <= to ? [from, to] : [to, from];
    first = new Date(`${a}T00:00:00`);
    last = new Date(`${b}T00:00:00`);
  }
  const days: string[] = [];
  for (let d = new Date(first); dayKey(d) <= dayKey(last) && days.length < MAX_DAYS; d = shift(d, 1)) {
    days.push(dayKey(d));
  }
  return days;
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const signedRwf = (value: number) =>
  value === 0 ? "0 RWF" : `${value > 0 ? "+" : "−"}${formatRwf(Math.abs(value))}`;

// Green only when the count matches what those checked days should have brought;
// red when money is missing.
const countColor = (counted: number, expectedOfChecked: number, anyChecked: boolean) =>
  !anyChecked
    ? brand.inkMuted
    : counted < expectedOfChecked
      ? brand.danger
      : counted === expectedOfChecked
        ? brand.success
        : brand.ink;

const CHECK_META: Record<Check, { label: string; icon: keyof typeof Ionicons.glyphMap; pill: string; fg: string }> = {
  verified: { label: "Checked", icon: "checkmark-circle-outline", pill: "bg-ink", fg: brand.lime },
  flagged: { label: "Flagged", icon: "flag-outline", pill: "bg-danger/10", fg: brand.danger },
  awaiting: { label: "Not checked", icon: "time-outline", pill: "bg-lime/40", fg: brand.ink },
};

function Pill({ check }: { check: Check }) {
  const meta = CHECK_META[check];
  return (
    <View className={`flex-row items-center self-start rounded-full px-2.5 py-1 ${meta.pill}`}>
      <Ionicons name={meta.icon} size={12} color={meta.fg} />
      <Text className="text-[11px] font-semibold ml-1" style={{ color: meta.fg }}>
        {tr(meta.label)}
      </Text>
    </View>
  );
}

function Big({ label, value, hint, color }: { label: string; value: string; hint: string; color?: string }) {
  return (
    <View className="flex-1 min-w-[200px] bg-white rounded-2xl border border-ink/5 p-5">
      <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-[2px]">{label}</Text>
      <Text numberOfLines={1} className="text-2xl font-semibold mt-1.5" style={{ color: color ?? brand.ink }}>
        {value}
      </Text>
      <Text className="text-ink/50 text-xs mt-1">{hint}</Text>
    </View>
  );
}

// A plain sentence with an icon, so the page explains itself.
function Line({ icon, color, children }: { icon: keyof typeof Ionicons.glyphMap; color?: string; children: string }) {
  return (
    <View className="flex-row items-start" style={{ gap: 10 }}>
      <Ionicons name={icon} size={18} color={color ?? brand.ink} style={{ marginTop: 1 }} />
      <Text className="flex-1 text-ink text-[14px] leading-[21px]">{children}</Text>
    </View>
  );
}

export default function MoneySummary() {
  const router = useRouter();
  const orders = useOrder((s) => s.orders);
  const fetchOrders = useOrder((s) => s.fetchOrders);
  const records = useFinanceVerification((s) => s.records);
  const loadRecords = useFinanceVerification((s) => s.load);
  const expenses = useExpenses((s) => s.expenses);
  const loadExpenses = useExpenses((s) => s.load);
  const getReceipts = useServices((s) => s.getReceipts);

  const [period, setPeriod] = useState<Period>("week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [services, setServices] = useState<CheckedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const days = useMemo(() => daysOf(period, from, to), [period, from, to]);
  const first = days[0];
  const last = days[days.length - 1];

  useEffect(() => {
    loadRecords();
    Promise.all([fetchOrders(), loadExpenses().catch(() => {})])
      .catch(() => Toast.show({ type: "error", text1: tr("Could not load sales") }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Booking money for the chosen days.
  useEffect(() => {
    if (!first) return setServices([]);
    const start = new Date(`${first}T00:00:00`);
    const end = shift(new Date(`${last}T00:00:00`), 1);
    getReceipts({ from: start, to: end }).then(setServices).catch(() => setServices([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, last]);

  const rows = useMemo(() => {
    const list: Row[] = [];
    for (const day of days) {
      const dayServices = services.filter((p) => dayKey(new Date(p.createdAt)) === day);
      for (const w of buildWorkerDays(orders, day, dayServices, expenses)) {
        const record = records[verificationKey(day, w.user.id)];
        const expected = sum(COUNTED.map((m) => w.expected[m]));
        if (expected === 0 && !record) continue;
        list.push({
          day,
          userId: w.user.id,
          name: w.user.employee?.name ?? w.user.name ?? "Unknown",
          expected,
          byMethod: w.expected,
          check: record?.status ?? "awaiting",
          counted: record ? sum(COUNTED.map((m) => record.counted[m] ?? 0)) : null,
          difference: record ? record.difference : null,
          record,
        });
      }
    }
    return list;
  }, [days, orders, services, expenses, records]);

  const expected = sum(rows.map((r) => r.expected));
  const checkedRows = rows.filter((r) => r.check !== "awaiting");
  const waitingRows = rows.filter((r) => r.check === "awaiting");
  const checkedExpected = sum(checkedRows.map((r) => r.expected));
  const counted = sum(checkedRows.map((r) => r.counted ?? 0));
  const difference = sum(checkedRows.map((r) => r.difference ?? 0));
  const waiting = sum(waitingRows.map((r) => r.expected));
  const flagged = rows.filter((r) => r.check === "flagged").length;
  const share = expected > 0 ? Math.min(1, checkedExpected / expected) : 0;

  const periodText =
    period === "custom"
      ? first
        ? first === last
          ? dayLabel(`${first}T00:00:00`)
          : `${dayLabel(`${first}T00:00:00`)} – ${dayLabel(`${last}T00:00:00`)}`
        : ""
      : tr(PERIODS.find((p) => p.value === period)!.label);

  // Newest day first.
  const byDay = [...days].reverse().flatMap((day) => {
    const list = rows.filter((r) => r.day === day);
    return list.length ? [{ day, rows: list }] : [];
  });

  const download = async () => {
    if (rows.length === 0) {
      Toast.show({ type: "info", text1: tr("Nothing to export for these days") });
      return;
    }
    try {
      await exportCsv(`money-${first}${first === last ? "" : `-to-${last}`}.csv`, [
        ["Date", "Worker", "Cash expected", "MoMo expected", "Card expected", "Total expected", "Counted", "Difference", "Status", "Checked by", "Checked at", "Note"],
        ...rows.map((r) => [
          r.day,
          r.name,
          r.byMethod.CASH,
          r.byMethod.MOMO,
          r.byMethod.CARD,
          r.expected,
          r.counted,
          r.difference,
          CHECK_META[r.check].label,
          r.record?.decidedBy,
          r.record ? new Date(r.record.decidedAt).toLocaleString("en-GB") : "",
          r.record?.note,
        ]),
        ["Total", "", "", "", "", expected, counted, difference, "", "", "", ""],
      ]);
      if (Platform.OS === "web") Toast.show({ type: "success", text1: tr("Export downloaded") });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not export"), text2: (error as Error).message });
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        eyebrow={tr("Finance")}
        title={tr("Money summary")}
        subtitle={tr("The money workers should hand in, and how much of it you have checked.")}
        right={
          <Pressable
            onPress={download}
            accessibilityRole="button"
            className="flex-row items-center h-10 px-4 rounded-xl bg-ink active:bg-ink/90"
          >
            <Ionicons name="download-outline" size={16} color={brand.lime} />
            <Text className="text-white text-[13px] font-semibold ml-2">{tr("Export")}</Text>
          </Pressable>
        }
      />

      {/* Which days */}
      <View style={{ gap: 10 }}>
        <Tabs options={PERIODS.map((p) => ({ ...p, label: tr(p.label) }))} value={period} onChange={(v) => setPeriod(v as Period)} />
        {period === "custom" && (
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            <View className="min-w-[180px]">
              <DateField value={from} placeholder={tr("From")} onChange={setFrom} />
            </View>
            <View className="min-w-[180px]">
              <DateField value={to} placeholder={tr("To")} onChange={setTo} />
            </View>
          </View>
        )}
      </View>

      {loading ? (
        <View className="py-16 items-center">
          <ActivityIndicator color={brand.ink} />
        </View>
      ) : days.length === 0 ? (
        <View className="bg-white rounded-2xl border border-ink/5 py-12 items-center px-6">
          <Ionicons name="calendar-outline" size={28} color={brand.inkDisabled} />
          <Text className="text-ink text-[15px] font-semibold mt-3">{tr("Pick the first and last day")}</Text>
        </View>
      ) : (
        <>
          {/* In plain words */}
          <View className="bg-white rounded-2xl border border-ink/5 p-5" style={{ gap: 12 }}>
            <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-[2px]">{periodText}</Text>
            {rows.length === 0 ? (
              <Line icon="information-circle-outline" color={brand.inkMuted}>
                {tr("No money came in on these days.")}
              </Line>
            ) : (
              <>
                <Line icon="wallet-outline">
                  {`${tr("Workers should hand in")} ${formatRwf(expected)} ${tr("in cash, MoMo and card.")}`}
                </Line>
                <Line icon="checkmark-circle-outline" color={brand.success}>
                  {checkedRows.length === 0
                    ? tr("You haven't checked any of it yet.")
                    : `${tr("You checked")} ${formatRwf(checkedExpected)} ${tr("of it and counted")} ${formatRwf(counted)}.`}
                </Line>
                {waiting !== 0 && (
                  <Line icon="time-outline">
                    {`${formatRwf(waiting)} ${tr("is still waiting to be checked")} (${waitingRows.length} ${tr("worker days")}).`}
                  </Line>
                )}
                {checkedRows.length > 0 && (
                  <Line
                    icon={difference < 0 ? "alert-circle-outline" : "checkmark-done-outline"}
                    color={difference < 0 ? brand.danger : brand.success}
                  >
                    {difference === 0
                      ? tr("What was counted matched what was expected.")
                      : difference < 0
                        ? `${tr("The counts were")} ${formatRwf(-difference)} ${tr("short.")}`
                        : `${tr("The counts were")} ${formatRwf(difference)} ${tr("over.")}`}
                  </Line>
                )}
                {flagged > 0 && (
                  <Line icon="flag-outline" color={brand.danger}>
                    {`${flagged} ${tr("worker days were flagged for a closer look.")}`}
                  </Line>
                )}

                {/* How much is checked */}
                <View style={{ gap: 6 }}>
                  <View className="h-2.5 rounded-full bg-ivory overflow-hidden">
                    <View className="h-full rounded-full bg-ink" style={{ width: `${Math.round(share * 100)}%` }} />
                  </View>
                  <Text className="text-ink/50 text-xs">
                    {Math.round(share * 100)}% {tr("checked")}
                  </Text>
                </View>
              </>
            )}
          </View>

          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            <Big label={tr("Expected")} value={formatRwf(expected)} hint={tr("Cash, MoMo and card, less bills paid from the till")} />
            <Big
              label={tr("Checked")}
              value={formatRwf(counted)}
              hint={`${tr("Should be")} ${formatRwf(checkedExpected)} · ${checkedRows.length} ${tr("worker days")}`}
              color={countColor(counted, checkedExpected, checkedRows.length > 0)}
            />
            <Big label={tr("Not checked")} value={formatRwf(waiting)} hint={`${waitingRows.length} ${tr("worker days")}`} />
            <Big
              label={tr("Difference")}
              value={signedRwf(difference)}
              hint={tr("Counted minus expected, on checked days")}
              color={difference < 0 ? brand.danger : brand.ink}
            />
          </View>

          {/* Day by day */}
          {byDay.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text className="text-ink/50 text-[11px] font-semibold uppercase tracking-wider">{tr("Day by day")}</Text>
              <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
                {byDay.map((d, i) => {
                  const dayExpected = sum(d.rows.map((r) => r.expected));
                  const dayChecked = d.rows.filter((r) => r.check !== "awaiting");
                  const dayCounted = sum(dayChecked.map((r) => r.counted ?? 0));
                  const dayCheckedExpected = sum(dayChecked.map((r) => r.expected));
                  const toCheck = d.rows.filter((r) => r.check === "awaiting").length;
                  const open = openDay === d.day;
                  return (
                    <View key={d.day} className={i === 0 ? "" : "border-t border-ink/5"}>
                      <Pressable
                        onPress={() => setOpenDay(open ? null : d.day)}
                        accessibilityState={{ expanded: open }}
                        className="flex-row flex-wrap items-center px-4 py-3.5 active:bg-ivory"
                        style={{ gap: 12 }}
                      >
                        <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={16} color={brand.inkMuted} />
                        <View className="flex-1 min-w-[140px]">
                          <Text className="text-ink text-[14px] font-semibold">{tr(dayLabel(`${d.day}T00:00:00`))}</Text>
                          <Text className="text-ink/50 text-xs mt-0.5">
                            {toCheck === 0
                              ? tr("All checked")
                              : `${toCheck} ${tr("of")} ${d.rows.length} ${tr("workers to check")}`}
                          </Text>
                        </View>
                        <View className="items-end min-w-[120px]">
                          <Text className="text-ink/40 text-[11px]">{tr("Expected")}</Text>
                          <Text className="text-ink text-[14px] font-semibold">{formatRwf(dayExpected)}</Text>
                        </View>
                        <View className="items-end min-w-[120px]">
                          <Text className="text-ink/40 text-[11px]">{tr("Checked")}</Text>
                          <Text
                            className="text-[14px] font-semibold"
                            style={{ color: countColor(dayCounted, dayCheckedExpected, dayChecked.length > 0) }}
                          >
                            {dayChecked.length > 0 ? formatRwf(dayCounted) : "—"}
                          </Text>
                          {dayChecked.length > 0 && dayCounted !== dayCheckedExpected && (
                            <Text className="text-ink/40 text-[11px]">
                              {tr("Should be")} {formatRwf(dayCheckedExpected)}
                            </Text>
                          )}
                        </View>
                      </Pressable>

                      {open && (
                        <View className="bg-ivory/60 px-4 pb-3" style={{ gap: 2 }}>
                          {d.rows.map((r) => (
                            <View key={r.userId} className="flex-row flex-wrap items-center py-2.5" style={{ gap: 10 }}>
                              <View className="w-8 h-8 rounded-full bg-white items-center justify-center">
                                <Text className="text-ink text-[11px] font-semibold">{initials(r.name)}</Text>
                              </View>
                              <View className="flex-1 min-w-[140px]">
                                <Text numberOfLines={1} className="text-ink text-[13px] font-semibold">{r.name}</Text>
                                <Text className="text-ink/50 text-xs">
                                  {r.record
                                    ? `${tr("Counted")} ${formatRwf(r.counted ?? 0)} · ${signedRwf(r.difference ?? 0)} · ${tr("by")} ${r.record.decidedBy}`
                                    : tr("Waiting for you to count")}
                                </Text>
                              </View>
                              <Text className="text-ink text-[13px] font-semibold">{formatRwf(r.expected)}</Text>
                              <Pill check={r.check} />
                            </View>
                          ))}
                          {d.rows.some((r) => r.check === "awaiting") && (
                            <Pressable
                              onPress={() => router.push("/(owner)/finance/verification")}
                              className="self-start flex-row items-center mt-1 h-9 px-3 rounded-lg border border-ink/10 bg-white active:bg-ivory"
                            >
                              <Ionicons name="shield-checkmark-outline" size={14} color={brand.ink} />
                              <Text className="text-ink text-xs font-semibold ml-1.5">{tr("Go check money")}</Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <Text className="text-ink/40 text-xs">
            {tr("Credit sales are money still owed, so they aren't counted here. See Credits.")}
          </Text>
        </>
      )}
    </ScrollView>
  );
}
