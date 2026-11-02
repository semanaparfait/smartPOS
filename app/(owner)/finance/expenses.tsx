import { DateField, EmptyState, Tabs } from "@/components/inventory/stockKit";
import { ChoiceChips, PageHeader } from "@/components/forms/FormKit";
import { ActionButton, FieldLabel, MoneyInput, Pill, webNoOutline } from "@/components/services/servicesKit";
import { ProofThumb, ProofViewer } from "@/components/finance/receiptKit";
import ChargeWorker from "@/components/finance/ChargeWorker";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_REPEATS,
  EXPENSE_STATUS,
  categoryMeta,
  counts,
  dayKey,
  isRunning,
  monthlyAmount,
  REPAID_WITH,
  owedBack,
  paidFromMeta,
  repaidLabel,
  repeatMeta,
} from "@/config/expenses";
import useAuth from "@/store/Authentication/useAuth";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import usePermissions from "@/store/Authentication/usePermissions";
import useExpenses, { type Expense, type ExpenseCategory, type ExpenseRepeat } from "@/store/Finance/useExpenses";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

const rwf = (amount: number | string) => `${Math.round(Number(amount)).toLocaleString()} RWF`;
const LISTS = [
  { value: "running", label: "Repeating" },
  { value: "once", label: "One time" },
  { value: "stopped", label: "Stopped" },
  { value: "rejected", label: "Rejected" },
];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-ink/5 p-4" style={{ minWidth: 180 }}>
      <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-[2px]">{label}</Text>
      <Text numberOfLines={1} className="text-ink text-2xl font-semibold mt-1">
        {value}
      </Text>
      {!!hint && <Text className="text-ink/40 text-[11px] mt-0.5">{hint}</Text>}
    </View>
  );
}

