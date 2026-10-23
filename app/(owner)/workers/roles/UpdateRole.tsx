import {
  Input,
  Label,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Section,
  TextArea,
} from "@/app/components/ownerComponents/FormKit";
import { brand } from "@/config/theme";
import useEmployee from "@/store/Employee/UseEmploye";
import useRole from "@/store/Employee/useRole";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";

interface RoleFormState {
  name: string;
  description: string;
}

const NAME_MAX = 40;

export default function UpdateRole() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const roleId = Array.isArray(id) ? id[0] : id;

  const { getRoles, updateRole } = useRole();
  const { employeeResponses } = useEmployee();

  const [form, setForm] = useState<RoleFormState>({ name: "", description: "" });
  const [original, setOriginal] = useState<RoleFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadRoleDetails = async () => {
      if (!roleId) {
        setLoading(false);
        return;
      }
      try {
        // Use the freshly fetched list, not the store snapshot from this render.
        const roles = (await getRoles()) ?? [];
        const activeRole = roles.find((r) => r.id === roleId);
        if (activeRole) {
          const loaded = {
            name: activeRole.name || "",
            description: activeRole.description || "",
          };
          setForm(loaded);
          setOriginal(loaded);
        }
      } catch (error) {
        console.error("Failed to load role details:", error);
        Toast.show({
          type: "error",
          text1: "Failed to load role details",
          text2: error instanceof Error ? error.message : "An unexpected error occurred.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadRoleDetails();
  }, [roleId]);

  const members = useMemo(
    () => employeeResponses.filter((e) => e.role?.id === roleId),
    [employeeResponses, roleId],
  );

  const isDirty =
    !!original && (form.name !== original.name || form.description !== original.description);

  const handleSave = async () => {
    if (!roleId) return;
    if (!form.name.trim()) {
      Toast.show({ type: "error", text1: "Missing name", text2: "Role name is required." });
      return;
    }
    setIsSaving(true);
    try {
      await updateRole(roleId, {
        name: form.name.trim(),
        description: form.description.trim(),
      });
      Toast.show({ type: "success", text1: "Role updated" });
      router.back();
    } catch (error) {
      console.error("Failed to update role:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update role",
        text2: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!roleId || loading || !original) {
    return (
      <View className="flex-1 justify-center items-center bg-ivory px-6">
        {loading ? (
          <>
            <ActivityIndicator color={brand.ink} />
            <Text className="text-ink/40 text-xs mt-3">Loading role...</Text>
          </>
        ) : (
          <>
            <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center mb-3">
              <Ionicons name="briefcase-outline" size={24} color={brand.inkDisabled} />
            </View>
            <Text className="text-ink text-sm font-bold">Role not found</Text>
            <Text
              onPress={() => router.back()}
              className="text-ink text-xs font-bold underline mt-2"
            >
              Go back
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <PageHeader
        eyebrow="Team · Roles"
        title={`Edit ${original.name}`}
        subtitle="Rename the role or update its description."
        onBack={() => router.back()}
      />

      <View className="flex-row flex-wrap items-start" style={{ gap: 16 }}>
        <View className="flex-1 min-w-[320px]" style={{ gap: 16 }}>
          <Section icon="briefcase-outline" title="Role details">
            <View style={{ gap: 18 }}>
              <View>
                <View className="flex-row justify-between items-end">
                  <Label required>Role name</Label>
                  <Text className="text-ink/30 text-[11px] mb-1.5">
                    {form.name.length}/{NAME_MAX}
                  </Text>
                </View>
                <Input
                  icon="pricetag-outline"
                  value={form.name}
                  maxLength={NAME_MAX}
                  placeholder="e.g. Waiter, Manager"
                  onChangeText={(val) => setForm({ ...form, name: val })}
                />
              </View>
              <View>
                <Label>Description</Label>
                <TextArea
                  value={form.description}
                  placeholder="Describe responsibilities for this role..."
                  onChangeText={(val) => setForm({ ...form, description: val })}
                />
              </View>
            </View>
          </Section>

          <View className="flex-row" style={{ gap: 12 }}>
            <SecondaryButton
              label="Discard"
              icon="arrow-undo-outline"
              disabled={!isDirty || isSaving}
              onPress={() => setForm(original)}
            />
            <PrimaryButton
              label={isDirty ? "Save changes" : "No changes"}
              busyLabel="Saving..."
              icon="checkmark-circle-outline"
              busy={isSaving}
              onPress={handleSave}
            />
          </View>
        </View>

        {/* Who has this role */}
        <View className="w-[300px] max-w-full">
          <Section icon="people-outline" title="People in this role" subtitle={`${members.length} assigned`}>
            {members.length === 0 ? (
              <Text className="text-ink/40 text-xs">Nobody has this role yet.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {members.slice(0, 8).map((m) => (
                  <View key={m.id} className="flex-row items-center">
                    <View className="w-8 h-8 rounded-lg bg-ink items-center justify-center">
                      <Text className="text-lime text-[11px] font-extrabold">
                        {(m.name || "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text numberOfLines={1} className="flex-1 ml-2.5 text-ink text-[13px] font-semibold">
                      {m.name}
                    </Text>
                  </View>
                ))}
                {members.length > 8 && (
                  <Text className="text-ink/40 text-[11px]">+ {members.length - 8} more</Text>
                )}
              </View>
            )}
          </Section>
        </View>
      </View>
    </ScrollView>
  );
}
