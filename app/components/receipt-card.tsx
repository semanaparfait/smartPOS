import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { Text, View, ActivityIndicator } from "react-native";
import useOrder from "@/store/Order/Order";
import { useLocalSearchParams } from "expo-router";
import { brand } from "@/config/theme";

type ReceiptCardProps = {
  cashierName?: string;
  shiftName?: string;
  // When provided, the card renders this order instead of fetching it.
  order?: any;
  // Must match the screen background so the perforations look cut out.
  cutoutColor?: string;
};

function Perforation({ color }: { color: string }) {
  return (
    <View className="flex-row items-center my-5" style={{ marginHorizontal: -24 }}>
      <View
        className="w-5 h-5 rounded-full"
        style={{ backgroundColor: color, marginLeft: -10 }}
      />
      <View className="flex-1 border-t-2 border-dashed border-ink/10 mx-2" />
      <View
        className="w-5 h-5 rounded-full"
        style={{ backgroundColor: color, marginRight: -10 }}
      />
    </View>
  );
}

function ZigzagEdge({ color }: { color: string }) {
  return (
    <View className="flex-row overflow-hidden h-2.5 bg-white">
      {Array.from({ length: 48 }).map((_, i) => (
        <View
          key={i}
          className="w-2.5 h-2.5 rounded-full mx-[1px]"
          style={{ backgroundColor: color, marginTop: 5 }}
        />
      ))}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-ink/60 text-sm">{label}</Text>
      <Text className="text-ink font-semibold text-sm">{value}</Text>
    </View>
  );
}

