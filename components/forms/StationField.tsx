import { ChoiceChips, Label } from "@/components/forms/FormKit";
import { tr } from "@/i18n";
import useStations from "@/store/Station/useStations";
import React, { useEffect } from "react";
import { Text, View } from "react-native";

// The role prepares orders on a kitchen screen.
export const isKitchenRole = (role?: { permissions?: string[] | null } | null) =>
  !!role?.permissions?.includes("kitchen.prepare");

// A cook's kitchen station: they sign in on its screen and start only its
// orders. Shown only once the shop has stations. "" = any station.
export default function StationField({ value, onChange }: { value: string; onChange: (stationId: string) => void }) {
  const stations = useStations((s) => s.stations);

  useEffect(() => {
    useStations.getState().load().catch(() => {});
  }, []);

  if (stations.length < 1) return null;

  return (
    <View>
      <Label>{tr("Kitchen station")}</Label>
      <ChoiceChips
        options={[
          { value: "", label: tr("Any station"), icon: "apps-outline" },
          ...stations.map((s) => ({ value: s.id, label: s.name, icon: "flame-outline" as const })),
        ]}
        value={value}
        onChange={onChange}
      />
      <Text className="text-ink/40 text-[11px] mt-1.5">
        {tr("They sign in only on this station's screen and start only its orders.")}
      </Text>
    </View>
  );
}
