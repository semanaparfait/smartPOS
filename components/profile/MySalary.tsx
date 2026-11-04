// The worker's own salary and what they owe the company. Paying back waits for
// approval; once approved, it no longer comes off the salary.
import { ProofThumb, ProofViewer, pickReceipt, type ReceiptPhoto } from "@/components/finance/receiptKit";
import { FieldLabel, MoneyInput, Pill, webNoOutline } from "@/components/services/servicesKit";
import { DEBT_PAYMENT_STATUS, debtKindMeta, debtMethodMeta } from "@/config/payroll";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import usePayroll, { payLine } from "@/store/Finance/usePayroll";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

const rwf = (amount: number | string) => `${Math.round(Number(amount)).toLocaleString()} RWF`;

function Figure({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View className="flex-1 min-w-[110px] bg-ivory rounded-xl px-3 py-2.5">
      <Text className="text-ink/50 text-[11px]">{label}</Text>
      <Text className="text-[15px] font-semibold mt-0.5" style={{ color: color ?? brand.ink }}>
        {value}
      </Text>
    </View>
  );
}

export default function MySalary() {
  const mine = usePayroll((s) => s.mine);
  const loadMine = usePayroll((s) => s.loadMine);
  const pay = usePayroll((s) => s.pay);
  const withdraw = usePayroll((s) => s.withdraw);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "MOMO">("CASH");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<ReceiptPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    loadMine()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadMine]);

  if (loading) {
    return (
      <View className="rounded-3xl bg-white p-6 items-center">
        <ActivityIndicator color={brand.ink} />
      </View>
    );
  }
  // Owners and accounts without an employee record have no salary here.
  if (!mine) return null;

  const left = Math.max(0, mine.owed - mine.waiting);

  const send = async () => {
    const value = Number(amount);
    if (!(value > 0)) return Toast.show({ type: "error", text1: tr("Enter how much you are paying back") });
    if (value > left) return Toast.show({ type: "error", text1: `${tr("You owe")} ${rwf(left)}` });
    setBusy(true);
    try {
      await pay(value, method, note.trim() || undefined, photo);
      Toast.show({ type: "success", text1: tr("Sent for approval"), text2: rwf(value) });
      setPaying(false);
      setAmount("");
      setNote("");
      setPhoto(null);
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not send the payment"), text2: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const takeBack = async (id: string) => {
    try {
      await withdraw(id);
      Toast.show({ type: "success", text1: tr("Taken back") });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not take it back"), text2: (error as Error).message });
    }
  };

  return (
    <View className="rounded-3xl bg-white p-6" style={{ gap: 14 }}>
      <Text className="text-lg font-bold text-ink">{tr("My salary")}</Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        <Figure label={mine.payType === "PER_DELIVERY" ? tr("Earned this month") : tr("Salary")} value={rwf(mine.salary)} />
        <Figure label={tr("I owe the company")} value={rwf(mine.owed)} color={mine.owed ? brand.danger : undefined} />
        <Figure label={tr("I will receive")} value={rwf(mine.toPay)} color={brand.success} />
      </View>
      {mine.payType === "PER_DELIVERY" ? <Text className="text-ink/50 text-xs">{payLine(mine, rwf)}</Text> : null}
      {mine.owed > 0 && (
        <Text className="text-ink/50 text-xs">
          {tr("What you owe comes off your salary. Pay it back and, once approved, it goes back to your salary.")}
          {mine.waiting > 0 ? ` ${rwf(mine.waiting)} ${tr("is waiting for approval.")}` : ""}
        </Text>
      )}

      {mine.salaryPayments.length > 0 && (
        <View>
          <FieldLabel>{tr("Salaries received")}</FieldLabel>
          {mine.salaryPayments.map((p) => (
            <View key={p.id} className="flex-row items-center py-2 border-b border-ink/5" style={{ gap: 10 }}>
              <Text className="text-ink text-[13px] font-semibold" style={{ width: 64 }}>{p.month}</Text>
              <Text className="flex-1 text-ink/50 text-xs">
                {p.paidOn}
                {p.deducted ? ` · ${rwf(p.deducted)} ${tr("taken off for debts")}` : ""}
              </Text>
              <Text className="text-[13px] font-semibold" style={{ color: brand.success }}>{rwf(p.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {mine.debts.length > 0 && (
        <View>
          <FieldLabel>{tr("Why I owe")}</FieldLabel>
          {mine.debts.map((d) => (
            <View key={d.id} className="flex-row items-center py-2 border-b border-ink/5" style={{ gap: 10 }}>
              <Ionicons name={debtKindMeta(d.kind).icon} size={16} color={brand.inkMuted} />
              <View className="flex-1">
                <Text className="text-ink text-[13px] font-semibold">{tr(debtKindMeta(d.kind).label)}</Text>
                <Text numberOfLines={2} className="text-ink/50 text-xs">
                  {d.date}
                  {d.note ? ` · ${d.note}` : ""}
                </Text>
              </View>
              <Text className="text-[13px] font-semibold" style={{ color: brand.danger }}>{rwf(d.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {mine.payments.length > 0 && (
        <View>
          <FieldLabel>{tr("What I paid back")}</FieldLabel>
          {mine.payments.map((p) => (
            <View key={p.id} className="py-2 border-b border-ink/5" style={{ gap: 4 }}>
              <View className="flex-row items-center" style={{ gap: 10 }}>
                {p.proofUrl ? (
                  <ProofThumb url={p.proofUrl} onOpen={() => setViewing(p.proofUrl)} size={32} />
                ) : (
                  <Ionicons name={debtMethodMeta(p.method).icon} size={16} color={brand.inkMuted} />
                )}
                <Text className="flex-1 text-ink text-[13px]">
                  {tr(debtMethodMeta(p.method).label)} · {p.createdAt.slice(0, 10)}
                </Text>
                <Pill {...DEBT_PAYMENT_STATUS[p.status]} />
                <Text className="text-ink text-[13px] font-semibold">{rwf(p.amount)}</Text>
              </View>
              {p.status === "REJECTED" && !!p.reviewNote && (
                <Text className="text-xs" style={{ color: brand.danger }}>
                  {tr("Why")}: {p.reviewNote}
                </Text>
              )}
              {p.status === "PENDING" && p.method !== "SALARY" && (
                <Pressable onPress={() => takeBack(p.id)} className="self-start h-8 px-3 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory">
                  <Text className="text-ink text-xs font-semibold">{tr("Take back")}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      {left > 0 &&
        (paying ? (
          <View className="border border-ink/10 rounded-2xl p-4" style={{ gap: 12 }}>
            <Text className="text-ink text-[15px] font-semibold">{tr("Pay back")}</Text>
            <View className="flex-row" style={{ gap: 8 }}>
              {(["CASH", "MOMO"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMethod(m)}
                  className={`flex-row items-center px-3.5 h-10 rounded-xl border ${method === m ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
                >
                  <Ionicons name={debtMethodMeta(m).icon} size={15} color={method === m ? brand.lime : brand.inkMuted} />
                  <Text className={`text-[13px] font-semibold ml-1.5 ${method === m ? "text-white" : "text-ink"}`}>{tr(debtMethodMeta(m).label)}</Text>
                </Pressable>
              ))}
            </View>
            <MoneyInput value={amount} placeholder={String(left)} onChange={setAmount} />
            <View className="bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[44px] justify-center">
              <TextInput
                value={note}
                onChangeText={setNote}
                maxLength={1000}
                placeholder={tr("Note (optional), e.g. Gave it to the owner")}
                placeholderTextColor={brand.inkDisabled}
                className="py-2.5 text-[14px] text-ink"
                style={webNoOutline}
              />
            </View>
            {photo ? (
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <Image source={{ uri: photo.uri }} style={{ width: 56, height: 72, borderRadius: 8 }} />
                <Pressable onPress={() => setPhoto(null)}>
                  <Text className="text-ink/60 text-xs font-semibold underline">{tr("Remove")}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={async () => {
                  const picked = await pickReceipt("library");
                  if (picked) setPhoto(picked);
                }}
                className="self-start h-9 px-3 rounded-lg border border-ink/10 flex-row items-center active:bg-ivory"
              >
                <Ionicons name="image-outline" size={15} color={brand.ink} />
                <Text className="text-ink text-xs font-semibold ml-1.5">{tr("Add proof (optional), e.g. MoMo message")}</Text>
              </Pressable>
            )}
            <View className="flex-row" style={{ gap: 8 }}>
              <Pressable onPress={() => setPaying(false)} className="h-11 px-4 rounded-xl border border-ink/10 items-center justify-center active:bg-ivory">
                <Text className="text-ink text-[13px] font-semibold">{tr("Cancel")}</Text>
              </Pressable>
              <Pressable onPress={send} disabled={busy} className="flex-1 h-11 rounded-xl bg-lime items-center justify-center active:bg-lime-dark">
                {busy ? <ActivityIndicator color={brand.ink} /> : <Text className="text-ink text-[13px] font-semibold">{tr("Send for approval")}</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setPaying(true)} className="h-12 rounded-xl bg-ink flex-row items-center justify-center active:bg-ink-soft">
            <Ionicons name="return-up-back-outline" size={17} color={brand.lime} />
            <Text className="text-white text-[14px] font-semibold ml-2">{tr("Pay back what I owe")}</Text>
          </Pressable>
        ))}
      <ProofViewer url={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}
