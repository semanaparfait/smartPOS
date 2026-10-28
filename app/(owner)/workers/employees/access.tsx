import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Section,
} from "@/app/components/ownerComponents/FormKit";
import PermissionPicker from "@/components/roles/PermissionPicker";
import { ALL_PERMISSION_KEYS } from "@/config/permissions";
import { brand } from "@/config/theme";
import type { EmployeeResponse } from "@/store/Employee/EmployeeType";
import useEmployee from "@/store/Employee/UseEmploye";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";

const KNOWN = new Set(ALL_PERMISSION_KEYS);
const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((k) => b.has(k));

// What the role gives. A role without a saved list allows everything; no role, nothing.
const roleAccess = (employee: EmployeeResponse) =>
  new Set(
    !employee.role
      ? []
      : Array.isArray(employee.role.permissions)
        ? employee.role.permissions
        : ALL_PERMISSION_KEYS,
  );

// The worker's final access, as the server worked it out (null = everything).
const finalAccess = (employee: EmployeeResponse, role: Set<string>) => {
  if (employee.permissions === null) return new Set(ALL_PERMISSION_KEYS);
  if (Array.isArray(employee.permissions)) return new Set(employee.permissions);
  // Older backend without `permissions`: role + added − removed.
  const removed = new Set(employee.removedPermissions ?? []);
  return new Set([...role, ...(employee.extraPermissions ?? [])].filter((k) => !removed.has(k)));
};

function Count({ label, value, tone }: { label: string; value: number; tone: "role" | "added" | "removed" }) {
  const dot = tone === "added" ? brand.lime : tone === "removed" ? brand.danger : brand.inkDisabled;
  return (
    <View className="flex-1 min-w-[110px] bg-ivory rounded-xl px-3 py-2.5">
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />
        <Text className="text-ink/50 text-[11px] font-medium ml-1.5">{label}</Text>
      </View>
      <Text className="text-ink text-lg font-bold mt-0.5">{value}</Text>
    </View>
  );
}

export default function WorkerAccess() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const employeeId = Array.isArray(id) ? id[0] : id;
  const getEmployeeById = useEmployee((s) => s.getEmployeeById);
  const setEmployeePermissions = useEmployee((s) => s.setEmployeePermissions);

  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }
    getEmployeeById(employeeId)
      .then((found) => {
        setEmployee(found);
        if (found) setAccess(finalAccess(found, roleAccess(found)));
      })
      .finally(() => setLoading(false));
  }, [employeeId, getEmployeeById]);

  const role = useMemo(() => (employee ? roleAccess(employee) : new Set<string>()), [employee]);
  const saved = useMemo(() => (employee ? finalAccess(employee, role) : new Set<string>()), [employee, role]);

  // The owner edits the final access; what's added and removed is the difference from the role.
  const added = [...access].filter((k) => !role.has(k) && KNOWN.has(k));
  const removed = [...role].filter((k) => !access.has(k) && KNOWN.has(k));
  const fromRole = [...access].filter((k) => role.has(k) && KNOWN.has(k)).length;
  const isDirty = !same(access, saved);

  if (!employeeId || loading || !employee) {
    return (
      <View className="flex-1 justify-center items-center bg-ivory px-6">
        {loading ? (
          <ActivityIndicator color={brand.ink} />
        ) : (
          <>
            <Text className="text-ink text-sm font-bold">Employee not found</Text>
            <Text onPress={() => router.back()} className="text-ink text-xs font-bold underline mt-2">
              Go back
            </Text>
          </>
        )}
      </View>
    );
  }

  const first = employee.name.split(" ")[0];

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await setEmployeePermissions(employee.id, {
        extraPermissions: added,
        removedPermissions: removed,
      });
      setEmployee(updated);
      setAccess(finalAccess(updated, roleAccess(updated)));
      Toast.show({ type: "success", text1: "Access saved", text2: `${first}'s menus update right away.` });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        eyebrow="Team · Employees"
        title="Worker access"
        subtitle={`What ${employee.name} can do. Changes here apply to ${first} only, not the whole role.`}
        onBack={() => router.back()}
      />

      <View className="flex-row flex-wrap items-start" style={{ gap: 16 }}>
        <View className="flex-1 min-w-[320px]" style={{ gap: 16 }}>
          <Section
            icon="shield-checkmark-outline"
            title={employee.role ? `Starts from the ${employee.role.name} role` : "No role"}
            subtitle={
              employee.role
                ? "Turn things on or off to give or take away access for this worker."
                : "Everything turned on here is added for this worker only."
            }
          >
            <View style={{ gap: 12 }}>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                <Count label="From role" value={fromRole} tone="role" />
                <Count label="Added" value={added.length} tone="added" />
                <Count label="Removed" value={removed.length} tone="removed" />
              </View>
              {(added.length > 0 || removed.length > 0) && (
                <Pressable
                  onPress={() => setAccess(new Set(role))}
                  className="self-start flex-row items-center px-3 py-2 rounded-xl border border-ink/10 active:bg-ivory"
                >
                  <Ionicons name="refresh-outline" size={14} color={brand.ink} />
                  <Text className="text-ink text-[12px] font-semibold ml-1.5">Reset to role</Text>
                </Pressable>
              )}
            </View>
          </Section>

          {error && (
            <View className="flex-row items-start bg-white border border-danger/30 rounded-xl px-3 py-2.5">
              <Ionicons name="alert-circle-outline" size={15} color={brand.danger} />
              <Text className="flex-1 text-[12px] ml-2" style={{ color: brand.danger }}>
                {error}
              </Text>
            </View>
          )}

          <PermissionPicker
            value={access}
            base={role}
            onChange={(next) => {
              setAccess(next);
              setError(null);
            }}
          />

          <View className="flex-row" style={{ gap: 12 }}>
            <SecondaryButton
              label="Discard"
              icon="arrow-undo-outline"
              disabled={!isDirty || saving}
              onPress={() => {
                setAccess(saved);
                setError(null);
              }}
            />
            <PrimaryButton
              label={isDirty ? "Save access" : "No changes"}
              busyLabel="Saving..."
              icon="checkmark-circle-outline"
              busy={saving}
              onPress={() => isDirty && handleSave()}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
