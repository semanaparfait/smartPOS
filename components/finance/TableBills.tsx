// Table orders (from the floor map) waiting for their payment to be verified.
// The waiter printed the bill and the customer paid; here the cashier says how
// (cash, MoMo, card…) on the checkout screen, which prints the receipt and
// frees the table. Shown at the top of Finance → Verification.
import { formatRwf, formatTime, itemCount, orderNumber, PlaceTag } from "@/components/orders/orderKit";
import { API_URL } from "@/config/api";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import { hasFeature } from "@/config/features";
import useAuth from "@/store/Authentication/useAuth";
import useOrder from "@/store/Order/Order";
import type { OrderType } from "@/store/Order/OrderType";
import { getAuthToken } from "@/utils/authToken";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export async function fetchTableBills(): Promise<OrderType[]> {
  const token = await getAuthToken();
  if (!token) throw new Error("User not authenticated");
  const res = await fetch(`${API_URL}/api/v1/orders/to-verify`, {
    headers: { "ngrok-skip-browser-warning": "true", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Could not load table orders");
  return res.json();
}

const waiterOf = (o: OrderType) => o.user?.employee?.name ?? o.user?.name ?? tr("Unknown");

// Only places that use the floor map (restaurants, bars); a shop sells at the counter.
export default function TableBills() {
  const floorMapOn = hasFeature(useAuth((st) => st.profile), "floorMap");
  return floorMapOn ? <TableBillsList /> : null;
}

function TableBillsList() {
  const router = useRouter();
  const [bills, setBills] = useState<OrderType[] | null>(null);
  const [error, setError] = useState(false);
  // Any order change on this phone (realtime or local) may add or remove one.
  const ordersVersion = useOrder((s) => s.orders);

  const load = useCallback(async () => {
    try {
      setBills(await fetchTableBills());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  // On opening the screen, when coming back from a payment, and every 20 s.
  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 20000);
      return () => clearInterval(t);
    }, [load]),
  );
  useEffect(() => {
    load();
  }, [ordersVersion, load]);

  const total = (bills ?? []).reduce((s, o) => s + Number(o.total || 0), 0);

  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-4" style={{ gap: 12 }}>
      <View className="flex-row items-center justify-between" style={{ gap: 10 }}>
        <View className="flex-row items-center flex-1">
          <View className="w-9 h-9 rounded-xl bg-lime items-center justify-center">
            <Ionicons name="restaurant-outline" size={17} color={brand.ink} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-ink text-[15px] font-bold">{tr("Table orders to verify")}</Text>
            <Text className="text-ink/50 text-[12px]">
              {tr("The waiter gave the bill. When the customer has paid, verify how they paid.")}
            </Text>
          </View>
        </View>
        {bills && bills.length > 0 && (
          <View className="items-end">
            <Text className="text-ink text-[15px] font-extrabold">{formatRwf(total)}</Text>
            <Text className="text-ink/45 text-[11px]">
              {bills.length} {bills.length === 1 ? tr("order") : tr("orders")}
            </Text>
          </View>
        )}
      </View>

      {bills === null && !error ? (
        <ActivityIndicator color={brand.ink} />
      ) : error ? (
        <Pressable onPress={load} className="h-10 rounded-xl bg-ivory items-center justify-center active:opacity-80">
          <Text className="text-ink/60 text-[13px] font-semibold">{tr("Could not load. Tap to try again.")}</Text>
        </Pressable>
      ) : bills!.length === 0 ? (
        <View className="flex-row items-center bg-ivory rounded-xl px-3 py-3">
          <Ionicons name="checkmark-circle-outline" size={16} color={brand.ink} />
          <Text className="text-ink/60 text-[13px] ml-2">{tr("No table is waiting. Every table order is verified.")}</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {bills!.map((o) => (
            <View key={o.id} className="flex-row flex-wrap items-center rounded-xl border border-ink/8 px-3 py-2.5" style={{ gap: 10 }}>
              <View className="flex-1 min-w-[180px]" style={{ gap: 4 }}>
                <PlaceTag order={o} size="md" />
                <Text className="text-ink/55 text-[12px]">
                  {orderNumber(o)} · {waiterOf(o)} · {itemCount(o)} {tr("items")} · {formatTime(o.createdAt)}
                </Text>
                <Text className="text-ink/45 text-[11px]" numberOfLines={1}>
                  {o.items.map((i) => `${i.quantity}× ${i.product?.name ?? ""}`).join(", ")}
                </Text>
              </View>
              <Text className="text-ink text-[15px] font-extrabold">{formatRwf(o.total)}</Text>
              <Pressable
                onPress={() => router.push({ pathname: "/(till)/till/checkout/checkout", params: { orderId: o.id } })}
                className="flex-row items-center h-10 px-4 rounded-xl bg-ink active:opacity-85"
              >
                <Ionicons name="shield-checkmark-outline" size={15} color={brand.lime} />
                <Text className="text-white text-[13px] font-bold ml-1.5">{tr("Verify payment")}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
