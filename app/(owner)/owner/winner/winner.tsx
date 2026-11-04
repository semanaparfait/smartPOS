import { PageHeader, initials } from "@/components/forms/FormKit";
import { brand } from "@/config/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { secureUrl, thumbUrl } from "@/utils/imageUrl";
import { tr } from "@/i18n";
import useOrder from "@/store/Order/Order";
import type { OrderType } from "@/store/Order/OrderType";
import useFinanceVerification, { dayKey, paidAt, type VerificationRecord } from "@/store/Finance/useFinanceVerification";
import useEmployee from "@/store/Employee/UseEmploye";
import type { EmployeeResponse } from "@/store/Employee/EmployeeType";
import useAuth from "@/store/Authentication/useAuth";

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

// Points out of 100, shown on the page so the result can be explained. Only what
// SmartPOS really records counts, the same as the website's Winner page.
const WEIGHTS = [
  { key: "sales", label: "Sales", max: 40 },
  { key: "orders", label: "Customers served", max: 25 },
  { key: "checks", label: "Money checks without a shortage", max: 20 },
  { key: "clean", label: "Few cancelled orders", max: 15 },
] as const;

type PartKey = (typeof WEIGHTS)[number]["key"];

type Row = {
  id: string;
  name: string;
  role: string;
  picture?: string;
  sales: number;
  orders: number;
  cancelled: number;
  checked: number;
  short: number;
  shortBy: number;
  parts: Record<PartKey, number>;
  score: number;
};

const num = (v: string | number | null | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const formatRwf = (value: number) => `${Math.round(value).toLocaleString()} RWF`;
const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  return monthKeyOf(new Date(y, m - 1 + by, 1));
};
const monthName = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

// Everyone who sold in the month, scored and ranked.
function rank(orders: OrderType[], checks: VerificationRecord[], month: string, staff: Map<string, EmployeeResponse>): Row[] {
  const byId = new Map<string, Omit<Row, "parts" | "score">>();
  const get = (o: OrderType) => {
    const id = o.user.id;
    let r = byId.get(id);
    if (!r) {
      const employee = staff.get(id);
      r = {
        id,
        name: employee?.name ?? o.user.employee?.name ?? o.user.name,
        role: employee?.role?.name ?? (o.user.role === "OWNER" ? tr("Owner") : tr("Staff")),
        picture: employee ? thumbUrl(employee.profile) : undefined,
        sales: 0,
        orders: 0,
        cancelled: 0,
        checked: 0,
        short: 0,
        shortBy: 0,
      };
      byId.set(id, r);
    }
    return r;
  };
  for (const o of orders) {
    if (!o.user) continue;
    if (o.status === "COMPLETED" && dayKey(new Date(paidAt(o))).startsWith(month)) {
      const r = get(o);
      r.sales += num(o.total);
      r.orders += 1;
    } else if (o.status === "CANCELLED" && dayKey(new Date(o.createdAt)).startsWith(month)) {
      get(o).cancelled += 1;
    }
  }
  for (const c of checks) {
    if (!c.date.startsWith(month)) continue;
    const r = byId.get(c.userId);
    if (!r) continue;
    r.checked += 1;
    if (num(c.difference) < 0) {
      r.short += 1;
      r.shortBy += -num(c.difference);
    }
  }
  const list = [...byId.values()].filter((r) => r.orders > 0);
  const maxSales = Math.max(1, ...list.map((r) => r.sales));
  const maxOrders = Math.max(1, ...list.map((r) => r.orders));
  return list
    .map((r) => {
      const parts = {
        sales: (r.sales / maxSales) * 40,
        orders: (r.orders / maxOrders) * 25,
        // Nobody checked yet: neither helps nor hurts.
        checks: r.checked ? ((r.checked - r.short) / r.checked) * 20 : 10,
        clean: (1 - Math.min(1, r.cancelled / Math.max(1, r.orders + r.cancelled))) * 15,
      };
      const score = Math.round(Math.max(0, Math.min(100, Object.values(parts).reduce((a, b) => a + b, 0))));
      return { ...r, parts, score };
    })
    .sort((a, b) => b.score - a.score || b.sales - a.sales);
}

