import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";

import { loadVenue } from "@/components/venueMap/storage";
import type { Venue } from "@/components/venueMap/types";
import VenueMapViewer from "@/components/venueMap/VenueMapViewer";

// The owner's floor map, read-only, for cashiers and waiters.
export default function WorkerView() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  // Reload whenever the screen is shown, so owner edits appear without restarting.
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      loadVenue().then((v) => {
        if (!mounted) return;
        setVenue(v);
        setLoading(false);
      });
      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <View style={{ height: 640 }} className="rounded-2xl overflow-hidden">
      <VenueMapViewer venue={venue} loading={loading} title="Floor map" idPrefix="vmw" />
    </View>
  );
}
