import { Input, Label, PageHeader, PrimaryButton, Section } from "@/components/forms/FormKit";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import type { DeliveryArea } from "@/store/Authentication/AuthTypes";
import useAuth from "@/store/Authentication/useAuth";
import useDelivery from "@/store/Delivery/useDelivery";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";

type AreaRow = { name: string; fee: string };
type FeeMode = "one" | "areas";

const digits = (v: string) => v.replace(/[^0-9]/g, "");

// The owner turns delivery on and sets what it costs. Workers can't change the
// fee on an order.
export default function DeliverySettings() {
  const router = useRouter();
  const company = useAuth((s) => s.profile?.company);
  const fetchProfile = useAuth((s) => s.fetchProfile);
  const saveSettings = useDelivery((s) => s.saveSettings);

  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<FeeMode>("one");
  const [fee, setFee] = useState("");
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Fill the form once, from what is saved.
  useEffect(() => {
    if (!company || ready) return;
    const saved = company.deliveryAreas ?? [];
    setEnabled(!!company.deliveryEnabled);
    setFee(String(Math.round(Number(company.deliveryFee) || 0) || ""));
    setAreas(saved.map((a) => ({ name: a.name, fee: String(a.fee) })));
    setMode(saved.length ? "areas" : "one");
    setReady(true);
  }, [company, ready]);

  const save = async () => {
    const list: DeliveryArea[] =
      mode === "areas"
        ? areas
            .filter((a) => a.name.trim())
            .map((a) => ({ name: a.name.trim(), fee: Number(a.fee) || 0 }))
        : [];
    if (enabled && mode === "areas" && list.length === 0) {
      Toast.show({ type: "error", text1: tr("Add at least one area"), text2: tr("Or use one fee for every delivery.") });
      return;
    }
    setSaving(true);
    try {
      await saveSettings({ enabled, fee: mode === "one" ? Number(fee) || 0 : 0, areas: list });
      await fetchProfile();
      Toast.show({
        type: "success",
        text1: enabled ? tr("Delivery is on") : tr("Delivery is off"),
        text2: enabled ? tr("Workers now see Delivery in the cart.") : undefined,
      });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not save"), text2: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const option = (value: FeeMode, title: string, hint: string) => {
    const on = mode === value;
    return (
      <Pressable
        onPress={() => setMode(value)}
        accessibilityState={{ selected: on }}
        className={`flex-1 min-w-[180px] rounded-xl border p-3.5 ${on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
      >
        <Text className={`text-[14px] font-semibold ${on ? "text-white" : "text-ink"}`}>{title}</Text>
        <Text className={`text-xs mt-0.5 ${on ? "text-white/60" : "text-ink/50"}`}>{hint}</Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <PageHeader
        eyebrow={tr("Settings")}
        title={tr("Delivery")}
        subtitle={tr("Turn on delivery and set what customers pay for it.")}
        onBack={() => router.back()}
      />

      <Section icon="bicycle-outline" title={tr("Do you deliver?")} subtitle={tr("When on, workers can choose Delivery in the cart")}>
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          {[
            { value: true, label: tr("Yes, we deliver") },
            { value: false, label: tr("No") },
          ].map((o) => {
            const on = enabled === o.value;
            return (
              <Pressable
                key={o.label}
                onPress={() => setEnabled(o.value)}
                accessibilityState={{ selected: on }}
                className={`h-11 px-4 rounded-xl border justify-center ${on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
              >
                <Text className={`text-[14px] font-semibold ${on ? "text-white" : "text-ink"}`}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {enabled && (
        <Section icon="cash-outline" title={tr("Delivery fee")} subtitle={tr("Added to the customer's total. Workers can't change it.")}>
          <View style={{ gap: 16 }}>
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {option("one", tr("One fee"), tr("The same price for every delivery"))}
              {option("areas", tr("By area"), tr("A price for each area you deliver to"))}
            </View>

            {mode === "one" ? (
              <View>
                <Label>{tr("Fee for every delivery")}</Label>
                <Input
                  icon="cash-outline"
                  value={fee}
                  onChangeText={(v) => setFee(digits(v))}
                  keyboardType="number-pad"
                  placeholder="0"
                  suffix="RWF"
                />
                <Text className="text-ink/40 text-[11px] mt-1.5">{tr("Leave it at 0 for free delivery.")}</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {areas.map((a, i) => (
                  <View key={i} className="flex-row items-center" style={{ gap: 8 }}>
                    <View className="flex-1">
                      <Input
                        icon="location-outline"
                        value={a.name}
                        placeholder={tr("Area, e.g. Remera")}
                        maxLength={60}
                        onChangeText={(name) => setAreas(areas.map((x, j) => (j === i ? { ...x, name } : x)))}
                      />
                    </View>
                    <View className="w-[150px]">
                      <Input
                        value={a.fee}
                        placeholder="0"
                        keyboardType="number-pad"
                        suffix="RWF"
                        onChangeText={(v) => setAreas(areas.map((x, j) => (j === i ? { ...x, fee: digits(v) } : x)))}
                      />
                    </View>
                    <Pressable
                      onPress={() => setAreas(areas.filter((_, j) => j !== i))}
                      accessibilityLabel={`${tr("Remove")} ${a.name}`}
                      className="w-10 h-10 rounded-xl items-center justify-center active:bg-red-50"
                    >
                      <Ionicons name="trash-outline" size={17} color={brand.danger} />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={() => setAreas([...areas, { name: "", fee: "" }])}
                  className="self-start h-10 px-3.5 rounded-xl border border-ink/10 flex-row items-center active:bg-ivory"
                  style={{ gap: 6 }}
                >
                  <Ionicons name="add" size={16} color={brand.ink} />
                  <Text className="text-ink text-[13px] font-semibold">{tr("Add area")}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </Section>
      )}

      {enabled && (
        <Section icon="people-outline" title={tr("Riders")} subtitle={tr("Who takes the orders")}>
          <Text className="text-ink/60 text-[13px] leading-5">
            {tr("Give your riders a role with the \"Deliver orders\" permission (Settings → Roles & Permissions). They will see only their deliveries and can collect money at the door. You can also send an order with an outside service by typing its name.")}
          </Text>
        </Section>
      )}

      <PrimaryButton label={tr("Save delivery settings")} busyLabel={tr("Saving...")} icon="checkmark-circle-outline" busy={saving} onPress={save} />
    </ScrollView>
  );
}
