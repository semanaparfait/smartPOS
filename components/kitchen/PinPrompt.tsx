import { PIN_LENGTH } from "@/components/profile/profileKit";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import { formatCountdown, useLockCountdown, useSignInLock } from "@/utils/signInLock";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from "react-native";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const tap = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

// Asks the cook starting an order for their PIN, so the owner knows who
// prepared it. `onSubmit` throws the server's message (e.g. "Wrong PIN"),
// shown here; the pad clears so they can try again.
export default function PinPrompt({
  visible,
  title,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  // What is being started, e.g. "Table 4 · #A1B2C3".
  title?: string;
  onSubmit: (pin: string) => Promise<void>;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Too many wrong PINs on this device: the pad waits out the countdown.
  const lockMessage = useSignInLock((s) => s.lock?.message);
  const attemptsLeft = useSignInLock((s) => s.attemptsLeft);
  const lockRemaining = useLockCountdown(null);
  const locked = lockRemaining > 0;

  useEffect(() => {
    if (!visible) {
      setPin("");
      setError(null);
    }
  }, [visible]);

  const submit = async (value: string) => {
    setBusy(true);
    try {
      await onSubmit(value);
    } catch (e) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError((e as Error).message);
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  const press = (digit: string) => {
    if (busy || locked || pin.length >= PIN_LENGTH) return;
    tap();
    setError(null);
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) submit(next);
  };

  // Number keys on a kitchen tablet with a keyboard, or on web.
  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const onKey = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) press(event.key);
      else if (event.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-ink/60 items-center justify-center p-4">
        <Pressable className="bg-white rounded-2xl p-6 w-full" style={{ maxWidth: 380, gap: 18 }}>
          <View className="items-center" style={{ gap: 6 }}>
            <View className="w-12 h-12 rounded-xl bg-lime items-center justify-center">
              <Ionicons name="person-circle-outline" size={26} color={brand.ink} />
            </View>
            <Text className="text-ink text-lg font-extrabold">{tr("Who is preparing this?")}</Text>
            <Text className="text-ink/50 text-[13px] text-center">
              {title ? `${title} · ` : ""}
              {tr("Enter your PIN to start.")}
            </Text>
          </View>

          <View className="flex-row justify-center" style={{ gap: 12 }}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                className={`w-3.5 h-3.5 rounded-full ${i < pin.length ? "bg-ink" : "bg-ink/10"}`}
              />
            ))}
          </View>

          <View className="h-5 items-center justify-center">
            {busy ? (
              <ActivityIndicator color={brand.ink} />
            ) : locked ? null : error ? (
              <Text className="text-danger text-[13px] font-semibold text-center">
                {error}
                {attemptsLeft !== null && attemptsLeft > 0
                  ? ` · ${
                      attemptsLeft === 1
                        ? tr("1 try left before this device locks")
                        : tr("{n} tries left before this device locks").replace("{n}", String(attemptsLeft))
                    }`
                  : ""}
              </Text>
            ) : null}
          </View>

          {locked && (
            <View className="items-center rounded-xl bg-ivory py-5 px-4" style={{ gap: 4 }}>
              <Ionicons name="lock-closed" size={22} color={brand.ink} />
              <Text className="text-ink text-[15px] font-bold mt-1">{tr("This device is locked")}</Text>
              {!!lockMessage && <Text className="text-ink/60 text-[13px] text-center">{tr(lockMessage)}</Text>}
              <Text className="text-ink text-4xl font-bold mt-2" style={{ fontVariant: ["tabular-nums"] }}>
                {formatCountdown(lockRemaining)}
              </Text>
              <Text className="text-ink/50 text-xs text-center">
                {tr("Need help? Contact your account owner to unlock this device.")}
              </Text>
            </View>
          )}

          {/* Dimmed while locked (digits do nothing); Cancel still closes the prompt. */}
          <View
            className="flex-row flex-wrap justify-between"
            style={{ rowGap: 10, ...(locked ? { opacity: 0.3 } : null) }}
          >
            {KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => press(key)}
                disabled={busy}
                className="w-[31%] h-16 rounded-xl items-center justify-center bg-ivory active:bg-ink/10"
              >
                <Text className="text-ink text-2xl font-semibold">{key}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={onClose}
              className="w-[31%] h-16 rounded-xl items-center justify-center active:bg-ink/5"
            >
              <Text className="text-ink/60 text-[13px] font-semibold">{tr("Cancel")}</Text>
            </Pressable>
            <Pressable
              onPress={() => press("0")}
              disabled={busy}
              className="w-[31%] h-16 rounded-xl items-center justify-center bg-ivory active:bg-ink/10"
            >
              <Text className="text-ink text-2xl font-semibold">0</Text>
            </Pressable>
            <Pressable
              onPress={() => setPin((p) => p.slice(0, -1))}
              accessibilityLabel={tr("Delete")}
              className="w-[31%] h-16 rounded-xl items-center justify-center active:bg-ink/5"
            >
              <Ionicons name="backspace-outline" size={22} color={brand.ink} />
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
