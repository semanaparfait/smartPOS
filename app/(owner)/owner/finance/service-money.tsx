import { DateField, EmptyState, Tabs } from "@/components/inventory/stockKit";
import { PAYMENT_META } from "@/components/orders/orderKit";
import { PageHeader } from "@/components/forms/FormKit";
import { Pill, webNoOutline } from "@/components/services/servicesKit";
import ChargeWorker from "@/components/finance/ChargeWorker";
import { dateKey, kindMeta, rwf, timeOf } from "@/config/services";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useAuth from "@/store/Authentication/useAuth";
import usePermissions from "@/store/Authentication/usePermissions";
import type { CheckedPayment, ReceiptStatus } from "@/store/Services/serviceTypes";
import useServices from "@/store/Services/useServices";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

const RECEIPT: Record<ReceiptStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Waiting", color: brand.ink, bg: "#D0E66B" },
  CONFIRMED: { label: "Received", color: brand.success, bg: "#16A34A1A" },
  MISSING: { label: "Not received", color: brand.danger, bg: "#DC26261A" },
};

const FILTERS = [
  { value: "PENDING", label: "Waiting" },
  { value: "CONFIRMED", label: "Received" },
  { value: "MISSING", label: "Not received" },
  { value: "all", label: "All" },
];

// Money in is positive, refunds count against it.
const signed = (p: CheckedPayment) => (p.isRefund ? -1 : 1) * Number(p.amount);
const sum = (list: CheckedPayment[]) => list.reduce((total, p) => total + signed(p), 0);

