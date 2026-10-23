import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useMemo } from "react";
import { Text, View, ActivityIndicator, Image, Platform } from "react-native";
import useOrder from "@/store/Order/Order";
import { useLocalSearchParams } from "expo-router";
import { brand, brandLogos } from "@/config/theme";

type ReceiptCardProps = {
  cashierName?: string;
  shiftName?: string;
  // When provided, the card renders this order instead of fetching it.
  order?: any;
  // Shown as "Paid by", e.g. "Cash" or "Cash + Card".
  paymentLabel?: string;
  // Must match the screen background so the perforations look cut out.
  cutoutColor?: string;
};

// Thermal-printer style figures.
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

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

function SectionTitle({ children }: { children: string }) {
  return (
    <View className="flex-row items-center my-4">
      <View className="flex-1 h-px bg-ink/10" />
      <Text className="text-ink/50 text-[10px] font-extrabold uppercase tracking-[3px] mx-3">
        {children}
      </Text>
      <View className="flex-1 h-px bg-ink/10" />
    </View>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 py-1.5">
      <Text className="text-[9px] font-bold text-ink/40 uppercase tracking-widest">
        {label}
      </Text>
      <Text
        className="text-xs text-ink mt-0.5"
        style={{ fontFamily: MONO }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-ink/60 text-[13px]">{label}</Text>
      <Text className="text-ink text-[13px]" style={{ fontFamily: MONO }}>
        {value}
      </Text>
    </View>
  );
}

// Decorative barcode derived from the receipt code, so each receipt differs.
function Barcode({ code }: { code: string }) {
  const bars = useMemo(() => {
    let seed = 0;
    for (const ch of code) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const next = () => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return seed;
    };
    return Array.from({ length: 56 }, () => ({
      width: 1 + (next() % 3),
      gap: 1 + (next() % 2),
    }));
  }, [code]);

  return (
    <View className="items-center">
      <View className="flex-row items-stretch h-12">
        <View className="bg-ink mr-[2px]" style={{ width: 2 }} />
        {bars.map((bar, i) => (
          <View
            key={i}
            className="bg-ink"
            style={{ width: bar.width, marginRight: bar.gap }}
          />
        ))}
        <View className="bg-ink" style={{ width: 2 }} />
      </View>
      <Text
        className="text-[11px] text-ink/70 mt-1.5"
        style={{ fontFamily: MONO, letterSpacing: 4 }}
      >
        {code}
      </Text>
    </View>
  );
}

