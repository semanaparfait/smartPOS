import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useAuth from "@/store/Authentication/useAuth";
import useDelivery, { type DeliveryDetails } from "@/store/Delivery/useDelivery";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

type Who = { kind: "later" } | { kind: "rider"; id: string } | { kind: "outside" };

function Label({ children }: { children: string }) {
  return (
    <Text className="text-ink/60 text-[11px] font-semibold uppercase tracking-wider mb-1.5">{children}</Text>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View className="bg-ivory border border-ink/10 rounded-xl px-3.5">
      <TextInput
        placeholderTextColor={brand.inkDisabled}
        className="py-3 text-[15px] text-ink"
        style={webNoOutline}
        {...props}
      />
    </View>
  );
}

function Choice({ label, on, onPress, hint }: { label: string; on: boolean; onPress: () => void; hint?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected: on }}
      className={`min-h-[40px] px-3 py-2 rounded-xl border justify-center ${
        on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
      }`}
    >
      <Text className={`text-[13px] font-semibold ${on ? "text-white" : "text-ink"}`}>{label}</Text>
      {hint ? <Text className={`text-[11px] ${on ? "text-white/60" : "text-ink/40"}`}>{hint}</Text> : null}
    </Pressable>
  );
}

// Who the order goes to, where, who takes it, and when the customer pays.
// The fee comes from the owner's settings.
export default function DeliveryDetailsModal({
  visible,
  itemsTotal,
  busy,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  itemsTotal: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (details: DeliveryDetails) => void;
}) {
  const company = useAuth((s) => s.profile?.company);
  const riders = useDelivery((s) => s.riders);
  const loadRiders = useDelivery((s) => s.loadRiders);
  const areas = company?.deliveryAreas ?? [];
  const flatFee = Number(company?.deliveryFee) || 0;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [payOnDelivery, setPayOnDelivery] = useState(false);
  const [who, setWho] = useState<Who>({ kind: "later" });
  const [outside, setOutside] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!visible) return;
    loadRiders().catch(() => {});
  }, [visible, loadRiders]);

  const fee = areas.length ? (areas.find((a) => a.name === area)?.fee ?? 0) : flatFee;
  const missing = [
    !name.trim() && tr("customer name"),
    !phone.trim() && tr("phone"),
    !address.trim() && tr("address"),
    areas.length > 0 && !area && tr("area"),
    who.kind === "outside" && !outside.trim() && tr("who takes it"),
  ].filter(Boolean) as string[];

  const submit = () => {
    if (missing.length || busy) return;
    onSubmit({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      address: address.trim(),
      area: area ?? undefined,
      payOnDelivery,
      riderId: who.kind === "rider" ? who.id : undefined,
      outsideRider: who.kind === "outside" ? outside.trim() : undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="flex-1 bg-ink/50 items-center justify-center p-4">
          <View className="bg-white rounded-2xl w-full overflow-hidden" style={{ maxWidth: 520, maxHeight: "92%" }}>
            <View className="px-5 pt-5 pb-3 flex-row items-center" style={{ gap: 12 }}>
              <View className="w-10 h-10 rounded-xl bg-lime items-center justify-center">
                <Ionicons name="bicycle-outline" size={20} color={brand.ink} />
              </View>
              <View className="flex-1">
                <Text className="text-ink text-lg font-semibold">{tr("Delivery details")}</Text>
                <Text className="text-ink/50 text-[13px]">{tr("Where it goes and who takes it.")}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 16 }} keyboardShouldPersistTaps="handled">
              <View>
                <Label>{tr("Customer")}</Label>
                <View style={{ gap: 8 }}>
                  <Field value={name} onChangeText={setName} placeholder={tr("Name")} maxLength={80} autoFocus />
                  <Field value={phone} onChangeText={setPhone} placeholder={tr("Phone, e.g. 0788 123 456")} keyboardType="phone-pad" maxLength={30} />
                  <Field value={address} onChangeText={setAddress} placeholder={tr("Address or landmark")} maxLength={300} />
                </View>
              </View>

              {areas.length > 0 && (
                <View>
                  <Label>{tr("Area")}</Label>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {areas.map((a) => (
                      <Choice
                        key={a.name}
                        label={a.name}
                        hint={`${Number(a.fee).toLocaleString()} RWF`}
                        on={area === a.name}
                        onPress={() => setArea(a.name)}
                      />
                    ))}
                  </View>
                </View>
              )}

              <View>
                <Label>{tr("Who takes it")}</Label>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  <Choice label={tr("Decide later")} on={who.kind === "later"} onPress={() => setWho({ kind: "later" })} />
                  {riders.map((r) => (
                    <Choice
                      key={r.id}
                      label={r.name}
                      on={who.kind === "rider" && who.id === r.id}
                      onPress={() => setWho({ kind: "rider", id: r.id })}
                    />
                  ))}
                  <Choice label={tr("Outside service")} on={who.kind === "outside"} onPress={() => setWho({ kind: "outside" })} />
                </View>
                {who.kind === "outside" && (
                  <View className="mt-2">
                    <Field value={outside} onChangeText={setOutside} placeholder={tr("Name and phone, e.g. Moto – Eric 0788…")} maxLength={100} />
                  </View>
                )}
              </View>

              <View>
                <Label>{tr("Payment")}</Label>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  <Choice label={tr("Pay now")} hint={tr("Before it leaves")} on={!payOnDelivery} onPress={() => setPayOnDelivery(false)} />
                  <Choice label={tr("Pay at the door")} hint={tr("The rider collects it")} on={payOnDelivery} onPress={() => setPayOnDelivery(true)} />
                </View>
              </View>

              <View>
                <Label>{tr("Note (optional)")}</Label>
                <Field value={note} onChangeText={setNote} placeholder={tr("e.g. Call when outside")} maxLength={300} />
              </View>

              <View className="bg-ivory rounded-xl p-3.5" style={{ gap: 6 }}>
                <View className="flex-row justify-between">
                  <Text className="text-ink/60 text-[13px]">{tr("Items")}</Text>
                  <Text className="text-ink text-[13px]">{itemsTotal.toLocaleString()} RWF</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-ink/60 text-[13px]">{tr("Delivery fee")}</Text>
                  <Text className="text-ink text-[13px]">
                    {areas.length && !area ? tr("Choose an area") : `${fee.toLocaleString()} RWF`}
                  </Text>
                </View>
                <View className="flex-row justify-between pt-1.5 border-t border-ink/10">
                  <Text className="text-ink text-[14px] font-semibold">{tr("Total")}</Text>
                  <Text className="text-ink text-[14px] font-semibold">{(itemsTotal + fee).toLocaleString()} RWF</Text>
                </View>
              </View>
            </ScrollView>

            <View className="px-5 pb-5 pt-3 border-t border-ink/5" style={{ gap: 8 }}>
              {missing.length > 0 && (
                <Text className="text-ink/50 text-xs">
                  {tr("Still needed:")} {missing.join(", ")}
                </Text>
              )}
              <View className="flex-row" style={{ gap: 10 }}>
                <Pressable
                  onPress={onClose}
                  className="h-12 px-5 rounded-xl border border-ink/10 items-center justify-center active:bg-ivory"
                >
                  <Text className="text-ink text-sm font-semibold">{tr("Back")}</Text>
                </Pressable>
                <Pressable
                  onPress={submit}
                  disabled={missing.length > 0 || busy}
                  className={`h-12 flex-1 rounded-xl bg-lime items-center justify-center active:bg-lime-dark ${
                    missing.length > 0 ? "opacity-50" : ""
                  }`}
                >
                  {busy ? (
                    <ActivityIndicator color={brand.ink} />
                  ) : (
                    <Text className="text-ink text-sm font-semibold">
                      {payOnDelivery ? tr("Create delivery") : tr("Continue to payment")}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
