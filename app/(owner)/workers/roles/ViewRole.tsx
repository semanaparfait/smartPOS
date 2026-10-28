import { ALL_PERMISSION_KEYS } from "@/config/permissions";
import { brand } from "@/config/theme";
import useEmployee from "@/store/Employee/UseEmploye";
import useRole from "@/store/Employee/useRole";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

// Roles beyond this are behind "Show all", so the panel stays compact.
const COLLAPSED_COUNT = 6;

export default function ViewRole({ onAdd }: { onAdd?: () => void }) {
  const { rolesResponse, getRoles } = useRole();
  const { employeeResponses } = useEmployee();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      await getRoles();
    };
    fetchRoles();
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of employeeResponses) {
      const id = e.role?.id;
      if (id) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [employeeResponses]);

  // Biggest roles first.
  const sorted = useMemo(
    () => [...rolesResponse].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)),
    [rolesResponse, counts],
  );
  const shown = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT);
  const total = employeeResponses.length;

  return (
    <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
      <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-ink/5">
        <View>
          <View className="flex-row items-center">
            <Text className="text-ink text-lg font-extrabold tracking-tight">Roles</Text>
            <View className="ml-2 min-w-[26px] h-[22px] px-2 rounded-full bg-ivory border border-ink/10 items-center justify-center">
              <Text className="text-ink text-[11px] font-extrabold">{rolesResponse.length}</Text>
            </View>
          </View>
          <Text className="text-ink/40 text-[11px] mt-0.5">What each person can do</Text>
        </View>
        {onAdd && (
          <Pressable
            onPress={onAdd}
            accessibilityLabel="Add role"
            className="flex-row items-center h-9 px-3 rounded-xl border border-ink/10 active:bg-ivory"
          >
            <Ionicons name="add" size={16} color={brand.ink} />
            <Text className="text-ink text-xs font-bold ml-1">Add role</Text>
          </Pressable>
        )}
      </View>

      {rolesResponse.length === 0 ? (
        <View className="py-12 items-center px-6">
          <View className="w-12 h-12 rounded-2xl bg-ivory items-center justify-center mb-3">
            <Ionicons name="briefcase-outline" size={22} color={brand.inkDisabled} />
          </View>
          <Text className="text-ink text-sm font-bold">No roles yet</Text>
          <Text className="text-ink/40 text-xs mt-1 text-center">
            Create roles like Cashier or Manager before adding employees.
          </Text>
        </View>
      ) : (
        <View className="px-3 py-2">
          {shown.map((role) => {
            const count = counts.get(role.id) ?? 0;
            const share = total ? count / total : 0;
            return (
              <View key={role.id} className="flex-row items-center px-2 py-2.5 rounded-xl">
                <View className="w-9 h-9 rounded-lg bg-ivory items-center justify-center">
                  <Ionicons name="briefcase-outline" size={16} color={brand.ink} />
                </View>
                <View className="flex-1 ml-3 pr-3">
                  <View className="flex-row items-baseline justify-between">
                    <Text numberOfLines={1} className="flex-1 text-ink text-[13px] font-bold pr-2">
                      {role.name}
                    </Text>
                    <Text className="text-ink/50 text-[11px] font-semibold">
                      {count} {count === 1 ? "person" : "people"}
                    </Text>
                  </View>
                  {role.description ? (
                    <Text numberOfLines={1} className="text-ink/40 text-[11px] mt-0.5">
                      {role.description}
                    </Text>
                  ) : null}
                  <Text className="text-ink/50 text-[11px] mt-0.5">
                    {Array.isArray(role.permissions)
                      ? `${role.permissions.length} of ${ALL_PERMISSION_KEYS.length} permissions`
                      : "Permissions not set"}
                  </Text>
                  <View className="h-1 rounded-full bg-ink/10 overflow-hidden mt-2">
                    <View className="h-full rounded-full bg-ink" style={{ width: `${share * 100}%` }} />
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: "/(owner)/workers/roles/UpdateRole", params: { id: role.id } })
                  }
                  accessibilityLabel={`Edit ${role.name}`}
                  hitSlop={6}
                  className="w-8 h-8 rounded-lg items-center justify-center active:bg-ivory"
                >
                  <Ionicons name="create-outline" size={15} color={brand.inkMuted} />
                </Pressable>
              </View>
            );
          })}

          {sorted.length > COLLAPSED_COUNT && (
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              className="flex-row items-center justify-center py-2.5 mt-1 rounded-xl active:bg-ivory"
            >
              <Text className="text-ink text-xs font-bold">
                {expanded ? "Show less" : `Show all ${sorted.length} roles`}
              </Text>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={13}
                color={brand.ink}
                style={{ marginLeft: 4 }}
              />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
