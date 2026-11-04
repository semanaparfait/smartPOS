// Warns the desk when a booking's time is nearly up and when it is up. Sits above
// every screen like the kitchen's ready alerts: five minutes before, it beeps a
// few times; at the end it keeps ringing until someone taps.
import { kindMeta, runningTotal, rwf, timeOf } from "@/config/services";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useAuth from "@/store/Authentication/useAuth";
import usePermissions from "@/store/Authentication/usePermissions";
import type { Booking } from "@/store/Services/serviceTypes";
import useServices from "@/store/Services/useServices";
import { playBeep } from "@/utils/beep";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

const WARN_BEFORE_MS = 5 * 60_000;
const CHECK_EVERY_MS = 15_000;
const FETCH_EVERY_MS = 60_000;
const RING_EVERY_MS = 2_000;
const SOON_BEEPS = 3;
const DISMISSED_KEY = "smartpos.bookingAlerts.dismissed.v1";

type Stage = "soon" | "over";

interface Alert {
  key: string;
  stage: Stage;
  booking: Booking;
}

const keyOf = (id: string, stage: Stage) => `${id}:${stage}`;

export default function BookingAlerts() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const signedIn = useAuth((s) => !!s.profile);
  const { can, isOwner } = usePermissions();
  const watching = signedIn && can("services.manage");
  const onScreen = useServices((s) => s.bookings);
  const getActiveBookings = useServices((s) => s.getActiveBookings);

  const [fetched, setFetched] = useState<Booking[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const beeped = useRef(new Set<string>());

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((raw) => raw && setDismissed(new Set(JSON.parse(raw))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!watching) {
      setFetched([]);
      return;
    }
    const load = () => getActiveBookings().then(setFetched).catch(() => {});
    load();
    const fetchTimer = setInterval(load, FETCH_EVERY_MS);
    const clock = setInterval(() => setNow(Date.now()), CHECK_EVERY_MS);
    return () => {
      clearInterval(fetchTimer);
      clearInterval(clock);
    };
  }, [watching, getActiveBookings]);

  // The copy on screen is newer (checked out a moment ago, say) than the last fetch.
  const active = useMemo(() => {
    const byId = new Map(fetched.map((b) => [b.id, b]));
    onScreen.forEach((b) => byId.set(b.id, b));
    return [...byId.values()].filter((b) => b.status === "ACTIVE" && b.endAt);
  }, [fetched, onScreen]);

  const alerts = useMemo<Alert[]>(
    () =>
      active
        .map((booking) => {
          const end = new Date(booking.endAt!).getTime();
          const stage: Stage | null = now >= end ? "over" : now >= end - WARN_BEFORE_MS ? "soon" : null;
          return stage ? { key: keyOf(booking.id, stage), stage, booking } : null;
        })
        .filter((alert): alert is Alert => !!alert && !dismissed.has(alert.key))
        .sort((a, b) => new Date(a.booking.endAt!).getTime() - new Date(b.booking.endAt!).getTime()),
    [active, now, dismissed],
  );

  // Keeps the saved list short: only bookings still in use.
  useEffect(() => {
    if (!fetched.length) return;
    const live = new Set(active.map((b) => b.id));
    const kept = [...dismissed].filter((key) => live.has(key.split(":")[0]));
    if (kept.length !== dismissed.size) {
      setDismissed(new Set(kept));
      AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(kept)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const ringing = alerts.some((a) => a.stage === "over");
  const freshSoon = alerts.filter((a) => a.stage === "soon" && !beeped.current.has(a.key));

  useEffect(() => {
    if (!ringing) return;
    playBeep();
    const timer = setInterval(playBeep, RING_EVERY_MS);
    return () => clearInterval(timer);
  }, [ringing]);

  // A few beeps only, and not cancelled by the next redraw.
  useEffect(() => {
    if (!freshSoon.length || ringing) return;
    freshSoon.forEach((a) => beeped.current.add(a.key));
    for (let i = 0; i < SOON_BEEPS; i++) setTimeout(playBeep, i * RING_EVERY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshSoon.length, ringing]);

  const dismiss = (key: string) => {
    const next = new Set(dismissed).add(key);
    // Seen the end: the five-minute warning is no longer needed either.
    if (key.endsWith(":over")) next.add(key.replace(":over", ":soon"));
    setDismissed(next);
    AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])).catch(() => {});
  };

  const open = (alert: Alert) => {
    dismiss(alert.key);
    router.push(
      isOwner
        ? { pathname: "/(owner)/owner/services/bookings", params: { booking: alert.booking.id } }
        : { pathname: "/(till)/till/Services", params: { booking: alert.booking.id } },
    );
  };

  if (!alerts.length) return null;

  return (
    <View className="absolute" style={{ top: 12, left: 12, width: Math.min(360, width - 24), maxHeight: height - 24 }}>
      <ScrollView contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
        {alerts.map((alert) => {
          const { booking } = alert;
          const over = alert.stage === "over";
          const minutesLeft = Math.max(1, Math.ceil((new Date(booking.endAt!).getTime() - now) / 60_000));
          return (
            <View
              key={alert.key}
              className="bg-white rounded-xl overflow-hidden border border-ink/10"
              style={{
                shadowColor: brand.ink,
                shadowOpacity: 0.2,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <View className={`h-1 ${over ? "bg-danger" : "bg-lime"}`} />
              <View className="p-4" style={{ gap: 8 }}>
                <View className="flex-row items-center">
                  <Ionicons
                    name={over ? "alarm" : "hourglass-outline"}
                    size={18}
                    color={over ? brand.danger : brand.ink}
                  />
                  <Text className="flex-1 text-ink text-base font-semibold ml-2">
                    {over ? tr("Time is up") : `${tr("Ends in")} ${minutesLeft} ${tr("min")}`}
                  </Text>
                  <Text className="text-ink/50 text-xs font-semibold">{booking.code}</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name={kindMeta(booking.service.kind).icon} size={15} color={brand.inkMuted} />
                  <Text numberOfLines={1} className="text-ink text-sm font-semibold ml-1.5 flex-1">
                    {booking.service.name}
                    {booking.unit ? ` · ${booking.unit.name}` : ""}
                  </Text>
                </View>
                <Text className="text-ink/60 text-xs">
                  {booking.customerName} · {tr("Until")} {timeOf(booking.endAt!)} · {rwf(runningTotal(booking, new Date(now)).total)}
                </Text>
                <View className="flex-row" style={{ gap: 8 }}>
                  <Pressable
                    onPress={() => dismiss(alert.key)}
                    className="h-10 px-4 rounded-lg border border-ink/10 items-center justify-center active:bg-ivory"
                  >
                    <Text className="text-ink text-sm font-semibold">{tr("OK")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => open(alert)}
                    className="h-10 flex-1 rounded-lg bg-ink flex-row items-center justify-center active:bg-ink-soft"
                  >
                    <Ionicons name="log-out-outline" size={16} color={brand.lime} />
                    <Text className="text-white text-sm font-semibold ml-1.5">{tr("Open to check out")}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
