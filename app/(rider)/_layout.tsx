import AreaGate from "@/components/AreaGate";
import { BrandMark } from "@/components/brand";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useAuth from "@/store/Authentication/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { Slot, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// A rider's phone: no till sidebar, just their board, their profile and sign-out.
function RiderShell() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const logout = useAuth((s) => s.logout);
  // Two-tap sign-out, like the till: the first tap arms it for 3s.
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const signOut = async () => {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    await logout();
    router.replace("/");
  };

  return (
    <View className="flex-1 bg-ivory">
      <View
        className="flex-row items-center bg-ink px-4 pb-3"
        style={{ paddingTop: insets.top + 12, gap: 10 }}
      >
        <BrandMark />
        <View className="flex-1" />
        <Pressable
          onPress={() => router.push("/(till)/till/profile/profile")}
          accessibilityLabel={tr("Profile")}
          className="h-10 w-10 rounded-xl bg-white/10 items-center justify-center active:bg-white/20"
        >
          <Ionicons name="person-circle-outline" size={20} color={brand.white} />
        </Pressable>
        <Pressable
          onPress={signOut}
          className={`h-10 px-3 rounded-xl flex-row items-center ${armed ? "bg-danger" : "bg-white/10 active:bg-white/20"}`}
          style={{ gap: 6 }}
        >
          <Ionicons name="log-out-outline" size={18} color={brand.white} />
          <Text className="text-white text-[13px] font-semibold">{armed ? tr("Tap again") : tr("Log out")}</Text>
        </Pressable>
      </View>
      <Slot />
    </View>
  );
}

export default function RiderLayout() {
  return (
    <AreaGate area="rider">
      <RiderShell />
    </AreaGate>
  );
}