function Avatar({ uri, name, size }: { uri?: string; name?: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (uri && !failed) {
    return <Image source={{ uri: secureUrl(uri) }} style={{ width: size, height: size, borderRadius: size / 2 }} onError={() => setFailed(true)} />;
  }
  return (
    <View className="bg-ivory items-center justify-center" style={{ width: size, height: size, borderRadius: size / 2 }}>
      <Text className="text-ink font-bold" style={{ fontSize: size * 0.32 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

function Card({ icon, title, right, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-5">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-xl bg-ivory items-center justify-center">
            <Ionicons name={icon} size={17} color={brand.ink} />
          </View>
          <Text className="text-ink text-[15px] font-bold tracking-tight ml-3">{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

function HeroMetric({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View className="flex-1 min-w-[140px] bg-white/5 border border-white/10 rounded-2xl p-4">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={14} color={brand.lime} />
        <Text className="text-white/50 text-[11px] font-semibold ml-1.5">{label}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit className="text-white text-xl font-bold tracking-tight mt-2">
        {value}
      </Text>
    </View>
  );
}

function MonthSwitch({ month, thisMonth, onChange }: { month: string; thisMonth: string; onChange: (m: string) => void }) {
  const atNow = month >= thisMonth;
  return (
    <View className="flex-row items-center bg-white border border-ink/10 rounded-full">
      <Pressable onPress={() => onChange(shiftMonth(month, -1))} className="px-3 py-2" accessibilityLabel={tr("Month before")}>
        <Ionicons name="chevron-back" size={16} color={brand.ink} />
      </Pressable>
      <Text className="text-ink text-[13px] font-semibold px-1">{monthName(month)}</Text>
      <Pressable disabled={atNow} onPress={() => onChange(shiftMonth(month, 1))} className="px-3 py-2" accessibilityLabel={tr("Month after")}>
        <Ionicons name="chevron-forward" size={16} color={atNow ? brand.inkDisabled : brand.ink} />
      </Pressable>
    </View>
  );
}

export default function Winner() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1150;
  const storeName = useAuth((s) => s.profile?.company?.name) ?? "SmartPOS";
  const orders = useOrder((s) => s.orders);
  const fetchOrders = useOrder((s) => s.fetchOrders);
  const records = useFinanceVerification((s) => s.records);
  const loadChecks = useFinanceVerification((s) => s.load);
  const employees = useEmployee((s) => s.employeeResponses);
  const getEmployees = useEmployee((s) => s.getEmployees);
  const [loading, setLoading] = useState(orders.length === 0);
  const thisMonth = monthKeyOf(new Date());
  const [month, setMonth] = useState(thisMonth);

  useEffect(() => {
    Promise.allSettled([fetchOrders(), loadChecks(), getEmployees()]).finally(() => setLoading(false));
  }, [fetchOrders, loadChecks, getEmployees]);

  const staff = useMemo(() => {
    const map = new Map<string, EmployeeResponse>();
    for (const e of Array.isArray(employees) ? employees : []) if (e.user?.id) map.set(e.user.id, e);
    return map;
  }, [employees]);
  const checks = useMemo(() => Object.values(records), [records]);
  const ranking = useMemo(() => rank(orders, checks, month, staff), [orders, checks, month, staff]);
  // The winners of the months before, as far back as the orders go.
  const hallOfFame = useMemo(() => {
    const months = [...new Set(orders.filter((o) => o.status === "COMPLETED").map((o) => dayKey(new Date(paidAt(o))).slice(0, 7)))]
      .sort()
      .reverse()
      .slice(0, 12);
    return months.map((m) => ({ month: m, winner: rank(orders, checks, m, staff)[0] })).filter((e) => e.winner);
  }, [orders, checks, staff]);

  const header = (
    <PageHeader
      eyebrow={tr("Recognition")}
      title={tr("Employee of the month")}
      subtitle={`${monthName(month)} · ${storeName}`}
      right={<MonthSwitch month={month} thisMonth={thisMonth} onChange={setMonth} />}
    />
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory">
        <ActivityIndicator color={brand.ink} />
      </View>
    );
  }

  const winner = ranking[0];
  if (!winner) {
    return (
      <ScrollView className="flex-1 bg-ivory" contentContainerStyle={{ padding: 24, gap: 20 }}>
        {header}
        <View className="items-center justify-center bg-white rounded-2xl border border-ink/5 px-6 py-16">
          <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center mb-3">
            <Ionicons name="trophy-outline" size={26} color={brand.inkDisabled} />
          </View>
          <Text className="text-ink text-sm font-bold">{tr("No winner yet")}</Text>
          <Text className="text-ink/40 text-xs mt-1 text-center">{tr("Nobody has paid sales in this month yet.")}</Text>
        </View>
      </ScrollView>
    );
  }

  const first = winner.name.split(" ")[0];
  const gap = ranking[1] ? winner.score - ranking[1].score : null;
  const others = ranking.slice(1);
  const leads = (pick: (r: Row) => number) => others.every((o) => pick(winner) >= pick(o));
  const reasons: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
    ...(leads((r) => r.sales) ? [{ icon: "trending-up" as const, text: `${tr("Highest sales this month:")} ${formatRwf(winner.sales)}` }] : []),
    ...(leads((r) => r.orders) ? [{ icon: "people" as const, text: `${tr("Served the most customers:")} ${winner.orders}` }] : []),
    ...(winner.checked && winner.short === 0 ? [{ icon: "shield-checkmark" as const, text: `${tr("Every money check matched")} (${winner.checked})` }] : []),
    ...(winner.cancelled === 0 ? [{ icon: "checkmark-done" as const, text: tr("No cancelled orders all month") }] : []),
  ];
  if (!reasons.length) reasons.push({ icon: "podium", text: tr("Best score across sales, customers, money checks and cancellations") });

  return (
    <ScrollView className="flex-1 bg-ivory" contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }} showsVerticalScrollIndicator={false}>
      {header}

      {/* HERO */}
      <View className="bg-ink rounded-3xl p-6 overflow-hidden">
        <View className="absolute rounded-full bg-lime/10" style={{ width: 340, height: 340, right: -100, top: -170 }} />
        <View className="absolute rounded-full bg-lime/5" style={{ width: 200, height: 200, left: -60, bottom: -110 }} />

        <View className={isWide ? "flex-row items-center" : ""} style={{ gap: 28 }}>
          <View className="flex-row items-center" style={isWide ? { width: 420 } : undefined}>
            <View>
              <View className="rounded-full p-1 bg-lime">
                <Avatar uri={winner.picture} name={winner.name} size={104} />
              </View>
              <View className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-lime border-4 border-ink items-center justify-center">
                <Ionicons name="trophy" size={16} color={brand.ink} />
              </View>
            </View>
            <View className="flex-1 ml-5">
              <View className="self-start flex-row items-center bg-lime rounded-full px-2.5 py-1">
                <Text className="text-ink text-[10px] font-bold uppercase tracking-wider">
                  {tr("Winner ·")} {monthName(month)}
                </Text>
              </View>
              <Text numberOfLines={2} className="text-white text-[26px] font-bold tracking-tight mt-2 capitalize">
                {winner.name}
              </Text>
              <Text className="text-white/50 text-[13px] mt-0.5">{winner.role}</Text>

              <View className="flex-row items-baseline mt-3">
                <Text className="text-lime text-[40px] font-bold tracking-tight">{winner.score}</Text>
                <Text className="text-white/40 text-sm font-bold ml-1">/ 100</Text>
                {gap !== null && (
                  <Text className="text-white/50 text-xs ml-3">
                    +{gap} {tr("pts ahead")}
                  </Text>
                )}
              </View>
              <View className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <View className="h-full rounded-full bg-lime" style={{ width: `${winner.score}%` }} />
              </View>
            </View>
          </View>

          <View className="flex-1 flex-row flex-wrap" style={{ gap: 10 }}>
            <HeroMetric icon="cash-outline" label={tr("Sales handled")} value={formatRwf(winner.sales)} />
            <HeroMetric icon="people-outline" label={tr("Customers served")} value={winner.orders.toLocaleString()} />
            <HeroMetric icon="shield-checkmark-outline" label={tr("Money checks")} value={winner.checked ? `${winner.checked - winner.short} / ${winner.checked}` : "—"} />
            <HeroMetric icon="close-circle-outline" label={tr("Cancelled orders")} value={String(winner.cancelled)} />
          </View>
        </View>
      </View>

      <View className={isWide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
        <View className="flex-1" style={{ gap: 16 }}>
          <Card icon="podium-outline" title={tr("Leaderboard")} right={<Text className="text-ink/40 text-xs">{ranking.length} {tr("staff")}</Text>}>
            <View style={{ gap: 4 }}>
              {ranking.map((item, index) => {
                const top = index === 0;
                return (
                  <View key={item.id} className={`flex-row items-center rounded-xl px-3 py-3 ${top ? "bg-lime/20" : ""}`}>
                    <View className={`w-8 h-8 rounded-lg items-center justify-center ${top ? "bg-ink" : "bg-ivory"}`}>
                      <Text className={`text-[13px] font-bold ${top ? "text-lime" : "text-ink/60"}`}>{index + 1}</Text>
                    </View>
                    <View className="ml-3">
                      <Avatar uri={item.picture} name={item.name} size={38} />
                    </View>
                    <View className="flex-1 ml-3 pr-4">
                      <Text numberOfLines={1} className="text-ink text-[14px] font-bold capitalize">
                        {item.name}
                      </Text>
                      <Text className="text-ink/40 text-[11px]">
                        {item.role} · {formatRwf(item.sales)} · {item.orders} {tr("orders")}
                        {item.short ? ` · ${item.short} ${tr("short")}` : ""}
                      </Text>
                    </View>
                    <View className="w-[140px]">
                      <View className="flex-row justify-end items-baseline mb-1.5">
                        <Text className="text-ink text-base font-bold">{item.score}</Text>
                        <Text className="text-ink/40 text-[11px] ml-0.5">{tr("pts")}</Text>
                      </View>
                      <View className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                        <View className="h-full rounded-full bg-ink" style={{ width: `${item.score}%` }} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          <Card icon="analytics-outline" title={`${tr("How")} ${first} ${tr("scored")} ${winner.score}`}>
            <View style={{ gap: 12 }}>
              {WEIGHTS.map((weight) => {
                const value = winner.parts[weight.key];
                return (
                  <View key={weight.key}>
                    <View className="flex-row justify-between mb-1.5">
                      <Text className="text-ink/60 text-[13px]">{tr(weight.label)}</Text>
                      <Text className="text-ink text-[13px] font-bold" style={{ fontFamily: MONO }}>
                        {value.toFixed(1)} / {weight.max}
                      </Text>
                    </View>
                    <View className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                      <View className="h-full rounded-full bg-ink" style={{ width: `${(value / weight.max) * 100}%` }} />
                    </View>
                  </View>
                );
              })}
              <Text className="text-ink/40 text-[11px] pt-2">
                {tr("Sales and customers are compared with the best in the month. Without any money check yet, that part counts half.")}
              </Text>
            </View>
          </Card>
        </View>

        <View style={isWide ? { width: 380, gap: 16 } : { gap: 16 }}>
          <Card icon="checkmark-done-outline" title={`${tr("Why")} ${first} ${tr("won")}`}>
            <View style={{ gap: 10 }}>
              {reasons.map((reason) => (
                <View key={reason.text} className="flex-row items-center">
                  <View className="w-8 h-8 rounded-lg bg-lime items-center justify-center">
                    <Ionicons name={reason.icon} size={15} color={brand.ink} />
                  </View>
                  <Text className="flex-1 text-ink text-[13px] font-medium ml-3">{reason.text}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card icon="chatbox-ellipses-outline" title={tr("Message for the team")}>
            <View className="border-l-2 border-lime pl-4">
              <Text className="text-ink/70 text-[14px] leading-6 italic">
                {tr("“Thank you")} {winner.name} {tr("for your dedication, discipline, and teamwork. Your effort helps")} {storeName} {tr("grow every day.”")}
              </Text>
            </View>
          </Card>

          <Card icon="trophy-outline" title={tr("Hall of fame")}>
            <View>
              {hallOfFame.map((entry, i) => {
                const current = entry.month === month;
                return (
                  <Pressable key={entry.month} onPress={() => setMonth(entry.month)} className="flex-row">
                    <View className="items-center mr-3" style={{ width: 16 }}>
                      <View className={`w-3 h-3 rounded-full mt-1 ${current ? "bg-lime border-2 border-ink" : "bg-ink/20"}`} />
                      {i < hallOfFame.length - 1 && <View className="flex-1 w-px bg-ink/10 my-1" />}
                    </View>
                    <View className="flex-1 pb-4">
                      <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-wider">{monthName(entry.month)}</Text>
                      <Text className={`text-[14px] capitalize mt-0.5 ${current ? "text-ink font-bold" : "text-ink font-semibold"}`}>
                        {entry.winner.name} · {entry.winner.score} {tr("pts")}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}
