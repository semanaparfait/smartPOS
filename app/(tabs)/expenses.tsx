import { DateField, EmptyState } from "@/components/inventory/stockKit";
import { ChoiceChips, PageHeader } from "@/components/forms/FormKit";
import { ProofThumb, ProofViewer, pickReceipt, type ReceiptPhoto } from "@/components/finance/receiptKit";
import { ActionButton, FieldLabel, MoneyInput, Pill, webNoOutline } from "@/components/services/servicesKit";
import { EXPENSE_CATEGORIES, EXPENSE_STATUS, PAID_FROM, categoryMeta, dayKey, paidFromMeta } from "@/config/expenses";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useExpenses, { type ExpenseCategory, type ExpensePaidFrom } from "@/store/Finance/useExpenses";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const rwf = (amount: number | string) => `${Math.round(Number(amount)).toLocaleString()} RWF`;

// A worker records a bill or cost they paid, with a photo of the receipt. It
// waits for the owner (or a manager) to approve it.
export default function SubmitExpense() {
  const mine = useExpenses((s) => s.mine);
  const loadMine = useExpenses((s) => s.loadMine);
  const submit = useExpenses((s) => s.submit);
  const withdraw = useExpenses((s) => s.withdraw);

  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(dayKey(new Date()));
  const [paidFrom, setPaidFrom] = useState<ExpensePaidFrom | "">("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<ReceiptPhoto | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    loadMine()
      .catch((error) => Toast.show({ type: "error", text1: tr("Could not load expenses"), text2: (error as Error).message }))
      .finally(() => setLoading(false));
  }, [loadMine]);

  const pickCategory = (value: ExpenseCategory) => {
    if (!title.trim() || EXPENSE_CATEGORIES.some((c) => tr(c.label) === title)) setTitle(tr(categoryMeta(value).label));
    setCategory(value);
  };

  const takePhoto = async (source: "camera" | "library") => {
    const picked = await pickReceipt(source);
    if (picked) setPhoto(picked);
  };

  const reset = () => {
    setCategory("");
    setTitle("");
    setAmount("");
    setPaidOn(dayKey(new Date()));
    setPaidFrom("");
    setNote("");
    setPhoto(null);
  };

  const send = async () => {
    if (!category || !title.trim() || !(Number(amount) > 0))
      return Toast.show({ type: "error", text1: tr("Enter what it was for, its kind and the amount") });
    if (!paidFrom) return Toast.show({ type: "error", text1: tr("Say where the money came from") });
    if (!photo) return Toast.show({ type: "error", text1: tr("Add a photo of the receipt or bill as proof") });
    setSaving(true);
    try {
      await submit({ title: title.trim(), category, amount: Number(amount), paidOn, paidFrom, note: note.trim() || undefined, photo });
      Toast.show({ type: "success", text1: tr("Sent for approval"), text2: `${title.trim()} · ${rwf(amount)}` });
      reset();
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not send the expense"), text2: (error as Error).message });
    } finally {
      setSaving(false);
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

  const from = paidFrom ? paidFromMeta(paidFrom) : undefined;

  return (
    <SafeAreaView className="flex-1 bg-ivory" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        <PageHeader
          eyebrow={tr("Expenses")}
          title={tr("Submit an expense")}
          subtitle={tr("Paid a bill or bought something for the business? Record it with a photo of the receipt. The owner approves it.")}
        />

        <View className="flex-row flex-wrap items-start" style={{ gap: 16 }}>
          <View className="flex-1 min-w-[320px] bg-white rounded-2xl border border-ink/5 p-5" style={{ gap: 16 }}>
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
                  placeholder={tr("e.g. Electricity token, Gas refill")}
                  placeholderTextColor={brand.inkDisabled}
                  className="py-3 text-[15px] text-ink"
                  style={webNoOutline}
                />
              </View>
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              <View style={{ flexGrow: 1, minWidth: 180 }}>
                <FieldLabel>{tr("Amount paid")}</FieldLabel>
                <MoneyInput value={amount} placeholder="0" onChange={setAmount} />
              </View>
              <View style={{ flexGrow: 1, minWidth: 180 }}>
                <FieldLabel>{tr("Paid on")}</FieldLabel>
                <DateField value={paidOn} placeholder={tr("Date")} onChange={(value) => setPaidOn(value || dayKey(new Date()))} />
              </View>
            </View>
            <View>
              <FieldLabel>{tr("Where the money came from")}</FieldLabel>
              <ChoiceChips options={PAID_FROM} value={paidFrom} onChange={setPaidFrom} />
              {from && <Text className="text-ink/50 text-xs mt-1.5">{tr(from.hint)}</Text>}
            </View>
            <View>
              <FieldLabel>{tr("Receipt photo (required)")}</FieldLabel>
              {photo ? (
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <Image source={{ uri: photo.uri }} style={{ width: 96, height: 128, borderRadius: 12 }} resizeMode="cover" />
                  <View style={{ gap: 8 }}>
                    <Pressable onPress={() => takePhoto(Platform.OS === "web" ? "library" : "camera")} className="h-10 px-4 rounded-xl border border-ink/10 flex-row items-center active:bg-ivory">
                      <Ionicons name="refresh" size={15} color={brand.ink} />
                      <Text className="text-ink text-[13px] font-semibold ml-1.5">{tr("Change photo")}</Text>
                    </Pressable>
                    <Pressable onPress={() => setPhoto(null)} className="h-10 px-4 rounded-xl border border-ink/10 flex-row items-center active:bg-ivory">
                      <Ionicons name="trash-outline" size={15} color={brand.inkMuted} />
                      <Text className="text-ink text-[13px] font-semibold ml-1.5">{tr("Remove")}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                  {Platform.OS !== "web" && (
                    <Pressable onPress={() => takePhoto("camera")} className="h-12 px-4 rounded-xl bg-ink flex-row items-center active:bg-ink-soft">
                      <Ionicons name="camera-outline" size={18} color={brand.lime} />
                      <Text className="text-white text-[13px] font-semibold ml-2">{tr("Take a photo")}</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => takePhoto("library")} className="h-12 px-4 rounded-xl border border-ink/10 bg-white flex-row items-center active:bg-ivory">
                    <Ionicons name="images-outline" size={18} color={brand.ink} />
                    <Text className="text-ink text-[13px] font-semibold ml-2">{tr("Choose a photo")}</Text>
                  </Pressable>
                </View>
              )}
            </View>
            <View className="bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px] justify-center">
              <TextInput
                value={note}
                onChangeText={setNote}
                maxLength={1000}
                placeholder={tr("Note (optional), e.g. Meter number, shop name")}
                placeholderTextColor={brand.inkDisabled}
                className="py-3 text-[15px] text-ink"
                style={webNoOutline}
              />
            </View>
            <View className="flex-row" style={{ gap: 10 }}>
              <ActionButton label={tr("Send for approval")} icon="send-outline" busy={saving} onPress={send} />
            </View>
          </View>

          <View className="flex-1 min-w-[320px] bg-white rounded-2xl border border-ink/5 overflow-hidden">
            <View className="px-5 pt-5 pb-3 border-b border-ink/5">
              <Text className="text-ink text-[15px] font-semibold">{tr("What I sent")}</Text>
            </View>
            {loading ? (
              <View className="py-14 items-center">
                <ActivityIndicator color={brand.ink} />
              </View>
            ) : mine.length === 0 ? (
              <EmptyState icon="receipt-outline" title={tr("Nothing sent yet")} hint={tr("Expenses you send appear here with their answer.")} />
            ) : (
              mine.map((e, i) => (
                <View key={e.id} className={`px-5 py-3 ${i ? "border-t border-ink/5" : ""}`} style={{ gap: 6 }}>
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    {e.proofUrl && <ProofThumb url={e.proofUrl} onOpen={() => setViewing(e.proofUrl)} />}
                    <View className="flex-1">
                      <Text numberOfLines={1} className="text-ink text-[14px] font-semibold">{e.title}</Text>
                      <Text numberOfLines={1} className="text-ink/50 text-xs">
                        {e.startDate} · {tr(paidFromMeta(e.paidFrom)?.label ?? "Other")}
                      </Text>
                    </View>
                    <View className="items-end" style={{ gap: 4 }}>
                      <Text className="text-ink text-[14px] font-semibold">{rwf(e.amount)}</Text>
                      <Pill {...EXPENSE_STATUS[e.status]} />
                    </View>
                  </View>
                  {e.status === "REJECTED" && !!e.reviewNote && (
                    <Text className="text-xs" style={{ color: brand.danger }}>
                      {tr("Why")}: {e.reviewNote}
                      {e.reviewedBy ? ` · ${e.reviewedBy.name}` : ""}
                    </Text>
                  )}
                  {e.status === "APPROVED" && e.reviewedBy && (
                    <Text className="text-ink/50 text-xs">
                      {tr("Approved by")} {e.reviewedBy.name}
                      {e.paidFrom === "OWN_MONEY" ? ` · ${tr("The company owes it back to you")}` : ""}
                    </Text>
                  )}
                  {e.status === "PENDING" && (
                    <Pressable onPress={() => takeBack(e.id)} className="self-start h-8 px-3 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory">
                      <Text className="text-ink text-xs font-semibold">{tr("Take back")}</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
      <ProofViewer url={viewing} onClose={() => setViewing(null)} />
    </SafeAreaView>
  );
}
