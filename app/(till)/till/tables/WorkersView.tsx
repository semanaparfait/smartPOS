import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";

import { loadVenueFrom } from "@/components/venueMap/storage";
import type { Venue } from "@/components/venueMap/types";
import VenueMapViewer from "@/components/venueMap/VenueMapViewer";
import { useVenueVersion } from "@/store/Venue/useVenueVersion";
import { tr } from "@/i18n";

// The owner's floor map for cashiers and waiters, from the server so every
// worker sees the same map. Reloads when shown and when the owner saves.
export default function WorkerView({
  height,
  onVenue,
}: {
  // Without a height the map fills the space it is given.
  height?: number;
  onVenue?: (venue: Venue | null, online: boolean) => void;
}) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const version = useVenueVersion((s) => s.version);

  const load = useCallback(() => {
    let mounted = true;
    loadVenueFrom().then(({ venue: v, online }) => {
      if (!mounted) return;
      setVenue(v);
      setLoading(false);
      onVenue?.(v, online);
    });
    return () => {
      mounted = false;
    };
  }, [onVenue]);

  useFocusEffect(load);
  useEffect(() => {
    if (version) return load();
  }, [version]);

  return (
    <View style={height ? { height } : { flex: 1 }} className="overflow-hidden">
      <VenueMapViewer venue={venue} loading={loading} title={tr("Floor map")} idPrefix="vmw" />
    </View>
  );
}
