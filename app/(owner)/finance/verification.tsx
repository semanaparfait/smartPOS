import { PageHeader } from "@/app/components/ownerComponents/FormKit";
import {
  formatRwf,
  formatTime,
  initials,
  orderNumber,
  orderStatus,
  PAYMENT_META,
  paymentMeta,
  paymentsOf,
  ProductThumb,
  STATUS_META as ORDER_STATUS_META,
  toNumber,
  type OrderStatus,
} from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import { confirmDialog, notify } from "@/store/Dialog/useDialog";
import useFinanceVerification, {
  verificationKey,
  type VerificationRecord,
} from "@/store/Finance/useFinanceVerification";
import useOrder from "@/store/Order/Order";
import type { OrderPayment, OrderType, OrderUser, PaymentMethod } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

// Methods the owner counts by hand. Credit is money still owed, so it's listed, not counted.
const COUNTED: PaymentMethod[] = ["CASH", "MOMO", "CARD"];
const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;
const GREEN = "#047857";
const AMBER = "#B45309";

type Status = "awaiting" | "verified" | "flagged";
type Filter = "all" | Status;

const STATUS_META: Record<Status, { label: string; icon: keyof typeof Ionicons.glyphMap; pill: string; fg: string; accent: string }> = {
  awaiting: { label: "To check", icon: "time-outline", pill: "bg-lime/40", fg: brand.ink, accent: brand.lime },
  verified: { label: "Verified", icon: "checkmark-circle-outline", pill: "bg-emerald-50", fg: GREEN, accent: "#10B981" },
  flagged: { label: "Flagged", icon: "flag-outline", pill: "bg-red-50", fg: brand.danger, accent: brand.danger },
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// When the money changed hands: the payment time, else when the order was completed.
const paidAt = (o: OrderType) => paymentsOf(o)[0]?.createdAt ?? o.updatedAt;

const signedRwf = (value: number) =>
  value === 0 ? "0 RWF" : `${value > 0 ? "+" : "−"}${formatRwf(Math.abs(value))}`;

interface WorkerDay {
  user: OrderUser;
  orders: OrderType[]; // every order of the day, newest first
  completed: OrderType[];
  pending: OrderType[];
  cancelled: OrderType[];
  expected: Record<PaymentMethod, number>;
  credits: { order: OrderType; payment: OrderPayment }[];
  unrecorded: OrderType[]; // completed but no payment details
  sales: number;
}

const emptyMethods = (): Record<PaymentMethod, number> => ({ CASH: 0, MOMO: 0, CARD: 0, CREDIT: 0 });

const buildWorkerDays = (orders: OrderType[], date: string): WorkerDay[] => {
  const byUser = new Map<string, WorkerDay>();
  const get = (user: OrderUser) => {
    let w = byUser.get(user.id);
    if (!w) {
      w = {
        user,
        orders: [],
        completed: [],
        pending: [],
        cancelled: [],
        expected: emptyMethods(),
        credits: [],
        unrecorded: [],
        sales: 0,
      };
      byUser.set(user.id, w);
    }
    return w;
  };

  for (const o of orders) {
    if (!o.user) continue;
    const status = orderStatus(o);
    if (status === "COMPLETED" && dayKey(new Date(paidAt(o))) === date) {
      const w = get(o.user);
      w.orders.push(o);
      w.completed.push(o);
      w.sales += toNumber(o.total);
      const payments = paymentsOf(o);
      if (payments.length === 0) w.unrecorded.push(o);
      for (const p of payments) {
        const m = p.method?.toUpperCase() as PaymentMethod;
        if (!(m in w.expected)) continue;
        w.expected[m] += toNumber(p.amount);
        if (m === "CREDIT") w.credits.push({ order: o, payment: p });
      }
    } else if (status !== "COMPLETED" && dayKey(new Date(o.createdAt)) === date) {
      const w = get(o.user);
      w.orders.push(o);
      if (status === "PENDING") w.pending.push(o);
      if (status === "CANCELLED") w.cancelled.push(o);
    }
  }

  for (const w of byUser.values()) {
    w.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [...byUser.values()].sort((a, b) => b.sales - a.sales);
};

// ---------- Small pieces ----------

function Pill({ label, icon, bg, fg }: { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }) {
  return (
    <View className={`flex-row items-center self-start rounded-full px-2.5 py-1 ${bg}`}>
      <Ionicons name={icon} size={12} color={fg} />
      <Text className="text-[11px] font-semibold ml-1" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

function OrderStatusPill({ status, raw }: { status: OrderStatus; raw: string }) {
  const meta = ORDER_STATUS_META[status];
  return (
    <Pill
      label={status === "OTHER" ? raw : meta.label}
      icon={meta.icon}
      bg={status === "PENDING" ? "bg-lime/40" : meta.pill}
      fg={meta.fg}
    />
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  return (
    <View className="flex-1 min-w-[170px] bg-white rounded-2xl border border-ink/5 p-4">
      <View className="flex-row items-center">
        <View className="w-8 h-8 rounded-lg bg-ivory items-center justify-center">
          <Ionicons name={icon} size={15} color={brand.ink} />
        </View>
        <Text className="text-ink/50 text-[12px] font-medium ml-2.5">{label}</Text>
      </View>
      <Text numberOfLines={1} className="text-lg font-bold mt-3" style={{ color: color ?? brand.ink }}>
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

function Difference({ value }: { value: number }) {
  const color = value === 0 ? GREEN : value < 0 ? brand.danger : AMBER;
  return (
    <Text className="text-[13px] font-semibold" style={{ color }}>
      {value === 0 ? "Balanced" : value < 0 ? `Short ${formatRwf(-value)}` : `Over ${formatRwf(value)}`}
    </Text>
  );
}

function Notice({ icon, color, bg, children }: { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; children: string }) {
  return (
    <View className={`flex-row items-start rounded-lg px-3 py-2 ${bg}`}>
      <Ionicons name={icon} size={14} color={color} style={{ marginTop: 1 }} />
      <Text className="flex-1 text-[12px] ml-2" style={{ color }}>
        {children}
      </Text>
    </View>
  );
}

// ---------- Investigate: every order a worker made that day ----------

type OrderFilter = "ALL" | "COMPLETED" | "PENDING" | "CANCELLED";

function WorkerOrdersModal({
  day,
  dateLabel,
  onClose,
}: {
  day: WorkerDay | null;
  dateLabel: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setFilter("ALL");
    setOpenId(null);
  }, [day?.user.id]);

  if (!day) return null;

  const counts: Record<OrderFilter, number> = {
    ALL: day.orders.length,
    COMPLETED: day.completed.length,
    PENDING: day.pending.length,
    CANCELLED: day.cancelled.length,
  };
  const list = day.orders.filter((o) => filter === "ALL" || orderStatus(o) === filter);
  const openOrder = (o: OrderType) => {
    onClose();
    router.push({ pathname: "/(owner)/inventory/Orders/[id]", params: { id: o.id } });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-ink/50 flex-row justify-end">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close" />
        <View className="bg-ivory h-full" style={{ width: Math.min(560, width) }}>
          {/* Header */}
          <View className="bg-white border-b border-ink/5 px-5 pt-5 pb-4">
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-full bg-ink items-center justify-center">
                <Text className="text-lime text-[13px] font-bold">{initials(day.user.name)}</Text>
              </View>
              <View className="flex-1 ml-3">
                <Text numberOfLines={1} className="text-ink text-[16px] font-bold">
                  {day.user.name}
                </Text>
                <Text className="text-ink/50 text-[12px]">Orders on {dateLabel}</Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityLabel="Close"
                className="w-9 h-9 rounded-lg items-center justify-center active:bg-ivory"
              >
                <Ionicons name="close" size={20} color={brand.inkMuted} />
              </Pressable>
            </View>

            <View className="flex-row mt-4 rounded-xl bg-ivory p-3" style={{ gap: 12 }}>
              {[
                { label: "Paid", value: formatRwf(day.sales) },
                { label: "Orders", value: String(day.orders.length) },
                { label: "Pending", value: String(day.pending.length) },
                { label: "Cancelled", value: String(day.cancelled.length) },
              ].map((s) => (
                <View key={s.label} className="flex-1">
                  <Text className="text-ink/40 text-[11px]">{s.label}</Text>
                  <Text numberOfLines={1} className="text-ink text-[13px] font-bold mt-0.5">
                    {s.value}
                  </Text>
                </View>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
              {(["ALL", "COMPLETED", "PENDING", "CANCELLED"] as OrderFilter[]).map((f) => {
                const on = filter === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f)}
                    className={`flex-row items-center h-8 px-3 rounded-full border ${on ? "bg-ink border-ink" : "bg-white border-ink/10"}`}
                  >
                    <Text className={`text-[12px] font-semibold ${on ? "text-white" : "text-ink/70"}`}>
                      {f === "ALL" ? "All" : ORDER_STATUS_META[f].label}
                    </Text>
                    <Text className={`text-[12px] ml-1.5 ${on ? "text-lime" : "text-ink/40"}`}>{counts[f]}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Orders */}
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {list.length === 0 ? (
              <Text className="text-ink/40 text-[13px] text-center py-10">No orders in this filter.</Text>
            ) : (
              list.map((o) => {
                const status = orderStatus(o);
                const open = openId === o.id;
                const payments = paymentsOf(o);
                const count = o.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <View key={o.id} className="bg-white rounded-xl border border-ink/5 overflow-hidden">
                    <Pressable
                      onPress={() => setOpenId(open ? null : o.id)}
                      className="flex-row items-center px-4 py-3 active:bg-ivory"
                    >
                      <View className="flex-1 pr-3">
                        <View className="flex-row items-center" style={{ gap: 8 }}>
                          <Text className="text-ink text-[13px] font-bold">{orderNumber(o)}</Text>
                          <Text className="text-ink/40 text-[12px]">
                            {formatTime(status === "COMPLETED" ? paidAt(o) : o.createdAt)}
                          </Text>
                        </View>
                        <Text numberOfLines={1} className="text-ink/50 text-[12px] mt-0.5">
                          {count} item{count === 1 ? "" : "s"} ·{" "}
                          {o.items.map((i) => `${i.quantity}× ${i.product?.name ?? "Item"}`).join(", ")}
                        </Text>
                      </View>
                      <View className="items-end" style={{ gap: 4 }}>
                        <Text
                          className={`text-[13px] font-semibold ${status === "CANCELLED" ? "text-ink/40 line-through" : "text-ink"}`}
                        >
                          {formatRwf(o.total)}
                        </Text>
                        <OrderStatusPill status={status} raw={o.status} />
                      </View>
                      <Ionicons
                        name={open ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={brand.inkDisabled}
                        style={{ marginLeft: 10 }}
                      />
                    </Pressable>

                    {open && (
                      <View className="px-4 pb-4 border-t border-ink/5" style={{ gap: 12 }}>
                        <View className="pt-3" style={{ gap: 8 }}>
                          {o.items.map((item) => (
                            <View key={item.id} className="flex-row items-center">
                              <ProductThumb item={item} size={32} />
                              <Text numberOfLines={1} className="flex-1 text-ink text-[13px] ml-2.5">
                                {item.product?.name ?? "Item"}
                              </Text>
                              <Text className="text-ink/50 text-[12px] mr-3">× {item.quantity}</Text>
                              <Text className="text-ink text-[13px] font-medium">{formatRwf(item.totalPrice)}</Text>
                            </View>
                          ))}
                        </View>

                        <View className="rounded-lg bg-ivory p-3" style={{ gap: 6 }}>
                          <Text className="text-ink/40 text-[11px] font-medium">Payment</Text>
                          {payments.length === 0 ? (
                            <Text className="text-ink/50 text-[12px]">
                              {status === "PENDING"
                                ? "Not paid yet."
                                : status === "CANCELLED"
                                  ? "Cancelled before payment."
                                  : "No payment details recorded."}
                            </Text>
                          ) : (
                            payments.map((p, i) => {
                              const meta = paymentMeta(p.method);
                              return (
                                <View key={p.id ?? i}>
                                  <View className="flex-row items-center">
                                    <Ionicons name={meta.icon} size={14} color={meta.fg} />
                                    <Text className="flex-1 text-ink text-[13px] ml-2">{meta.label}</Text>
                                    <Text className="text-ink text-[13px] font-medium">{formatRwf(p.amount)}</Text>
                                  </View>
                                  {p.method?.toUpperCase() === "CREDIT" && (
                                    <Text className="text-ink/50 text-[12px] ml-6 mt-0.5">
                                      {[p.creditOwnerName, p.creditOwnerPhone, p.takenBy && `taken by ${p.takenBy}`]
                                        .filter(Boolean)
                                        .join(" · ") || "No credit details"}
                                    </Text>
                                  )}
                                </View>
                              );
                            })
                          )}
                        </View>

                        {o.note ? <Text className="text-ink/60 text-[12px]">Note: {o.note}</Text> : null}

                        <Pressable onPress={() => openOrder(o)} className="flex-row items-center self-start">
                          <Text className="text-ink text-[12px] font-semibold underline">Open full order</Text>
                          <Ionicons name="arrow-forward" size={13} color={brand.ink} style={{ marginLeft: 4 }} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------- One worker's check ----------

function WorkerCard({
  day,
  date,
  record,
  decidedBy,
  onInvestigate,
}: {
  day: WorkerDay;
  date: string;
  record?: VerificationRecord;
  decidedBy: string;
  onInvestigate: () => void;
}) {
  const { save, reopen } = useFinanceVerification();
  const status: Status = record?.status ?? "awaiting";
  const locked = !!record;
  const meta = STATUS_META[status];

  const toDrafts = (r?: VerificationRecord) =>
    Object.fromEntries(Object.entries(r?.counted ?? {}).map(([k, v]) => [k, String(v)])) as Partial<
      Record<PaymentMethod, string>
    >;
  const [drafts, setDrafts] = useState(() => toDrafts(record));
  const [note, setNote] = useState(record?.note ?? "");
  const [busy, setBusy] = useState(false);

  // Reset the form when the record is reopened or the day changes.
  useEffect(() => {
    setDrafts(toDrafts(record));
    setNote(record?.note ?? "");
  }, [record, date]);

  const methods = COUNTED.filter((m) => day.expected[m] > 0 || drafts[m]);
  const countedOf = (m: PaymentMethod) => (drafts[m] === undefined || drafts[m] === "" ? null : toNumber(drafts[m]));
  const expectedTotal = COUNTED.reduce((s, m) => s + day.expected[m], 0);
  const countedTotal = COUNTED.reduce((s, m) => s + (countedOf(m) ?? 0), 0);
  const allEntered = methods.every((m) => countedOf(m) !== null);
  const difference = countedTotal - expectedTotal;
  const unrecordedTotal = day.unrecorded.reduce((s, o) => s + toNumber(o.total), 0);
  const pendingTotal = day.pending.reduce((s, o) => s + toNumber(o.total), 0);

  const fillExpected = () => setDrafts(Object.fromEntries(methods.map((m) => [m, String(day.expected[m])])));

  const buildRecord = (s: VerificationRecord["status"]): VerificationRecord => ({
    date,
    userId: day.user.id,
    status: s,
    counted: Object.fromEntries(methods.map((m) => [m, countedOf(m) ?? 0])),
    expected: { ...day.expected },
    difference,
    note: note.trim(),
    decidedAt: new Date().toISOString(),
    decidedBy,
  });

  const handleVerify = async () => {
    if (!allEntered) {
      notify({
        title: "Enter the money received",
        message: `Type the amount you actually received for ${methods
          .filter((m) => countedOf(m) === null)
          .map((m) => PAYMENT_META[m].label)
          .join(", ")}. If it matches the app, tap "Same as recorded".`,
        tone: "warning",
      });
      return;
    }
    if (difference !== 0) {
      const ok = await confirmDialog({
        title: difference < 0 ? "Money is missing" : "There is extra money",
        message: `${day.user.name} is ${difference < 0 ? "short" : "over"} by ${formatRwf(Math.abs(difference))}. Verify anyway, or go back and flag it so it can be followed up.`,
        tone: "warning",
        confirmLabel: "Verify anyway",
        cancelLabel: "Go back",
      });
      if (!ok) return;
    }
    setBusy(true);
    await save(buildRecord("verified"));
    setBusy(false);
    notify({ title: "Verified", message: `${day.user.name}: ${formatRwf(countedTotal)} received.`, tone: "success" });
  };

  const handleFlag = async () => {
    if (!note.trim()) {
      notify({
        title: "Add a note first",
        message: "Explain what is wrong, for example \"5,000 RWF missing from cash\", so it can be followed up.",
        tone: "warning",
      });
      return;
    }
    const ok = await confirmDialog({
      title: "Flag this check?",
      message: `${day.user.name}'s money for this day will be marked as needing follow-up.`,
      tone: "danger",
      confirmLabel: "Flag",
    });
    if (!ok) return;
    setBusy(true);
    await save(buildRecord("flagged"));
    setBusy(false);
  };

  const handleReopen = async () => {
    const ok = await confirmDialog({
      title: "Check again?",
      message: "The saved decision is removed so you can enter the amounts again.",
      tone: "info",
      confirmLabel: "Check again",
    });
    if (ok) await reopen(date, day.user.id);
  };

  return (
    <View className="flex-1 bg-white rounded-2xl border border-ink/5 overflow-hidden">
      <View className="h-1" style={{ backgroundColor: meta.accent }} />

      {/* Worker */}
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <View className="w-10 h-10 rounded-full bg-ink items-center justify-center">
          <Text className="text-lime text-[13px] font-bold">{initials(day.user.name)}</Text>
        </View>
        <View className="flex-1 ml-3 pr-2">
          <Text numberOfLines={1} className="text-ink text-[15px] font-bold">
            {day.user.name}
          </Text>
          <Text numberOfLines={1} className="text-ink/50 text-[12px]">
            {day.completed.length} paid · {formatRwf(day.sales)}
            {day.pending.length ? ` · ${day.pending.length} pending` : ""}
          </Text>
        </View>
        <Pill label={meta.label} icon={meta.icon} bg={meta.pill} fg={meta.fg} />
      </View>

      <Pressable
        onPress={onInvestigate}
        className="mx-5 mb-3 flex-row items-center justify-between rounded-xl border border-ink/10 px-3 h-10 active:bg-ivory"
      >
        <View className="flex-row items-center">
          <Ionicons name="search-outline" size={15} color={brand.ink} />
          <Text className="text-ink text-[13px] font-semibold ml-2">
            See all {day.orders.length} order{day.orders.length === 1 ? "" : "s"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={brand.inkMuted} />
      </Pressable>

      {/* Reconciliation table */}
      <View className="mx-5 rounded-xl border border-ink/5 overflow-hidden">
        <View className="flex-row bg-ivory px-3 py-2">
          <Text className="flex-[1.1] text-ink/50 text-[11px] font-medium">Method</Text>
          <Text className="flex-1 text-ink/50 text-[11px] font-medium text-right">In the app</Text>
          <Text className="flex-[1.2] text-ink/50 text-[11px] font-medium text-right">Received</Text>
          <Text className="flex-1 text-ink/50 text-[11px] font-medium text-right">Difference</Text>
        </View>

        {methods.length === 0 ? (
          <Text className="text-ink/40 text-[12px] px-3 py-4">No cash, MoMo or card payments on this day.</Text>
        ) : (
          methods.map((m) => {
            const pm = PAYMENT_META[m];
            const counted = countedOf(m);
            const diff = counted === null ? null : counted - day.expected[m];
            return (
              <View key={m} className="flex-row items-center px-3 py-2.5 border-t border-ink/5">
                <View className="flex-[1.1] flex-row items-center">
                  <Ionicons name={pm.icon} size={15} color={pm.fg} />
                  <Text className="text-ink text-[13px] font-medium ml-2">{pm.label}</Text>
                </View>
                <Text className="flex-1 text-ink/70 text-[13px] text-right">{formatRwf(day.expected[m])}</Text>
                <View className="flex-[1.2] items-end">
                  {locked ? (
                    <Text className="text-ink text-[13px] font-semibold">{formatRwf(counted ?? 0)}</Text>
                  ) : (
                    <View
                      className="flex-row items-center bg-ivory border rounded-lg h-9 px-2 w-[118px]"
                      style={{ borderColor: diff ? brand.danger : "rgba(32,40,59,0.1)" }}
                    >
                      <TextInput
                        value={drafts[m] ?? ""}
                        onChangeText={(t) => setDrafts((d) => ({ ...d, [m]: t.replace(/[^0-9]/g, "") }))}
                        placeholder="0"
                        placeholderTextColor={brand.inkDisabled}
                        keyboardType="numeric"
                        accessibilityLabel={`${pm.label} received`}
                        className="flex-1 text-ink text-[13px] font-medium text-right"
                        style={webNoOutline}
                      />
                      <Text className="text-ink/40 text-[10px] ml-1">RWF</Text>
                    </View>
                  )}
                </View>
                <View className="flex-1 items-end">
                  {diff === null ? <Text className="text-ink/30 text-[13px]">—</Text> : <Difference value={diff} />}
                </View>
              </View>
            );
          })
        )}

        {methods.length > 0 && (
          <View className="flex-row items-center px-3 py-2.5 border-t border-ink/10 bg-ivory/60">
            <Text className="flex-[1.1] text-ink text-[13px] font-semibold">Total</Text>
            <Text className="flex-1 text-ink text-[13px] font-semibold text-right">{formatRwf(expectedTotal)}</Text>
            <Text className="flex-[1.2] text-ink text-[13px] font-semibold text-right">
              {allEntered || locked ? formatRwf(countedTotal) : "—"}
            </Text>
            <View className="flex-1 items-end">
              {allEntered || locked ? <Difference value={difference} /> : <Text className="text-ink/30">—</Text>}
            </View>
          </View>
        )}
      </View>

      {/* Credit and warnings */}
      <View className="mx-5 mt-3" style={{ gap: 6 }}>
        {day.credits.length > 0 && (
          <View className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2.5" style={{ gap: 6 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-[12px] font-semibold" style={{ color: brand.danger }}>
                Given on credit (not counted)
              </Text>
              <Text className="text-[12px] font-semibold" style={{ color: brand.danger }}>
                {formatRwf(day.expected.CREDIT)}
              </Text>
            </View>
            {day.credits.map(({ order, payment }, i) => (
              <View key={payment.id ?? `${order.id}-${i}`} className="flex-row items-center">
                <Text numberOfLines={1} className="flex-1 text-ink/70 text-[12px]">
                  {payment.creditOwnerName || "Unknown"}
                  {payment.creditOwnerPhone ? ` · ${payment.creditOwnerPhone}` : ""} · {orderNumber(order)}
                </Text>
                <Text className="text-ink/70 text-[12px]">{formatRwf(payment.amount)}</Text>
              </View>
            ))}
          </View>
        )}
        {day.unrecorded.length > 0 && (
          <Notice icon="alert-circle-outline" color={AMBER} bg="bg-amber-50">
            {`${day.unrecorded.length} paid order${day.unrecorded.length === 1 ? " has" : "s have"} no payment details (${formatRwf(unrecordedTotal)}) and ${day.unrecorded.length === 1 ? "is" : "are"} not in the table.`}
          </Notice>
        )}
        {day.pending.length > 0 && (
          <Notice icon="hourglass-outline" color={brand.inkMuted} bg="bg-ivory">
            {`${day.pending.length} order${day.pending.length === 1 ? " is" : "s are"} still waiting for payment (${formatRwf(pendingTotal)}).`}
          </Notice>
        )}
      </View>

      {/* Note + actions */}
      <View className="p-5 pt-4" style={{ gap: 10 }}>
        {locked ? (
          <View className="rounded-xl bg-ivory px-3 py-2.5">
            <Text className="text-ink text-[12px] font-medium">
              {meta.label} by {record!.decidedBy} on{" "}
              {new Date(record!.decidedAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {record!.note ? <Text className="text-ink/60 text-[12px] mt-0.5">“{record!.note}”</Text> : null}
          </View>
        ) : (
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Note (needed to flag), e.g. 5,000 RWF missing from cash"
            placeholderTextColor={brand.inkDisabled}
            multiline
            className="min-h-[42px] bg-ivory border border-ink/10 rounded-xl px-3 py-2.5 text-ink text-[13px]"
            style={webNoOutline}
          />
        )}

        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {locked ? (
            <Pressable
              onPress={handleReopen}
              className="flex-row items-center justify-center h-10 px-4 rounded-xl border border-ink/10 active:bg-ivory"
            >
              <Ionicons name="refresh-outline" size={15} color={brand.ink} />
              <Text className="text-ink text-[13px] font-semibold ml-1.5">Check again</Text>
            </Pressable>
          ) : (
            <>
              {methods.length > 0 && (
                <Pressable
                  onPress={fillExpected}
                  className="flex-row items-center justify-center h-10 px-3.5 rounded-xl border border-ink/10 active:bg-ivory"
                >
                  <Text className="text-ink text-[13px] font-semibold">Same as recorded</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleFlag}
                disabled={busy}
                className="flex-row items-center justify-center h-10 px-3.5 rounded-xl border border-ink/10 active:bg-red-50"
              >
                <Ionicons name="flag-outline" size={14} color={brand.danger} />
                <Text className="text-[13px] font-semibold ml-1.5" style={{ color: brand.danger }}>
                  Flag
                </Text>
              </Pressable>
              <Pressable
                onPress={handleVerify}
                disabled={busy}
                className="flex-1 min-w-[120px] flex-row items-center justify-center h-10 px-4 rounded-xl bg-ink active:bg-ink-soft"
              >
                {busy ? (
                  <ActivityIndicator size="small" color={brand.lime} />
                ) : (
                  <Ionicons name="checkmark" size={16} color={brand.lime} />
                )}
                <Text className="text-white text-[13px] font-semibold ml-1.5">Verify</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ---------- Page ----------

export default function FinanceVerification() {
  const { width } = useWindowDimensions();
  const { orders, fetchOrders } = useOrder();
  const { records, loaded: recordsLoaded, load } = useFinanceVerification();
  const profile = useAuth((s) => s.profile);

  const [date, setDate] = useState(() => new Date());
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [investigateId, setInvestigateId] = useState<string | null>(null);

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
    if (!recordsLoaded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const key = dayKey(date);
  const isToday = key === dayKey(new Date());
  const shiftDay = (delta: number) =>
    setDate((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + delta);
      return next;
    });

  const workers = useMemo(() => buildWorkerDays(orders, key), [orders, key]);
  const statusOf = (w: WorkerDay): Status => records[verificationKey(key, w.user.id)]?.status ?? "awaiting";

  const counts = { all: workers.length, awaiting: 0, verified: 0, flagged: 0 } as Record<Filter, number>;
  for (const w of workers) counts[statusOf(w)] += 1;

  const totals = workers.reduce(
    (acc, w) => {
      acc.sales += w.sales;
      acc.expected += COUNTED.reduce((s, m) => s + w.expected[m], 0);
      acc.credit += w.expected.CREDIT;
      const rec = records[verificationKey(key, w.user.id)];
      if (rec) acc.diff += rec.difference;
      return acc;
    },
    { sales: 0, expected: 0, credit: 0, diff: 0 },
  );

  const visible = workers.filter((w) => filter === "all" || statusOf(w) === filter);
  const investigating = workers.find((w) => w.user.id === investigateId) ?? null;
  const twoCols = width >= 1280;
  const decidedBy = profile?.name ?? "Owner";
  const dateLabel = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const checked = counts.verified + counts.flagged;

  return (
    <>
      <ScrollView
        className="flex-1 bg-ivory"
        contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          eyebrow="Finance"
          title="Verification"
          subtitle="Compare the money each worker recorded in the app with the money you actually received."
          right={
            <Pressable
              onPress={refresh}
              disabled={loading}
              className="flex-row items-center h-10 px-4 rounded-xl bg-white border border-ink/10 active:bg-ivory"
            >
              {loading ? (
                <ActivityIndicator size="small" color={brand.ink} />
              ) : (
                <Ionicons name="refresh" size={15} color={brand.ink} />
              )}
              <Text className="text-ink text-[13px] font-semibold ml-2">Refresh</Text>
            </Pressable>
          }
        />

        {/* How it works */}
        <View className="bg-white rounded-2xl border border-ink/5 px-4 py-3 flex-row flex-wrap" style={{ gap: 16 }}>
          {[
            { n: "1", text: "Count the cash and check MoMo and card for each worker." },
            { n: "2", text: "Type the amounts under “Received”." },
            { n: "3", text: "Verify if it matches, or Flag it with a note." },
          ].map((step) => (
            <View key={step.n} className="flex-row items-center flex-1 min-w-[220px]">
              <View className="w-6 h-6 rounded-full bg-ivory items-center justify-center">
                <Text className="text-ink text-[12px] font-semibold">{step.n}</Text>
              </View>
              <Text className="flex-1 text-ink/60 text-[12px] ml-2">{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Day picker + progress */}
        <View
          className="bg-white rounded-2xl border border-ink/5 p-4 flex-row flex-wrap items-center justify-between"
          style={{ gap: 14 }}
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Pressable
              onPress={() => shiftDay(-1)}
              accessibilityLabel="Previous day"
              className="w-9 h-9 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory"
            >
              <Ionicons name="chevron-back" size={17} color={brand.ink} />
            </Pressable>
            <View className="px-1 min-w-[210px]">
              <Text className="text-ink/40 text-[11px]">{isToday ? "Today" : "Day"}</Text>
              <Text className="text-ink text-[14px] font-semibold">{dateLabel}</Text>
            </View>
            <Pressable
              onPress={() => shiftDay(1)}
              disabled={isToday}
              accessibilityLabel="Next day"
              className={`w-9 h-9 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory ${isToday ? "opacity-30" : ""}`}
            >
              <Ionicons name="chevron-forward" size={17} color={brand.ink} />
            </Pressable>
            {!isToday && (
              <Pressable onPress={() => setDate(new Date())} className="h-9 px-3 rounded-lg bg-ivory items-center justify-center">
                <Text className="text-ink text-[12px] font-semibold">Go to today</Text>
              </Pressable>
            )}
          </View>

          <View className="min-w-[220px] flex-1 max-w-[340px]">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-ink/50 text-[12px]">
                {checked} of {workers.length} worker{workers.length === 1 ? "" : "s"} checked
              </Text>
              <Text className="text-ink text-[12px] font-semibold">
                {workers.length ? Math.round((checked / workers.length) * 100) : 0}%
              </Text>
            </View>
            <View className="h-1.5 rounded-full bg-ivory overflow-hidden flex-row">
              <View style={{ flex: counts.verified, backgroundColor: "#10B981" }} />
              <View style={{ flex: counts.flagged, backgroundColor: brand.danger }} />
              <View style={{ flex: counts.awaiting || (workers.length ? 0 : 1) }} />
            </View>
          </View>
        </View>

        {/* KPIs */}
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          <Kpi icon="receipt-outline" label="Total sales" value={formatRwf(totals.sales)} hint={`${workers.length} worker${workers.length === 1 ? "" : "s"} sold today`} />
          <Kpi icon="wallet-outline" label="Should be received" value={formatRwf(totals.expected)} hint="Cash, MoMo and card" />
          <Kpi
            icon="git-compare-outline"
            label="Difference found"
            value={signedRwf(totals.diff)}
            hint={checked ? (totals.diff < 0 ? "Money missing" : totals.diff > 0 ? "Extra money" : "Everything matches") : "Nothing checked yet"}
            color={totals.diff < 0 ? brand.danger : totals.diff > 0 ? AMBER : checked ? GREEN : undefined}
          />
          <Kpi icon="time-outline" label="Given on credit" value={formatRwf(totals.credit)} hint="Still to be paid by customers" />
        </View>

        {/* Filters */}
        <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
          {(["all", "awaiting", "verified", "flagged"] as Filter[]).map((f) => {
            const on = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                className={`flex-row items-center h-9 px-3.5 rounded-full border ${on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
              >
                <Text className={`text-[13px] font-medium ${on ? "text-white" : "text-ink/70"}`}>
                  {f === "all" ? "All workers" : STATUS_META[f].label}
                </Text>
                <Text className={`text-[13px] ml-1.5 ${on ? "text-lime" : "text-ink/40"}`}>{counts[f]}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Worker cards */}
        {loading && orders.length === 0 ? (
          <View className="bg-white rounded-2xl border border-ink/5 py-16 items-center">
            <ActivityIndicator color={brand.ink} />
            <Text className="text-ink/40 text-xs mt-3">Loading payments…</Text>
          </View>
        ) : error && orders.length === 0 ? (
          <View className="bg-white rounded-2xl border border-ink/5 py-16 items-center px-6">
            <Ionicons name="cloud-offline-outline" size={24} color={brand.danger} />
            <Text className="text-ink text-[13px] font-semibold mt-2">Could not load orders</Text>
            <Pressable onPress={refresh} className="mt-2">
              <Text className="text-ink text-xs font-semibold underline">Try again</Text>
            </Pressable>
          </View>
        ) : visible.length === 0 ? (
          <View className="bg-white rounded-2xl border border-ink/5 py-16 items-center px-6">
            <Ionicons
              name={workers.length ? "checkmark-done-outline" : "calendar-outline"}
              size={24}
              color={brand.inkDisabled}
            />
            <Text className="text-ink text-[13px] font-semibold mt-2">
              {workers.length === 0 ? "No sales on this day" : "No workers in this filter"}
            </Text>
            <Text className="text-ink/40 text-xs mt-1 text-center">
              {workers.length === 0 ? "Workers appear here once they make a sale." : "Choose another filter above."}
            </Text>
          </View>
        ) : (
          <View className={twoCols ? "flex-row flex-wrap" : ""} style={{ gap: 16 }}>
            {visible.map((w) => (
              <View key={w.user.id} style={twoCols ? { width: "49%" } : undefined} className="flex-grow">
                <WorkerCard
                  day={w}
                  date={key}
                  record={records[verificationKey(key, w.user.id)]}
                  decidedBy={decidedBy}
                  onInvestigate={() => setInvestigateId(w.user.id)}
                />
              </View>
            ))}
          </View>
        )}

        <Text className="text-ink/30 text-[11px] text-center">Checks are saved on this device.</Text>
      </ScrollView>

      <WorkerOrdersModal day={investigating} dateLabel={dateLabel} onClose={() => setInvestigateId(null)} />
    </>
  );
}
