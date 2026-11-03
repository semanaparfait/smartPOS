import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useCart from "@/store/Cart/useCart";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { countdown, holdMs, useNow } from "./holdKit";

// Sales on hold, above the products: tap one to bring it back to the till.
export default function HeldSalesBar() {
  const heldCarts = useCart((s) => s.heldCarts);
  const resumeHeld = useCart((s) => s.resumeHeld);
  const now = useNow(heldCarts.length > 0);
  const [opening, setOpening] = useState<string | null>(null);

  if (heldCarts.length === 0) return null;

  const resume = async (cartId: string, name?: string | null) => {
    if (opening) return;
    setOpening(cartId);
    try {
      await resumeHeld(cartId);
      Toast.show({ type: "success", text1: tr("Sale back on the till"), text2: name ?? undefined });
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not continue the sale"), text2: (error as Error).message });
    } finally {
      setOpening(null);
    }
  };

  return (
    <View className="mb-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: "center" }}
      >
        <View className="flex-row items-center mr-1">
          <Ionicons name="pause-circle-outline" size={16} color={brand.inkMuted} />
          <Text className="text-ink/50 text-[11px] font-bold uppercase tracking-wider ml-1">
            {tr("On hold")}
          </Text>
        </View>
        {heldCarts.map((cart) => {
          const left = holdMs(cart) - now;
          const late = left <= 0;
          const items = cart.items?.length ?? 0;
          return (
            <Pressable
              key={cart.id}
              onPress={() => resume(cart.id, cart.heldFor)}
              accessibilityLabel={`${tr("Continue sale for")} ${cart.heldFor}`}
              className={`h-10 flex-row items-center rounded-xl border px-3 ${
                late ? "bg-white border-danger" : "bg-white border-ink/10 active:bg-ivory"
              }`}
              style={{ gap: 8 }}
            >
              <Text numberOfLines={1} className="text-ink text-[13px] font-semibold max-w-[140px]">
                {cart.heldFor}
              </Text>
              <Text className="text-ink/40 text-xs">
                {items} {items === 1 ? tr("item") : tr("items")}
              </Text>
              {opening === cart.id ? (
                <ActivityIndicator size="small" color={brand.ink} />
              ) : (
                <Text
                  className="text-xs font-bold"
                  style={{ color: late ? brand.danger : brand.ink, fontVariant: ["tabular-nums"] }}
                >
                  {late ? tr("Time up") : countdown(left)}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