export default function ReceiptCard({
  cashierName = "Semana",
  shiftName = "Morning",
  order,
  cutoutColor = brand.ivory,
}: ReceiptCardProps) {
  const { fetchOrderById, orders } = useOrder();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [loading, setLoading] = useState(!order);
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  useEffect(() => {
    if (order) return;
    const fetchOrderDetails = async () => {
      if (orderId && typeof orderId === "string") {
        try {
          setLoading(true);
          const result = await fetchOrderById(orderId);
          if (result) {
            setCurrentOrder(result);
          }
        } catch (error) {
          console.error("Error fetching receipt mapping context:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [order, orderId, fetchOrderById]);

  const activeOrder =
    order || currentOrder || orders?.find((o: any) => o.id === orderId);

  if (loading && !activeOrder) {
    return (
      <View className="p-12 items-center justify-center bg-white rounded-2xl border border-ink/5">
        <ActivityIndicator color={brand.ink} size="small" />
        <Text className="text-xs text-ink/40 mt-3 font-medium">
          Preparing receipt...
        </Text>
      </View>
    );
  }

  if (!activeOrder) {
    return (
      <View className="p-10 items-center justify-center bg-white rounded-2xl border border-dashed border-ink/10">
        <View className="bg-ivory p-3 rounded-full mb-3">
          <Ionicons name="document-text-outline" size={28} color={brand.inkDisabled} />
        </View>
        <Text className="text-sm font-bold text-ink">Order not found</Text>
        <Text className="text-xs text-ink/40 mt-1 text-center">
          No receipt matches ID {orderId}
        </Text>
      </View>
    );
  }

  const subtotalVal = parseFloat(activeOrder.subtotal || "0");
  const taxVal = parseFloat(activeOrder.tax || "0");
  const totalVal = parseFloat(activeOrder.total || "0");
  const vatVal = taxVal > 0 ? taxVal : Math.round(subtotalVal * 0.18);

  const totalItemsCount =
    activeOrder.items?.reduce(
      (sum: number, item: any) => sum + (item.quantity || 0),
      0,
    ) || 0;
  const shortSaleCode = activeOrder.id
    ? activeOrder.id.split("-")[0].toUpperCase()
    : "0000";

  const createdAt = activeOrder.createdAt
    ? new Date(activeOrder.createdAt)
    : new Date();
  const formattedDate = createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const formattedTime = createdAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const status = String(activeOrder.status || "CONFIRMED").toUpperCase();
  const isCancelled = status === "CANCELLED";

  return (
    <View>
      <View
        className="bg-white rounded-t-2xl overflow-hidden"
        style={{
          shadowColor: brand.ink,
          shadowOpacity: 0.08,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 6,
        }}
      >
        {/* Top band */}
        <View className="bg-ink py-3 px-5 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="receipt-outline" size={13} color={brand.lime} />
            <Text className="text-white font-bold tracking-[3px] text-[10px] uppercase ml-2">
              Official Tax Receipt
            </Text>
          </View>
          <View
            className={`px-2 py-0.5 rounded-full ${isCancelled ? "bg-white" : "bg-lime"}`}
          >
            <Text
              className="text-[9px] font-extrabold tracking-wider"
              style={{ color: isCancelled ? brand.danger : brand.ink }}
            >
              {status}
            </Text>
          </View>
        </View>

        <View className="px-6 pt-6 pb-4">
          {/* Header */}
          <View className="items-center">
            <View className="w-14 h-14 rounded-full bg-ivory border border-ink/5 items-center justify-center mb-2.5">
              <Ionicons name="business" size={24} color={brand.ink} />
            </View>
            <Text className="text-xl font-extrabold text-ink tracking-tight">
              SMART POS LTD
            </Text>
            <Text className="text-ink/40 text-[11px] text-center mt-1 leading-4 font-medium">
              KG 12 Ave, Building 45, 2nd Floor{"\n"}
              Kigali, Rwanda • TIN: 102938475
            </Text>
            <View className="flex-row items-center mt-2 bg-ivory px-2.5 py-1 rounded-full">
              <Ionicons name="call" size={10} color={brand.inkMuted} />
              <Text className="text-ink/60 text-[10px] font-semibold ml-1">
                +250 788 000 000
              </Text>
            </View>
          </View>

          {/* Meta */}
          <View className="flex-row mt-5 rounded-xl bg-ivory">
            <View className="flex-1 p-3 border-r border-ink/5">
              <Text className="text-[9px] font-bold text-ink/40 uppercase tracking-widest">
                Receipt
              </Text>
              <Text className="text-xs font-extrabold text-ink mt-1">
                #{shortSaleCode}
              </Text>
            </View>
            <View className="flex-1 p-3 border-r border-ink/5">
              <Text className="text-[9px] font-bold text-ink/40 uppercase tracking-widest">
                Date
              </Text>
              <Text className="text-xs font-bold text-ink mt-1">
                {formattedDate}
              </Text>
            </View>
            <View className="flex-1 p-3">
              <Text className="text-[9px] font-bold text-ink/40 uppercase tracking-widest">
                Time
              </Text>
              <Text className="text-xs font-bold text-ink mt-1">
                {formattedTime}
              </Text>
            </View>
          </View>

          <Perforation color={cutoutColor} />

          {/* Items */}
          <View className="flex-row items-center mb-3">
            <Text className="flex-1 text-[10px] font-bold uppercase tracking-widest text-ink/40">
              Item
            </Text>
            <Text className="w-10 text-[10px] font-bold uppercase tracking-widest text-ink/40 text-center">
              Qty
            </Text>
            <Text className="w-24 text-[10px] font-bold uppercase tracking-widest text-ink/40 text-right">
              Amount
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {activeOrder.items && activeOrder.items.length > 0 ? (
              activeOrder.items.map((item: any) => {
                const lineTotal = parseFloat(item.totalPrice || "0");
                const qty = Number(item.quantity) || 0;
                const unit = qty > 0 ? lineTotal / qty : 0;
                return (
                  <View key={item.id} className="flex-row items-center">
                    <View className="flex-1 pr-3">
                      <Text
                        className="text-sm font-semibold text-ink"
                        numberOfLines={1}
                      >
                        {item.product?.name || "Unknown item"}
                      </Text>
                      <Text className="text-[11px] text-ink/40 mt-0.5">
                        @ {Math.round(unit).toLocaleString()} RWF
                      </Text>
                    </View>
                    <View className="w-10 items-center">
                      <View className="bg-ivory border border-ink/10 rounded-md px-1.5 py-0.5">
                        <Text className="text-xs font-extrabold text-ink">
                          ×{qty}
                        </Text>
                      </View>
                    </View>
                    <Text className="w-24 text-right text-sm font-extrabold text-ink">
                      {lineTotal.toLocaleString()}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View className="rounded-xl bg-ivory p-4 items-center border border-dashed border-ink/10">
                <Ionicons name="cart-outline" size={20} color={brand.inkDisabled} />
                <Text className="text-xs font-semibold text-ink/40 mt-1">
                  No items on this order
                </Text>
              </View>
            )}
          </View>

          <Perforation color={cutoutColor} />

          {/* Totals */}
          <View style={{ gap: 8 }}>
            <SummaryRow label="Items" value={String(totalItemsCount)} />
            <SummaryRow
              label="Subtotal"
              value={`${subtotalVal.toLocaleString()} RWF`}
            />
            <SummaryRow
              label="Tax (18% VAT)"
              value={`${vatVal.toLocaleString()} RWF`}
            />
          </View>

          <View className="mt-4 flex-row justify-between items-center bg-ink px-4 py-4 rounded-xl">
            <Text className="text-white/60 text-xs font-bold uppercase tracking-widest">
              Total
            </Text>
            <Text className="text-2xl font-extrabold text-lime tracking-tight">
              {totalVal.toLocaleString()}
              <Text className="text-sm font-bold text-white/60"> RWF</Text>
            </Text>
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-between mt-5">
            <View className="flex-row" style={{ gap: 16 }}>
              <View>
                <Text className="text-[9px] font-bold text-ink/40 uppercase tracking-widest">
                  Cashier
                </Text>
                <Text className="text-xs font-bold text-ink mt-0.5">
                  {cashierName}
                </Text>
              </View>
              <View>
                <Text className="text-[9px] font-bold text-ink/40 uppercase tracking-widest">
                  Shift
                </Text>
                <Text className="text-xs font-bold text-ink mt-0.5">
                  {shiftName}
                </Text>
              </View>
            </View>
            <View className="p-1.5 border border-ink/10 rounded-xl">
              <Ionicons name="qr-code" size={44} color={brand.ink} />
            </View>
          </View>

          <Text className="text-[9px] font-bold text-ink/40 mt-5 tracking-[3px] uppercase text-center">
            Thank you for your business
          </Text>
        </View>
      </View>
      <ZigzagEdge color={cutoutColor} />
    </View>
  );
}
