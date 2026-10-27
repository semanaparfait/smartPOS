import { PageHeader } from "@/app/components/ownerComponents/FormKit";
import {
  DetailRow,
  deviceIcon,
  deviceState,
  formatDate,
  formatDateTime,
  MONO,
  SEGMENT_COLOR,
  StatusPill,
  timeAgo,
  titleCase,
  toggleAction,
  useDeviceActions,
  UserChip,
} from "@/components/devices/deviceKit";
import { brand } from "@/config/theme";
import type { ActivityLog } from "@/store/Device/DeviceType";
import useDeviceInfo, { type RotatedSecret } from "@/store/Device/useDeviceInfo";
import { confirmDialog, notify } from "@/store/Dialog/useDialog";
import { fetchUniversalDeviceInfo } from "@/utils/device";
import { saveDeviceSecret } from "@/utils/deviceSecret";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const DEVICES_ROUTE = "/(owner)/Settings/Devices/DeviceInformation";

const PAGE_SIZE = 20;

const actionIcon = (action: string): keyof typeof Ionicons.glyphMap => {
  const a = action.toLowerCase();
  if (a.includes("logout") || a.includes("log out") || a.includes("sign out")) return "log-out-outline";
  if (a.includes("login") || a.includes("log in") || a.includes("sign in")) return "log-in-outline";
  if (a.includes("order")) return "receipt-outline";
  if (a.includes("pay") || a.includes("sale") || a.includes("checkout")) return "card-outline";
  if (a.includes("product") || a.includes("stock") || a.includes("inventory")) return "cube-outline";
  if (a.includes("delete") || a.includes("remove")) return "trash-outline";
  if (a.includes("create") || a.includes("add")) return "add-circle-outline";
  if (a.includes("update") || a.includes("edit")) return "create-outline";
  return "pulse-outline";
};

// "CREATE_ORDER" -> "Create order"; free text is left as-is.
const actionLabel = (action: string) =>
  /^[A-Z0-9_]+$/.test(action) ? titleCase(action).replace(/^(\w)(.*)$/, (_, f, r) => f + r.toLowerCase()) : action;

const dayLabel = (value: string) => {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const statusTone = (code: number) =>
  code >= 400
    ? { box: "bg-red-50", fg: brand.danger }
    : code >= 300
      ? { box: "bg-ivory", fg: brand.inkMuted }
      : { box: "bg-emerald-50", fg: "#047857" };

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View className="flex-1 min-w-[160px] bg-white rounded-2xl border border-ink/5 p-4">
      <View className="flex-row items-center">
        <View className="w-7 h-7 rounded-lg bg-ivory items-center justify-center">
          <Ionicons name={icon} size={14} color={brand.ink} />
        </View>
        <Text className="text-ink/50 text-[11px] font-bold uppercase tracking-[1.5px] ml-2">{label}</Text>
      </View>
      <Text numberOfLines={1} className="text-ink text-xl font-extrabold tracking-tight mt-3">
        {value}
      </Text>
      {hint && (
        <Text numberOfLines={1} className="text-ink/40 text-[11px] mt-0.5">
          {hint}
        </Text>
      )}
    </View>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Text className="text-ink text-[15px] font-extrabold tracking-tight">{title}</Text>
        {right}
      </View>
      <View className="px-5 pb-4">{children}</View>
    </View>
  );
}

