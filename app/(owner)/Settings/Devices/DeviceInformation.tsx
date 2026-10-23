import { PageHeader } from "@/app/components/ownerComponents/FormKit";
import { brand } from "@/config/theme";
import type { DeviceListType } from "@/store/Device/DeviceType";
import useDeviceInfo from "@/store/Device/useDeviceInfo";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

type Action = "approve" | "reject" | "enable" | "disable" | "delete";
type DeviceState = "active" | "pending" | "disabled" | "rejected";
type Filter = "all" | DeviceState;

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const STATE_META: Record<
  DeviceState,
  { label: string; icon: keyof typeof Ionicons.glyphMap; pill: string; fg: string }
> = {
  active: { label: "Active", icon: "checkmark-circle", pill: "bg-lime", fg: brand.ink },
  pending: { label: "Pending", icon: "time-outline", pill: "bg-white border border-ink/15", fg: brand.ink },
  disabled: { label: "Disabled", icon: "power-outline", pill: "bg-ivory border border-ink/10", fg: brand.inkMuted },
  rejected: { label: "Rejected", icon: "close-circle-outline", pill: "bg-red-50", fg: brand.danger },
};

const ACTION_COPY: Record<Action, { title: string; verb: string }> = {
  approve: { title: "Approve device", verb: "approve" },
  reject: { title: "Reject device", verb: "reject" },
  enable: { title: "Enable device", verb: "enable" },
  disable: { title: "Disable device", verb: "disable" },
  delete: { title: "Delete device", verb: "delete" },
};

const deviceState = (d: DeviceListType): DeviceState => {
  if (d.registrationStatus === "REGISTERED") return d.enabled === false ? "disabled" : "active";
  if (d.registrationStatus === "REJECTED") return "rejected";
  return "pending";
};

const deviceIcon = (os?: string): keyof typeof Ionicons.glyphMap => {
  const v = (os || "").toLowerCase();
  if (v.includes("tab") || v.includes("ipad")) return "tablet-portrait-outline";
  if (v.includes("android") || v.includes("ios") || v.includes("iphone")) return "phone-portrait-outline";
  if (v.includes("windows") || v.includes("mac") || v.includes("linux") || v.includes("web"))
    return "desktop-outline";
  return "hardware-chip-outline";
};

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

