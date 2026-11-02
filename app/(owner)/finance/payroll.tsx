import { DateField, EmptyState } from "@/components/inventory/stockKit";
import { ChoiceChips, PageHeader } from "@/components/forms/FormKit";
import { ProofThumb, ProofViewer } from "@/components/finance/receiptKit";
import { ActionButton, FieldLabel, MoneyInput, Pill, webNoOutline } from "@/components/services/servicesKit";
import { dayKey } from "@/config/expenses";
import { DEBT_KINDS, DEBT_PAYMENT_STATUS, debtKindMeta, debtMethodMeta } from "@/config/payroll";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useAuth from "@/store/Authentication/useAuth";
import usePermissions from "@/store/Authentication/usePermissions";
import usePayroll, { type DebtKind, type DebtPayment, type SalaryMethod, type WorkerPayroll } from "@/store/Finance/usePayroll";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

const rwf = (amount: number | string) => `${Math.round(Number(amount)).toLocaleString()} RWF`;

const SALARY_METHODS: { value: SalaryMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "CASH", label: "Cash", icon: "cash-outline" },
  { value: "MOMO", label: "MoMo", icon: "phone-portrait-outline" },
  { value: "BANK", label: "Bank", icon: "business-outline" },
];

const monthKey = (d: Date) => dayKey(d).slice(0, 7);
const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + by, 1));
};