const dayRange = (day: string) => {
  const from = new Date(`${day}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from, to };
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-ink/5 p-4" style={{ minWidth: 160 }}>
      <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-[2px]">{label}</Text>
      <Text numberOfLines={1} className="text-2xl font-semibold mt-1" style={{ color: tone ?? brand.ink }}>
        {value}
      </Text>
    </View>
  );
}

function PaymentRow({
  payment,
  mine,
  busy,
  first,
  onConfirm,
  onMissing,
  onReopen,
}: {
  payment: CheckedPayment;
  // Taken by the person checking: someone else has to confirm it.
  mine: boolean;
  busy: boolean;
  first: boolean;
  onConfirm: () => void;
  onMissing: (note: string) => void;
  onReopen: () => void;
}) {
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState("");
  const method = PAYMENT_META[payment.method];
  const { booking } = payment;

  return (
    <View className={`px-4 py-3 ${first ? "" : "border-t border-ink/5"}`} style={{ gap: 8 }}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View style={{ width: 92 }}>
          <Text className="text-ink text-[13px] font-semibold">{timeOf(payment.createdAt)}</Text>
          <Text className="text-ink/40 text-[11px]">{dateKey(payment.createdAt)}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Ionicons name={kindMeta(booking.service.kind).icon} size={14} color={brand.inkMuted} />
            <Text numberOfLines={1} className="text-ink text-[13px] font-semibold ml-1.5 flex-1">
              {booking.service.name}
              {booking.unit ? ` · ${booking.unit.name}` : ""}
            </Text>
          </View>
          <Text numberOfLines={1} className="text-ink/50 text-xs">
            {booking.customerName} · {booking.code}
            {payment.isRefund && payment.reason ? ` · ${tr("Refund")}: ${payment.reason}` : ""}
          </Text>
        </View>
        <View className="flex-row items-center" style={{ width: 110 }}>
          <Ionicons
            name={payment.isRefund ? "return-up-back-outline" : method.icon}
            size={15}
            color={payment.isRefund ? brand.danger : brand.inkMuted}
          />
          <Text className="text-ink/70 text-xs ml-1.5">
            {payment.isRefund ? `${tr("Refund")} · ` : ""}
            {tr(method.label)}
          </Text>
        </View>
        <Text
          className="text-[14px] font-semibold text-right"
          style={{ width: 120, color: payment.isRefund ? brand.danger : brand.ink }}
        >
          {payment.isRefund ? "- " : ""}
          {rwf(payment.amount)}
        </Text>
        <View style={{ width: 230 }} className="flex-row justify-end items-center">
          {busy ? (
            <ActivityIndicator size="small" color={brand.ink} />
          ) : payment.receipt === "PENDING" ? (
            mine ? (
              <Text className="text-ink/40 text-xs text-right">{tr("You took this. Someone else confirms it.")}</Text>
            ) : (
              <>
                <Pressable
                  onPress={() => setReporting((open) => !open)}
                  className="h-8 px-3 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory mr-1.5"
                >
                  <Text className="text-xs font-semibold" style={{ color: brand.danger }}>
                    {tr("Not received")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onConfirm}
                  className="h-8 px-3 rounded-lg bg-lime flex-row items-center active:bg-lime-dark"
                >
                  <Ionicons name="checkmark" size={14} color={brand.ink} />
                  <Text className="text-ink text-xs font-semibold ml-1">{tr("Received")}</Text>
                </Pressable>
              </>
            )
          ) : (
            <>
              <Pill {...RECEIPT[payment.receipt]} />
              {!mine && (
                <Pressable onPress={onReopen} accessibilityLabel={tr("Undo")} hitSlop={6} className="ml-2 h-8 px-2 rounded-lg items-center justify-center active:bg-ivory">
                  <Text className="text-ink/50 text-xs font-semibold">{tr("Undo")}</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>

      <Text className="text-ink/40 text-[11px]" style={{ marginLeft: 104 }}>
        {payment.isRefund ? tr("Given back by") : tr("Taken by")} {payment.takenBy?.name ?? "—"}
        {payment.receiptCheckedBy
          ? ` · ${tr(payment.receipt === "CONFIRMED" ? "Confirmed by" : "Reported by")} ${payment.receiptCheckedBy.name}${
              payment.receiptCheckedAt ? `, ${dateKey(payment.receiptCheckedAt)} ${timeOf(payment.receiptCheckedAt)}` : ""
            }`
          : ""}
      </Text>
      {payment.receipt === "MISSING" && (
        <View className="flex-row items-center justify-between" style={{ marginLeft: 104, gap: 8 }}>
          <Text className="text-xs flex-1" style={{ color: brand.danger }}>
            {payment.receiptNote ?? ""}
          </Text>
          {!payment.isRefund && payment.takenBy && (
            <ChargeWorker
              workerName={payment.takenBy.name}
              charge={{
                userId: payment.takenBy.id,
                kind: "SHORTAGE",
                amount: Number(payment.amount),
                date: dateKey(payment.createdAt),
                note: `${booking.service.name} · ${booking.code}${payment.receiptNote ? ` · ${payment.receiptNote}` : ""}`,
                source: `service-payment:${payment.id}`,
              }}
            />
          )}
        </View>
      )}

      {reporting && payment.receipt === "PENDING" && (
        <View className="flex-row items-center" style={{ marginLeft: 104, gap: 8 }}>
          <View className="flex-1 bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[44px] justify-center">
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={255}
              autoFocus
              placeholder={tr("What happened? e.g. Cash short by 5,000")}
              placeholderTextColor={brand.inkDisabled}
              className="py-2.5 text-[14px] text-ink"
              style={webNoOutline}
            />
          </View>
          <Pressable
            onPress={() => {
              if (note.trim().length < 3) {
                Toast.show({ type: "error", text1: tr("Say what happened to the money") });
                return;
              }
              onMissing(note.trim());
              setReporting(false);
            }}
            className="h-11 px-4 rounded-xl bg-ink items-center justify-center active:bg-ink-soft"
          >
            <Text className="text-white text-xs font-semibold">{tr("Report")}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Booking money, checked payment by payment: someone allowed to verify takings
// confirms it reached the business, or reports it missing and says why.
export default function ServiceMoney() {
  const me = useAuth((s) => s.profile?.id);
  const { isOwner } = usePermissions();
  const getReceipts = useServices((s) => s.getReceipts);
  const confirmReceipts = useServices((s) => s.confirmReceipts);
  const reportMissing = useServices((s) => s.reportMissing);
  const reopenReceipt = useServices((s) => s.reopenReceipt);

  const [filter, setFilter] = useState("PENDING");
  const [day, setDay] = useState(dateKey(new Date()));
  const [payments, setPayments] = useState<CheckedPayment[]>([]);
  const [waiting, setWaiting] = useState<CheckedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  // Waiting money is listed whatever its date, so nothing old is missed.
  const load = useCallback(async () => {
    const range = dayRange(day);
    try {
      const [listed, pending] = await Promise.all([
        filter === "PENDING"
          ? getReceipts({ receipt: "PENDING" })
          : getReceipts({ ...range, ...(filter === "all" ? {} : { receipt: filter as ReceiptStatus }) }),
        getReceipts({ receipt: "PENDING" }),
      ]);
      setPayments(listed);
      setWaiting(pending);
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not load payments"), text2: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, [day, filter, getReceipts]);

  useEffect(() => {
    load();
  }, [load]);

  const isMine = (p: CheckedPayment) => !isOwner && p.takenBy?.id === me;

  // Updated rows replace the old ones; rows leave the list when they no longer match.
  const apply = (updated: CheckedPayment[]) => {
    const byId = new Map(updated.map((p) => [p.id, p]));
    const matches = (p: CheckedPayment) => filter === "all" || p.receipt === filter;
    setPayments((list) => list.map((p) => byId.get(p.id) ?? p).filter(matches));
    setWaiting((list) => list.map((p) => byId.get(p.id) ?? p).filter((p) => p.receipt === "PENDING"));
  };

  const act = async (ids: string[], action: () => Promise<CheckedPayment[] | CheckedPayment>, done: string) => {
    setBusy((set) => new Set([...set, ...ids]));
    try {
      const result = await action();
      apply(Array.isArray(result) ? result : [result]);
      Toast.show({ type: "success", text1: tr(done) });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not update"), text2: (error as Error).message });
    } finally {
      setBusy((set) => new Set([...set].filter((id) => !ids.includes(id))));
    }
  };

  // Grouped by who took the money, so each worker's takings are checked together.
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; list: CheckedPayment[] }>();
    for (const p of payments) {
      const key = p.takenBy?.id ?? "none";
      if (!map.has(key)) map.set(key, { name: p.takenBy?.name ?? tr("Unknown"), list: [] });
      map.get(key)!.list.push(p);
    }
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [payments]);

  const missingTotal = payments.filter((p) => p.receipt === "MISSING");

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      className="flex-1 bg-ivory w-full"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow={tr("Finance")}
          title={tr("Service money")}
          subtitle={tr("Confirm the money taken for bookings really reached you. Nobody can confirm money they took themselves.")}
        />

        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          <Stat
            label={tr("Waiting to confirm")}
            value={`${rwf(sum(waiting))} · ${waiting.length}`}
            tone={waiting.length ? brand.ink : brand.success}
          />
          {filter !== "PENDING" && (
            <>
              <Stat label={tr("Received")} value={rwf(sum(payments.filter((p) => p.receipt === "CONFIRMED")))} tone={brand.success} />
              <Stat
                label={tr("Not received")}
                value={rwf(sum(missingTotal))}
                tone={missingTotal.length ? brand.danger : undefined}
              />
            </>
          )}
        </View>

        <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
          <View className="p-4 border-b border-ink/5 flex-row flex-wrap items-center" style={{ gap: 12 }}>
            <Tabs options={FILTERS} value={filter} onChange={setFilter} />
            {filter !== "PENDING" ? (
              <View style={{ width: 220 }}>
                <DateField value={day} placeholder={tr("Date")} onChange={(value) => setDay(value || dateKey(new Date()))} />
              </View>
            ) : (
              <Text className="text-ink/40 text-xs">{tr("All days, oldest first")}</Text>
            )}
          </View>

          {loading ? (
            <View className="py-14 items-center">
              <ActivityIndicator color={brand.ink} />
            </View>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={filter === "PENDING" ? "checkmark-done-outline" : "wallet-outline"}
              title={tr(filter === "PENDING" ? "Everything is confirmed" : "No payments")}
              hint={tr(filter === "PENDING" ? "New booking money will wait here." : "Try another day or filter.")}
            />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="min-w-[860px] w-full">
                {groups.map(([key, group]) => {
                  const confirmable = group.list.filter((p) => p.receipt === "PENDING" && !isMine(p));
                  return (
                    <View key={key} className="border-b border-ink/5">
                      <View className="flex-row items-center justify-between bg-ivory px-4 py-2.5">
                        <View>
                          <Text className="text-ink text-[14px] font-semibold">{group.name}</Text>
                          <Text className="text-ink/50 text-xs">
                            {group.list.length} {tr(group.list.length === 1 ? "payment" : "payments")} · {rwf(sum(group.list))}
                          </Text>
                        </View>
                        {confirmable.length > 1 && (
                          <Pressable
                            onPress={() =>
                              act(
                                confirmable.map((p) => p.id),
                                () => confirmReceipts(confirmable.map((p) => p.id)),
                                "Confirmed as received",
                              )
                            }
                            className="h-9 px-3.5 rounded-xl bg-ink flex-row items-center active:bg-ink-soft"
                          >
                            <Ionicons name="checkmark-done" size={15} color={brand.lime} />
                            <Text className="text-white text-xs font-semibold ml-1.5">
                              {tr("Confirm all")} · {rwf(sum(confirmable))}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                      {group.list.map((p, i) => (
                        <PaymentRow
                          key={p.id}
                          payment={p}
                          mine={isMine(p)}
                          busy={busy.has(p.id)}
                          first={i === 0}
                          onConfirm={() => act([p.id], () => confirmReceipts([p.id]), "Confirmed as received")}
                          onMissing={(note) => act([p.id], () => reportMissing(p.id, note), "Reported as not received")}
                          onReopen={() => act([p.id], () => reopenReceipt(p.id), "Back to waiting")}
                        />
                      ))}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
