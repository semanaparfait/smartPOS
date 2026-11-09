import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isTable } from "@/components/venueMap/catalog";
import useTableState, { TABLE_STATUS, tableStatusOf, type TableStatus } from "@/components/venueMap/tableState";
import type { Venue } from "@/components/venueMap/types";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import WorkerView from "./WorkersView";

const STATUSES: TableStatus[] = ["available", "occupied", "reserved", "cleaning"];

// Tables: the floor map on the whole screen with every table's live state.
// Tap a table to seat guests, take their order, book it or take payment.
export default function Tables() {
  const { tables, load, online } = useTableState();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [mapOnline, setMapOnline] = useState(true);
  const [showBookings, setShowBookings] = useState(false);

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

  // Bookings coming up, soonest first.
  const bookings = useMemo(() => {
    const labels = new Map((venue?.floors ?? []).flatMap((f) => f.items.map((i) => [i.id, i.label || ""] as const)));
    return Object.entries(tables)
      .filter(([id, t]) => t.status === "reserved" && t.booking && labels.has(id))
      .map(([id, t]) => ({ id, label: labels.get(id)!, ...t.booking! }))
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [tables, venue]);

  const isOnline = online && mapOnline;

  return (
    <SafeAreaView className="flex-1 bg-ivory" edges={["top"]}>
      {/* One slim bar: counts, live state, bookings. The map gets the rest. */}
      <View className="flex-row flex-wrap items-center px-3 pt-2 pb-1" style={{ gap: 6 }}>
        <Text className="text-ink text-lg font-bold tracking-tight mr-1">{tr("Tables")}</Text>
        <View className="flex-row items-center rounded-full bg-ink px-2.5 h-7">
          <Text className="text-white text-[12px] font-semibold">
            {ids.length} {tr("All tables").toLowerCase()}
          </Text>
        </View>
        {STATUSES.map((s) => (
          <View key={s} className="flex-row items-center rounded-full bg-white border border-ink/5 px-2.5 h-7">
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TABLE_STATUS[s].color }} />
            <Text className="text-ink/70 text-[12px] ml-1.5">{tr(TABLE_STATUS[s].label)}</Text>
            <Text className="text-ink text-[12px] font-semibold ml-1">{counts[s]}</Text>
          </View>
        ))}
        <View className="flex-1" />
        {bookings.length > 0 && (
          <Pressable
            onPress={() => setShowBookings((o) => !o)}
            className={`flex-row items-center rounded-full px-3 h-8 ${showBookings ? "bg-ink" : "bg-white border border-ink/10 active:bg-ivory"}`}
          >
            <Ionicons name="bookmark" size={13} color={showBookings ? brand.lime : TABLE_STATUS.reserved.color} />
            <Text className={`text-[12px] font-semibold ml-1.5 ${showBookings ? "text-white" : "text-ink"}`}>
              {tr("Bookings")} {bookings.length}
            </Text>
          </Pressable>
        )}
        <View className={`flex-row items-center rounded-full px-2.5 h-8 ${isOnline ? "bg-white" : "bg-amber-100"}`}>
          <Ionicons name={isOnline ? "cloud-done-outline" : "cloud-offline-outline"} size={14} color={isOnline ? "#15803d" : "#B45309"} />
          <Text className={`text-[12px] font-semibold ml-1 ${isOnline ? "text-green-700" : "text-amber-800"}`}>
            {isOnline ? tr("Live") : tr("Offline: last known state")}
          </Text>
        </View>
      </View>

      <View className="flex-1">
        <WorkerView onVenue={onVenue} />

        {/* Bookings, over the map while open */}
        {showBookings && bookings.length > 0 && (
          <View className="absolute right-4 top-2 bg-white rounded-2xl border border-ink/10 p-3" style={{ width: 300, maxWidth: "92%", maxHeight: "70%" }}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-ink text-[14px] font-semibold">{tr("Bookings")}</Text>
              <Pressable onPress={() => setShowBookings(false)} accessibilityLabel={tr("Close")} className="w-7 h-7 rounded-lg items-center justify-center active:bg-ivory">
                <Ionicons name="close" size={16} color={brand.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8 }}>
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
            </ScrollView>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
