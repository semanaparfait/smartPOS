import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isTable } from "@/components/venueMap/catalog";
import useTableState, { TABLE_STATUS, tableStatusOf, type TableStatus } from "@/components/venueMap/tableState";
import type { Venue } from "@/components/venueMap/types";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import { tr } from "@/i18n";
import WorkerView from "./WorkersView";

const STATUSES: TableStatus[] = ["available", "occupied", "reserved", "cleaning"];

// Tables: the floor map with every table's live state. Tap a table to seat
// guests, take their order, book it, take payment or print the bill.
export default function Tables() {
  const { height } = useWindowDimensions();
  const name = useAuth((s) => s.profile?.name);
  const { tables, load, online } = useTableState();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [mapOnline, setMapOnline] = useState(true);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  const onVenue = useCallback((v: Venue | null, isOnline: boolean) => {
    setVenue(v);
    setMapOnline(isOnline);
    useTableState
      .getState()
      .setLabels(Object.fromEntries((v?.floors ?? []).flatMap((f) => f.items.map((i) => [i.id, i.label || ""]))));
  }, []);

  const ids = useMemo(
    () => (venue?.floors ?? []).flatMap((f) => f.items.filter((i) => isTable(i.type)).map((i) => i.id)),
    [venue],
  );
  const counts = useMemo(() => {
    const c: Record<TableStatus, number> = { available: 0, occupied: 0, reserved: 0, cleaning: 0 };
    for (const id of ids) c[tableStatusOf(tables, id)] += 1;
    return c;
  }, [ids, tables]);

  // Bookings coming up today, soonest first.
  const bookings = useMemo(() => {
    const labels = new Map((venue?.floors ?? []).flatMap((f) => f.items.map((i) => [i.id, i.label || ""] as const)));
    return Object.entries(tables)
      .filter(([id, t]) => t.status === "reserved" && t.booking && labels.has(id))
      .map(([id, t]) => ({ id, label: labels.get(id)!, ...t.booking! }))
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .slice(0, 6);
  }, [tables, venue]);

  const isOnline = online && mapOnline;

  return (
    <SafeAreaView className="flex-1 bg-ivory" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 8 }}>
          <View>
            <Text className="text-ink text-2xl font-bold tracking-tight">{tr("Tables")}</Text>
            <Text className="text-ink/55 text-[13px] mt-0.5">
              {name ? `${name} · ` : ""}
              {tr("Tap a table to serve it")}
            </Text>
          </View>
          <View className={`flex-row items-center rounded-full px-3 h-8 ${isOnline ? "bg-white" : "bg-amber-100"}`}>
            <Ionicons name={isOnline ? "cloud-done-outline" : "cloud-offline-outline"} size={15} color={isOnline ? "#15803d" : "#B45309"} />
            <Text className={`text-[12px] font-semibold ml-1.5 ${isOnline ? "text-green-700" : "text-amber-800"}`}>
              {isOnline ? tr("Live for all workers") : tr("Offline: last known state")}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          <View className="bg-ink rounded-2xl px-4 py-3" style={{ minWidth: 120 }}>
            <Text className="text-white/60 text-[12px] font-medium">{tr("All tables")}</Text>
            <Text className="text-white text-2xl font-bold mt-0.5">{ids.length}</Text>
          </View>
          {STATUSES.map((s) => (
            <View key={s} className="bg-white rounded-2xl border border-ink/5 px-4 py-3" style={{ minWidth: 120 }}>
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TABLE_STATUS[s].color }} />
                <Text className="text-ink/60 text-[12px] font-medium ml-1.5">{tr(TABLE_STATUS[s].label)}</Text>
              </View>
              <Text className="text-ink text-2xl font-bold mt-0.5">{counts[s]}</Text>
            </View>
          ))}
        </View>

        {bookings.length > 0 && (
          <View className="bg-white rounded-2xl border border-ink/5 p-4" style={{ gap: 8 }}>
            <Text className="text-ink text-[14px] font-semibold">{tr("Bookings")}</Text>
            {bookings.map((b) => (
              <View key={b.id} className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="min-w-[40px] h-7 px-2 rounded-lg items-center justify-center" style={{ backgroundColor: TABLE_STATUS.reserved.color }}>
                    <Text className="text-white text-[12px] font-semibold">{b.label}</Text>
                  </View>
                  <Text numberOfLines={1} className="text-ink text-[13px] ml-2 flex-1">
                    {b.name}
                    {b.guests ? ` · ${b.guests} ${tr("guests")}` : ""}
                  </Text>
                </View>
                <Text className="text-ink text-[13px] font-semibold">
                  {new Date(b.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
          <WorkerView height={Math.max(520, height - 220)} onVenue={onVenue} />
        </View>

        {venue === null && (
          <View className="flex-row items-center bg-white rounded-2xl p-4">
            <Ionicons name="information-circle-outline" size={18} color={brand.ink} />
            <Text className="text-ink/70 text-[13px] ml-2 flex-1">
              {tr("No floor map yet. The owner draws it in Floor map, and it shows here for every worker.")}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