// Alert buttons don't render on web, so confirm there with the browser dialog.
const confirmAction = (title: string, message: string, destructive: boolean) =>
  new Promise<boolean>((resolve) => {
    if (Platform.OS === "web") {
      resolve(window.confirm(`${title}\n\n${message}`));
      return;
    }
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Confirm", style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });

// Segment colours for the summary bar; each segment also has a text label.
const SEGMENT_COLOR: Record<DeviceState, string> = {
  active: brand.ink,
  pending: brand.lime,
  disabled: "rgba(32,40,59,0.25)",
  rejected: brand.danger,
};
const SEGMENT_ORDER: DeviceState[] = ["active", "pending", "disabled", "rejected"];

const SEGMENT_HINT: Record<DeviceState, string> = {
  active: "Approved and selling",
  pending: "Need your approval",
  disabled: "Blocked from selling",
  rejected: "Access denied",
};

// KPI strip: total on the left, one column per status. Each column filters the list.
function StatusSummary({
  total,
  counts,
  filter,
  onFilter,
}: {
  total: number;
  counts: Record<DeviceState, number>;
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
  const { width } = useWindowDimensions();
  const stacked = width < 900;

  return (
    <View
      className={`bg-white rounded-2xl border border-ink/5 overflow-hidden ${stacked ? "" : "flex-row"}`}
    >
      {/* Total */}
      <Pressable
        onPress={() => onFilter("all")}
        accessibilityRole="button"
        accessibilityState={{ selected: filter === "all" }}
        className="bg-ink px-6 py-5 justify-between"
        style={stacked ? undefined : { width: 220 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-white/50 text-[11px] font-bold uppercase tracking-[2px]">
            All devices
          </Text>
          <View className="w-8 h-8 rounded-lg bg-lime items-center justify-center">
            <Ionicons name="hardware-chip" size={15} color={brand.ink} />
          </View>
        </View>
        <Text className="text-lime text-[40px] font-extrabold tracking-tight mt-3">{total}</Text>
        <View className="flex-row items-center mt-1">
          {filter === "all" ? (
            <>
              <View className="w-1.5 h-1.5 rounded-full bg-lime mr-1.5" />
              <Text className="text-white/60 text-xs">Showing all</Text>
            </>
          ) : (
            <Text className="text-white/60 text-xs underline">Show all</Text>
          )}
        </View>
      </Pressable>

      {/* Per status */}
      <View className="flex-1 flex-row flex-wrap">
        {SEGMENT_ORDER.map((s, i) => {
          const count = counts[s];
          const pct = total ? Math.round((count / total) * 100) : 0;
          const selected = filter === s;
          const needsAction = s === "pending" && count > 0;
          return (
            <Pressable
              key={s}
              onPress={() => onFilter(selected ? "all" : s)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${STATE_META[s].label}: ${count} of ${total}`}
              className={`px-5 py-5 ${selected ? "bg-ivory" : "active:bg-ivory"} ${
                i > 0 && !stacked ? "border-l border-ink/5" : ""
              } ${stacked && i >= 2 ? "border-t border-ink/5" : ""} ${stacked && i % 2 === 1 ? "border-l border-ink/5" : ""}`}
              style={{ width: stacked ? "50%" : "25%" }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full" style={{ backgroundColor: SEGMENT_COLOR[s] }} />
                  <Text className="text-ink/60 text-[13px] font-semibold ml-2">{STATE_META[s].label}</Text>
                </View>
                {needsAction ? (
                  <View className="bg-lime rounded-full px-2 py-0.5">
                    <Text className="text-ink text-[10px] font-extrabold">Review</Text>
                  </View>
                ) : selected ? (
                  <Ionicons name="funnel" size={12} color={brand.ink} />
                ) : null}
              </View>

              <View className="flex-row items-baseline mt-3">
                <Text className="text-ink text-[30px] font-extrabold tracking-tight">{count}</Text>
                <Text className="text-ink/40 text-xs font-semibold ml-2">{pct}%</Text>
              </View>
              <Text numberOfLines={1} className="text-ink/40 text-[11px] mt-0.5">
                {SEGMENT_HINT[s]}
              </Text>

              <View className="h-1 rounded-full bg-ink/5 overflow-hidden mt-3">
                <View
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: SEGMENT_COLOR[s] }}
                />
              </View>

              {selected && <View className="absolute left-0 right-0 bottom-0 h-0.5 bg-ink" />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StatusPill({ state }: { state: DeviceState }) {
  const meta = STATE_META[state];
  return (
    <View className={`flex-row items-center self-start px-2.5 py-1 rounded-full ${meta.pill}`}>
      <Ionicons name={meta.icon} size={12} color={meta.fg} />
      <Text className="text-[11px] font-extrabold ml-1" style={{ color: meta.fg }}>
        {meta.label}
      </Text>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  disabled,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      className={`w-8 h-8 rounded-lg items-center justify-center border border-ink/10 ${
        disabled ? "opacity-40" : danger ? "active:bg-red-50" : "active:bg-ivory"
      }`}
    >
      <Ionicons name={icon} size={15} color={danger ? brand.danger : brand.ink} />
    </Pressable>
  );
}

function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <View className="flex-row items-start justify-between py-2.5 border-t border-ink/5">
      <Text className="text-ink/40 text-xs w-[100px]">{label}</Text>
      <Text
        selectable
        className="flex-1 text-ink text-[13px] font-semibold text-right"
        style={mono ? { fontFamily: MONO, fontSize: 11 } : undefined}
      >
        {value || "—"}
      </Text>
    </View>
  );
}

export default function DeviceInformation() {
  const { getDevices, deviceListType, updateRegistration, setDeviceEnabled, deleteDevice } =
    useDeviceInfo();
  const { width } = useWindowDimensions();

  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await getDevices();
    setRefreshing(false);
    setLoaded(true);
  };

  useEffect(() => {
    refresh();
  }, []);

  const devices = deviceListType ?? [];
  const activeDevice = devices.find((d) => d.id === activeDeviceId) ?? null;

  const counts = useMemo(() => {
    const c = { active: 0, pending: 0, disabled: 0, rejected: 0 };
    for (const d of devices) c[deviceState(d)] += 1;
    return c;
  }, [devices]);

  const pending = devices.filter((d) => deviceState(d) === "pending");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      if (filter !== "all" && deviceState(d) !== filter) return false;
      if (!q) return true;
      return (
        d.deviceName?.toLowerCase().includes(q) ||
        d.deviceOs?.toLowerCase().includes(q) ||
        d.deviceId?.toLowerCase().includes(q)
      );
    });
  }, [devices, filter, search]);

  const runDeviceAction = async (device: DeviceListType, action: Action) => {
    if (busyDeviceId) return;
    const copy = ACTION_COPY[action];
    const confirmed = await confirmAction(
      copy.title,
      `Are you sure you want to ${copy.verb} "${device.deviceName}"?`,
      action === "delete" || action === "reject",
    );
    if (!confirmed) return;

    setBusyDeviceId(device.id);
    let success = false;
    if (action === "approve" || action === "reject") {
      success = await updateRegistration(device.deviceId, action === "approve" ? "REGISTERED" : "REJECTED");
    } else if (action === "enable" || action === "disable") {
      success = await setDeviceEnabled(device.deviceId, action === "enable");
    } else {
      success = await deleteDevice(device.deviceId);
    }

    if (success) {
      await getDevices();
      if (action === "delete") setActiveDeviceId(null);
    } else {
      Alert.alert("Action failed", `Unable to ${copy.verb} this device.`);
    }
    setBusyDeviceId(null);
  };

  const showSidePanel = !!activeDevice && width >= 1100;

  const detailPanel = activeDevice && (
    <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
      <View className="bg-ink p-5">
        <View className="flex-row items-start justify-between">
          <View className="w-12 h-12 rounded-xl bg-lime items-center justify-center">
            <Ionicons name={deviceIcon(activeDevice.deviceOs)} size={22} color={brand.ink} />
          </View>
          <Pressable
            onPress={() => setActiveDeviceId(null)}
            accessibilityLabel="Close details"
            className="w-8 h-8 rounded-lg items-center justify-center active:bg-white/10"
          >
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>
        <Text numberOfLines={1} className="text-white text-lg font-extrabold tracking-tight mt-3">
          {activeDevice.deviceName}
        </Text>
        <Text numberOfLines={1} className="text-white/50 text-xs mt-0.5">
          {activeDevice.deviceOs || "Unknown OS"}
        </Text>
        <View className="mt-3">
          <StatusPill state={deviceState(activeDevice)} />
        </View>
      </View>

      <View className="px-5 pt-2 pb-1">
        <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px] mt-3 mb-1">
          Device
        </Text>
        <DetailRow label="Device ID" value={activeDevice.deviceId} mono />
        <DetailRow label="Added" value={formatDate(activeDevice.createdAt)} />
        <DetailRow label="Last change" value={formatDate(activeDevice.updatedAt)} />

        <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px] mt-4 mb-1">
          Company
        </Text>
        <DetailRow label="Name" value={activeDevice.company?.name} />
        <DetailRow label="Code" value={activeDevice.company?.code} mono />
        <DetailRow label="Location" value={activeDevice.company?.location} />
      </View>

      <View className="p-5" style={{ gap: 10 }}>
        {deviceState(activeDevice) === "pending" || deviceState(activeDevice) === "rejected" ? (
          <View className="flex-row" style={{ gap: 10 }}>
            <Pressable
              onPress={() => runDeviceAction(activeDevice, "approve")}
              disabled={busyDeviceId === activeDevice.id}
              className="flex-1 flex-row items-center justify-center h-11 rounded-xl bg-lime active:bg-lime-dark"
            >
              <Ionicons name="checkmark" size={16} color={brand.ink} />
              <Text className="text-ink text-[13px] font-bold ml-1.5">Approve</Text>
            </Pressable>
            {deviceState(activeDevice) === "pending" && (
              <Pressable
                onPress={() => runDeviceAction(activeDevice, "reject")}
                disabled={busyDeviceId === activeDevice.id}
                className="flex-1 flex-row items-center justify-center h-11 rounded-xl border border-ink/10 active:bg-red-50"
              >
                <Ionicons name="close" size={16} color={brand.danger} />
                <Text className="text-[13px] font-bold ml-1.5" style={{ color: brand.danger }}>
                  Reject
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable
            onPress={() =>
              runDeviceAction(activeDevice, activeDevice.enabled === false ? "enable" : "disable")
            }
            disabled={busyDeviceId === activeDevice.id}
            className={`flex-row items-center justify-center h-11 rounded-xl ${
              activeDevice.enabled === false ? "bg-lime active:bg-lime-dark" : "bg-ink active:bg-ink-soft"
            }`}
          >
            <Ionicons
              name="power"
              size={16}
              color={activeDevice.enabled === false ? brand.ink : brand.lime}
            />
            <Text
              className={`text-[13px] font-bold ml-1.5 ${activeDevice.enabled === false ? "text-ink" : "text-white"}`}
            >
              {activeDevice.enabled === false ? "Enable device" : "Disable device"}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => runDeviceAction(activeDevice, "delete")}
          disabled={busyDeviceId === activeDevice.id}
          className="flex-row items-center justify-center h-11 rounded-xl border border-ink/10 active:bg-red-50"
        >
          <Ionicons name="trash-outline" size={15} color={brand.danger} />
          <Text className="text-[13px] font-bold ml-1.5" style={{ color: brand.danger }}>
            Delete device
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        eyebrow="Settings"
        title="Devices"
        subtitle="Approve new POS terminals and control which ones can sell."
        right={
          <Pressable
            onPress={refresh}
            disabled={refreshing}
            className="flex-row items-center h-10 px-4 rounded-xl bg-white border border-ink/10 active:bg-ivory"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={brand.ink} />
            ) : (
              <Ionicons name="refresh" size={15} color={brand.ink} />
            )}
            <Text className="text-ink text-[13px] font-bold ml-2">Refresh</Text>
          </Pressable>
        }
      />

      <StatusSummary total={devices.length} counts={counts} filter={filter} onFilter={setFilter} />

      {/* Needs approval */}
      {pending.length > 0 && (
        <View className="bg-ink rounded-2xl p-5" style={{ gap: 14 }}>
          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-xl bg-lime items-center justify-center">
              <Ionicons name="notifications" size={17} color={brand.ink} />
            </View>
            <View className="ml-3">
              <Text className="text-white text-[15px] font-extrabold">
                {pending.length} device{pending.length === 1 ? "" : "s"} waiting for approval
              </Text>
              <Text className="text-white/50 text-xs">
                Approve only terminals you recognise.
              </Text>
            </View>
          </View>
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {pending.map((device) => (
              <View
                key={device.id}
                className="flex-row items-center bg-white/5 border border-white/10 rounded-xl pl-3 pr-2 py-2 min-w-[300px] flex-1"
              >
                <Ionicons name={deviceIcon(device.deviceOs)} size={20} color={brand.lime} />
                <View className="flex-1 ml-3 pr-2">
                  <Text numberOfLines={1} className="text-white text-[13px] font-bold">
                    {device.deviceName}
                  </Text>
                  <Text numberOfLines={1} className="text-white/40 text-[11px]">
                    {device.deviceOs} · {formatDate(device.createdAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => runDeviceAction(device, "reject")}
                  disabled={busyDeviceId === device.id}
                  accessibilityLabel={`Reject ${device.deviceName}`}
                  className="w-9 h-9 rounded-lg items-center justify-center active:bg-white/10 mr-1"
                >
                  <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
                </Pressable>
                <Pressable
                  onPress={() => runDeviceAction(device, "approve")}
                  disabled={busyDeviceId === device.id}
                  className="flex-row items-center h-9 px-3 rounded-lg bg-lime active:bg-lime-dark"
                >
                  {busyDeviceId === device.id ? (
                    <ActivityIndicator size="small" color={brand.ink} />
                  ) : (
                    <Ionicons name="checkmark" size={15} color={brand.ink} />
                  )}
                  <Text className="text-ink text-xs font-bold ml-1">Approve</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className={showSidePanel ? "flex-row items-start" : ""} style={{ gap: 16 }}>
        {/* Device list */}
        <View className="flex-1 min-w-0 bg-white rounded-2xl border border-ink/5 overflow-hidden">
          <View className="px-5 pt-5 pb-4 border-b border-ink/5" style={{ gap: 14 }}>
            <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 12 }}>
              <Text className="text-ink text-lg font-extrabold tracking-tight">
                {filter === "all" ? "All devices" : `${STATE_META[filter].label} devices`}
              </Text>
              <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3 h-10 w-[260px] max-w-full">
                <Ionicons name="search" size={16} color={brand.inkMuted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Name, OS or device ID"
                  placeholderTextColor={brand.inkDisabled}
                  className="flex-1 ml-2 text-[13px] text-ink"
                  style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined}
                />
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="min-w-[760px] w-full">
              <View className="flex-row items-center bg-ivory px-5 py-3 border-b border-ink/5">
                <Text className="flex-[2.2] text-ink/40 text-[10px] font-bold uppercase tracking-widest">
                  Device
                </Text>
                <Text className="flex-[1.4] text-ink/40 text-[10px] font-bold uppercase tracking-widest">
                  Operating system
                </Text>
                <Text className="flex-1 text-ink/40 text-[10px] font-bold uppercase tracking-widest">
                  Added
                </Text>
                <Text className="w-[110px] text-ink/40 text-[10px] font-bold uppercase tracking-widest">
                  Status
                </Text>
                <View className="w-[116px]" />
              </View>

              {!loaded ? (
                <View className="py-14 items-center">
                  <ActivityIndicator color={brand.ink} />
                </View>
              ) : filtered.length === 0 ? (
                <View className="py-14 items-center">
                  <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center mb-3">
                    <Ionicons name="hardware-chip-outline" size={24} color={brand.inkDisabled} />
                  </View>
                  <Text className="text-ink text-sm font-bold">
                    {devices.length === 0 ? "No devices yet" : "No matching devices"}
                  </Text>
                  <Text className="text-ink/40 text-xs mt-1">
                    {devices.length === 0
                      ? "Devices appear here after they are activated with your company code."
                      : "Try another filter or search."}
                  </Text>
                </View>
              ) : (
                filtered.map((device, index) => {
                  const state = deviceState(device);
                  const selected = activeDeviceId === device.id;
                  const busy = busyDeviceId === device.id;
                  return (
                    <Pressable
                      key={device.id}
                      onPress={() => setActiveDeviceId(selected ? null : device.id)}
                      className={`flex-row items-center px-5 py-3 ${
                        index === filtered.length - 1 ? "" : "border-b border-ink/5"
                      } ${selected ? "bg-lime/15" : "active:bg-ivory"}`}
                    >
                      <View className="flex-[2.2] flex-row items-center pr-3">
                        <View
                          className={`w-10 h-10 rounded-xl items-center justify-center ${
                            selected ? "bg-ink" : "bg-ivory"
                          }`}
                        >
                          <Ionicons
                            name={deviceIcon(device.deviceOs)}
                            size={18}
                            color={selected ? brand.lime : brand.ink}
                          />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text numberOfLines={1} className="text-ink text-[13px] font-bold">
                            {device.deviceName}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className="text-ink/40 text-[10px] mt-0.5"
                            style={{ fontFamily: MONO }}
                          >
                            {device.deviceId}
                          </Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} className="flex-[1.4] text-ink/60 text-[12px] pr-3">
                        {device.deviceOs || "—"}
                      </Text>
                      <Text className="flex-1 text-ink/50 text-[12px]">{formatDate(device.createdAt)}</Text>
                      <View className="w-[110px]">
                        <StatusPill state={state} />
                      </View>
                      <View className="w-[116px] flex-row justify-end" style={{ gap: 6 }}>
                        {state === "pending" ? (
                          <IconButton
                            icon="checkmark"
                            label={`Approve ${device.deviceName}`}
                            disabled={busy}
                            onPress={() => runDeviceAction(device, "approve")}
                          />
                        ) : state !== "rejected" ? (
                          <IconButton
                            icon="power"
                            label={`${device.enabled === false ? "Enable" : "Disable"} ${device.deviceName}`}
                            disabled={busy}
                            onPress={() =>
                              runDeviceAction(device, device.enabled === false ? "enable" : "disable")
                            }
                          />
                        ) : null}
                        <IconButton
                          icon="trash-outline"
                          label={`Delete ${device.deviceName}`}
                          danger
                          disabled={busy}
                          onPress={() => runDeviceAction(device, "delete")}
                        />
                        <IconButton
                          icon={selected ? "chevron-back" : "chevron-forward"}
                          label="Details"
                          onPress={() => setActiveDeviceId(selected ? null : device.id)}
                        />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>

        {/* Details: side panel on wide screens, below the list otherwise */}
        {activeDevice && (
          <View style={showSidePanel ? { width: 340 } : undefined}>{detailPanel}</View>
        )}
      </View>
    </ScrollView>
  );
}
