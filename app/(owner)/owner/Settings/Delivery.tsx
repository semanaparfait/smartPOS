import { Input, Label, PageHeader, PrimaryButton } from "@/components/forms/FormKit";
import Question from "@/components/forms/Question";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import type { DeliveryArea } from "@/store/Authentication/AuthTypes";
import useAuth from "@/store/Authentication/useAuth";
import { isRiderRole } from "@/components/forms/PayFields";
import useDelivery, { type RiderRole } from "@/store/Delivery/useDelivery";
import useRole from "@/store/Employee/useRole";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";

type AreaRow = { name: string; fee: string };
type FeeMode = "one" | "areas";

const digits = (v: string) => v.replace(/[^0-9]/g, "");

// Three questions: do you deliver, do you charge for it, do you have riders.
// Workers can't change the fee on an order.
export default function DeliverySettings() {
  const router = useRouter();
  const company = useAuth((s) => s.profile?.company);
  const fetchProfile = useAuth((s) => s.fetchProfile);
  const saveSettings = useDelivery((s) => s.saveSettings);

  const [enabled, setEnabled] = useState(false);
  const [charge, setCharge] = useState(false);
  const [mode, setMode] = useState<FeeMode>("one");
  const [fee, setFee] = useState("");
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [riders, setRiders] = useState(false);
  const [riderRole, setRiderRole] = useState<RiderRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // The rider role made earlier, for the "Add a rider" button.
  const hasRiders = !!company?.deliveryRiders;
  useEffect(() => {
    if (!hasRiders || riderRole) return;
    useRole
      .getState()
      .getRoles()
      .then((roles) => {
        const role = roles?.find(isRiderRole);
        if (role) setRiderRole({ id: role.id, name: role.name, created: false });
      })
      .catch(() => {});
  }, [hasRiders, riderRole]);

  // Fill the answers once, from what is saved.
  useEffect(() => {
    if (!company || ready) return;
    const saved = company.deliveryAreas ?? [];
    const savedFee = Math.round(Number(company.deliveryFee) || 0);
    setEnabled(!!company.deliveryEnabled);
    setCharge(savedFee > 0 || saved.length > 0);
    setFee(savedFee ? String(savedFee) : "");
    setAreas(saved.map((a) => ({ name: a.name, fee: String(a.fee) })));
    setMode(saved.length ? "areas" : "one");
    setRiders(!!company.deliveryRiders);
    setReady(true);
  }, [company, ready]);

  const save = async () => {
    const list: DeliveryArea[] =
      charge && mode === "areas"
        ? areas.filter((a) => a.name.trim()).map((a) => ({ name: a.name.trim(), fee: Number(a.fee) || 0 }))
        : [];
    const oneFee = charge && mode === "one" ? Number(fee) || 0 : 0;

    if (enabled && charge && mode === "one" && oneFee <= 0) {
      Toast.show({ type: "error", text1: tr("Enter the fee"), text2: tr("Or answer No to charging a fee.") });
      return;
    }
    if (enabled && charge && mode === "areas" && list.length === 0) {
      Toast.show({ type: "error", text1: tr("Add at least one area"), text2: tr("Or use one fee for every delivery.") });
      return;
    }

    setSaving(true);
    try {
      const saved = await saveSettings({ enabled, fee: oneFee, areas: list, riders: enabled && riders });
      setRiderRole(saved.riderRole);
      await fetchProfile();
      Toast.show({
        type: "success",
        text1: enabled ? tr("Delivery is on") : tr("Delivery is off"),
        text2: saved.riderRole?.created
          ? tr("We added the Delivery rider role. Add your riders as workers.")
          : enabled
            ? tr("Workers now see Delivery in the cart.")
            : undefined,
      });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not save"), text2: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const feeOption = (value: FeeMode, label: string) => {
    const on = mode === value;
    return (
      <Pressable
        onPress={() => setMode(value)}
        accessibilityState={{ selected: on }}
        className={`h-10 px-3.5 rounded-xl border justify-center ${on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
      >
        <Text className={`text-[13px] font-semibold ${on ? "text-white" : "text-ink"}`}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <PageHeader
        eyebrow={tr("Settings")}
        title={tr("Delivery")}
        subtitle={tr("Answer a few questions. You can change them any time.")}
        onBack={() => router.back()}
      />

      <Question
        icon="bicycle-outline"
        title={tr("Do you deliver to customers?")}
        yes={tr("Workers can choose Delivery in the cart")}
        no={tr("Only sales in the shop")}
        value={enabled}
        onChange={setEnabled}
      />

      {enabled && (
        <Question
          icon="cash-outline"
          title={tr("Do you charge a delivery fee?")}
          yes={tr("Added to the customer's total")}
          no={tr("Delivery is free")}
          value={charge}
          onChange={setCharge}
        >
          {charge && (
            <View style={{ gap: 12 }}>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {feeOption("one", tr("Same fee everywhere"))}
                {feeOption("areas", tr("A fee per area"))}
              </View>
              {mode === "one" ? (
                <View>
                  <Label>{tr("Fee for every delivery")}</Label>
                  <Input
                    icon="cash-outline"
                    value={fee}
                    onChangeText={(v) => setFee(digits(v))}
                    keyboardType="number-pad"
                    placeholder="1000"
                    suffix="RWF"
                  />
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
              <Text className="text-ink/40 text-[11px]">{tr("Workers can't change the fee on an order.")}</Text>
            </View>
          )}
        </Question>
      )}

      {enabled && (
        <Question
          icon="people-outline"
          title={tr("Do you have your own riders?")}
          yes={tr("Choose who takes each order")}
          no={tr("Workers just mark it delivered")}
          value={riders}
          onChange={setRiders}
        >
          {riders && (
            <View className="bg-ivory rounded-xl p-4" style={{ gap: 12 }}>
              {[
                { icon: "shield-checkmark-outline" as const, text: tr("Saving makes a \"Delivery rider\" role for you, ready to use.") },
                { icon: "person-add-outline" as const, text: tr("Add each rider in Workers with that role, paid monthly or per delivery.") },
                { icon: "phone-portrait-outline" as const, text: tr("Riders sign in like any worker and pick the deliveries nobody has taken.") },
              ].map((step, i) => (
                <View key={i} className="flex-row items-start" style={{ gap: 10 }}>
                  <View className="w-7 h-7 rounded-lg bg-white items-center justify-center">
                    <Ionicons name={step.icon} size={14} color={brand.ink} />
                  </View>
                  <Text className="flex-1 text-ink/70 text-[13px] leading-5 mt-1">{step.text}</Text>
                </View>
              ))}
              {riderRole && company?.deliveryRiders ? (
                <Pressable
                  onPress={() =>
                    router.push({ pathname: "/(owner)/owner/workers/workers", params: { add: "employee", roleId: riderRole.id } })
                  }
                  className="self-start flex-row items-center h-10 px-4 rounded-xl bg-ink active:bg-ink/90"
                  style={{ gap: 8 }}
                >
                  <Ionicons name="person-add-outline" size={16} color={brand.lime} />
                  <Text className="text-white text-[13px] font-semibold">{tr("Add a rider")}</Text>
                </Pressable>
              ) : null}
              <Text className="text-ink/40 text-[11px]">{tr("You can still type the name of an outside rider on an order.")}</Text>
            </View>
          )}
        </Question>
      )}

      <PrimaryButton label={tr("Save")} busyLabel={tr("Saving...")} icon="checkmark-circle-outline" busy={saving} onPress={save} />
    </ScrollView>
  );
}
