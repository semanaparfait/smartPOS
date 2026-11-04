import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import useDeviceInfo from "@/store/Device/useDeviceInfo";
import { getAuthToken } from "@/utils/authToken";
import { type Area, canEnter, homeFor } from "@/utils/home";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

// Wraps an area (owner, till or kitchen). After a refresh it waits for the
// signed-in profile instead of guessing, sends someone who doesn't belong here
// to their own home, and sends a signed-out visitor to the start screen.
export default function AreaGate({ area, children }: { area: Area; children: React.ReactNode }) {
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const deviceType = useDeviceInfo((s) => s.deviceType);
  const [deviceKnown, setDeviceKnown] = useState(false);

  useEffect(() => {
    useDeviceInfo
      .getState()
      .loadSavedDeviceType()
      .catch(() => {})
      .finally(() => setDeviceKnown(true));
  }, []);

  // A refresh keeps the token but not the profile: load it again.
  useEffect(() => {
    if (profile) return;
    let live = true;
    (async () => {
      const token = await getAuthToken();
      const loaded = token ? await useAuth.getState().fetchProfile() : null;
      if (live && !loaded) router.replace("/");
    })();
    return () => {
      live = false;
    };
  }, [profile, router]);

  const allowed = !!profile && deviceKnown && canEnter(area, profile, deviceType);

  useEffect(() => {
    if (profile && deviceKnown && !allowed) router.replace(homeFor(profile, deviceType) as any);
  }, [profile, deviceKnown, allowed, deviceType, router]);

  if (!allowed) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory">
        <ActivityIndicator color={brand.ink} />
      </View>
    );
  }
  return <>{children}</>;
}