export default function ReceiptCard({
  cashierName = "Semana",
  shiftName = "Morning",
  order,
  paymentLabel,
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
  const formattedDate = createdAt.toLocaleDateString("en-GB", {
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
        className="bg-white rounded-t-xl overflow-hidden"
        style={{
          shadowColor: brand.ink,
          shadowOpacity: 0.08,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 6,
        }}
      >
        {/* Brand strip */}
        <View className="flex-row h-1.5">
          <View className="flex-1 bg-ink" />
          <View className="w-16 bg-lime" />
        </View>

        <View className="px-6 pt-6 pb-5">
          {/* Header */}
          <View className="items-center">
            <Image
              source={brandLogos.light}
              style={{ width: 150, height: 44 }}
              resizeMode="contain"
              accessibilityLabel="SmartPOS"
            />
            <Text className="text-ink/50 text-[11px] text-center mt-2 leading-4">
              KG 12 Ave, Building 45, 2nd Floor, Kigali
            </Text>
            <Text className="text-ink/50 text-[11px] text-center leading-4">
              Tel +250 788 000 000 · TIN 102938475
            </Text>
          </View>

          <SectionTitle>Sales Receipt</SectionTitle>

          {/* Meta */}
          <View className="flex-row flex-wrap">
            <MetaItem label="Receipt No." value={`#${shortSaleCode}`} />
            <View className="w-1/2 py-1.5 items-end">
              <Text className="text-[9px] font-bold text-ink/40 uppercase tracking-widest">
                Status
              </Text>
              <View
                className={`flex-row items-center mt-0.5 px-2 py-0.5 rounded-full ${isCancelled ? "bg-ivory" : "bg-lime"}`}
              >
                <View
                  className="w-1.5 h-1.5 rounded-full mr-1"
                  style={{ backgroundColor: isCancelled ? brand.danger : brand.ink }}
                />
                <Text
                  className="text-[9px] font-extrabold tracking-wider"
                  style={{ color: isCancelled ? brand.danger : brand.ink }}
                >
                  {status}
                </Text>
              </View>
            </View>
            <MetaItem label="Date" value={formattedDate} />
            <View className="w-1/2 py-1.5 items-end">
              <Text className="text-[9px] font-bold text-ink/40 uppercase tracking-widest">
                Time
              </Text>
              <Text className="text-xs text-ink mt-0.5" style={{ fontFamily: MONO }}>
                {formattedTime}
              </Text>
            </View>
            <MetaItem label="Cashier" value={cashierName} />
            <View className="w-1/2 py-1.5 items-end">
              <Text className="text-[9px] font-bold text-ink/40 uppercase tracking-widest">
                Shift
              </Text>
              <Text className="text-xs text-ink mt-0.5" style={{ fontFamily: MONO }}>
                {shiftName}
              </Text>
            </View>
          </View>

          <Perforation color={cutoutColor} />

          {/* Items */}
          <View className="flex-row items-center mb-3">
            <Text className="flex-1 text-[10px] font-bold uppercase tracking-widest text-ink/40">
              Description
            </Text>
            <Text className="text-[10px] font-bold uppercase tracking-widest text-ink/40 text-right">
              Amount
            </Text>
          </View>

          <View style={{ gap: 14 }}>
            {activeOrder.items && activeOrder.items.length > 0 ? (
              activeOrder.items.map((item: any) => {
                const lineTotal = parseFloat(item.totalPrice || "0");
                const qty = Number(item.quantity) || 0;
                const unit = qty > 0 ? lineTotal / qty : 0;
                return (
                  <View key={item.id} className="flex-row items-start">
                    <View className="flex-1 pr-3">
                      <Text
                        className="text-[13px] font-bold text-ink"
                        numberOfLines={2}
                      >
                        {item.product?.name || "Unknown item"}
                      </Text>
                      <Text
                        className="text-[11px] text-ink/50 mt-0.5"
                        style={{ fontFamily: MONO }}
                      >
                        {qty} × {Math.round(unit).toLocaleString()}
                      </Text>
                    </View>
                    <Text
                      className="text-[13px] text-ink"
                      style={{ fontFamily: MONO }}
                    >
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
            <SummaryRow label={`Items (${totalItemsCount})`} value={subtotalVal.toLocaleString()} />
            <SummaryRow label="VAT 18% (incl.)" value={vatVal.toLocaleString()} />
          </View>

          {/* Double rule, like a printed receipt */}
          <View className="mt-4 mb-3" style={{ gap: 2 }}>
            <View className="h-px bg-ink/20" />
            <View className="h-px bg-ink/20" />
          </View>

          <View className="flex-row justify-between items-end">
            <View>
              <Text className="text-ink text-sm font-extrabold uppercase tracking-[2px]">
                Total
              </Text>
              <Text className="text-ink/40 text-[10px] mt-0.5">RWF · VAT inclusive</Text>
            </View>
            <Text
              className="text-[28px] font-bold text-ink"
              style={{ fontFamily: MONO, letterSpacing: -0.5 }}
            >
              {totalVal.toLocaleString()}
            </Text>
          </View>

          {paymentLabel ? (
            <View className="flex-row items-center justify-between mt-4 bg-ivory rounded-lg px-3 py-2.5">
              <View className="flex-row items-center">
                <Ionicons name="wallet-outline" size={14} color={brand.inkMuted} />
                <Text className="text-ink/60 text-xs ml-2">Paid by</Text>
              </View>
              <Text className="text-ink text-xs font-extrabold uppercase tracking-wider">
                {paymentLabel}
              </Text>
            </View>
          ) : null}

          <Perforation color={cutoutColor} />

          {/* Footer */}
          <Barcode code={shortSaleCode} />

          <View className="items-center mt-5">
            <Text className="text-ink text-sm font-extrabold tracking-tight">
              Thank you for your business!
            </Text>
            <Text className="text-ink/40 text-[11px] mt-1 text-center">
              Please keep this receipt as proof of purchase.
            </Text>
          </View>
        </View>
      </View>
      <ZigzagEdge color={cutoutColor} />
    </View>
  );
}
