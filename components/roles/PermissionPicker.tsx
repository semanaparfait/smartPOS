import {
  ALL_PERMISSION_KEYS,
  PERMISSION_GROUPS,
  permissionLabel,
  ROLE_PRESETS,
  withoutDependents,
  withRequirements,
} from "@/config/permissions";
import { brand } from "@/config/theme";
import usePermissions from "@/store/Authentication/usePermissions";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

function Toggle({ on }: { on: boolean }) {
  return (
    <View className={`w-10 h-6 rounded-full p-0.5 ${on ? "bg-ink" : "bg-ink/15"}`}>
      <View
        className={`w-5 h-5 rounded-full ${on ? "bg-lime" : "bg-white"}`}
        style={{ transform: [{ translateX: on ? 16 : 0 }] }}
      />
    </View>
  );
}

// Where a permission comes from, for one worker compared with their role.
function OriginTag({ on, inRole }: { on: boolean; inRole: boolean }) {
  if (on && inRole)
    return (
      <View className="rounded-full bg-ivory px-1.5 py-0.5">
        <Text className="text-ink/50 text-[10px] font-medium">From role</Text>
      </View>
    );
  if (on)
    return (
      <View className="rounded-full bg-lime px-1.5 py-0.5">
        <Text className="text-ink text-[10px] font-medium">Added</Text>
      </View>
    );
  if (inRole)
    return (
      <View className="rounded-full bg-danger/10 px-1.5 py-0.5">
        <Text className="text-[10px] font-medium" style={{ color: brand.danger }}>
          Removed
        </Text>
      </View>
    );
  return null;
}

// Grouped on/off switches for a role's permissions, with presets.
// Dependencies are kept consistent: enabling "Sell on credit" also enables
// "Take payments"; disabling "Take payments" disables what needs it.
// With `base` (a role's permissions) it edits one worker's access instead: no
// templates, and each permission is tagged from role / added / removed.
// A worker editing roles or access can only change what they have themselves
// (the API refuses the rest); other switches are shown locked.
export default function PermissionPicker({
  value,
  onChange,
  onPreset,
  base,
}: {
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  // Called with the preset name, so the form can fill an empty role name.
  onPreset?: (name: string, description: string) => void;
  base?: Set<string>;
}) {
  const { isOwner, granted } = usePermissions();
  const canGive = (key: string) => isOwner || granted.has(key);

  const toggle = (key: string) => {
    if (!canGive(key)) return;
    onChange(value.has(key) ? withoutDependents(value, key) : withRequirements([...value, key]));
  };

  const setGroup = (allKeys: string[], on: boolean) => {
    const keys = allKeys.filter(canGive);
    let next = new Set(value);
    if (on) next = withRequirements([...next, ...keys]);
    else for (const k of keys) next = withoutDependents(next, k);
    onChange(next);
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Presets + summary */}
      {!base && (
      <View className="bg-white rounded-2xl border border-ink/5 p-4" style={{ gap: 10 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-ink text-[14px] font-semibold">Start from a template</Text>
          <Text className="text-ink/50 text-[12px]">
            {value.size} of {ALL_PERMISSION_KEYS.length} allowed
          </Text>
        </View>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {ROLE_PRESETS.map((p) => (
            <Pressable
              key={p.name}
              onPress={() => {
                onChange(withRequirements(p.permissions.filter(canGive)));
                onPreset?.(p.name, p.description);
              }}
              className="px-3 py-2 rounded-xl border border-ink/10 active:bg-ivory"
            >
              <Text className="text-ink text-[13px] font-medium">{p.name}</Text>
              <Text className="text-ink/40 text-[11px]">{p.description}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => onChange(new Set([...value].filter((k) => !canGive(k))))}
            className="px-3 py-2 rounded-xl border border-ink/10 active:bg-ivory justify-center"
          >
            <Text className="text-ink/60 text-[13px] font-medium">Clear all</Text>
          </Pressable>
        </View>
      </View>
      )}

      {PERMISSION_GROUPS.map((group) => {
        const keys = group.permissions.map((p) => p.key);
        const onCount = keys.filter((k) => value.has(k)).length;
        const allOn = keys.filter(canGive).every((k) => value.has(k));
        return (
          <View key={group.key} className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
            <View className="flex-row items-center px-4 py-3 border-b border-ink/5">
              <View className="w-8 h-8 rounded-lg bg-ivory items-center justify-center">
                <Ionicons name={group.icon} size={16} color={brand.ink} />
              </View>
              <View className="flex-1 ml-2.5">
                <Text className="text-ink text-[14px] font-semibold">{group.title}</Text>
                <Text className="text-ink/40 text-[11px]">
                  {onCount} of {keys.length} allowed
                </Text>
              </View>
              {keys.some(canGive) && (
                <Pressable onPress={() => setGroup(keys, !allOn)} hitSlop={6}>
                  <Text className="text-ink text-[12px] font-semibold underline">{allOn ? "Turn all off" : "Allow all"}</Text>
                </Pressable>
              )}
            </View>

            {group.permissions.map((p, i) => {
              const on = value.has(p.key);
              const locked = !canGive(p.key);
              return (
                <Pressable
                  key={p.key}
                  onPress={() => toggle(p.key)}
                  disabled={locked}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: on, disabled: locked }}
                  accessibilityLabel={p.label}
                  className={`flex-row items-center px-4 py-3 active:bg-ivory ${i ? "border-t border-ink/5" : ""}`}
                >
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center flex-wrap" style={{ gap: 6 }}>
                      <Text className="text-ink text-[13px] font-medium">{p.label}</Text>
                      {base && <OriginTag on={on} inRole={base.has(p.key)} />}
                      {locked && (
                        <View className="flex-row items-center rounded-full bg-ivory px-1.5 py-0.5">
                          <Ionicons name="lock-closed" size={9} color={brand.inkMuted} />
                          <Text className="text-ink/50 text-[10px] font-medium ml-0.5">Not yours to give</Text>
                        </View>
                      )}
                      {p.sensitive && (
                        <View className="rounded-full bg-danger/10 px-1.5 py-0.5">
                          <Text className="text-[10px] font-medium" style={{ color: brand.danger }}>
                            Sensitive
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-ink/50 text-[12px] mt-0.5">{p.description}</Text>
                    {p.requires?.length ? (
                      <Text className="text-ink/30 text-[11px] mt-0.5">
                        Also turns on: {p.requires.map(permissionLabel).join(", ")}
                      </Text>
                    ) : null}
                  </View>
                  <View className={locked ? "opacity-40" : ""}>
                    <Toggle on={on} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
