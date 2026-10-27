import { PageHeader } from "@/app/components/ownerComponents/FormKit";
import {
  deviceIcon,
  deviceState,
  formatDate,
  IconButton,
  MONO,
  OnlineBadge,
  SEGMENT_COLOR,
  SEGMENT_HINT,
  SEGMENT_ORDER,
  STATE_META,
  StatusPill,
  timeAgo,
  toggleAction,
  useDeviceActions,
  UserChip,
  type Action,
  type DeviceState,
} from "@/components/devices/deviceKit";
import { brand } from "@/config/theme";
import type { DeviceListType } from "@/store/Device/DeviceType";
import useDeviceInfo from "@/store/Device/useDeviceInfo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

type Filter = "all" | DeviceState;
type ViewMode = "grid" | "table";

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

function DeviceCard({
  device,
  busy,
  onOpen,
  onAction,
}: {
  device: DeviceListType;
  busy: boolean;
  onOpen: () => void;
  onAction: (action: Action) => void;
}) {
  const state = deviceState(device);
  const disabled = state === "disabled";

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="link"
      accessibilityLabel={`Open ${device.deviceName}`}
      className={`flex-1 bg-white rounded-2xl overflow-hidden border border-ink/5 active:border-ink/30 ${
        disabled ? "opacity-80" : ""
      }`}
    >
      {/* Status accent */}
      <View className="h-1" style={{ backgroundColor: SEGMENT_COLOR[state] }} />

      <View className="p-4" style={{ gap: 14 }}>
        {/* Identity */}
        <View className="flex-row items-start">
          <View>
            <View className="w-12 h-12 rounded-xl items-center justify-center bg-ivory">
              <Ionicons name={deviceIcon(device.deviceOs)} size={22} color={brand.ink} />
            </View>
            <View
              className={`absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                device.online ? "bg-emerald-500" : "bg-ink/20"
              }`}
            />
          </View>
          <View className="flex-1 ml-3 pr-2">
            <Text numberOfLines={1} className="text-ink text-[15px] font-extrabold tracking-tight">
              {device.deviceName}
            </Text>
            <Text numberOfLines={1} className="text-ink/50 text-[12px] mt-0.5">
              {device.deviceOs || "Unknown OS"}
            </Text>
            <View className="mt-1.5">
              <OnlineBadge online={device.online} lastSeenAt={device.lastSeenAt} />
            </View>
          </View>
          <StatusPill state={state} />
        </View>

        {/* Current user */}
        <View className="bg-ivory rounded-xl px-3 py-2.5">
          <Text className="text-ink/40 text-[9px] font-bold uppercase tracking-[1.5px] mb-2">
            Signed in
          </Text>
          <UserChip user={device.currentUser} />
        </View>

        {/* Activity */}
        <View style={{ gap: 8 }}>
          <View className="flex-row items-start">
            <Ionicons name="pulse-outline" size={14} color={brand.inkMuted} style={{ marginTop: 1 }} />
            <Text numberOfLines={1} className="flex-1 text-ink/70 text-[12px] ml-2">
              {device.lastActivity || "No recent activity"}
            </Text>
            {device.lastActivityAt && (
              <Text className="text-ink/40 text-[11px] ml-2">{timeAgo(device.lastActivityAt)}</Text>
            )}
          </View>
          <View className="flex-row items-center">
            <Ionicons name="log-in-outline" size={14} color={brand.inkMuted} />
            <Text className="flex-1 text-ink/70 text-[12px] ml-2">Last login</Text>
            <Text className="text-ink/40 text-[11px]">{timeAgo(device.lastLoginAt)}</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color={brand.inkMuted} />
            <Text className="flex-1 text-ink/70 text-[12px] ml-2">Added</Text>
            <Text className="text-ink/40 text-[11px]">{formatDate(device.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View className="flex-row items-center px-4 py-3 border-t border-ink/5 bg-ivory/50">
        <Text numberOfLines={1} className="flex-1 text-ink/40 text-[10px] pr-3" style={{ fontFamily: MONO }}>
          {device.deviceId}
        </Text>
        <View className="flex-row" style={{ gap: 6 }}>
          {state === "pending" ? (
            <>
              <IconButton
                icon="close"
                label={`Reject ${device.deviceName}`}
                danger
                disabled={busy}
                onPress={() => onAction("reject")}
              />
              <Pressable
                onPress={() => onAction("approve")}
                disabled={busy}
                className="flex-row items-center h-8 px-3 rounded-lg bg-lime active:bg-lime-dark"
              >
                {busy ? (
                  <ActivityIndicator size="small" color={brand.ink} />
                ) : (
                  <Ionicons name="checkmark" size={14} color={brand.ink} />
                )}
                <Text className="text-ink text-xs font-bold ml-1">Approve</Text>
              </Pressable>
            </>
          ) : (
            <>
              {state !== "rejected" && (
                <IconButton
                  icon="power"
                  label={`${disabled ? "Enable" : "Disable"} ${device.deviceName}`}
                  disabled={busy}
                  onPress={() => onAction(toggleAction(device))}
                />
              )}
              <IconButton
                icon="trash-outline"
                label={`Delete ${device.deviceName}`}
                danger
                disabled={busy}
                onPress={() => onAction("delete")}
              />
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function DeviceInformation() {
  const { getDevices, deviceListType } = useDeviceInfo();
  const { busyDeviceId, runDeviceAction } = useDeviceActions();
  const { width } = useWindowDimensions();
  const router = useRouter();

  const openDevice = (device: DeviceListType) =>
    router.push({ pathname: "/(owner)/Settings/Devices/[id]", params: { id: device.id } });

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [gridWidth, setGridWidth] = useState(0);

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

  const counts = useMemo(() => {
    const c = { active: 0, pending: 0, disabled: 0, rejected: 0 };
    for (const d of devices) c[deviceState(d)] += 1;
    return c;
  }, [devices]);

  const pending = devices.filter((d) => deviceState(d) === "pending");
  const onlineCount = devices.filter((d) => d.online).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      if (filter !== "all" && deviceState(d) !== filter) return false;
      if (!q) return true;
      return (
        d.deviceName?.toLowerCase().includes(q) ||
        d.deviceOs?.toLowerCase().includes(q) ||
        d.deviceId?.toLowerCase().includes(q) ||
        d.currentUser?.name?.toLowerCase().includes(q)
      );
    });
  }, [devices, filter, search]);

  // Columns from the measured list width, falling back to the window until it's measured.
  const GRID_GAP = 14;
  const listWidth = gridWidth || width - 48;
  const columns = Math.max(1, Math.floor((listWidth + GRID_GAP) / (300 + GRID_GAP)));
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

        {/* Device list */}
        <View
          className="w-full"
          style={{ gap: 14 }}
          onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
        >
          {/* Toolbar */}
          <View className="bg-white rounded-2xl border border-ink/5 px-5 py-4">
            <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 12 }}>
              <View>
                <Text className="text-ink text-lg font-extrabold tracking-tight">
                  {filter === "all" ? "All devices" : `${STATE_META[filter].label} devices`}
                </Text>
                <View className="flex-row items-center mt-0.5">
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <Text className="text-ink/50 text-xs ml-1.5">
                    {onlineCount} online · {filtered.length} shown
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap items-center" style={{ gap: 10 }}>
                <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3 h-10 w-[260px] max-w-full">
                  <Ionicons name="search" size={16} color={brand.inkMuted} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Name, OS, device ID or user"
                    placeholderTextColor={brand.inkDisabled}
                    className="flex-1 ml-2 text-[13px] text-ink"
                    style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined}
                  />
                </View>
                <View className="flex-row bg-ivory border border-ink/10 rounded-xl p-1">
                  {(["grid", "table"] as ViewMode[]).map((mode) => {
                    const on = viewMode === mode;
                    return (
                      <Pressable
                        key={mode}
                        onPress={() => setViewMode(mode)}
                        accessibilityLabel={mode === "grid" ? "Card view" : "Table view"}
                        accessibilityState={{ selected: on }}
                        className={`w-8 h-8 rounded-lg items-center justify-center ${on ? "bg-ink" : ""}`}
                      >
                        <Ionicons
                          name={mode === "grid" ? "grid-outline" : "list-outline"}
                          size={15}
                          color={on ? brand.lime : brand.inkMuted}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {!loaded ? (
            <View className="bg-white rounded-2xl border border-ink/5 py-14 items-center">
              <ActivityIndicator color={brand.ink} />
            </View>
          ) : filtered.length === 0 ? (
            <View className="bg-white rounded-2xl border border-ink/5 py-14 items-center px-6">
              <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center mb-3">
                <Ionicons name="hardware-chip-outline" size={24} color={brand.inkDisabled} />
              </View>
              <Text className="text-ink text-sm font-bold">
                {devices.length === 0 ? "No devices yet" : "No matching devices"}
              </Text>
              <Text className="text-ink/40 text-xs mt-1 text-center">
                {devices.length === 0
                  ? "Devices appear here after they are activated with your company code."
                  : "Try another filter or search."}
              </Text>
            </View>
          ) : viewMode === "grid" ? (
            <View className="flex-row flex-wrap" style={{ margin: -GRID_GAP / 2 }}>
              {filtered.map((device) => (
                <View key={device.id} style={{ width: `${100 / columns}%`, padding: GRID_GAP / 2 }}>
                  <DeviceCard
                    device={device}
                    busy={busyDeviceId === device.id}
                    onOpen={() => openDevice(device)}
                    onAction={(action) => runDeviceAction(device, action)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="min-w-[900px] w-full">
                  <View className="flex-row items-center bg-ivory px-5 py-3 border-b border-ink/5">
                    <Text className="flex-[2.2] text-ink/40 text-[10px] font-bold uppercase tracking-widest">
                      Device
                    </Text>
                    <Text className="flex-[1.6] text-ink/40 text-[10px] font-bold uppercase tracking-widest">
                      Signed in
                    </Text>
                    <Text className="flex-[1.2] text-ink/40 text-[10px] font-bold uppercase tracking-widest">
                      Connection
                    </Text>
                    <Text className="w-[110px] text-ink/40 text-[10px] font-bold uppercase tracking-widest">
                      Status
                    </Text>
                    <View className="w-[116px]" />
                  </View>

                  {filtered.map((device, index) => {
                    const state = deviceState(device);
                    const busy = busyDeviceId === device.id;
                    return (
                      <Pressable
                        key={device.id}
                        onPress={() => openDevice(device)}
                        className={`flex-row items-center px-5 py-3 active:bg-ivory ${
                          index === filtered.length - 1 ? "" : "border-b border-ink/5"
                        }`}
                      >
                        <View className="flex-[2.2] flex-row items-center pr-3">
                          <View className="w-10 h-10 rounded-xl items-center justify-center bg-ivory">
                            <Ionicons name={deviceIcon(device.deviceOs)} size={18} color={brand.ink} />
                          </View>
                          <View className="flex-1 ml-3">
                            <Text numberOfLines={1} className="text-ink text-[13px] font-bold">
                              {device.deviceName}
                            </Text>
                            <Text numberOfLines={1} className="text-ink/40 text-[11px] mt-0.5">
                              {device.deviceOs || "Unknown OS"}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-[1.6] pr-3">
                          <UserChip user={device.currentUser} />
                        </View>
                        <View className="flex-[1.2] pr-3">
                          <OnlineBadge online={device.online} lastSeenAt={device.lastSeenAt} />
                        </View>
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
                              label={`${state === "disabled" ? "Enable" : "Disable"} ${device.deviceName}`}
                              disabled={busy}
                              onPress={() => runDeviceAction(device, toggleAction(device))}
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
                            icon="chevron-forward"
                            label={`Open ${device.deviceName}`}
                            onPress={() => openDevice(device)}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
    </ScrollView>
  );
}
