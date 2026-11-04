import { PageHeader, PrimaryButton } from "@/components/forms/FormKit";
import Question from "@/components/forms/Question";
import { API_URL } from "@/config/api";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useAuth from "@/store/Authentication/useAuth";
import useRole from "@/store/Employee/useRole";
import { getAuthToken } from "@/utils/authToken";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";

type KitchenRole = { id: string; name: string; created: boolean };

// Throws the server's own message.
const saveKitchen = async (enabled: boolean): Promise<{ kitchenRole: KitchenRole | null }> => {
  const token = await getAuthToken();
  if (!token) throw new Error("User not authenticated");
  const response = await fetch(`${API_URL}/api/v1/companies/kitchen-settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enabled }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(message || "Something went wrong");
  }
  return { kitchenRole: data?.kitchenRole ?? null };
};

// One question: does the shop prepare orders in a kitchen? Yes makes a
// "Kitchen staff" role; workers given it sign in straight to the kitchen screen.
export default function KitchenSettings() {
  const router = useRouter();
  const company = useAuth((s) => s.profile?.company);
  const fetchProfile = useAuth((s) => s.fetchProfile);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kitchenRole, setKitchenRole] = useState<KitchenRole | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!company || ready) return;
    setEnabled(!!company.kitchenEnabled);
    setReady(true);
  }, [company, ready]);

  // The kitchen role made earlier, for the "Add kitchen staff" button.
  const saved = !!company?.kitchenEnabled;
  useEffect(() => {
    if (!saved || kitchenRole) return;
    useRole
      .getState()
      .getRoles()
      .then((roles) => {
        const role = roles?.find((r) => r.permissions?.includes("kitchen.prepare"));
        if (role) setKitchenRole({ id: role.id, name: role.name, created: false });
      })
      .catch(() => {});
  }, [saved, kitchenRole]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveKitchen(enabled);
      setKitchenRole(result.kitchenRole);
      await fetchProfile();
      Toast.show({
        type: "success",
        text1: enabled ? tr("Kitchen screen is on") : tr("Kitchen screen is off"),
        text2: result.kitchenRole?.created ? tr("We added the Kitchen staff role. Add your kitchen staff as workers.") : undefined,
      });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not save"), text2: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { icon: "shield-checkmark-outline" as const, text: tr("Saving makes a \"Kitchen staff\" role for you, ready to use.") },
    { icon: "person-add-outline" as const, text: tr("Add each cook in Workers with that role.") },
    { icon: "restaurant-outline" as const, text: tr("Kitchen staff sign in straight to the kitchen screen and see nothing else.") },
    { icon: "pricetag-outline" as const, text: tr("Turn on \"Send to kitchen\" on the products the kitchen prepares.") },
  ];

  return (
    <ScrollView className="flex-1 bg-ivory" contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 16, maxWidth: 820 }}>
      <PageHeader
        eyebrow={tr("Settings")}
        title={tr("Kitchen")}
        subtitle={tr("Prepare orders on a kitchen screen, with your own kitchen staff.")}
        onBack={() => router.back()}
      />

      <Question
        icon="restaurant-outline"
        title={tr("Do you prepare orders in a kitchen?")}
        yes={tr("Kitchen items go to the kitchen screen")}
        no={tr("Orders are served straight from the till")}
        value={enabled}
        onChange={setEnabled}
      >
        {enabled && (
          <View className="bg-ivory rounded-xl p-4" style={{ gap: 12 }}>
            {steps.map((step, i) => (
              <View key={i} className="flex-row items-start" style={{ gap: 10 }}>
                <View className="w-7 h-7 rounded-lg bg-white items-center justify-center">
                  <Ionicons name={step.icon} size={14} color={brand.ink} />
                </View>
                <Text className="flex-1 text-ink/70 text-[13px] leading-5 mt-1">{step.text}</Text>
              </View>
            ))}
            {kitchenRole && saved ? (
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/(owner)/owner/workers/workers", params: { add: "employee", roleId: kitchenRole.id } })
                }
                className="self-start flex-row items-center h-10 px-4 rounded-xl bg-ink active:bg-ink/90"
                style={{ gap: 8 }}
              >
                <Ionicons name="person-add-outline" size={16} color={brand.lime} />
                <Text className="text-white text-[13px] font-semibold">{tr("Add kitchen staff")}</Text>
              </Pressable>
            ) : null}
            <Text className="text-ink/40 text-[11px]">{tr("A tablet can also be set as a kitchen display in Devices.")}</Text>
          </View>
        )}
      </Question>

      <PrimaryButton label={tr("Save")} busyLabel={tr("Saving...")} icon="checkmark-circle-outline" busy={saving} onPress={save} />
    </ScrollView>
  );
}
