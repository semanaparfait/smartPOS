import Pager from "@/app/components/ownerComponents/Pager";
import { brand } from "@/config/theme";
import type { ShiftType } from "@/store/Employee/EmployeeType";
import useEmployee from "@/store/Employee/UseEmploye";
import useRole from "@/store/Employee/useRole";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { thumbUrl, type ImageFile } from "@/utils/imageUrl";
const PAGE_SIZE = 10;
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const SHIFTS: Record<ShiftType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  DAY: { label: "Day", icon: "sunny-outline" },
  EVENING: { label: "Evening", icon: "partly-sunny-outline" },
  NIGHT: { label: "Night", icon: "moon-outline" },
  HYBRID: { label: "Hybrid", icon: "swap-horizontal-outline" },
};

const COLS = {
  employee: { flex: 2.4 },
  phone: { flex: 1.2 },
  role: { flex: 1.1 },
  shift: { flex: 1 },
  salary: { flex: 1.2 },
  joined: { flex: 1 },
  actions: { width: 116 },
};

const initials = (name: string) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function Avatar({ uri, name }: { uri: ImageFile | null; name: string }) {
  const [failed, setFailed] = useState(false);
  if (uri && !failed) {
    return (
      <Image
        source={{ uri: thumbUrl(uri) }}
        style={{ width: 38, height: 38, borderRadius: 12, padding:5 }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View className="w-[38px] h-[38px] rounded-xl bg-ink items-center justify-center">
      <Text className="text-lime text-[13px] font-extrabold">{initials(name)} </Text>
    </View>
  );
}

function HeaderCell({ label, style, align = "left" }: { label: string; style: object; align?: "left" | "right" }) {
  return (
    <Text
      style={[style, { textAlign: align }]}
      className="text-ink/40 text-[10px] font-bold uppercase tracking-widest px-2"
    >
      {label}
    </Text>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      className={`w-8 h-8 rounded-lg items-center justify-center border border-ink/10 ${
        danger ? "active:bg-red-50" : "active:bg-ivory"
      }`}
    >
      <Ionicons name={icon} size={15} color={danger ? brand.danger : brand.ink} />
    </Pressable>
  );
}

export default function ViewUsers({ onAdd }: { onAdd?: () => void }) {
  const { employeeResponses, getEmployees, DeleteEmployee } = useEmployee();
  const { rolesResponse } = useRole();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchEmployees = async () => {
      await getEmployees();
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search, roleFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employeeResponses.filter((e) => {
      if (roleFilter !== "all" && e.role?.id !== roleFilter) return false;
      if (!q) return true;
      return (
        e.name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.phone?.toLowerCase().includes(q)
      );
    });
  }, [employeeResponses, search, roleFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const confirmDelete = (id: string, name: string) => {
    const run = async () => {
      try {
        await DeleteEmployee(id);
      } catch (error) {
        Alert.alert("Could not delete", (error as Error).message);
      }
    };
    const message = `Remove ${name} from your team? This cannot be undone.`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) run();
      return;
    }
    Alert.alert("Delete employee", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  };

  const roleChips = [{ id: "all", name: "All roles" }, ...rolesResponse.map((r) => ({ id: r.id, name: r.name }))];

  return (
    <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
      {/* Toolbar */}
      <View className="px-5 pt-5 pb-4 border-b border-ink/5" style={{ gap: 14 }}>
        <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 12 }}>
          <View className="flex-row items-center">
            <Text className="text-ink text-lg font-extrabold tracking-tight">Employees</Text>
            <View className="ml-2 min-w-[26px] h-[22px] px-2 rounded-full bg-lime items-center justify-center">
              <Text className="text-ink text-[11px] font-extrabold">{filtered.length}</Text>
            </View>
          </View>

          <View className="flex-row items-center" style={{ gap: 8 }}>
            <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3 h-10 w-[260px] max-w-full">
              <Ionicons name="search" size={16} color={brand.inkMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Name, email or phone"
                placeholderTextColor={brand.inkDisabled}
                className="flex-1 ml-2 text-[13px] text-ink"
                style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={16} color={brand.inkDisabled} />
                </Pressable>
              )}
            </View>
            {onAdd && (
              <Pressable
                onPress={onAdd}
                className="flex-row items-center h-10 px-4 rounded-xl bg-lime active:bg-lime-dark"
              >
                <Ionicons name="person-add-outline" size={15} color={brand.ink} />
                <Text className="text-ink text-[13px] font-bold ml-2">Add employee</Text>
              </Pressable>
            )}
          </View>
        </View>

        {rolesResponse.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row" style={{ gap: 8 }}>
              {roleChips.map((chip) => {
                const active = roleFilter === chip.id;
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => setRoleFilter(chip.id)}
                    className={`px-3.5 py-1.5 rounded-full border ${
                      active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${active ? "text-lime" : "text-ink/60"}`}>
                      {chip.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="min-w-[960px] w-full">
          <View className="flex-row items-center bg-ivory px-3 py-3 border-b border-ink/5">
            <HeaderCell label="Employee" style={COLS.employee} />
            <HeaderCell label="Phone" style={COLS.phone} />
            <HeaderCell label="Role" style={COLS.role} />
            <HeaderCell label="Shift" style={COLS.shift} />
            <HeaderCell label="Salary" style={COLS.salary} align="right" />
            <HeaderCell label="Joined" style={COLS.joined} align="right" />
            <HeaderCell label="" style={COLS.actions} />
          </View>

          {visible.length === 0 ? (
            <View className="py-14 items-center">
              <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center mb-3">
                <Ionicons name="people-outline" size={26} color={brand.inkDisabled} />
              </View>
              <Text className="text-ink text-sm font-bold">
                {employeeResponses.length === 0 ? "No employees yet" : "No matching employees"}
              </Text>
              <Text className="text-ink/40 text-xs mt-1">
                {employeeResponses.length === 0
                  ? "Add your first team member to get started."
                  : "Try another search or role."}
              </Text>
            </View>
          ) : (
            visible.map((worker, index) => {
              const shift = SHIFTS[worker.shift as ShiftType];
              return (
                <View
                  key={worker.id}
                  className={`flex-row items-center px-3 py-2.5 ${
                    index === visible.length - 1 ? "" : "border-b border-ink/5"
                  }`}
                >
                  <View style={COLS.employee} className="flex-row items-center px-2">
                    <Avatar uri={worker.profile} name={worker.name} />
                    <View className="ml-3 flex-1">
                      <Text numberOfLines={1} className="text-ink text-[13px] font-bold">
                        {worker.name}
                      </Text>
                      <Text numberOfLines={1} className="text-ink/40 text-[11px] mt-0.5">
                        {worker.email}
                      </Text>
                    </View>
                  </View>

                  <Text style={COLS.phone} numberOfLines={1} className="text-ink/60 text-[12px] px-2">
                    {worker.phone || "—"}
                  </Text>

                  <View style={COLS.role} className="px-2 items-start">
                    <View className="px-2.5 py-1 rounded-md bg-ivory border border-ink/5">
                      <Text numberOfLines={1} className="text-ink/70 text-[11px] font-semibold">
                        {worker.role?.name ?? "No role"}
                      </Text>
                    </View>
                  </View>

                  <View style={COLS.shift} className="px-2 flex-row items-center">
                    {shift ? (
                      <>
                        <Ionicons name={shift.icon} size={14} color={brand.inkMuted} />
                        <Text className="text-ink/60 text-[12px] ml-1.5">{shift.label}</Text>
                      </>
                    ) : (
                      <Text className="text-ink/30 text-xs">—</Text>
                    )}
                  </View>

                  <Text
                    style={[COLS.salary, { fontFamily: MONO }]}
                    className="text-ink text-[12px] font-bold text-right px-2"
                  >
                    {Number(worker.salary || 0).toLocaleString()} RWF
                  </Text>

                  <Text style={COLS.joined} className="text-ink/50 text-[12px] text-right px-2">
                    {new Date(worker.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>

                  <View style={COLS.actions} className="flex-row justify-end" >
                    <View className="flex-row" style={{ gap: 6 }}>
                      <ActionButton
                        icon="eye-outline"
                        label={`View ${worker.name}`}
                        onPress={() =>
                          router.push({ pathname: "/workers/employees/[id]", params: { id: worker.id } })
                        }
                      />
                      <ActionButton
                        icon="create-outline"
                        label={`Edit ${worker.name}`}
                        onPress={() =>
                          router.push({ pathname: "/workers/employees/UpdateEmployee", params: { id: worker.id } })
                        }
                      />
                      <ActionButton
                        icon="trash-outline"
                        label={`Delete ${worker.name}`}
                        danger
                        onPress={() => confirmDelete(worker.id, worker.name)}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {filtered.length > 0 && (
        <View className="px-5 py-3.5 border-t border-ink/5">
          <Pager
            page={safePage}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </View>
      )}
    </View>
  );
}
