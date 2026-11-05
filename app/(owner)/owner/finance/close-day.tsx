import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Input, PageHeader, PrimaryButton, Section, TextArea } from "@/components/forms/FormKit";
import Paged from "@/components/lists/Paged";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import {
  closeTheDay,
  loadClosingPreview,
  loadClosings,
  type ClosingPreview,
  type CountedMethod,
  type DayClosing,
} from "@/store/Closing/useClosing";

const COUNTED: CountedMethod[] = ["CASH", "MOMO", "CARD"];
const LABEL: Record<string, string> = { CASH: "Cash", MOMO: "MoMo", CARD: "Card", CREDIT: "Credit (owed)" };

const rwf = (n: number) => `${Math.round(n).toLocaleString()} RWF`;
const qty = (n: number) => (Math.round(n * 1000) / 1000).toLocaleString();
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dayName = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

function moneyLine(difference: number) {
  if (Math.round(difference) === 0) return { text: tr("All money matches"), color: brand.success };
  return difference < 0
    ? { text: `${rwf(-difference)} ${tr("missing")}`, color: brand.danger }
    : { text: `${rwf(difference)} ${tr("more than expected")}`, color: brand.ink };
}

// One closed day, as the owners got it.
function ClosingCard({ c, open, onToggle }: { c: DayClosing; open: boolean; onToggle: () => void }) {
  const counted = c.stock.filter((s) => s.counted !== null);
  const off = counted.filter((s) => s.difference !== 0);
  const money = moneyLine(c.money.difference);
  return (
    <View className="bg-white rounded-2xl border border-ink/5">
      <Pressable onPress={onToggle} className="flex-row items-center px-4 py-3.5">
        <View className="flex-1">
          <Text className="text-ink text-[14px] font-bold">{dayName(c.businessDay)}</Text>
          <Text className="text-ink/45 text-[11px] mt-0.5">
            {tr("Closed")} {when(c.closedAt)} · {c.closedByName}
          </Text>
        </View>
        <Text className="text-ink text-[13px] font-bold mr-3">{rwf(c.orders.paidTotal)}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={brand.inkMuted} />
      </Pressable>
      {open && (
        <View className="border-t border-ink/5 px-4 py-3" style={{ gap: 6 }}>
          <Text className="text-[13px] font-semibold" style={{ color: money.color }}>
            {tr("Money")}: {money.text}
          </Text>
          {!!c.orders.open && (
            <Text className="text-ink/60 text-[12px]">
              {c.orders.open} {tr("orders were not paid yet when the day closed")}
            </Text>
          )}
          {COUNTED.map((m) => (
            <Text key={m} className="text-ink/60 text-[12px]">
              {tr(LABEL[m])}: {tr("expected")} {rwf(c.money.expected[m])} · {tr("counted")} {rwf(c.money.counted[m])}
            </Text>
          ))}
          <Text className="text-[13px] font-semibold mt-1" style={{ color: off.length ? brand.danger : brand.ink }}>
            {tr("Stock")}: {!counted.length ? tr("not counted") : off.length ? `${off.length} ${tr("of")} ${counted.length} ${tr("off")}` : tr("all match")}
          </Text>
          {off.map((s) => (
            <Text key={s.productId} className="text-ink/60 text-[12px]">
              {s.name}: {tr("expected")} {qty(s.expected)} · {tr("counted")} {qty(s.counted ?? 0)} ({s.difference > 0 ? "+" : ""}
              {qty(s.difference)} {s.unit}, {rwf(s.value)})
            </Text>
          ))}
          {c.note && <Text className="text-ink/70 text-[12px] italic mt-1">“{c.note}”</Text>}
        </View>
      )}
    </View>
  );
}

