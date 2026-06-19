import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { Text, View, ActivityIndicator } from "react-native";
import useOrder from "@/store/Order/Order";
import { useLocalSearchParams } from "expo-router";

type ReceiptCardProps = {
  cashierName?: string;
  shiftName?: string;
};

export default function ReceiptCard({
  cashierName = "Semana",
  shiftName = "Morning",
}: ReceiptCardProps) {
  const { fetchOrderById, orders, cancelOrder } = useOrder();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  useEffect(() => {
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
      }
    };

    fetchOrderDetails();
  }, [orderId, fetchOrderById]);

  const activeOrder =
    currentOrder || orders?.find((o: any) => o.id === orderId);

  if (loading) {
    return (
      <View className="p-12 items-center justify-center bg-white rounded-[24px]">
        <ActivityIndicator color="#14532d" size="small" />
        <Text className="text-xs text-slate-400 mt-3 font-medium">
          Downloading receipt parameters...
        </Text>
      </View>
    );
  }



  if (!activeOrder) {
    return (
      <View className="p-8 items-center justify-center bg-white rounded-[24px] border border-dashed border-slate-200">
        <Ionicons name="alert-circle-outline" size={32} color="#94A3B8" />
        <Text className="text-sm font-bold text-slate-700 mt-2">
          Order Not Found
        </Text>
        <Text className="text-xs text-slate-400 mt-1 text-center">
          Could not locate ticket records matching ID: {orderId}
        </Text>
      </View>
    );
  }

  const subtotalVal = parseFloat(activeOrder.subtotal || "0");
  const taxVal = parseFloat(activeOrder.tax || "0");
  const totalVal = parseFloat(activeOrder.total || "0");

  const totalItemsCount =
    activeOrder.items?.reduce(
      (sum: number, item: any) => sum + (item.quantity || 0),
      0,
    ) || 0;
  const shortSaleCode = activeOrder.id
    ? activeOrder.id.split("-")[0].toUpperCase()
    : "0000";

  const formattedDate = activeOrder.createdAt
    ? new Date(activeOrder.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : new Date().toLocaleDateString();

  return (
    <View className="bg-white rounded-[24px] shadow-xl border border-slate-100 overflow-hidden relative pb-4">
      <View className="bg-slate-900 py-3.5 items-center justify-center flex-row gap-1.5">
        <Ionicons name="receipt-outline" size={12} color="#FFFFFF" />
        <Text className="text-white font-bold tracking-[3px] text-[10px] uppercase">
          Official Tax Receipt
        </Text>
      </View>

      <View className="p-6">
        <View className="items-center mb-6">
          <View className="bg-slate-50 p-3 rounded-full border border-slate-100 mb-2">
            <Ionicons name="business" size={26} color="#0F172A" />
          </View>
          <Text className="text-xl font-extrabold text-slate-900 tracking-tight">
            SMART POS LTD
          </Text>
          <Text className="text-slate-400 text-[11px] text-center mt-1 leading-4 font-medium">
            KG 12 Ave, Building 45, 2nd Floor{"\n"}
            Kigali, Rwanda • TIN: 102938475
          </Text>
          <View className="flex-row items-center gap-1 mt-1 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100">
            <Ionicons name="call" size={10} color="#64748B" />
            <Text className="text-slate-500 text-[10px] font-semibold">
              +250 788 000 000
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <View className="flex-1 pr-2">
            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Receipt No.
            </Text>
            <Text className="text-xs font-black text-slate-800 mt-0.5">
              # ORD-{shortSaleCode}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Date & Time
            </Text>
            <Text className="text-xs font-bold text-slate-700 mt-0.5">
              {formattedDate}
            </Text>
          </View>
        </View>

        <View className="pt-2">
          <View className="mb-2 flex-row items-center justify-between px-1">
            <Text className="flex-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Item description
            </Text>
            <Text className="w-12 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">
              Qty
            </Text>
            <Text className="w-24 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">
              Price
            </Text>
          </View>
          <View className="border-b border-dashed border-slate-200 my-1" />

          <View className="mt-2" style={{ gap: 6 }}>
            {activeOrder.items && activeOrder.items.length > 0 ? (
              activeOrder.items.map((item: any) => (
                <View
                  key={item.id}
                  className="flex-row items-center justify-between px-1 py-1"
                >
                  <Text
                    className="flex-1 pr-3 text-sm font-semibold text-slate-700"
                    numberOfLines={1}
                  >
                    {item.product?.name || "Unknown Stock Item"}
                  </Text>
                  <Text className="w-12 text-center text-sm font-bold text-slate-500">
                    {item.quantity}
                  </Text>
                  <Text className="w-24 text-right text-sm font-bold text-slate-800">
                    {parseFloat(item.totalPrice || "0").toLocaleString()}
                  </Text>
                </View>
              ))
            ) : (
              <View className="rounded-xl bg-slate-50 p-4 items-center justify-center border border-dashed border-slate-200">
                <Ionicons name="cart-outline" size={20} color="#94A3B8" />
                <Text className="text-xs font-semibold text-slate-400 mt-1">
                  Items summary finalized at checkout.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View
          className="mt-5 border-t border-dashed border-slate-200 pt-4"
          style={{ gap: 10 }}
        >
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-slate-500 font-medium text-xs">
              Total Items
            </Text>
            <Text className="text-slate-800 font-bold text-xs">
              {totalItemsCount}
            </Text>
          </View>
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-slate-500 font-medium text-xs">Subtotal</Text>
            <Text className="text-slate-800 font-bold text-xs">
              {subtotalVal.toLocaleString()} RWF
            </Text>
          </View>
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-slate-500 font-medium text-xs">
              VAT (18% inclusive)
            </Text>
            <Text className="text-slate-800 font-bold text-xs">
              {taxVal > 0
                ? taxVal.toLocaleString()
                : Math.round(subtotalVal * 0.18).toLocaleString()}{" "}
              RWF
            </Text>
          </View>
        </View>

        <View className="mt-5 flex-row justify-between items-center bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl">
          <Text className="text-sm font-bold text-emerald-900 uppercase tracking-wide">
            Status: {activeOrder.status || "CONFIRMED"}
          </Text>
          <Text className="text-xl font-black text-emerald-700">
            {totalVal.toLocaleString()} RWF
          </Text>
        </View>

        <View className="mt-6 pt-5 border-t border-slate-100">
          <View className="flex-row justify-between items-center mb-6 bg-slate-50/80 px-3 py-2 rounded-lg">
            <View>
              <Text className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                Cashier
              </Text>
              <Text className="text-xs font-bold text-slate-700 mt-0.5">
                {cashierName}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                Shift
              </Text>
              <Text className="text-xs font-bold text-slate-700 mt-0.5">
                {shiftName}
              </Text>
            </View>
          </View>

          <View className="items-center mb-2">
            <View className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
              <Ionicons name="qr-code" size={72} color="#0F172A" />
            </View>
            <Text className="text-[8px] font-bold text-slate-400 mt-4 tracking-[4px] uppercase text-center">
              *** Thank you for your business ***
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
