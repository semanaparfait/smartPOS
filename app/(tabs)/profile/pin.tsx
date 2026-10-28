import { isWeakPin, PIN_LENGTH, ProfilePage, Rule } from "@/components/profile/profileKit";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, useWindowDimensions, View } from "react-native";

type Step = 0 | 1 | 2;

const STEPS: { title: string; hint: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { title: "Current PIN", hint: "Enter the PIN you use today.", icon: "key-outline" },
  { title: "New PIN", hint: "Choose 6 digits that are easy for you, hard for others.", icon: "keypad-outline" },
  { title: "Confirm new PIN", hint: "Enter your new PIN again.", icon: "checkmark-done-outline" },
];

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const tap = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};
const buzz = () => {
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

function Key({
  onPress,
  onLongPress,
  ghost,
  disabled,
  label,
  children,
}: {
  onPress: () => void;
  onLongPress?: () => void;
  ghost?: boolean;
  disabled?: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityLabel={label}
      className={`w-[31%] h-16 rounded-xl items-center justify-center ${
        ghost ? "active:bg-ink/5" : "bg-ivory active:bg-ink/10"
      }`}
    >
      {children}
    </Pressable>
  );
}

function StepRow({ index, step }: { index: Step; step: Step }) {
  const done = index < step;
  const current = index === step;
  return (
    <View className="flex-row items-center">
      <View
        className={`w-8 h-8 rounded-full items-center justify-center ${
          done ? "bg-lime" : current ? "bg-white" : "bg-white/10"
        }`}
      >
        {done ? (
          <Ionicons name="checkmark" size={16} color={brand.ink} />
        ) : (
          <Text className={`text-[13px] font-bold ${current ? "text-ink" : "text-white/40"}`}>{index + 1}</Text>
        )}
      </View>
      <View className="ml-3 flex-1">
        <Text className={`text-[13px] font-semibold ${current ? "text-white" : done ? "text-white/70" : "text-white/40"}`}>
          {STEPS[index].title}
        </Text>
        {current && <Text className="text-white/50 text-[11px] mt-0.5">{STEPS[index].hint}</Text>}
      </View>
    </View>
  );
}

export default function ChangePin() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { changePin } = useAuth();

  const [step, setStep] = useState<Step>(0);
  const [pins, setPins] = useState(["", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [current, next, confirm] = pins;
  const entry = pins[step];
  const isWide = width >= 900;

  const setEntry = (value: string) =>
    setPins((prev) => prev.map((p, i) => (i === step ? value : p)));

  const press = (digit: string) => {
    if (saving || entry.length >= PIN_LENGTH) return;
    tap();
    setError(null);
    setEntry(entry + digit);
  };
  const backspace = () => {
    if (saving) return;
    setError(null);
    setEntry(entry.slice(0, -1));
  };
  const clear = () => {
    if (saving) return;
    setError(null);
    setEntry("");
  };

  // Restart from a step with a message, clearing that step and the ones after it.
  const failAt = (at: Step, message: string) => {
    buzz();
    setPins((prev) => prev.map((p, i) => (i >= at ? "" : p)));
    setStep(at);
    setError(message);
  };

  const submit = async (newPin: string) => {
    setSaving(true);
    try {
      await changePin(current, newPin);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch (e) {
      const message = (e as Error).message;
      // A wrong current PIN sends them back to the start; anything else to the new PIN.
      failAt(/current pin/i.test(message) ? 0 : 1, message);
    } finally {
      setSaving(false);
    }
  };

  // Move on as soon as a step has all 6 digits.
  useEffect(() => {
    if (entry.length !== PIN_LENGTH) return;
    const timer = setTimeout(() => {
      if (step === 0) setStep(1);
      else if (step === 1) {
        if (isWeakPin(next)) failAt(1, "That PIN is too easy to guess. Avoid repeated or ordered digits.");
        else if (next === current) failAt(1, "Your new PIN must be different from the current one.");
        else setStep(2);
      } else if (confirm !== next) failAt(2, "The PINs don't match. Enter your new PIN again.");
      else submit(confirm);
    }, 180);
    return () => clearTimeout(timer);
  }, [entry, step]);

  // Number keys on web / desktop.
  useEffect(() => {
    if (Platform.OS !== "web" || done) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape") clear();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const goBack = () => {
    if (step === 0) return router.back();
    setError(null);
    setPins((prev) => prev.map((p, i) => (i >= step - 1 ? "" : p)));
    setStep((step - 1) as Step);
  };

  const sixDigits = next.length === PIN_LENGTH;

  const guide = (
    <View className="bg-ink rounded-3xl p-6 overflow-hidden">
      <View
        className="absolute rounded-full bg-lime/10"
        style={{ width: 220, height: 220, right: -80, top: -110 }}
      />
      <View className="w-11 h-11 rounded-2xl bg-lime items-center justify-center">
        <Ionicons name="shield-checkmark" size={20} color={brand.ink} />
      </View>
      <Text className="text-white text-lg font-bold mt-4">Keep your till secure</Text>
      <Text className="text-white/50 text-xs leading-5 mt-1">
        Your PIN signs you in at the till. Never share it, even with your manager.
      </Text>

      <View className="mt-6" style={{ gap: 14 }}>
        {([0, 1, 2] as Step[]).map((i) => (
          <StepRow key={i} index={i} step={done ? (3 as Step) : step} />
        ))}
      </View>

      <View className="mt-6 pt-5 border-t border-white/10" style={{ gap: 8 }}>
        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[2px]">A good PIN</Text>
        {[
          { ok: sixDigits, label: "Has exactly 6 digits" },
          { ok: sixDigits && !isWeakPin(next), label: "Isn't repeated or in order (111111, 123456)" },
          { ok: sixDigits && next !== current, label: "Is different from your current PIN" },
        ].map((rule) => (
          <View key={rule.label} className="flex-row items-center">
            <Ionicons
              name={rule.ok ? "checkmark-circle" : "ellipse-outline"}
              size={14}
              color={rule.ok ? brand.lime : "rgba(255,255,255,0.3)"}
            />
            <Text className={`text-xs ml-2 ${rule.ok ? "text-white" : "text-white/50"}`}>{rule.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const pad = done ? (
    <View className="bg-white rounded-3xl border border-ink/5 p-8 items-center">
      <View className="w-20 h-20 rounded-full bg-lime items-center justify-center">
        <Ionicons name="checkmark" size={40} color={brand.ink} />
      </View>
      <Text className="text-ink text-xl font-bold mt-5">PIN changed</Text>
      <Text className="text-ink/50 text-[13px] text-center mt-1.5 max-w-[280px]">
        Use your new PIN the next time you sign in at the till.
      </Text>
      <View className="w-full mt-7" style={{ gap: 10 }}>
        <Rule ok label="Your old PIN no longer works" />
        <Rule ok label="Your new PIN works on every till in your company" />
      </View>
      <Pressable
        onPress={() => router.back()}
        className="w-full h-14 rounded-xl bg-lime active:bg-lime-dark items-center justify-center flex-row mt-7"
      >
        <Ionicons name="arrow-back" size={18} color={brand.ink} />
        <Text className="text-ink text-[15px] font-bold ml-2">Back to profile</Text>
      </Pressable>
    </View>
  ) : (
    <View className="bg-white rounded-3xl border border-ink/5 p-6">
      {/* Progress */}
      <View className="flex-row" style={{ gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-ink" : "bg-ink/10"}`} />
        ))}
      </View>

      <View className="items-center mt-6">
        <View className="w-12 h-12 rounded-2xl bg-ivory items-center justify-center">
          <Ionicons name={STEPS[step].icon} size={22} color={brand.ink} />
        </View>
        <Text className="text-ink/40 text-[10px] font-bold uppercase tracking-[2px] mt-4">
          Step {step + 1} of 3
        </Text>
        <Text className="text-ink text-xl font-bold mt-1">{STEPS[step].title}</Text>
        <Text className="text-ink/50 text-[13px] text-center mt-1">{STEPS[step].hint}</Text>
      </View>

      {/* Dots */}
      <View className="h-16 flex-row items-center justify-center mt-3" style={{ gap: 16 }}>
        {saving ? (
          <ActivityIndicator color={brand.ink} />
        ) : (
          Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 ${
                error ? "bg-danger border-danger" : i < entry.length ? "bg-ink border-ink" : "border-ink/20"
              }`}
            />
          ))
        )}
      </View>

      <View className="min-h-[36px] items-center justify-center px-2">
        {error ? (
          <View className="flex-row items-center bg-danger/10 rounded-full px-3 py-1.5">
            <Ionicons name="alert-circle" size={14} color={brand.danger} />
            <Text className="text-xs font-medium ml-1.5" style={{ color: brand.danger }}>
              {error}
            </Text>
          </View>
        ) : saving ? (
          <Text className="text-ink/50 text-xs">Saving your new PIN...</Text>
        ) : null}
      </View>

      {/* Keypad */}
      <View className="flex-row flex-wrap justify-between mt-3" style={{ rowGap: 12 }}>
        {KEYS.map((n) => (
          <Key key={n} onPress={() => press(n)} disabled={saving}>
            <Text className="text-ink text-2xl font-semibold">{n}</Text>
          </Key>
        ))}
        <Key ghost onPress={clear} disabled={saving} label="Clear">
          <Text className="text-ink/50 text-xs font-bold uppercase tracking-[1.5px]">Clear</Text>
        </Key>
        <Key onPress={() => press("0")} disabled={saving}>
          <Text className="text-ink text-2xl font-semibold">0</Text>
        </Key>
        <Key ghost onPress={backspace} onLongPress={clear} disabled={saving} label="Delete">
          <Ionicons name="backspace-outline" size={24} color={brand.ink} />
        </Key>
      </View>

      <Pressable
        onPress={goBack}
        disabled={saving}
        className="flex-row items-center justify-center h-11 mt-4 rounded-xl active:bg-ivory"
      >
        <Ionicons name="arrow-back" size={14} color={brand.inkMuted} />
        <Text className="text-ink/60 text-[13px] font-semibold ml-1.5">
          {step === 0 ? "Cancel" : `Back to ${STEPS[step - 1].title.toLowerCase()}`}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <ProfilePage wide title="Change PIN" subtitle="The 6-digit PIN you use to sign in at the till.">
      <View className={isWide ? "flex-row items-start" : ""} style={{ gap: 20 }}>
        <View style={isWide ? { width: 340 } : undefined}>{guide}</View>
        <View className={isWide ? "flex-1 items-center" : ""}>
          <View style={{ width: "100%", maxWidth: 420 }}>{pad}</View>
        </View>
      </View>
    </ProfilePage>
  );
}