// The end of the business day (today only): the money counted, the stock
// counted, a note when money doesn't match. Orders not paid yet stay open.
// The owners get the summary on their phone and WhatsApp.
export default function CloseDay() {
  const [preview, setPreview] = useState<ClosingPreview | null>(null);
  const [history, setHistory] = useState<DayClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [money, setMoney] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([loadClosingPreview(), loadClosings().catch(() => [])]);
      setPreview(p);
      setHistory(h);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!preview) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory px-6">
        {loading ? (
          <ActivityIndicator color={brand.ink} />
        ) : (
          <>
            <Text className="text-ink text-sm font-bold">{tr("Could not load")}</Text>
            <Text className="text-ink/50 text-xs mt-1 text-center">{error}</Text>
            <Pressable onPress={load} className="mt-4 h-10 px-4 rounded-xl bg-ink items-center justify-center">
              <Text className="text-white text-[13px] font-bold">{tr("Try again")}</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const p = preview;
  const closed = p.alreadyClosed;
  const counted = (m: string) => Number(money[m] || 0);
  const moneyFilled = COUNTED.every((m) => money[m] !== undefined && money[m] !== "");
  const difference = COUNTED.reduce((s, m) => s + counted(m) - p.money.expected[m], 0);
  const summary = moneyLine(difference);
  const countedRows = p.stock.filter((r) => counts[r.productId] !== undefined && counts[r.productId] !== "");
  const off = countedRows.filter((r) => Number(counts[r.productId]) !== r.expected);
  const moneyOff = moneyFilled && Math.round(difference) !== 0;
  const noteMissing = moneyOff && !note.trim();

  const close = async () => {
    if (closed) return Toast.show({ type: "error", text1: tr("Today is already closed.") });
    if (!moneyFilled) return Toast.show({ type: "error", text1: tr("Enter the cash, MoMo and card you counted (0 when there is none).") });
    if (noteMissing) return Toast.show({ type: "error", text1: tr("Money doesn't match: write a note saying why.") });
    setBusy(true);
    try {
      const saved = await closeTheDay({
        counted: { CASH: counted("CASH"), MOMO: counted("MOMO"), CARD: counted("CARD") },
        stock: countedRows.map((r) => ({ productId: r.productId, counted: Number(counts[r.productId]) })),
        note: note.trim() || undefined,
      });
      Toast.show({ type: "success", text1: tr("Day closed. The owners got the summary.") });
      setMoney({});
      setCounts({});
      setNote("");
      setOpenId(saved.id);
      await load();
    } catch (e) {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : String(e) });
      void load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-ivory" contentContainerStyle={{ padding: 24, paddingBottom: 48, gap: 16 }} keyboardShouldPersistTaps="handled">
      <PageHeader
        eyebrow={tr("Finance")}
        title={tr("Close the day")}
        subtitle={`${dayName(p.businessDay)} · ${tr("from midnight until now")} · ${tr("the owners get the summary on their phone and WhatsApp")}`}
        right={
          <Pressable onPress={load} className="flex-row items-center bg-white border border-ink/10 rounded-xl px-3 py-2">
            {loading ? <ActivityIndicator size="small" color={brand.ink} /> : <Ionicons name="refresh" size={15} color={brand.ink} />}
            <Text className="text-ink text-[13px] font-semibold ml-1.5">{tr("Refresh")}</Text>
          </Pressable>
        }
      />

      {closed && (
        <Pressable onPress={() => setOpenId(closed.id)} className="rounded-2xl bg-ink px-4 py-3.5">
          <Text className="text-lime text-[14px] font-bold">{tr("Today is already closed")}</Text>
          <Text className="text-white/70 text-[12px] mt-0.5">
            {closed.closedByName} · {when(closed.closedAt)} · {tr("a day is closed once. See it below in Past closings.")}
          </Text>
        </Pressable>
      )}

      {/* 1. Today's unpaid orders: a reminder, they don't stop closing */}
      {p.openOrders.length > 0 ? (
        <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-amber-900 text-[14px] font-bold">
            {p.openOrders.length} {p.openOrders.length === 1 ? tr("order from today is not paid yet") : tr("orders from today are not paid yet")}
          </Text>
          <Text className="text-amber-900/80 text-[12px] mt-1">
            {tr("You can still close the day. They stay open and are paid later; the summary mentions them.")}
          </Text>
          <View className="mt-3 bg-white rounded-xl">
            {p.openOrders.map((o) => (
              <View key={o.id} className="flex-row items-center px-3 py-2.5 border-b border-ink/5">
                <Text className="text-ink text-[13px] font-bold w-20">#{o.id.replace(/-/g, "").slice(-6).toUpperCase()}</Text>
                <Text className="flex-1 text-ink/60 text-[12px]" numberOfLines={1}>
                  {o.staff}
                  {o.customerName ? ` · ${o.customerName}` : ""}
                </Text>
                <Text className="text-ink text-[13px] font-bold">{rwf(o.total)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View className="rounded-2xl bg-green-50 px-4 py-3 flex-row items-center">
          <Ionicons name="checkmark-done" size={16} color="#047857" />
          <Text className="text-green-800 text-[13px] font-medium ml-2 flex-1">
            {tr("Every order from today is paid or cancelled.")} {p.orders.paid} {tr("paid")} · {rwf(p.orders.paidTotal)} · {p.orders.cancelled} {tr("cancelled")}
          </Text>
        </View>
      )}
      {p.olderOpenOrders > 0 && (
        <Text className="text-ink/50 text-[12px]">
          {p.olderOpenOrders} {tr("open orders from before today are not part of this day.")}
        </Text>
      )}

      {/* 2. Money */}
      <Section icon="cash-outline" title={tr("Money")} subtitle={tr("Count the drawer and check MoMo and card.")}>
        <View style={{ gap: 12 }}>
          {COUNTED.map((m) => {
            const filled = money[m] !== undefined && money[m] !== "";
            const diff = counted(m) - p.money.expected[m];
            return (
              <View key={m}>
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-ink text-[13px] font-bold">{tr(LABEL[m])}</Text>
                  <Text className="text-ink/50 text-[12px]">
                    {tr("Expected")} {rwf(p.money.expected[m])}
                    {filled ? ` · ${Math.round(diff) === 0 ? tr("matches") : rwf(diff)}` : ""}
                  </Text>
                </View>
                <Input
                  value={money[m] ?? ""}
                  onChangeText={(t) => setMoney((x) => ({ ...x, [m]: t.replace(/[^0-9]/g, "") }))}
                  keyboardType="number-pad"
                  placeholder="0"
                  suffix="RWF"
                />
              </View>
            );
          })}
          <Text className="text-ink/50 text-[12px]">
            {tr(LABEL.CREDIT)}: {rwf(p.money.expected.CREDIT)} · {tr("not counted: customers still owe it.")}
          </Text>
          <View className="rounded-xl px-4 py-3" style={{ backgroundColor: !moneyFilled ? brand.ivory : Math.round(difference) === 0 ? "#ecfdf5" : difference < 0 ? "#fef2f2" : "#f4f8dc" }}>
            <Text className="text-[13px] font-bold" style={{ color: moneyFilled ? summary.color : brand.inkMuted }}>
              {moneyFilled ? summary.text : tr("Enter what you counted")}
            </Text>
            <Text className="text-ink/50 text-[11px] mt-0.5">
              {tr("Sales")} {rwf(p.money.sales)}
              {p.money.services ? ` · ${tr("services")} ${rwf(p.money.services)}` : ""}
              {p.money.tillExpenses ? ` · ${tr("till expenses")} −${rwf(p.money.tillExpenses)}` : ""}
            </Text>
          </View>
        </View>
      </Section>

      {/* 3. Stock */}
      <Section icon="cube-outline" title={tr("Stock")} subtitle={tr("Opening + received − sold − wasted = expected. Count what is really there.")}>
        <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
          <Text className="flex-1 text-ink/50 text-[12px]">
            {countedRows.length} {tr("of")} {p.stock.length} {tr("counted")}
            {off.length ? ` · ${off.length} ${tr("don't match")}` : ""}
          </Text>
          <Pressable
            onPress={() => setCounts(Object.fromEntries(p.stock.map((r) => [r.productId, String(r.expected)])))}
            className="bg-ivory rounded-lg px-3 py-2"
          >
            <Text className="text-ink text-[12px] font-semibold">{tr("Fill all with expected")}</Text>
          </Pressable>
        </View>
        <Paged
          items={p.stock}
          render={(r) => {
            const value = counts[r.productId] ?? "";
            const diff = value === "" ? null : Number(value) - r.expected;
            return (
              <View key={r.productId} className={`flex-row items-center py-2.5 border-b border-ink/5 ${diff ? "bg-red-50" : ""}`}>
                <View className="flex-1 pr-2">
                  <Text className="text-ink text-[13px] font-semibold" numberOfLines={1}>
                    {r.name} <Text className="text-ink/40 text-[11px]">{r.unit}</Text>
                  </Text>
                  <Text className="text-ink/45 text-[11px]">
                    {qty(r.opening)}
                    {r.received ? ` +${qty(r.received)}` : ""}
                    {r.sold ? ` −${qty(r.sold)}` : ""}
                    {r.wasted ? ` −${qty(r.wasted)}` : ""} = {qty(r.expected)}
                  </Text>
                </View>
                <TextInput
                  value={value}
                  onChangeText={(t) => setCounts((c) => ({ ...c, [r.productId]: t.replace(/[^0-9.]/g, "") }))}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={brand.inkDisabled}
                  className="w-20 h-10 rounded-lg border border-ink/15 bg-ivory px-2 text-right text-ink"
                />
                <Text className="w-20 text-right text-[12px] font-bold" style={{ color: diff === null ? brand.inkDisabled : diff === 0 ? "#047857" : brand.danger }}>
                  {diff === null ? "—" : diff === 0 ? tr("matches") : `${diff > 0 ? "+" : ""}${qty(diff)}`}
                </Text>
              </View>
            );
          }}
        />
        {!p.stock.length && <Text className="text-ink/50 text-[13px]">{tr("No product counts stock.")}</Text>}
      </Section>

      <Section
        icon="chatbox-ellipses-outline"
        title={moneyOff ? tr("Note (required)") : tr("Note")}
        subtitle={moneyOff ? tr("The money doesn't match: say why.") : tr("Optional when the money matches. Sent with the summary.")}
      >
        <TextArea value={note} onChangeText={setNote} placeholder={moneyOff ? tr("Why is money missing or over?") : tr("Anything the owners should know")} />
        {noteMissing && <Text className="text-red-600 text-[12px] mt-2">{tr("Write a note before closing.")}</Text>}
      </Section>

      <View className={closed ? "opacity-50" : ""}>
        <PrimaryButton label={tr("Close the day")} busyLabel={tr("Closing...")} icon="lock-closed" busy={busy} onPress={close} />
      </View>

      {/* Past closings */}
      {history.length > 0 && (
        <View style={{ gap: 10 }} className="mt-4">
          <Text className="text-ink text-[15px] font-extrabold">{tr("Past closings")}</Text>
          {history.map((c) => (
            <ClosingCard key={c.id} c={c} open={openId === c.id} onToggle={() => setOpenId((x) => (x === c.id ? null : c.id))} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
