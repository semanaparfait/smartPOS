import { PageHeader, SHIFT_OPTIONS, initials } from "@/app/components/ownerComponents/FormKit";
import { brand } from "@/config/theme";
import { isEmployeeActive, type EmployeeResponse } from "@/store/Employee/EmployeeType";
import useEmployee from "@/store/Employee/UseEmploye";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { secureUrl } from "@/utils/imageUrl";
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// Whole months between two dates, for "time with the company".
const tenure = (from: string) => {
  const start = new Date(from);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (months < 1) return "Less than a month";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${years} year${years === 1 ? "" : "s"}${rest ? ` ${rest} mo` : ""}`;
};

function InfoCard({
  icon,
  title,
  rows,
  width,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  rows: { label: string; value?: string | null; mono?: boolean }[];
  width: any;
}) {
  return (
    <View style={{ width }} className="bg-white rounded-2xl border border-ink/5 p-5">
      <View className="flex-row items-center mb-3">
        <View className="w-8 h-8 rounded-lg bg-ivory items-center justify-center">
          <Ionicons name={icon} size={15} color={brand.ink} />
        </View>
        <Text className="text-ink text-[14px] font-extrabold tracking-tight ml-2.5">{title}</Text>
      </View>
      {rows.map((row, i) => (
        <View
          key={row.label}
          className={`flex-row items-start justify-between py-2.5 ${i === 0 ? "" : "border-t border-ink/5"}`}
        >
          <Text className="text-ink/40 text-xs w-[110px]">{row.label}</Text>
          <Text
            selectable
            className="flex-1 text-ink text-[13px] font-semibold text-right"
            style={row.mono ? { fontFamily: MONO, fontSize: 12 } : undefined}
          >
            {row.value || "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function SingleWorker() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const getEmployeeById = useEmployee((s) => s.getEmployeeById);
  const DeleteEmployee = useEmployee((s) => s.DeleteEmployee);
  const setEmployeeActive = useEmployee((s) => s.setEmployeeActive);
  const setEmployeeMultipleDevices = useEmployee((s) => s.setEmployeeMultipleDevices);
  const [switching, setSwitching] = useState(false);
  const [savingDevices, setSavingDevices] = useState(false);
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const employeeId = Array.isArray(id) ? id[0] : id;
  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoFailed, setPhotoFailed] = useState(false);

  // Reloaded whenever the page comes back into view, so changes made on the
  // edit and access pages show up.
  useFocusEffect(
    useCallback(() => {
      if (!employeeId) {
        setLoading(false);
        return;
      }
      let stale = false;
      getEmployeeById(employeeId).then((found) => {
        if (stale) return;
        setEmployee(found);
        setLoading(false);
      });
      return () => {
        stale = true;
      };
    }, [employeeId, getEmployeeById]),
  );

  if (!employeeId || loading || !employee) {
    return (
      <View className="flex-1 justify-center items-center bg-ivory px-6">
        {loading ? (
          <>
            <ActivityIndicator color={brand.ink} />
            <Text className="text-ink/40 text-xs mt-3">Loading profile...</Text>
          </>
        ) : (
          <>
            <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center mb-3">
              <Ionicons name="person-remove-outline" size={24} color={brand.inkDisabled} />
            </View>
            <Text className="text-ink text-sm font-bold">
              {employeeId ? "Employee not found" : "No employee selected"}
            </Text>
            <Text onPress={() => router.back()} className="text-ink text-xs font-bold underline mt-2">
              Go back
            </Text>
          </>
        )}
      </View>
    );
  }

  const shift = SHIFT_OPTIONS.find((s) => s.value === employee.shift);
  const cardWidth = width >= 1300 ? "32.4%" : width >= 900 ? "49.2%" : "100%";

  const handleDelete = () => {
    const run = async () => {
      try {
        await DeleteEmployee(employee.id);
        router.back();
      } catch (error) {
        Alert.alert("Could not delete", (error as Error).message);
      }
    };
    const message = `Remove ${employee.name} from your team? This cannot be undone.`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) run();
      return;
    }
    Alert.alert("Delete employee", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  };

  const active = isEmployeeActive(employee);

  // One tap, no confirmation: it's easy to undo.
  const handleToggleActive = async () => {
    setSwitching(true);
    try {
      setEmployee(await setEmployeeActive(employee.id, !active));
      Toast.show({
        type: "success",
        text1: active ? `${employee.name} deactivated` : `${employee.name} activated`,
        text2: active ? "They're signed out and can't sign in." : "They can sign in again.",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: `Could not ${active ? "deactivate" : "activate"}`,
        text2: (error as Error).message,
      });
    } finally {
      setSwitching(false);
    }
  };

  const first = employee.name.split(" ")[0];
  const multipleDevices = employee.user?.allowMultipleDevices === true;

  // One tap, like activate: switching off signs them out everywhere but their latest device.
  const handleToggleDevices = async () => {
    setSavingDevices(true);
    try {
      setEmployee(await setEmployeeMultipleDevices(employee.id, !multipleDevices));
      Toast.show({
        type: "success",
        text1: multipleDevices ? "One device only" : "Multiple devices allowed",
        text2: multipleDevices
          ? `${first} stays signed in only on the device they used last.`
          : `${first} can now be signed in on several tills.`,
      });
    } catch (error) {
      Toast.show({ type: "error", text1: "Could not change this", text2: (error as Error).message });
    } finally {
      setSavingDevices(false);
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
        title="Employee profile"
        onBack={() => router.back()}
        right={
          <View className="flex-row" style={{ gap: 8 }}>
            {employee.user && (
              <Pressable
                onPress={handleToggleActive}
                disabled={switching}
                className={`flex-row items-center h-10 px-4 rounded-xl bg-white border border-ink/10 active:bg-ivory ${
                  switching ? "opacity-60" : ""
                }`}
              >
                {switching ? (
                  <ActivityIndicator size="small" color={brand.ink} />
                ) : (
                  <Ionicons
                    name={active ? "pause-circle-outline" : "play-circle-outline"}
                    size={16}
                    color={brand.ink}
                  />
                )}
                <Text className="text-ink text-[13px] font-bold ml-2">
                  {active ? "Deactivate" : "Activate"}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleDelete}
              className="flex-row items-center h-10 px-4 rounded-xl bg-white border border-ink/10 active:bg-red-50"
            >
              <Ionicons name="trash-outline" size={15} color={brand.danger} />
              <Text className="text-[13px] font-bold ml-2" style={{ color: brand.danger }}>
                Delete
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({ pathname: "/workers/employees/UpdateEmployee", params: { id: employee.id } })
              }
              className="flex-row items-center h-10 px-4 rounded-xl bg-lime active:bg-lime-dark"
            >
              <Ionicons name="create-outline" size={15} color={brand.ink} />
              <Text className="text-ink text-[13px] font-bold ml-2">Edit</Text>
            </Pressable>
          </View>
        }
      />

      {/* Hero */}
      <View className="bg-ink rounded-3xl p-6 overflow-hidden">
        <View
          className="absolute rounded-full bg-lime/10"
          style={{ width: 260, height: 260, right: -80, top: -120 }}
        />
        <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 20 }}>
          <View className="flex-row items-center flex-1 min-w-[260px]">
            <View className="w-20 h-20 rounded-2xl bg-lime items-center justify-center overflow-hidden">
              {employee.profile && !photoFailed ? (
                <Image
                  source={{ uri: secureUrl(employee.profile) }}
                  style={{ width: 80, height: 80 }}
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <Text className="text-ink text-2xl font-extrabold">{initials(employee.name)}</Text>
              )}
            </View>
            <View className="flex-1 ml-4">
              <Text numberOfLines={1} className="text-white text-2xl font-extrabold tracking-tight">
                {employee.name}
              </Text>
              <Text numberOfLines={1} className="text-white/50 text-[13px] mt-0.5">
                {employee.email}
              </Text>
              <View className="flex-row flex-wrap mt-3" style={{ gap: 6 }}>
                <View className="flex-row items-center bg-lime rounded-full px-2.5 py-1">
                  <Ionicons name="briefcase" size={11} color={brand.ink} />
                  <Text className="text-ink text-[11px] font-extrabold ml-1">
                    {employee.role?.name ?? "No role"}
                  </Text>
                </View>
                {employee.user && (
                  <View
                    className={`flex-row items-center rounded-full px-2.5 py-1 ${
                      active ? "bg-white/10" : "bg-white"
                    }`}
                  >
                    <View
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: active ? brand.success : brand.danger }}
                    />
                    <Text
                      className="text-[11px] font-bold ml-1.5"
                      style={{ color: active ? brand.white : brand.danger }}
                    >
                      {active ? "Active" : "Deactivated"}
                    </Text>
                  </View>
                )}
                {shift && (
                  <View className="flex-row items-center bg-white/10 rounded-full px-2.5 py-1">
                    <Ionicons name={shift.icon} size={11} color={brand.white} />
                    <Text className="text-white text-[11px] font-bold ml-1">{shift.label} shift</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View className="flex-row" style={{ gap: 24 }}>
            <View>
              <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[2px]">
                Monthly salary
              </Text>
              <Text className="text-lime text-2xl font-extrabold tracking-tight mt-1">
                {Number(employee.salary || 0).toLocaleString()}
                <Text className="text-white/50 text-sm font-bold"> RWF</Text>
              </Text>
            </View>
            <View>
              <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[2px]">
                With the team
              </Text>
              <Text className="text-white text-2xl font-extrabold tracking-tight mt-1">
                {tenure(employee.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Worker access */}
      <Pressable
        onPress={() => router.push({ pathname: "/workers/employees/access", params: { id: employee.id } })}
        className="flex-row items-center bg-white rounded-2xl border border-ink/5 p-5 active:bg-ivory"
      >
        <View className="w-10 h-10 rounded-xl bg-lime items-center justify-center">
          <Ionicons name="shield-checkmark-outline" size={18} color={brand.ink} />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-ink text-[14px] font-extrabold tracking-tight">Worker access</Text>
          <Text className="text-ink/50 text-[12px] mt-0.5">
            {(employee.extraPermissions?.length ?? 0) + (employee.removedPermissions?.length ?? 0) === 0
              ? `Same as the ${employee.role?.name ?? "role"} role`
              : `${employee.role?.name ?? "No role"} role · ${employee.extraPermissions?.length ?? 0} added · ${
                  employee.removedPermissions?.length ?? 0
                } removed`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={brand.inkMuted} />
      </Pressable>

      {/* Sign-in on several tills */}
      {employee.user && (
        <Pressable
          onPress={handleToggleDevices}
          disabled={savingDevices}
          accessibilityRole="switch"
          accessibilityState={{ checked: multipleDevices, disabled: savingDevices }}
          className={`flex-row items-center bg-white rounded-2xl border border-ink/5 p-5 active:bg-ivory ${
            savingDevices ? "opacity-60" : ""
          }`}
        >
          <View className="w-10 h-10 rounded-xl bg-ivory items-center justify-center">
            <Ionicons name="phone-portrait-outline" size={18} color={brand.ink} />
          </View>
          <View className="flex-1 ml-3 pr-3">
            <Text className="text-ink text-[14px] font-extrabold tracking-tight">
              Allow sign-in on multiple devices
            </Text>
            <Text className="text-ink/50 text-[12px] mt-0.5">
              {multipleDevices
                ? `${first} can stay signed in on several tills. Turning this off keeps them signed in only on the device they used last.`
                : `Signing in on another till signs ${first} out of the one before.`}
            </Text>
          </View>
          {savingDevices ? (
            <ActivityIndicator size="small" color={brand.ink} />
          ) : (
            <View className={`w-10 h-6 rounded-full p-0.5 ${multipleDevices ? "bg-ink" : "bg-ink/15"}`}>
              <View
                className={`w-5 h-5 rounded-full ${multipleDevices ? "bg-lime" : "bg-white"}`}
                style={{ transform: [{ translateX: multipleDevices ? 16 : 0 }] }}
              />
            </View>
          )}
        </Pressable>
      )}

      {/* Details */}
      <View className="flex-row flex-wrap justify-between" style={{ rowGap: 16 }}>
        <InfoCard
          icon="call-outline"
          title="Contact"
          width={cardWidth}
          rows={[
            { label: "Phone", value: employee.phone },
            { label: "Email", value: employee.email },
          ]}
        />
        <InfoCard
          icon="briefcase-outline"
          title="Role & assignment"
          width={cardWidth}
          rows={[
            { label: "Role", value: employee.role?.name },
            { label: "Responsibility", value: employee.role?.description },
            { label: "Shift", value: shift?.label },
            { label: "Status", value: employee.user ? (active ? "Active" : "Deactivated") : "No login" },
            { label: "Last sign-in", value: employee.user?.lastLoginAt ? formatDate(employee.user.lastLoginAt) : null },
            { label: "Joined", value: formatDate(employee.createdAt) },
            { label: "Last updated", value: formatDate(employee.updatedAt) },
            { label: "Employee ID", value: employee.id, mono: true },
          ]}
        />
        <InfoCard
          icon="business-outline"
          title="Company"
          width={cardWidth}
          rows={[
            { label: "Employer", value: employee.company?.name },
            { label: "Business code", value: employee.company?.code, mono: true },
            { label: "Type", value: employee.company?.type },
            { label: "Location", value: employee.company?.location },
            { label: "Email", value: employee.company?.email },
            { label: "Phone", value: employee.company?.phone_number },
          ]}
        />
      </View>
    </ScrollView>
  );
}