// Pay one month's salary: what they owe can be taken off; a month is paid once.
function SalaryPanel({ worker }: { worker: WorkerPayroll }) {
  const paySalary = usePayroll((s) => s.paySalary);
  const undoSalary = usePayroll((s) => s.undoSalary);
  const [month, setMonth] = useState(monthKey(new Date()));
  const suggestedDeduct = Math.min(worker.owed, worker.salary);
  const [deduct, setDeduct] = useState(String(suggestedDeduct));
  const [amount, setAmount] = useState(String(worker.salary - suggestedDeduct));
  const [method, setMethod] = useState<SalaryMethod>("CASH");
  const [paidOn, setPaidOn] = useState(dayKey(new Date()));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const paid = worker.salaryPayments.find((p) => p.month === month);

  // What is handed over follows the deduction, unless typed by hand.
  const changeDeduct = (value: string) => {
    setDeduct(value);
    setAmount(String(Math.max(0, worker.salary - Number(value || 0))));
  };

  const pay = async () => {
    const taken = Number(deduct || 0);
    if (taken > worker.owed) return Toast.show({ type: "error", text1: `${tr("They owe only")} ${rwf(worker.owed)}` });
    if (taken > worker.salary) return Toast.show({ type: "error", text1: tr("You cannot take off more than the salary") });
    setBusy(true);
    try {
      await paySalary({ employeeId: worker.employeeId, month, deducted: taken, amount: Number(amount || 0), method, paidOn, note: note.trim() || undefined });
      Toast.show({ type: "success", text1: `${tr("Salary paid for")} ${month}`, text2: `${worker.name} · ${rwf(amount)}` });
      setNote("");
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not record the salary"), text2: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const undo = async (id: string) => {
    try {
      await undoSalary(id);
      Toast.show({ type: "success", text1: tr("Salary payment undone"), text2: month });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not update"), text2: (error as Error).message });
    }
  };

  return (
    <View className="bg-ivory rounded-xl p-3" style={{ gap: 10 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-ink text-[14px] font-semibold">{tr("Pay salary")}</Text>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Pressable onPress={() => setMonth(shiftMonth(month, -1))} accessibilityLabel={tr("Previous month")} className="w-8 h-8 rounded-lg bg-white items-center justify-center active:bg-ivory">
            <Ionicons name="chevron-back" size={15} color={brand.ink} />
          </Pressable>
          <Text className="text-ink text-[13px] font-semibold" style={{ minWidth: 64, textAlign: "center" }}>{month}</Text>
          <Pressable onPress={() => setMonth(shiftMonth(month, 1))} accessibilityLabel={tr("Next month")} className="w-8 h-8 rounded-lg bg-white items-center justify-center active:bg-ivory">
            <Ionicons name="chevron-forward" size={15} color={brand.ink} />
          </Pressable>
        </View>
      </View>

      {paid ? (
        <View className="flex-row flex-wrap items-center" style={{ gap: 10 }}>
          <Ionicons name="checkmark-circle" size={18} color={brand.success} />
          <Text className="flex-1 text-ink text-[13px]">
            {tr("Paid")} {rwf(paid.amount)} · {tr(SALARY_METHODS.find((m) => m.value === paid.method)?.label ?? "")} · {paid.paidOn}
            {paid.deducted ? ` · ${rwf(paid.deducted)} ${tr("taken off for debts")}` : ""}
            {paid.paidBy ? ` · ${paid.paidBy.name}` : ""}
          </Text>
          <Pressable onPress={() => undo(paid.id)} hitSlop={6}>
            <Text className="text-ink/50 text-xs font-semibold underline">{tr("Undo")}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            <View style={{ flexGrow: 1, minWidth: 150 }}>
              <FieldLabel>{tr("Salary")}</FieldLabel>
              <View className="bg-white border border-ink/10 rounded-xl px-3.5 min-h-[48px] justify-center">
                <Text className="text-ink text-[15px]">{rwf(worker.salary)}</Text>
              </View>
            </View>
            <View style={{ flexGrow: 1, minWidth: 150 }}>
              <FieldLabel>{`${tr("Take off for debts")} (${tr("owes")} ${rwf(worker.owed)})`}</FieldLabel>
              <MoneyInput value={deduct} placeholder="0" onChange={changeDeduct} />
            </View>
            <View style={{ flexGrow: 1, minWidth: 150 }}>
              <FieldLabel>{tr("Handed over")}</FieldLabel>
              <MoneyInput value={amount} placeholder="0" onChange={setAmount} />
            </View>
          </View>
          <View className="flex-row flex-wrap items-end" style={{ gap: 10 }}>
            <View style={{ gap: 6 }}>
              <FieldLabel>{tr("Paid with")}</FieldLabel>
              <View className="flex-row" style={{ gap: 6 }}>
                {SALARY_METHODS.map((m) => (
                  <Pressable
                    key={m.value}
                    onPress={() => setMethod(m.value)}
                    className={`flex-row items-center px-3 h-10 rounded-xl border ${method === m.value ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
                  >
                    <Ionicons name={m.icon} size={14} color={method === m.value ? brand.lime : brand.inkMuted} />
                    <Text className={`text-xs font-semibold ml-1 ${method === m.value ? "text-white" : "text-ink"}`}>{tr(m.label)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ width: 190 }}>
              <FieldLabel>{tr("Paid on")}</FieldLabel>
              <DateField value={paidOn} placeholder={tr("Date")} onChange={(value) => setPaidOn(value || dayKey(new Date()))} />
            </View>
          </View>
          <View className="bg-white border border-ink/10 rounded-xl px-3.5 min-h-[44px] justify-center">
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={1000}
              placeholder={tr("Note (optional), e.g. Bonus included, 3 days unpaid leave")}
              placeholderTextColor={brand.inkDisabled}
              className="py-2.5 text-[14px] text-ink"
              style={webNoOutline}
            />
          </View>
          <Pressable onPress={pay} disabled={busy} className="h-11 rounded-xl bg-lime flex-row items-center justify-center active:bg-lime-dark">
            {busy ? <ActivityIndicator color={brand.ink} /> : <Ionicons name="checkmark" size={16} color={brand.ink} />}
            <Text className="text-ink text-[13px] font-semibold ml-1.5">
              {tr("Mark")} {month} {tr("as paid")} · {rwf(amount || 0)}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function Stat({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-ink/5 p-4" style={{ minWidth: 180 }}>
      <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-[2px]">{label}</Text>
      <Text numberOfLines={1} className="text-2xl font-semibold mt-1" style={{ color: color ?? brand.ink }}>
        {value}
      </Text>
      {!!hint && <Text className="text-ink/40 text-[11px] mt-0.5">{hint}</Text>}
    </View>
  );
}

// Charge something to a worker by hand: an advance, goods, damage. `open` false = hidden.
function ChargeModal({ open, workers, onClose }: { open: boolean; workers: WorkerPayroll[]; onClose: () => void }) {
  const charge = usePayroll((s) => s.charge);
  const [employeeId, setEmployeeId] = useState("");
  const [kind, setKind] = useState<DebtKind | "">("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(dayKey(new Date()));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmployeeId("");
    setKind("");
    setAmount("");
    setDate(dayKey(new Date()));
    setNote("");
  }, [open]);

  const save = async () => {
    if (!employeeId || !kind || !(Number(amount) > 0)) {
      Toast.show({ type: "error", text1: tr("Choose the worker, the reason and the amount") });
      return;
    }
    setSaving(true);
    try {
      await charge({ employeeId, kind, amount: Number(amount), date, note: note.trim() || undefined });
      Toast.show({ type: "success", text1: tr("Charged to the worker"), text2: `${workers.find((w) => w.employeeId === employeeId)?.name ?? ""} · ${rwf(amount)}` });
      onClose();
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not charge"), text2: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-ink/50 items-center justify-center p-4">
        <View className="bg-white rounded-2xl w-full overflow-hidden" style={{ maxWidth: 560, maxHeight: "94%" }}>
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-ink/5">
            <Text className="text-ink text-lg font-semibold">{tr("Charge a worker")}</Text>
            <Pressable onPress={onClose} accessibilityLabel={tr("Close")} className="w-9 h-9 rounded-lg items-center justify-center active:bg-ivory">
              <Ionicons name="close" size={20} color={brand.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <View>
              <FieldLabel>{tr("Worker")}</FieldLabel>
              <ChoiceChips options={workers.map((w) => ({ value: w.employeeId, label: w.name }))} value={employeeId} onChange={setEmployeeId} />
            </View>
            <View>
              <FieldLabel>{tr("Why")}</FieldLabel>
              <ChoiceChips options={DEBT_KINDS} value={kind} onChange={setKind} />
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              <View style={{ flexGrow: 1, minWidth: 180 }}>
                <FieldLabel>{tr("Amount")}</FieldLabel>
                <MoneyInput value={amount} placeholder="0" onChange={setAmount} />
              </View>
              <View style={{ flexGrow: 1, minWidth: 180 }}>
                <FieldLabel>{tr("Date")}</FieldLabel>
                <DateField value={date} placeholder={tr("Date")} onChange={(value) => setDate(value || dayKey(new Date()))} />
              </View>
            </View>
            <View className="bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px] justify-center">
              <TextInput
                value={note}
                onChangeText={setNote}
                maxLength={1000}
                placeholder={tr("Note, e.g. Took 2 sodas, broke a glass")}
                placeholderTextColor={brand.inkDisabled}
                className="py-3 text-[15px] text-ink"
                style={webNoOutline}
              />
            </View>
            <Text className="text-ink/40 text-xs">{tr("It comes off their salary until they pay it back.")}</Text>
          </ScrollView>
          <View className="flex-row px-5 pb-5 pt-3 border-t border-ink/5" style={{ gap: 10 }}>
            <ActionButton label={tr("Cancel")} icon="close" tone="plain" onPress={onClose} />
            <ActionButton label={tr("Charge")} icon="checkmark" busy={saving} onPress={save} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// A worker's payment waiting for approval.
function PendingPayment({
  worker,
  payment,
  canReview,
  first,
  onView,
}: {
  worker: WorkerPayroll;
  payment: DebtPayment;
  canReview: boolean;
  first: boolean;
  onView: (url: string) => void;
}) {
  const approve = usePayroll((s) => s.approve);
  const reject = usePayroll((s) => s.reject);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (action: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await action();
      Toast.show({ type: "success", text1: tr(done), text2: `${worker.name} · ${rwf(payment.amount)}` });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not update"), text2: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className={`px-4 py-3 ${first ? "" : "border-t border-ink/5"}`} style={{ gap: 8 }}>
      <View className="flex-row flex-wrap items-center" style={{ gap: 12 }}>
        {payment.proofUrl && <ProofThumb url={payment.proofUrl} onOpen={() => onView(payment.proofUrl!)} size={44} />}
        <View className="flex-1 min-w-[160px]">
          <Text className="text-ink text-[14px] font-semibold">{worker.name}</Text>
          <Text numberOfLines={2} className="text-ink/50 text-xs">
            {tr(debtMethodMeta(payment.method).label)} · {payment.createdAt.slice(0, 10)}
            {payment.note ? ` · ${payment.note}` : ""}
          </Text>
        </View>
        <Text className="text-ink text-[15px] font-semibold">{rwf(payment.amount)}</Text>
        {busy ? (
          <ActivityIndicator color={brand.ink} />
        ) : canReview ? (
          <View className="flex-row" style={{ gap: 6 }}>
            <Pressable onPress={() => setRejecting((v) => !v)} className="h-9 px-3 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory">
              <Text className="text-xs font-semibold" style={{ color: brand.danger }}>{tr("Reject")}</Text>
            </Pressable>
            <Pressable onPress={() => act(() => approve(payment.id), "Payment approved")} className="h-9 px-3.5 rounded-lg bg-lime flex-row items-center active:bg-lime-dark">
              <Ionicons name="checkmark" size={15} color={brand.ink} />
              <Text className="text-ink text-xs font-semibold ml-1">{tr("Received, approve")}</Text>
            </Pressable>
          </View>
        ) : (
          <Text className="text-ink/40 text-xs">{tr("Your own payment. Someone else checks it.")}</Text>
        )}
      </View>
      {rejecting && (
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="flex-1 bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[44px] justify-center">
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={255}
              autoFocus
              placeholder={tr("Why? e.g. The money did not arrive")}
              placeholderTextColor={brand.inkDisabled}
              className="py-2.5 text-[14px] text-ink"
              style={webNoOutline}
            />
          </View>
          <Pressable
            onPress={() => {
              if (note.trim().length < 3) return Toast.show({ type: "error", text1: tr("Say why it is rejected") });
              act(() => reject(payment.id, note.trim()), "Payment rejected");
            }}
            className="h-11 px-4 rounded-xl bg-ink items-center justify-center active:bg-ink-soft"
          >
            <Text className="text-white text-xs font-semibold">{tr("Reject")}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function WorkerCard({ worker, mine, onView }: { worker: WorkerPayroll; mine: boolean; onView: (url: string) => void }) {
  const record = usePayroll((s) => s.record);
  const removeDebt = usePayroll((s) => s.removeDebt);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const fromSalary = Math.min(worker.owed, worker.salary);

  const pay = async (method: "CASH" | "MOMO" | "SALARY", value: number) => {
    if (!(value > 0)) return Toast.show({ type: "error", text1: tr("Enter how much they gave back") });
    setBusy(method);
    try {
      await record(worker.employeeId, value, method);
      setAmount("");
      Toast.show({
        type: "success",
        text1: tr(method === "SALARY" ? "Taken from the salary" : "Payment recorded"),
        text2: `${worker.name} · ${rwf(value)}`,
      });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not update"), text2: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const drop = async (id: string) => {
    try {
      await removeDebt(id);
      Toast.show({ type: "success", text1: tr("Debt removed") });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not delete"), text2: (error as Error).message });
    }
  };

  return (
    <View className={`bg-white rounded-2xl border border-ink/5 overflow-hidden ${worker.active ? "" : "opacity-60"}`}>
      <Pressable onPress={() => setOpen((v) => !v)} className="flex-row flex-wrap items-center px-4 py-3.5 active:bg-ivory" style={{ gap: 14 }}>
        <View className="flex-1 min-w-[160px]">
          <Text className="text-ink text-[15px] font-semibold">{worker.name}</Text>
          <Text className="text-ink/50 text-xs">
            {tr("Salary")} {rwf(worker.salary)}
            {worker.waiting > 0 ? ` · ${rwf(worker.waiting)} ${tr("waiting for approval")}` : ""}
          </Text>
          <View className="mt-1">
            {worker.salaryPayments.some((p) => p.month === monthKey(new Date())) ? (
              <Pill label={tr("Paid this month")} color={brand.success} bg="#16A34A1A" />
            ) : (
              <Pill label={tr("Not paid this month")} color={brand.ink} bg="#D0E66B" />
            )}
          </View>
        </View>
        <View className="items-end">
          <Text className="text-ink/40 text-[11px]">{tr("Owes")}</Text>
          <Text className="text-[15px] font-semibold" style={{ color: worker.owed ? brand.danger : brand.inkMuted }}>
            {rwf(worker.owed)}
          </Text>
        </View>
        <View className="items-end" style={{ minWidth: 120 }}>
          <Text className="text-ink/40 text-[11px]">{tr("To pay this month")}</Text>
          <Text className="text-[15px] font-semibold" style={{ color: brand.success }}>{rwf(worker.toPay)}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={brand.inkMuted} />
      </Pressable>

      {open && (
        <View className="px-4 pb-4 pt-3 border-t border-ink/5" style={{ gap: 12 }}>
          {!mine && worker.salary > 0 && <SalaryPanel worker={worker} />}
          {worker.owed > 0 && !mine && (
            <View className="bg-ivory rounded-xl p-3" style={{ gap: 10 }}>
              <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
                <Pressable
                  onPress={() => pay("SALARY", fromSalary)}
                  disabled={!fromSalary || !!busy}
                  className={`h-10 px-4 rounded-xl bg-ink flex-row items-center active:bg-ink-soft ${fromSalary ? "" : "opacity-40"}`}
                >
                  {busy === "SALARY" ? <ActivityIndicator size="small" color={brand.lime} /> : <Ionicons name="remove-circle-outline" size={16} color={brand.lime} />}
                  <Text className="text-white text-[13px] font-semibold ml-1.5">
                    {tr("Take")} {rwf(fromSalary)} {tr("from the salary")}
                  </Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
                <Text className="text-ink/60 text-xs">{tr("Or they gave back")}</Text>
                <View style={{ width: 160 }}>
                  <MoneyInput value={amount} placeholder={String(worker.owed)} onChange={setAmount} />
                </View>
                {(["CASH", "MOMO"] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => pay(m, Number(amount || worker.owed))}
                    disabled={!!busy}
                    className="h-10 px-3.5 rounded-xl border border-ink/10 bg-white flex-row items-center active:bg-ivory"
                  >
                    <Ionicons name={debtMethodMeta(m).icon} size={15} color={brand.ink} />
                    <Text className="text-ink text-[13px] font-semibold ml-1.5">{tr(debtMethodMeta(m).label)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View>
            <FieldLabel>{tr("What they owe")}</FieldLabel>
            {worker.debts.length === 0 ? (
              <Text className="text-ink/40 text-[13px]">{tr("Nothing charged.")}</Text>
            ) : (
              worker.debts.map((d) => (
                <View key={d.id} className="flex-row items-center py-2 border-b border-ink/5" style={{ gap: 10 }}>
                  <Ionicons name={debtKindMeta(d.kind).icon} size={16} color={brand.inkMuted} />
                  <View className="flex-1">
                    <Text className="text-ink text-[13px] font-semibold">{tr(debtKindMeta(d.kind).label)}</Text>
                    <Text numberOfLines={2} className="text-ink/50 text-xs">
                      {d.date}
                      {d.note ? ` · ${d.note}` : ""}
                      {d.chargedBy ? ` · ${tr("by")} ${d.chargedBy.name}` : ""}
                    </Text>
                  </View>
                  <Text className="text-[13px] font-semibold" style={{ color: brand.danger }}>{rwf(d.amount)}</Text>
                  {!mine && (
                    <Pressable onPress={() => drop(d.id)} accessibilityLabel={tr("Delete")} hitSlop={6} className="w-8 h-8 items-center justify-center rounded-lg active:bg-ivory">
                      <Ionicons name="trash-outline" size={14} color={brand.inkMuted} />
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>

          {worker.salaryPayments.length > 0 && (
            <View>
              <FieldLabel>{tr("Salaries paid")}</FieldLabel>
              {worker.salaryPayments.map((p) => (
                <View key={p.id} className="flex-row items-center py-2 border-b border-ink/5" style={{ gap: 10 }}>
                  <Text className="text-ink text-[13px] font-semibold" style={{ width: 64 }}>{p.month}</Text>
                  <Text className="flex-1 text-ink/50 text-xs">
                    {p.paidOn} · {tr(SALARY_METHODS.find((m) => m.value === p.method)?.label ?? "")}
                    {p.deducted ? ` · ${rwf(p.deducted)} ${tr("taken off for debts")}` : ""}
                    {p.note ? ` · ${p.note}` : ""}
                  </Text>
                  <Text className="text-ink text-[13px] font-semibold">{rwf(p.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {worker.payments.length > 0 && (
            <View>
              <FieldLabel>{tr("Paid back")}</FieldLabel>
              {worker.payments.map((p) => (
                <View key={p.id} className="flex-row items-center py-2 border-b border-ink/5" style={{ gap: 10 }}>
                  {p.proofUrl ? (
                    <ProofThumb url={p.proofUrl} onOpen={() => onView(p.proofUrl!)} size={32} />
                  ) : (
                    <Ionicons name={debtMethodMeta(p.method).icon} size={16} color={brand.inkMuted} />
                  )}
                  <View className="flex-1">
                    <Text className="text-ink text-[13px]">
                      {tr(debtMethodMeta(p.method).label)} · {p.createdAt.slice(0, 10)}
                    </Text>
                    {(p.reviewNote || p.reviewedBy) && (
                      <Text numberOfLines={2} className="text-xs" style={{ color: p.status === "REJECTED" ? brand.danger : brand.inkMuted }}>
                        {p.reviewedBy ? `${tr(p.status === "REJECTED" ? "Rejected by" : "Approved by")} ${p.reviewedBy.name}` : ""}
                        {p.reviewNote ? `: ${p.reviewNote}` : ""}
                      </Text>
                    )}
                  </View>
                  <Pill {...DEBT_PAYMENT_STATUS[p.status]} />
                  <Text className="text-ink text-[13px] font-semibold">{rwf(p.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// Each worker's salary, what they owe the company, and what is left to pay them.
export default function Payroll() {
  const { workers, loaded, load } = usePayroll();
  const me = useAuth((s) => s.profile?.id);
  const { isOwner } = usePermissions();
  const [charging, setCharging] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    load().catch((error) => Toast.show({ type: "error", text1: tr("Could not load salaries"), text2: (error as Error).message }));
  }, [load]);

  const isMine = (w: WorkerPayroll) => !isOwner && w.userId === me;
  const pending = workers.flatMap((w) => w.payments.filter((p) => p.status === "PENDING").map((p) => ({ worker: w, payment: p })));
  const thisMonth = monthKey(new Date());
  const paidThisMonth = workers.filter((w) => w.salaryPayments.some((p) => p.month === thisMonth));
  const totals = workers.reduce(
    (acc, w) => ({ salaries: acc.salaries + w.salary, owed: acc.owed + w.owed, toPay: acc.toPay + w.toPay }),
    { salaries: 0, owed: 0, toPay: 0 },
  );

  return (
    <ScrollView className="flex-1 bg-ivory w-full" contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16 }}>
      <PageHeader
        eyebrow={tr("Finance")}
        title={tr("Salaries & debts")}
        subtitle={tr("What each worker owes the company comes off their salary. When they pay it back and it is approved, it goes back to their salary.")}
        right={
          <Pressable onPress={() => setCharging(true)} className="flex-row items-center h-10 px-4 rounded-xl bg-lime active:bg-lime-dark">
            <Ionicons name="add" size={18} color={brand.ink} />
            <Text className="text-ink text-sm font-semibold ml-1">{tr("Charge a worker")}</Text>
          </Pressable>
        }
      />

      <View className="flex-row flex-wrap" style={{ gap: 12 }}>
        <Stat label={tr("Salaries a month")} value={rwf(totals.salaries)} />
        <Stat label={tr("Owed by workers")} value={rwf(totals.owed)} color={totals.owed ? brand.danger : undefined} />
        <Stat label={tr("To pay this month")} value={rwf(totals.toPay)} hint={tr("Salaries minus what is owed")} color={brand.success} />
        <Stat
          label={tr("Paid this month")}
          value={`${paidThisMonth.length} / ${workers.filter((w) => w.salary > 0).length}`}
          hint={rwf(paidThisMonth.reduce((sum, w) => sum + (w.salaryPayments.find((p) => p.month === thisMonth)?.amount ?? 0), 0))}
        />
        <Stat label={tr("Waiting for approval")} value={String(pending.length)} />
      </View>

      {pending.length > 0 && (
        <View className="bg-white rounded-2xl border border-lime overflow-hidden">
          <View className="px-4 pt-4 pb-3 border-b border-ink/5">
            <Text className="text-ink text-[15px] font-semibold">{tr("Payments waiting for approval")}</Text>
            <Text className="text-ink/40 text-xs mt-0.5">{tr("Approve only when the money really reached you. Then it goes back to their salary.")}</Text>
          </View>
          {pending.map(({ worker, payment }, i) => (
            <PendingPayment key={payment.id} worker={worker} payment={payment} first={i === 0} canReview={!isMine(worker)} onView={setViewing} />
          ))}
        </View>
      )}

      {!loaded ? (
        <View className="bg-white rounded-2xl border border-ink/5 py-14 items-center">
          <ActivityIndicator color={brand.ink} />
        </View>
      ) : workers.length === 0 ? (
        <View className="bg-white rounded-2xl border border-ink/5">
          <EmptyState icon="people-outline" title={tr("No salaries yet")} hint={tr("Set each worker's monthly salary in Workers.")} />
        </View>
      ) : (
        workers.map((w) => <WorkerCard key={w.employeeId} worker={w} mine={isMine(w)} onView={setViewing} />)
      )}

      <ChargeModal open={charging} workers={workers} onClose={() => setCharging(false)} />
      <ProofViewer url={viewing} onClose={() => setViewing(null)} />
    </ScrollView>
  );
}
