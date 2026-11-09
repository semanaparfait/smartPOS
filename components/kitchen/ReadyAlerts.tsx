import { orderNumber } from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import { useT } from "@/i18n";
import type { OrderType } from "@/store/Order/OrderType";
import useReadyAlerts from "@/store/Order/useReadyAlerts";
import { playBeep } from "@/utils/beep";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

const RING_EVERY_MS = 2_000;

// Sits above every screen and keeps ringing until the food is marked as served.
export default function ReadyAlerts() {
  const alerts = useReadyAlerts((s) => s.alerts);
  const markServed = useReadyAlerts((s) => s.markServed);
  const t = useT();
  const { width, height } = useWindowDimensions();
  const ringing = alerts.length > 0;

  useEffect(() => {
    if (!ringing) return;
    playBeep();
    const timer = setInterval(playBeep, RING_EVERY_MS);
    return () => clearInterval(timer);
  }, [ringing]);

  if (!ringing) return null;

  return (
    <View
      className="absolute"
      style={{ top: 12, right: 12, width: Math.min(360, width - 24), maxHeight: height - 24 }}
    >
      <ScrollView contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
        {alerts.map((alert) => (
          <View
            key={alert.id}
            className="bg-white rounded-xl overflow-hidden border border-ink/10"
            style={{
              shadowColor: brand.ink,
              shadowOpacity: 0.2,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <View className="h-1 bg-success" />
            <View className="p-4" style={{ gap: 10 }}>
              <View className="flex-row items-center">
                <Ionicons name="notifications" size={18} color={brand.success} />
                <Text className="flex-1 text-ink text-base font-bold ml-2">{t("ready.title")}</Text>
                <Text className="text-ink/50 text-xs font-semibold">
                  {orderNumber({ id: alert.id } as OrderType)}
                </Text>
              </View>
              {!!alert.place && (
                <View className="flex-row items-center self-start rounded-full bg-lime px-3 py-1.5">
                  <Ionicons name="location" size={14} color={brand.ink} />
                  <Text className="text-ink text-[14px] font-bold ml-1">{alert.place}</Text>
                </View>
              )}
              <View style={{ gap: 4 }}>
                {alert.items.map((item, i) => (
                  <View key={`${item.name}-${i}`}>
                    <Text className="text-ink text-sm font-semibold">
                      {item.quantity}× {item.name}
                    </Text>
                    {!!item.note && <Text className="text-ink/60 text-xs">{item.note}</Text>}
                  </View>
                ))}
              </View>
              {!!alert.orderedBy && (
                <Text className="text-ink/50 text-xs">{t("ready.orderedBy", { name: alert.orderedBy })}</Text>
              )}
              <Pressable
                onPress={() => markServed(alert)}
                className="h-11 rounded-lg bg-ink items-center justify-center active:bg-ink-soft"
              >
                <Text className="text-white text-sm font-bold">{t("ready.markServed")}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