function ActivityRow({ log, first, last }: { log: ActivityLog; first: boolean; last: boolean }) {
  const tone = log.statusCode != null ? statusTone(log.statusCode) : null;
  return (
    <View className="flex-row">
      <View className="items-center mr-3">
        <View
          className={`w-9 h-9 rounded-xl items-center justify-center ${first ? "bg-ink" : "bg-ivory"}`}
        >
          <Ionicons name={actionIcon(log.action)} size={16} color={first ? brand.lime : brand.ink} />
        </View>
        {!last && <View className="flex-1 w-px bg-ink/10 my-1" />}
      </View>
      <View className={`flex-1 ${last ? "" : "pb-5"}`}>
        <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
          <Text className="flex-1 text-ink text-[13px] font-bold mt-0.5">{actionLabel(log.action)}</Text>
          <Text className="text-ink/40 text-[11px] mt-1">{formatTime(log.createdAt)}</Text>
        </View>
        <Text numberOfLines={1} className="text-ink/50 text-[11px] mt-0.5">
          {log.user?.name ?? "Unknown user"}
          {log.user?.role ? ` · ${titleCase(log.user.role)}` : ""} · {timeAgo(log.createdAt)}
        </Text>
        {(log.method || log.path || tone) && (
          <View className="flex-row flex-wrap items-center mt-2" style={{ gap: 6 }}>
            {log.method && (
              <View className="bg-ink rounded-md px-1.5 py-0.5">
                <Text className="text-lime text-[9px] font-extrabold" style={{ fontFamily: MONO }}>
                  {log.method.toUpperCase()}
                </Text>
              </View>
            )}
            {log.path && (
              <Text
                selectable
                numberOfLines={1}
                className="flex-shrink text-ink/50 text-[10px]"
                style={{ fontFamily: MONO }}
              >
                {log.path}
              </Text>
            )}
            {tone && (
              <View className={`rounded-md px-1.5 py-0.5 ${tone.box}`}>
                <Text className="text-[9px] font-extrabold" style={{ color: tone.fg, fontFamily: MONO }}>
                  {log.statusCode}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// Logs grouped by day, newest first.
function ActivityTimeline({ logs }: { logs: ActivityLog[] }) {
  const groups: { day: string; items: ActivityLog[] }[] = [];
  for (const log of logs) {
    const day = dayLabel(log.createdAt);
    const group = groups[groups.length - 1];
    if (group?.day === day) group.items.push(log);
    else groups.push({ day, items: [log] });
  }

  return (
    <View style={{ gap: 18 }}>
      {groups.map((group, g) => (
        <View key={group.day}>
          <View className="flex-row items-center mb-3">
            <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px]">{group.day}</Text>
            <View className="flex-1 h-px bg-ink/5 ml-3" />
            <Text className="text-ink/30 text-[10px] ml-3">{group.items.length}</Text>
          </View>
          {group.items.map((log, i) => (
            <ActivityRow
              key={log.id}
              log={log}
              first={g === 0 && i === 0}
              last={i === group.items.length - 1}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  disabled,
  variant,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant: "lime" | "ghost" | "danger";
}) {
  const styles = {
    lime: { box: "bg-lime active:bg-lime-dark", fg: brand.ink },
    ghost: { box: "bg-white/10 active:bg-white/20", fg: "#FFFFFF" },
    danger: { box: "bg-white/5 border border-white/10 active:bg-red-500/20", fg: "#FCA5A5" },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center h-10 px-4 rounded-xl ${styles.box} ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <Ionicons name={icon} size={15} color={styles.fg} />
      <Text className="text-[13px] font-bold ml-1.5" style={{ color: styles.fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

// Shows a freshly rotated secret. The server never shows it again, so the owner
// must copy it now and enter it on the device.
function SecretModal({
  secret,
  savedHere,
  onClose,
}: {
  secret: RotatedSecret | null;
  savedHere: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!secret) return;
    if (Platform.OS === "web" && navigator?.clipboard) {
      await navigator.clipboard.writeText(secret.deviceSecret);
      setCopied(true);
    } else {
      await Share.share({ message: secret.deviceSecret });
    }
  };

  const close = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Modal visible={!!secret} transparent animationType="fade" onRequestClose={close}>
      <View className="flex-1 bg-ink/60 items-center justify-center p-6">
        <View className="w-full max-w-[480px] bg-white rounded-2xl overflow-hidden">
          <View className="bg-ink p-5 flex-row items-center">
            <View className="w-11 h-11 rounded-xl bg-lime items-center justify-center">
              <Ionicons name="key" size={20} color={brand.ink} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-white text-[16px] font-extrabold">New device secret</Text>
              <Text className="text-white/50 text-xs" style={{ fontFamily: MONO }}>
                {secret?.deviceId}
              </Text>
            </View>
          </View>

          <View className="p-5" style={{ gap: 14 }}>
            <View className="flex-row items-start bg-amber-50 border border-amber-200 rounded-xl p-3">
              <Ionicons name="warning-outline" size={16} color="#B45309" />
              <Text className="flex-1 text-amber-800 text-xs ml-2">
                This is the only time the secret is shown. The old secret has stopped working, so the
                device shows as offline until this one is entered on it.
              </Text>
            </View>

            <View className="bg-ivory border border-ink/10 rounded-xl p-3">
              <Text selectable className="text-ink text-[12px] leading-5" style={{ fontFamily: MONO }}>
                {secret?.deviceSecret}
              </Text>
            </View>

            {savedHere ? (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color="#047857" />
                <Text className="text-emerald-700 text-xs font-semibold ml-1.5">
                  You are on this device, so the secret was saved here automatically.
                </Text>
              </View>
            ) : (
              <Text className="text-ink/50 text-xs">
                On the device, open the login screen, tap &quot;Add device secret&quot; and paste it.
              </Text>
            )}

            <View className="flex-row" style={{ gap: 10 }}>
              <Pressable
                onPress={copy}
                className="flex-1 flex-row items-center justify-center h-11 rounded-xl border border-ink/10 active:bg-ivory"
              >
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color={brand.ink} />
                <Text className="text-ink text-[13px] font-bold ml-1.5">{copied ? "Copied" : "Copy"}</Text>
              </Pressable>
              <Pressable
                onPress={close}
                className="flex-1 items-center justify-center h-11 rounded-xl bg-ink active:bg-ink-soft"
              >
                <Text className="text-white text-[13px] font-bold">Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function DeviceDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { deviceListType, getDevices, getDeviceActivities, rotateSecret } = useDeviceInfo();
  const [rotating, setRotating] = useState(false);
  const [newSecret, setNewSecret] = useState<RotatedSecret | null>(null);
  const [savedHere, setSavedHere] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[] | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace(DEVICES_ROUTE));

  const { busyDeviceId, runDeviceAction } = useDeviceActions((action) => {
    if (action === "delete") router.replace(DEVICES_ROUTE);
  });

  const device = deviceListType?.find((d) => d.id === id || d.deviceId === id) ?? null;

  // Opened directly (refresh or shared link): load the list first.
  useEffect(() => {
    if (device) return;
    setLoading(true);
    getDevices().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // The activities endpoint takes the device's UUID (`id`), not the hardware `deviceId`.
  const deviceUuid = device?.id;

  const loadLogs = async () => {
    if (!deviceUuid) return;
    setLogsLoading(true);
    const result = await getDeviceActivities(deviceUuid);
    setLogsError(result === null);
    if (result) setLogs(result);
    setLogsLoading(false);
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceUuid]);

  const handleRotate = async () => {
    if (!device || rotating) return;
    const confirmed = await confirmDialog({
      title: "Rotate device secret?",
      message: `A new secret will be issued for "${device.deviceName}". The current one stops working immediately, so the device shows offline until the new secret is entered on it.`,
      tone: "warning",
      confirmLabel: "Rotate secret",
    });
    if (!confirmed) return;

    setRotating(true);
    const result = await rotateSecret(device.id);
    setRotating(false);
    if (!result) {
      notify({
        title: "Rotation failed",
        message: "We couldn't issue a new secret for this device. Check your connection and try again.",
        tone: "danger",
      });
      return;
    }

    // Rotating the device in use right now: store the secret so heartbeats keep working.
    let here = false;
    try {
      here = (await fetchUniversalDeviceInfo()).deviceId === result.deviceId;
      if (here) await saveDeviceSecret(result.deviceSecret);
    } catch {
      here = false;
    }
    setSavedHere(here);
    setNewSecret(result);
  };

  const sortedLogs = useMemo(
    () =>
      [...(logs ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [logs],
  );
  const todayCount = sortedLogs.filter(
    (l) => new Date(l.createdAt).toDateString() === new Date().toDateString(),
  ).length;

  if (!device) {
    return (
      <View className="flex-1 bg-ivory items-center justify-center p-6">
        {loading ? (
          <ActivityIndicator color={brand.ink} />
        ) : (
          <>
            <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center mb-3">
              <Ionicons name="hardware-chip-outline" size={24} color={brand.inkDisabled} />
            </View>
            <Text className="text-ink text-sm font-bold">Device not found</Text>
            <Text className="text-ink/40 text-xs mt-1">It may have been deleted.</Text>
            <Pressable
              onPress={goBack}
              className="mt-4 h-10 px-4 rounded-xl bg-ink items-center justify-center active:bg-ink-soft"
            >
              <Text className="text-white text-[13px] font-bold">Back to devices</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const state = deviceState(device);
  const busy = busyDeviceId === device.id;
  const wide = width >= 1100;
  const user = device.currentUser;

  return (
    <ScrollView
      className="flex-1 bg-ivory"
      contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        eyebrow="Settings · Devices"
        title={device.deviceName}
        subtitle="Device status, who is using it and what it has been doing."
        onBack={goBack}
      />

      {/* Hero */}
      <View className="bg-ink rounded-2xl overflow-hidden">
        <View className="h-1" style={{ backgroundColor: SEGMENT_COLOR[state] }} />
        <View className="p-6 flex-row flex-wrap items-center justify-between" style={{ gap: 20 }}>
          <View className="flex-row items-center flex-1 min-w-[260px]">
            <View>
              <View className="w-16 h-16 rounded-2xl bg-lime items-center justify-center">
                <Ionicons name={deviceIcon(device.deviceOs)} size={30} color={brand.ink} />
              </View>
              <View
                className={`absolute -right-1 -bottom-1 w-4 h-4 rounded-full border-2 border-ink ${
                  device.online ? "bg-emerald-400" : "bg-white/30"
                }`}
              />
            </View>
            <View className="flex-1 ml-4">
              <Text numberOfLines={1} className="text-white text-xl font-extrabold tracking-tight">
                {device.deviceName}
              </Text>
              <Text numberOfLines={1} className="text-white/50 text-[13px] mt-0.5">
                {device.deviceOs || "Unknown OS"}
              </Text>
              <View className="flex-row flex-wrap items-center mt-2.5" style={{ gap: 8 }}>
                <StatusPill state={state} />
                <View className="flex-row items-center bg-white/10 rounded-full px-2.5 py-1">
                  <View
                    className={`w-1.5 h-1.5 rounded-full ${device.online ? "bg-emerald-400" : "bg-white/30"}`}
                  />
                  <Text className="text-white/70 text-[11px] font-bold ml-1.5">
                    {device.online ? "Online now" : `Offline · ${timeAgo(device.lastSeenAt)}`}
                  </Text>
                </View>
                <Text selectable numberOfLines={1} className="text-white/30 text-[10px]" style={{ fontFamily: MONO }}>
                  {device.deviceId}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {state === "pending" || state === "rejected" ? (
              <>
                <ActionButton
                  icon="checkmark"
                  label="Approve"
                  variant="lime"
                  disabled={busy}
                  onPress={() => runDeviceAction(device, "approve")}
                />
                {state === "pending" && (
                  <ActionButton
                    icon="close"
                    label="Reject"
                    variant="danger"
                    disabled={busy}
                    onPress={() => runDeviceAction(device, "reject")}
                  />
                )}
              </>
            ) : (
              <ActionButton
                icon="power"
                label={state === "disabled" ? "Enable device" : "Disable device"}
                variant={state === "disabled" ? "lime" : "ghost"}
                disabled={busy}
                onPress={() => runDeviceAction(device, toggleAction(device))}
              />
            )}
            <ActionButton
              icon="trash-outline"
              label="Delete"
              variant="danger"
              disabled={busy}
              onPress={() => runDeviceAction(device, "delete")}
            />
          </View>
        </View>
      </View>

      {/* Quick stats */}
      <View className="flex-row flex-wrap" style={{ gap: 12 }}>
        <StatTile
          icon="wifi-outline"
          label="Last seen"
          value={device.online ? "Online" : timeAgo(device.lastSeenAt)}
          hint={formatDateTime(device.lastSeenAt)}
        />
        <StatTile
          icon="log-in-outline"
          label="Last login"
          value={timeAgo(device.lastLoginAt)}
          hint={formatDateTime(device.lastLoginAt)}
        />
        <StatTile
          icon="pulse-outline"
          label="Last activity"
          value={timeAgo(device.lastActivityAt)}
          hint={device.lastActivity || "No activity yet"}
        />
        <StatTile icon="calendar-outline" label="Added" value={formatDate(device.createdAt)} hint={device.company?.name} />
      </View>

      <View className={wide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
        {/* Activity log */}
        <View className={wide ? "flex-1 min-w-0" : ""}>
          <Section
            title="Activity log"
            right={
              <View className="flex-row items-center" style={{ gap: 10 }}>
                {logs && (
                  <Text className="text-ink/40 text-xs">
                    {sortedLogs.length} events · {todayCount} today
                  </Text>
                )}
                <Pressable
                  onPress={loadLogs}
                  disabled={logsLoading}
                  accessibilityLabel="Refresh activity"
                  className="w-8 h-8 rounded-lg items-center justify-center border border-ink/10 active:bg-ivory"
                >
                  {logsLoading ? (
                    <ActivityIndicator size="small" color={brand.ink} />
                  ) : (
                    <Ionicons name="refresh" size={14} color={brand.ink} />
                  )}
                </Pressable>
              </View>
            }
          >
            {logs === null ? (
              <View className="py-10 items-center">
                {logsLoading ? (
                  <ActivityIndicator color={brand.ink} />
                ) : (
                  <>
                    <Ionicons name="cloud-offline-outline" size={22} color={brand.inkDisabled} />
                    <Text className="text-ink text-sm font-bold mt-2">Could not load activity</Text>
                    <Pressable onPress={loadLogs} className="mt-2">
                      <Text className="text-ink text-xs font-bold underline">Try again</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : sortedLogs.length === 0 ? (
              <View className="py-10 items-center">
                <View className="w-12 h-12 rounded-2xl bg-ivory items-center justify-center mb-2">
                  <Ionicons name="pulse-outline" size={22} color={brand.inkDisabled} />
                </View>
                <Text className="text-ink text-sm font-bold">No activity yet</Text>
                <Text className="text-ink/40 text-xs mt-1">Actions on this device will show up here.</Text>
              </View>
            ) : (
              <>
                {logsError && (
                  <Text className="text-xs mb-3" style={{ color: brand.danger }}>
                    Refresh failed. Showing the last loaded activity.
                  </Text>
                )}
                <ActivityTimeline logs={sortedLogs.slice(0, visible)} />
                {sortedLogs.length > visible && (
                  <Pressable
                    onPress={() => setVisible((v) => v + PAGE_SIZE)}
                    className="mt-5 h-10 rounded-xl border border-ink/10 items-center justify-center active:bg-ivory"
                  >
                    <Text className="text-ink text-[13px] font-bold">
                      Show more ({sortedLogs.length - visible} remaining)
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </Section>
        </View>

        {/* Side info */}
        <View style={[{ gap: 16 }, wide ? { width: 360 } : undefined]}>
          <Section title="Signed in">
            <View className="bg-ivory rounded-xl p-3">
              <UserChip user={user} />
            </View>
            {user && (
              <View className="mt-2">
                <DetailRow label="Role" value={titleCase(user.role)} />
                <DetailRow label="Email" value={user.email} />
                <DetailRow label="Phone" value={user.phone} />
                <DetailRow label="Account" value={user.active ? "Active" : "Inactive"} />
                <DetailRow label="Last login" value={formatDateTime(user.lastLoginAt)} />
              </View>
            )}
          </Section>

          <Section title="Device">
            <DetailRow label="Device ID" value={device.deviceId} mono />
            <DetailRow label="OS" value={device.deviceOs} />
            <DetailRow label="Registration" value={titleCase(device.registrationStatus)} />
            <DetailRow label="Added" value={formatDateTime(device.createdAt)} />
            <DetailRow label="Last change" value={formatDateTime(device.updatedAt)} />
          </Section>

          <Section title="Security">
            <View className="flex-row items-start">
              <View className="w-9 h-9 rounded-xl bg-ivory items-center justify-center">
                <Ionicons name="key-outline" size={16} color={brand.ink} />
              </View>
              <Text className="flex-1 text-ink/50 text-xs ml-3">
                The device secret keeps this device showing as online. Rotate it if the device was
                reinstalled, replaced, lost, or registered before secrets existed. Logins are not
                affected.
              </Text>
            </View>
            <Pressable
              onPress={handleRotate}
              disabled={rotating}
              className="mt-4 flex-row items-center justify-center h-11 rounded-xl bg-ink active:bg-ink-soft"
            >
              {rotating ? (
                <ActivityIndicator size="small" color={brand.lime} />
              ) : (
                <Ionicons name="refresh-circle-outline" size={17} color={brand.lime} />
              )}
              <Text className="text-white text-[13px] font-bold ml-1.5">Rotate secret</Text>
            </Pressable>
          </Section>

          <Section title="Company">
            <DetailRow label="Name" value={device.company?.name} />
            <DetailRow label="Code" value={device.company?.code} mono />
            <DetailRow label="Type" value={titleCase(device.company?.type)} />
            <DetailRow label="Location" value={device.company?.location} />
            <DetailRow label="Phone" value={device.company?.phone_number} />
          </Section>
        </View>
      </View>
      <SecretModal secret={newSecret} savedHere={savedHere} onClose={() => setNewSecret(null)} />
    </ScrollView>
  );
}
