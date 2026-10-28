import { brand } from "@/config/theme";
import type { DeviceListType } from "@/store/Device/DeviceType";
import useDeviceInfo from "@/store/Device/useDeviceInfo";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { confirmDialog, notify, type DialogTone } from "@/store/Dialog/useDialog";
import { Platform, Pressable, Text, View } from "react-native";

// Shared device helpers and UI used by the device list and the device detail page.

export type Action = "approve" | "reject" | "enable" | "disable" | "delete";
export type DeviceState = "active" | "pending" | "disabled" | "rejected";

export const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

export const STATE_META: Record<
  DeviceState,
  { label: string; icon: keyof typeof Ionicons.glyphMap; pill: string; fg: string }
> = {
  active: { label: "Active", icon: "checkmark-circle", pill: "bg-lime", fg: brand.ink },
  pending: { label: "Pending", icon: "time-outline", pill: "bg-white border border-ink/15", fg: brand.ink },
  disabled: { label: "Disabled", icon: "power-outline", pill: "bg-ivory border border-ink/10", fg: brand.inkMuted },
  rejected: { label: "Rejected", icon: "close-circle-outline", pill: "bg-danger/10", fg: brand.danger },
};

export const ACTION_COPY: Record<
  Action,
  { title: string; verb: string; confirmLabel: string; tone: DialogTone; message: (name: string) => string }
> = {
  approve: {
    title: "Approve device?",
    verb: "approve",
    confirmLabel: "Approve",
    tone: "info",
    message: (name) => `"${name}" will be able to sign in staff and take sales for your company.`,
  },
  reject: {
    title: "Reject device?",
    verb: "reject",
    confirmLabel: "Reject",
    tone: "danger",
    message: (name) => `"${name}" will be denied access. You can still approve it later.`,
  },
  enable: {
    title: "Enable device?",
    verb: "enable",
    confirmLabel: "Enable",
    tone: "info",
    message: (name) => `"${name}" will be able to sell again.`,
  },
  disable: {
    title: "Disable device?",
    verb: "disable",
    confirmLabel: "Disable",
    tone: "warning",
    message: (name) => `"${name}" will be blocked from selling until you enable it again.`,
  },
  delete: {
    title: "Delete device?",
    verb: "delete",
    confirmLabel: "Delete",
    tone: "danger",
    message: (name) => `"${name}" will be removed permanently. It will need to request access again.`,
  },
};

export const deviceState = (d: DeviceListType): DeviceState => {
  const status = (d.registrationStatus || "").toUpperCase();
  if (status === "REGISTERED" || status === "ACTIVE" || status === "ENABLED") return "active";
  if (status === "DISABLED") return "disabled";
  if (status === "REJECTED") return "rejected";
  return "pending";
};

export const toggleAction = (d: DeviceListType): Action =>
  deviceState(d) === "disabled" ? "enable" : "disable";

export const deviceIcon = (os?: string): keyof typeof Ionicons.glyphMap => {
  const v = (os || "").toLowerCase();
  if (v.includes("tab") || v.includes("ipad")) return "tablet-portrait-outline";
  if (v.includes("android") || v.includes("ios") || v.includes("iphone")) return "phone-portrait-outline";
  if (v.includes("windows") || v.includes("mac") || v.includes("linux") || v.includes("web"))
    return "desktop-outline";
  return "hardware-chip-outline";
};

export const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const timeAgo = (value?: string | null) => {
  if (!value) return "Never";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
};

export const initials = (name?: string) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export const titleCase = (value?: string | null) =>
  (value || "").toLowerCase().replace(/(^|[\s_])(\w)/g, (_, sep, c) => `${sep === "_" ? " " : sep}${c.toUpperCase()}`);

// Segment colours for the summary bar; each segment also has a text label.
export const SEGMENT_COLOR: Record<DeviceState, string> = {
  active: brand.ink,
  pending: brand.lime,
  disabled: "rgba(32,40,59,0.25)",
  rejected: brand.danger,
};
export const SEGMENT_ORDER: DeviceState[] = ["active", "pending", "disabled", "rejected"];