// Add or change one expense. `editing` undefined = hidden, null = new.
function ExpenseModal({ editing, onClose }: { editing: Expense | null | undefined; onClose: () => void }) {
  const add = useExpenses((s) => s.add);
  const update = useExpenses((s) => s.update);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [amount, setAmount] = useState("");
  const [repeat, setRepeat] = useState<ExpenseRepeat>("ONCE");
  const [startDate, setStartDate] = useState(dayKey(new Date()));
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing === undefined) return;
    setTitle(editing?.title ?? "");
    setCategory(editing?.category ?? "");
    setAmount(editing ? String(Number(editing.amount)) : "");
    setRepeat(editing?.repeat ?? "ONCE");
    setStartDate(editing?.startDate ?? dayKey(new Date()));
    setEndDate(editing?.endDate ?? "");
    setNote(editing?.note ?? "");
  }, [editing]);

  // Picking a kind fills a title, unless one was typed.
  const pickCategory = (value: ExpenseCategory) => {
    if (!title.trim() || EXPENSE_CATEGORIES.some((c) => tr(c.label) === title)) setTitle(tr(categoryMeta(value).label));
    setCategory(value);
  };

  const save = async () => {
    if (!title.trim() || !category || !(Number(amount) > 0)) {
      Toast.show({ type: "error", text1: tr("Enter what it was for, its kind and the amount") });
      return;
    }
    if (repeat !== "ONCE" && endDate && endDate < startDate) {
      Toast.show({ type: "error", text1: tr("The end date is before the start date") });
      return;
    }
    setSaving(true);
    try {
      const input = {
        title: title.trim(),
        category,
        amount: Number(amount),
        repeat,
        startDate,
        endDate: repeat === "ONCE" ? null : endDate || null,
        note: note.trim() || null,
      };
      if (editing) await update(editing.id, input);
      else await add(input);
      Toast.show({ type: "success", text1: tr(editing ? "Expense saved" : "Expense added"), text2: `${title.trim()} · ${rwf(amount)}` });
      onClose();
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not save the expense"), text2: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const per = repeatMeta(repeat).per;

  return (
    <Modal visible={editing !== undefined} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-ink/50 items-center justify-center p-4">
        <View className="bg-white rounded-2xl w-full overflow-hidden" style={{ maxWidth: 560, maxHeight: "94%" }}>
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-ink/5">
            <Text className="text-ink text-lg font-semibold">{tr(editing ? "Edit expense" : "Add expense")}</Text>
            <Pressable onPress={onClose} accessibilityLabel={tr("Close")} className="w-9 h-9 rounded-lg items-center justify-center active:bg-ivory">
              <Ionicons name="close" size={20} color={brand.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <View>
              <FieldLabel>{tr("Kind")}</FieldLabel>
              <ChoiceChips options={EXPENSE_CATEGORIES} value={category} onChange={pickCategory} />
            </View>
            <View>
              <FieldLabel>{tr("What it was for")}</FieldLabel>
              <View className="bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px] justify-center">
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  maxLength={120}
                  placeholder={tr("e.g. Electricity bill, Shop rent")}
                  placeholderTextColor={brand.inkDisabled}
                  className="py-3 text-[15px] text-ink"
                  style={webNoOutline}
                />
              </View>
            </View>
            <View>
              <FieldLabel>{tr("How often")}</FieldLabel>
              <Tabs options={EXPENSE_REPEATS} value={repeat} onChange={(value) => setRepeat(value as ExpenseRepeat)} />
            </View>
            <View>
              <FieldLabel>{repeat === "ONCE" ? tr("Amount paid") : `${tr("Amount")} ${tr(per)}`}</FieldLabel>
              <MoneyInput value={amount} placeholder="0" onChange={setAmount} />
              {repeat !== "ONCE" && Number(amount) > 0 && (
                <Text className="text-ink/50 text-xs mt-1.5">
                  {tr("About")} {rwf(monthlyAmount({ amount, repeat }))} {tr("per month")}
                </Text>
              )}
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              <View style={{ flexGrow: 1, minWidth: 200 }}>
                <FieldLabel>{repeat === "ONCE" ? tr("Paid on") : tr("Starts")}</FieldLabel>
                <DateField value={startDate} placeholder={tr("Date")} onChange={(value) => setStartDate(value || dayKey(new Date()))} />
              </View>
              {repeat !== "ONCE" && (
                <View style={{ flexGrow: 1, minWidth: 200 }}>
                  <FieldLabel>{tr("Ends (optional)")}</FieldLabel>
                  <DateField value={endDate} placeholder={tr("Still going")} onChange={setEndDate} />
                </View>
              )}
            </View>
            <View className="bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px] justify-center">
              <TextInput
                value={note}
                onChangeText={setNote}
                maxLength={1000}
                placeholder={tr("Note (optional), e.g. Meter number, landlord")}
                placeholderTextColor={brand.inkDisabled}
                className="py-3 text-[15px] text-ink"
                style={webNoOutline}
              />
            </View>
            {repeat !== "ONCE" && (
              <Text className="text-ink/40 text-xs">
                {tr("A repeating cost is spread over the days it covers, so each day's profit carries its share.")}
              </Text>
            )}
          </ScrollView>
          <View className="flex-row px-5 pb-5 pt-3 border-t border-ink/5" style={{ gap: 10 }}>
            <ActionButton label={tr("Cancel")} icon="close" tone="plain" onPress={onClose} />
            <ActionButton label={tr(editing ? "Save changes" : "Add expense")} icon="checkmark" busy={saving} onPress={save} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// A worker's expense with its receipt: approve it, or reject it saying why.
function PendingRow({
  expense,
  canReview,
  first,
  onView,
}: {
  expense: Expense;
  // False when the checker submitted it themselves.
  canReview: boolean;
  first: boolean;
  onView: (url: string) => void;
}) {
  const approve = useExpenses((s) => s.approve);
  const reject = useExpenses((s) => s.reject);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const from = paidFromMeta(expense.paidFrom);

  const act = async (action: () => Promise<Expense>, done: string) => {
    setBusy(true);
    try {
      await action();
      Toast.show({
        type: "success",
        text1: tr(done),
        text2:
          done === "Expense approved" && expense.paidFrom === "OWN_MONEY"
            ? `${tr("Pay back")} ${rwf(expense.amount)} ${tr("to")} ${expense.recordedBy?.name ?? ""}`
            : expense.title,
      });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not update"), text2: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className={`px-4 py-3 ${first ? "" : "border-t border-ink/5"}`} style={{ gap: 8 }}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        {expense.proofUrl ? (
          <ProofThumb url={expense.proofUrl} onOpen={() => onView(expense.proofUrl!)} size={52} />
        ) : (
          <View className="w-[52px] h-[52px] rounded-lg bg-ivory items-center justify-center">
            <Ionicons name={categoryMeta(expense.category).icon} size={20} color={brand.ink} />
          </View>
        )}
        <View className="flex-1">
          <Text numberOfLines={1} className="text-ink text-[14px] font-semibold">{expense.title}</Text>
          <Text numberOfLines={2} className="text-ink/50 text-xs">
            {expense.recordedBy?.name ?? "—"} · {expense.startDate} · {tr(from?.label ?? "Other")}
            {expense.note ? ` · ${expense.note}` : ""}
          </Text>
        </View>
        <Text className="text-ink text-[15px] font-semibold">{rwf(expense.amount)}</Text>
        {busy ? (
          <ActivityIndicator color={brand.ink} />
        ) : canReview ? (
          <View className="flex-row" style={{ gap: 6 }}>
            <Pressable onPress={() => setRejecting((open) => !open)} className="h-9 px-3 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory">
              <Text className="text-xs font-semibold" style={{ color: brand.danger }}>{tr("Reject")}</Text>
            </Pressable>
            <Pressable
              onPress={() => act(() => approve(expense.id), "Expense approved")}
              className="h-9 px-3.5 rounded-lg bg-lime flex-row items-center active:bg-lime-dark"
            >
              <Ionicons name="checkmark" size={15} color={brand.ink} />
              <Text className="text-ink text-xs font-semibold ml-1">{tr("Approve")}</Text>
            </Pressable>
          </View>
        ) : (
          <Text className="text-ink/40 text-xs" style={{ maxWidth: 160 }}>{tr("You sent this. Someone else checks it.")}</Text>
        )}
      </View>
      {expense.paidFrom === "OWN_MONEY" && (
        <Text className="text-ink/60 text-xs">{tr("Paid with their own money: pay it back once approved.")}</Text>
      )}
      {rejecting && (
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="flex-1 bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[44px] justify-center">
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={255}
              autoFocus
              placeholder={tr("Why? e.g. The receipt does not match the amount")}
              placeholderTextColor={brand.inkDisabled}
              className="py-2.5 text-[14px] text-ink"
              style={webNoOutline}
            />
          </View>
          <Pressable
            onPress={() => {
              if (note.trim().length < 3) {
                Toast.show({ type: "error", text1: tr("Say why it is rejected") });
                return;
              }
              act(() => reject(expense.id, note.trim()), "Expense rejected");
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

// What the company spends to run. Workers' salaries come in by themselves.
export default function Expenses() {
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can("expenses.manage");
  const { expenses, salaries, loaded, load, update, remove, markRepaid, markNotRepaid } = useExpenses();
  const [list, setList] = useState("running");
  const [editing, setEditing] = useState<Expense | null | undefined>(undefined);
  const [viewing, setViewing] = useState<string | null>(null);
  const me = useAuth((s) => s.profile?.id);
  const { isOwner } = usePermissions();

  useEffect(() => {
    load().catch((error) =>
      Toast.show({ type: "error", text1: tr("Could not load expenses"), text2: (error as Error).message }),
    );
  }, [load]);

  const today = dayKey(new Date());
  const thisMonth = today.slice(0, 7);
  const approved = expenses.filter(counts);
  const owed = expenses.filter(owedBack);

  const payBack = async (expense: Expense, method: (typeof REPAID_WITH)[number]["value"]) => {
    try {
      await markRepaid(expense.id, method);
      Toast.show({
        type: "success",
        text1: tr("Marked as paid back"),
        text2: `${expense.recordedBy?.name ?? ""} · ${rwf(expense.amount)} · ${tr(repaidLabel(method))}`,
      });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not update"), text2: (error as Error).message });
    }
  };

  const undoPayBack = async (expense: Expense) => {
    try {
      await markNotRepaid(expense.id);
      Toast.show({ type: "success", text1: tr("Back to not paid back"), text2: expense.title });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not update"), text2: (error as Error).message });
    }
  };
  const pending = expenses.filter((e) => e.status === "PENDING");
  const running = approved.filter((e) => isRunning(e, today));
  const shown =
    list === "rejected"
      ? expenses.filter((e) => e.status === "REJECTED")
      : approved.filter((e) =>
          list === "running" ? running.includes(e) : list === "once" ? e.repeat === "ONCE" : e.repeat !== "ONCE" && !running.includes(e),
        );
  const monthlyRunning = running.reduce((sum, e) => sum + monthlyAmount(e), 0);
  const onceThisMonth = approved
    .filter((e) => e.repeat === "ONCE" && e.startDate.startsWith(thisMonth))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const stop = async (expense: Expense) => {
    try {
      await update(expense.id, { endDate: today < expense.startDate ? expense.startDate : today });
      Toast.show({ type: "success", text1: tr("Stopped from today"), text2: expense.title });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not update"), text2: (error as Error).message });
    }
  };

  const drop = async (expense: Expense) => {
    try {
      await remove(expense.id);
      Toast.show({ type: "success", text1: tr("Expense deleted"), text2: expense.title });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not delete"), text2: (error as Error).message });
    }
  };

  return (
    <ScrollView className="flex-1 bg-ivory w-full" contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16 }}>
      <PageHeader
        eyebrow={tr("Finance")}
        title={tr("Expenses")}
        subtitle={tr("Rent, bills and everything the company pays to run. They come off the profit in the Overview.")}
        right={
          canManage && (
            <Pressable onPress={() => setEditing(null)} className="flex-row items-center h-10 px-4 rounded-xl bg-lime active:bg-lime-dark">
              <Ionicons name="add" size={18} color={brand.ink} />
              <Text className="text-ink text-sm font-semibold ml-1">{tr("Add expense")}</Text>
            </Pressable>
          )
        }
      />

      <View className="flex-row flex-wrap" style={{ gap: 12 }}>
        <Stat label={tr("Repeating costs")} value={rwf(monthlyRunning)} hint={`${running.length} · ${tr("per month")}`} />
        <Stat label={tr("Salaries")} value={rwf(salaries.monthly)} hint={`${salaries.workers.length} ${tr("workers")} · ${tr("per month")}`} />
        <Stat label={tr("One-time this month")} value={rwf(onceThisMonth)} />
        <Stat label={tr("Fixed costs a month")} value={rwf(monthlyRunning + salaries.monthly)} hint={tr("What you must earn to break even")} />
      </View>

      {pending.length > 0 && (
        <View className="bg-white rounded-2xl border border-lime overflow-hidden">
          <View className="px-4 pt-4 pb-3 border-b border-ink/5 flex-row items-center justify-between">
            <View>
              <Text className="text-ink text-[15px] font-semibold">
                {tr("Waiting for approval")} · {pending.length}
              </Text>
              <Text className="text-ink/40 text-xs mt-0.5">{tr("Sent by workers with a photo of the receipt. Only approved ones lower the profit.")}</Text>
            </View>
            <Text className="text-ink text-[15px] font-semibold">{rwf(pending.reduce((sum, e) => sum + Number(e.amount), 0))}</Text>
          </View>
          {pending.map((e, i) => (
            <PendingRow
              key={e.id}
              expense={e}
              first={i === 0}
              canReview={canManage && (isOwner || e.recordedBy?.id !== me)}
              onView={setViewing}
            />
          ))}
        </View>
      )}

      {owed.length > 0 && (
        <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
          <View className="px-4 pt-4 pb-3 border-b border-ink/5 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-ink text-[15px] font-semibold">{tr("Owed back to workers")}</Text>
              <Text className="text-ink/40 text-xs mt-0.5">{tr("They paid these with their own money. Tap how you paid them back.")}</Text>
            </View>
            <Text className="text-[15px] font-semibold" style={{ color: brand.danger }}>
              {rwf(owed.reduce((sum, e) => sum + Number(e.amount), 0))}
            </Text>
          </View>
          {owed.map((e, i) => (
            <View key={e.id} className={`flex-row flex-wrap items-center px-4 py-3 ${i ? "border-t border-ink/5" : ""}`} style={{ gap: 12 }}>
              {e.proofUrl && <ProofThumb url={e.proofUrl} onOpen={() => setViewing(e.proofUrl)} size={40} />}
              <View className="flex-1 min-w-[160px]">
                <Text numberOfLines={1} className="text-ink text-[14px] font-semibold">{e.recordedBy?.name ?? "—"}</Text>
                <Text numberOfLines={1} className="text-ink/50 text-xs">
                  {e.title} · {e.startDate}
                </Text>
              </View>
              <Text className="text-ink text-[14px] font-semibold">{rwf(e.amount)}</Text>
              {canManage && (isOwner || e.recordedBy?.id !== me) ? (
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Text className="text-ink/50 text-xs mr-1">{tr("Paid back with")}</Text>
                  {REPAID_WITH.map((m) => (
                    <Pressable
                      key={m.value}
                      onPress={() => payBack(e, m.value)}
                      className="h-9 px-3 rounded-lg bg-ink flex-row items-center active:bg-ink-soft"
                    >
                      <Ionicons name={m.icon} size={14} color={brand.lime} />
                      <Text className="text-white text-xs font-semibold ml-1">{tr(m.label)}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text className="text-ink/40 text-xs">{tr("Someone else marks it paid back.")}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View className="bg-white rounded-2xl border border-ink/5 p-5" style={{ gap: 10 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-ink text-[15px] font-semibold">{tr("Salaries")}</Text>
            <Text className="text-ink/40 text-xs mt-0.5">
              {tr("Counted by themselves from each worker's monthly salary. Change a salary in Workers.")}
            </Text>
          </View>
          <Pressable onPress={() => router.push("/(owner)/workers/workers")} className="h-8 px-3 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory">
            <Text className="text-ink text-xs font-semibold">{tr("Workers")}</Text>
          </Pressable>
        </View>
        {salaries.workers.length === 0 ? (
          <Text className="text-ink/40 text-[13px]">{tr("No worker has a salary set.")}</Text>
        ) : (
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {salaries.workers.map((w) => (
              <View key={w.id} className="bg-ivory rounded-xl px-3 py-2">
                <Text className="text-ink text-[13px] font-semibold">{w.name}</Text>
                <Text className="text-ink/50 text-xs">{rwf(w.salary)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
        <View className="p-4 border-b border-ink/5">
          <Tabs options={LISTS} value={list} onChange={setList} />
        </View>
        {!loaded ? (
          <View className="py-14 items-center">
            <ActivityIndicator color={brand.ink} />
          </View>
        ) : shown.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title={tr("No expenses here")}
            hint={tr(canManage ? "Add rent, electricity, water and other costs to see your real profit." : "Ask the owner to record the company's costs.")}
          />
        ) : (
          shown.map((e, i) => {
            const meta = categoryMeta(e.category);
            return (
              <View key={e.id} className={`flex-row items-center px-4 py-3 ${i ? "border-t border-ink/5" : ""}`} style={{ gap: 12 }}>
                {e.proofUrl ? (
                  <ProofThumb url={e.proofUrl} onOpen={() => setViewing(e.proofUrl)} size={40} />
                ) : (
                  <View className="w-10 h-10 rounded-xl bg-ivory items-center justify-center">
                    <Ionicons name={meta.icon} size={18} color={brand.ink} />
                  </View>
                )}
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-ink text-[14px] font-semibold">{e.title}</Text>
                  <Text numberOfLines={1} className="text-ink/50 text-xs">
                    {tr(meta.label)} ·{" "}
                    {e.repeat === "ONCE"
                      ? `${tr("Paid on")} ${e.startDate}`
                      : `${tr("From")} ${e.startDate}${e.endDate ? ` ${tr("to")} ${e.endDate}` : ""}`}
                    {e.note ? ` · ${e.note}` : ""}
                  </Text>
                  {e.reviewedBy && (
                    <Text numberOfLines={2} className="text-xs" style={{ color: e.status === "REJECTED" ? brand.danger : brand.inkMuted }}>
                      {`${tr("Sent by")} ${e.recordedBy?.name ?? "—"} · ${tr(e.status === "REJECTED" ? "Rejected by" : "Approved by")} ${e.reviewedBy.name}`}
                      {e.status === "REJECTED" && e.reviewNote ? `: ${e.reviewNote}` : ""}
                      {e.status === "APPROVED" && e.paidFrom ? ` · ${tr(paidFromMeta(e.paidFrom)?.label ?? "")}` : ""}
                    </Text>
                  )}
                  {e.status === "APPROVED" && e.paidFrom === "OWN_MONEY" && (
                    <View className="flex-row items-center flex-wrap" style={{ gap: 8 }}>
                      <Text className="text-xs" style={{ color: e.repaidAt ? brand.success : brand.danger }}>
                        {e.repaidAt
                          ? `${tr("Paid back")} ${e.repaidAt.slice(0, 10)} · ${tr(repaidLabel(e.repaidWith))}${e.repaidBy ? ` · ${e.repaidBy.name}` : ""}`
                          : tr("Not paid back yet")}
                      </Text>
                      {e.repaidAt && canManage && (
                        <Pressable onPress={() => undoPayBack(e)} hitSlop={6}>
                          <Text className="text-ink/50 text-xs font-semibold underline">{tr("Undo")}</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
                <View className="items-end">
                  <Text className="text-ink text-[14px] font-semibold">{rwf(e.amount)}</Text>
                  {e.status === "REJECTED" ? (
                    <View className="items-end" style={{ gap: 6 }}>
                      <Pill {...EXPENSE_STATUS.REJECTED} />
                      {(e.paidFrom === "TILL_CASH" || e.paidFrom === "TILL_MOMO") && e.recordedBy && (
                        <ChargeWorker
                          workerName={e.recordedBy.name}
                          charge={{
                            userId: e.recordedBy.id,
                            kind: "EXPENSE",
                            amount: Number(e.amount),
                            date: e.startDate,
                            note: `${e.title}${e.reviewNote ? ` · ${e.reviewNote}` : ""}`,
                            source: `expense:${e.id}`,
                          }}
                        />
                      )}
                    </View>
                  ) : (
                    <Text className="text-ink/40 text-[11px]">{e.repeat === "ONCE" ? tr("once") : tr(repeatMeta(e.repeat).per)}</Text>
                  )}
                </View>
                {canManage && (
                  <View className="flex-row" style={{ gap: 6 }}>
                    <Pressable onPress={() => setEditing(e)} accessibilityLabel={`${tr("Edit")} ${e.title}`} className="w-8 h-8 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory">
                      <Ionicons name="create-outline" size={15} color={brand.ink} />
                    </Pressable>
                    {isRunning(e, today) && (
                      <Pressable onPress={() => stop(e)} className="h-8 px-2.5 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory">
                        <Text className="text-ink text-xs font-semibold">{tr("Stop")}</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => drop(e)} accessibilityLabel={`${tr("Delete")} ${e.title}`} className="w-8 h-8 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory">
                      <Ionicons name="trash-outline" size={15} color={brand.inkMuted} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      <ExpenseModal editing={editing} onClose={() => setEditing(undefined)} />
      <ProofViewer url={viewing} onClose={() => setViewing(null)} />
    </ScrollView>
  );
}
