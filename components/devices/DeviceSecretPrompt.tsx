import { brand } from "@/config/theme";
import useDeviceInfo from "@/store/Device/useDeviceInfo";
import { saveDeviceSecret } from "@/utils/deviceSecret";
import { KeyRound, WifiOff, X } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";

// Shown on the login screen when this device can't send heartbeats (missing or
// rejected secret). Lets staff paste the secret the owner got from "Rotate secret".
export default function DeviceSecretPrompt({ deviceId }: { deviceId: string | null }) {
  const { heartbeatStatus, sendHeartbeat } = useDeviceInfo();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (heartbeatStatus !== "no-secret" && heartbeatStatus !== "invalid-secret") return null;

  const close = () => {
    setOpen(false);
    setValue("");
    setError(null);
  };

  const save = async () => {
    const secret = value.trim();
    if (!secret || !deviceId) return;
    setSaving(true);
    setError(null);
    const status = await sendHeartbeat(deviceId, secret);
    if (status === "ok") {
      await saveDeviceSecret(secret);
      close();
    } else {
      setError(
        status === "invalid-secret"
          ? "That secret was rejected. Ask the owner to rotate it again."
          : "Could not reach the server. Check the connection and try again.",
      );
    }
    setSaving(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center self-center gap-2 mt-4 px-3 py-2 rounded-full bg-amber-50 border border-amber-200 active:bg-amber-100"
      >
        <WifiOff size={13} color="#B45309" />
        <Text className="text-amber-800 text-xs font-semibold">
          {heartbeatStatus === "invalid-secret"
            ? "Device secret rejected · Update it"
            : "Device shows offline · Add device secret"}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View className="flex-1 bg-ink/60 items-center justify-center p-6">
          <View className="w-full max-w-[420px] bg-white rounded-2xl p-6">
            <View className="flex-row items-start justify-between">
              <View className="w-11 h-11 rounded-xl bg-ink items-center justify-center">
                <KeyRound size={20} color={brand.lime} />
              </View>
              <Pressable onPress={close} accessibilityLabel="Close" className="p-1">
                <X size={18} color={brand.inkMuted} />
              </Pressable>
            </View>
            <Text className="text-ink text-lg font-extrabold tracking-tight mt-4">Device secret</Text>
            <Text className="text-ink/50 text-[13px] mt-1">
              The owner can get a new secret from Settings → Devices → this device → Rotate secret.
              It keeps this device showing as online. Staff can still log in without it.
            </Text>

            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder="Paste the 64-character secret"
              placeholderTextColor={brand.inkDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              className="mt-4 h-12 px-4 rounded-xl bg-ivory border border-ink/10 text-ink text-[13px]"
              style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined}
            />
            {error && <Text className="text-xs mt-2" style={{ color: brand.danger }}>{error}</Text>}

            <Pressable
              onPress={save}
              disabled={!value.trim() || saving || !deviceId}
              className={`mt-4 h-12 rounded-xl items-center justify-center bg-ink active:bg-ink-soft ${
                !value.trim() || !deviceId ? "opacity-40" : ""
              }`}
            >
              {saving ? (
                <ActivityIndicator color={brand.lime} />
              ) : (
                <Text className="text-white text-[14px] font-bold">Save secret</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
