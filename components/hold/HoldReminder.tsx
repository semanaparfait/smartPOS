import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useCart from "@/store/Cart/useCart";
import type { CartResponse } from "@/store/Cart/cartTypes";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, Vibration, View } from "react-native";
import Toast from "react-native-toast-message";
import { atHoldLimit, cartTotal, holdMs, useMaxHold, useNow } from "./holdKit";

const CHIME = require("@/assets/sound/hold-reminder.wav");

// Plays once and frees itself; a sound that can't play (e.g. the browser blocks
// audio before any tap) is skipped, the card still shows.
const playChime = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(CHIME, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
    });
  } catch {}
};

// How long the worker first chose to wait; each "wait more" adds that again.
const waitSteps = new Map<string, number>();
const waitStep = (cart: CartResponse) => {
  if (!waitSteps.has(cart.id)) {
    const first = (holdMs(cart) - new Date(cart.heldAt ?? 0).getTime()) / 60_000;
    waitSteps.set(cart.id, Math.max(1, Math.round(first)));
  }
  return waitSteps.get(cart.id)!;
};

// Pops up on any till screen when a held sale's time is over: wait again, bring
// it back, or cancel it. Never past the longest hold the owner allows.
export default function HoldReminder() {
  const heldCarts = useCart((s) => s.heldCarts);
  const getHeldCarts = useCart((s) => s.getHeldCarts);
  const extendHold = useCart((s) => s.extendHold);
  const resumeHeld = useCart((s) => s.resumeHeld);
  const cancelHeld = useCart((s) => s.cancelHeld);
  const max = useMaxHold();
  const router = useRouter();
  const now = useNow(heldCarts.length > 0);
  const [busy, setBusy] = useState<"wait" | "resume" | "cancel" | null>(null);
  const buzzed = useRef<string | null>(null);

  useEffect(() => {
    getHeldCarts().catch(() => {});
  }, [getHeldCarts]);

  const due = heldCarts.find((c) => holdMs(c) <= now);
  const dueKey = due ? `${due.id}:${due.holdUntil}` : null;

  useEffect(() => {
    if (dueKey && buzzed.current !== dueKey) {
      buzzed.current = dueKey;
      Vibration.vibrate(400);
      playChime();
    }
  }, [dueKey]);

  if (!due) return null;

  const limitReached = atHoldLimit(due, max);
  const heldMinutes = Math.max(1, Math.round((now - new Date(due.heldAt ?? now).getTime()) / 60_000));
  // Never past the limit, counted from when the sale was first held.
  const untilLimit = new Date(due.heldAt ?? now).getTime() + max * 60_000 - Math.max(now, holdMs(due));
  const step = Math.max(1, Math.min(waitStep(due), Math.ceil(untilLimit / 60_000)));
  const items = due.items?.length ?? 0;

  const run = async (kind: "wait" | "resume" | "cancel") => {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === "wait") {
        await extendHold(due.id, step);
        Toast.show({ type: "success", text1: `${tr("Waiting")} ${step} min ${tr("more")}`, text2: due.heldFor ?? undefined });
      } else if (kind === "resume") {
        await resumeHeld(due.id);
        waitSteps.delete(due.id);
        router.push("/(tabs)/products/products");
        Toast.show({ type: "success", text1: tr("Sale back on the till"), text2: due.heldFor ?? undefined });
      } else {
        await cancelHeld(due.id);
        waitSteps.delete(due.id);
        Toast.show({ type: "success", text1: tr("Held sale cancelled"), text2: due.heldFor ?? undefined });
      }
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Something went wrong"), text2: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const button = (kind: "wait" | "resume" | "cancel", label: string, primary = false) => (
    <Pressable
      onPress={() => run(kind)}
      disabled={!!busy}
      className={`h-11 px-4 rounded-xl items-center justify-center ${
        primary
          ? "flex-1 bg-lime active:bg-lime-dark"
          : kind === "cancel"
            ? "border border-red-200 active:bg-red-50"
            : "border border-ink/10 active:bg-ivory"
      }`}
    >
      {busy === kind ? (
        <ActivityIndicator color={brand.ink} />
      ) : (
        <Text className="text-sm font-bold" style={{ color: kind === "cancel" ? brand.danger : brand.ink }}>
          {label}
        </Text>
      )}
    </Pressable>
  );

  return (
    <View pointerEvents="box-none" className="absolute top-4 left-4 right-4 items-center" style={{ zIndex: 50 }}>
      <View
        className="bg-white rounded-2xl p-4 w-full border border-ink/5"
        style={{
          maxWidth: 440,
          gap: 12,
          shadowColor: brand.ink,
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }}
      >
        <View className="flex-row items-start" style={{ gap: 12 }}>
          <View className="w-10 h-10 rounded-xl bg-lime items-center justify-center">
            <Ionicons name="time-outline" size={20} color={brand.ink} />
          </View>
          <View className="flex-1">
            <Text className="text-ink text-[15px] font-extrabold">
              {limitReached ? tr("Hold time is over") : tr("Still waiting?")}
            </Text>
            <Text className="text-ink/60 text-[13px] mt-0.5">
              {due.heldFor} · {items} {items === 1 ? tr("item") : tr("items")} · {cartTotal(due).toLocaleString()} RWF
            </Text>
            <Text className="text-ink/40 text-xs mt-0.5">
              {limitReached
                ? `${tr("Held for")} ${max} min, ${tr("the longest allowed.")}`
                : `${tr("Held for")} ${heldMinutes} min`}
            </Text>
          </View>
        </View>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {button("cancel", tr("Cancel sale"))}
          {limitReached
            ? button("resume", tr("Continue sale"), true)
            : (
              <>
                {button("resume", tr("Continue sale"))}
                {button("wait", `${tr("Wait")} ${step} min`, true)}
              </>
            )}
        </View>
      </View>
    </View>
  );
}