export const SEGMENT_HINT: Record<DeviceState, string> = {
  active: "Approved and selling",
  pending: "Need your approval",
  disabled: "Blocked from selling",
  rejected: "Access denied",
};

export function StatusPill({ state }: { state: DeviceState }) {
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

export function IconButton({
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
        disabled ? "opacity-40" : danger ? "active:bg-danger/10" : "active:bg-ivory"
      }`}
    >
      <Ionicons name={icon} size={15} color={danger ? brand.danger : brand.ink} />
    </Pressable>
  );
}

export function OnlineBadge({ online, lastSeenAt }: { online: boolean; lastSeenAt?: string | null }) {
  return (
    <View className="flex-row items-center">
      <View className={`w-2 h-2 rounded-full ${online ? "bg-success" : "bg-ink/20"}`} />
      <Text className={`text-[11px] font-semibold ml-1.5 ${online ? "text-success" : "text-ink/40"}`}>
        {online ? "Online" : `Offline · ${timeAgo(lastSeenAt)}`}
      </Text>
    </View>
  );
}

export function UserChip({ user, dark }: { user: DeviceListType["currentUser"]; dark?: boolean }) {
  if (!user) {
    return (
      <View className="flex-row items-center">
        <View
          className={`w-9 h-9 rounded-full items-center justify-center border border-dashed ${
            dark ? "border-white/20" : "border-ink/15"
          }`}
        >
          <Ionicons name="person-outline" size={15} color={dark ? "rgba(255,255,255,0.4)" : brand.inkDisabled} />
        </View>
        <Text className={`text-[12px] ml-2.5 ${dark ? "text-white/40" : "text-ink/40"}`}>
          No one signed in
        </Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center">
      <View className="w-9 h-9 rounded-full bg-ink items-center justify-center">
        <Text className="text-lime text-[12px] font-extrabold">{initials(user.name)}</Text>
      </View>
      <View className="flex-1 ml-2.5">
        <Text numberOfLines={1} className={`text-[13px] font-bold ${dark ? "text-white" : "text-ink"}`}>
          {user.name}
        </Text>
        <Text numberOfLines={1} className={`text-[11px] ${dark ? "text-white/50" : "text-ink/50"}`}>
          {titleCase(user.role)}
          {user.email ? ` · ${user.email}` : ""}
        </Text>
      </View>
    </View>
  );
}

export function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
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

// Confirms, runs a device action against the API and refreshes the list.
export function useDeviceActions(onDone?: (action: Action, device: DeviceListType) => void) {
  const { getDevices, updateRegistration, setDeviceEnabled, deleteDevice } = useDeviceInfo();
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);

  const runDeviceAction = async (device: DeviceListType, action: Action) => {
    if (busyDeviceId) return;
    const copy = ACTION_COPY[action];
    const confirmed = await confirmDialog({
      title: copy.title,
      message: copy.message(device.deviceName),
      tone: copy.tone,
      confirmLabel: copy.confirmLabel,
    });
    if (!confirmed) return;

    setBusyDeviceId(device.id);
    let success = false;
    if (action === "approve" || action === "reject") {
      success = await updateRegistration(device.id, action === "approve" ? "APPROVE" : "REJECT");
    } else if (action === "enable" || action === "disable") {
      success = await setDeviceEnabled(device.id, action === "enable");
    } else {
      success = await deleteDevice(device.id);
    }

    if (success) {
      await getDevices();
      onDone?.(action, device);
    } else {
      notify({
        title: "Something went wrong",
        message: `We couldn't ${copy.verb} "${device.deviceName}". Check your connection and try again.`,
        tone: "danger",
      });
    }
    setBusyDeviceId(null);
  };

  return { busyDeviceId, runDeviceAction };
}
