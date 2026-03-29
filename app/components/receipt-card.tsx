import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

export type ReceiptLine = {
  name: string;
  qty: number;
  price: number;
};

type ReceiptCardProps = {
  saleCode: string;
  totalItems: number;
  totalAmount: number;
  vat: number;
  grandTotal: number;
  receiptLines: ReceiptLine[];
  cashierName?: string;
  shiftName?: string;
};

export default function ReceiptCard({
  saleCode,
  totalItems,
  totalAmount,
  vat,
  grandTotal,
  receiptLines,
  cashierName = "semana",
  shiftName = "Morning",
}: ReceiptCardProps) {
  return (
    <View className="bg-white rounded-[32px] shadow-lg border border-slate-100 overflow-hidden">
      <View className="bg-slate-900 py-3 items-center">
        <Text className="text-white font-black tracking-[3px] text-[10px]">
          OFFICIAL TAX RECEIPT
        </Text>
      </View>

      <View className="p-8">
        <View className="items-center mb-6">
          <View className="bg-slate-100 p-3 rounded-2xl mb-3">
            <Ionicons name="business" size={28} color="#1E293B" />
          </View>
          <Text className="text-xl font-black text-slate-900">
            SMART POS LTD
          </Text>
          <Text className="text-slate-400 text-[11px] text-center mt-1 leading-4">
            KG 12 Ave, Building 45, 2nd Floor{"\n"}
            Kigali, Rwanda • TIN: 102938475
          </Text>
          <Text className="text-slate-500 text-[11px] font-bold mt-1">
            +250 788 000 000
          </Text>
        </View>

        <View className="flex-row justify-between mb-4 border-b border-slate-50 pb-4">
          <View>
            <Text className="text-[9px] font-bold text-slate-400 uppercase">
              Receipt No.
            </Text>
            <Text className="text-sm font-black text-slate-800">
              #{saleCode}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[9px] font-bold text-slate-400 uppercase">
              Date
            </Text>
            <Text className="text-sm font-bold text-slate-800">
              {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View className="border-t border-dashed border-slate-200 pt-5">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Item
            </Text>
            <View className="flex-row items-center" style={{ gap: 14 }}>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Qty
              </Text>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Price
              </Text>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            {receiptLines.length > 0 ? (
              receiptLines.map((line, index) => (
                <View
                  key={`${line.name}-${index}`}
                  className="flex-row items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                >
                  <Text
                    className="flex-1 pr-3 text-xs font-bold text-slate-700"
                    numberOfLines={1}
                  >
                    {line.name}
                  </Text>
                  <View className="flex-row items-center" style={{ gap: 14 }}>
                    <Text className="min-w-[22px] text-right text-xs font-black text-slate-800">
                      {line.qty}
                    </Text>
                    <Text className="min-w-[80px] text-right text-xs font-black text-slate-800">
                      {line.price.toLocaleString()} RWF
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View className="rounded-xl bg-slate-50 px-3 py-2">
                <Text className="text-xs font-semibold text-slate-500">
                  No item details found.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View
          className="mt-4 border-t border-b border-dashed border-slate-200 py-5"
          style={{ gap: 12 }}
        >
          <View className="flex-row justify-between">
            <Text className="text-slate-500 font-medium text-sm">
              Total Items
            </Text>
            <Text className="text-slate-900 font-bold text-sm">
              {totalItems}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-slate-500 font-medium text-sm">Subtotal</Text>
            <Text className="text-slate-900 font-bold text-sm">
              {totalAmount.toLocaleString()} RWF
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-slate-500 font-medium text-sm">
              VAT (18%)
            </Text>
            <Text className="text-slate-900 font-bold text-sm">
              {vat.toLocaleString()} RWF
            </Text>
          </View>
        </View>

        <View className="mt-5 flex-row justify-between items-center bg-slate-50 p-4 rounded-2xl">
          <Text className="text-base font-black text-slate-900">
            Total Paid
          </Text>
          <Text className="text-xl font-black text-green-700">
            {grandTotal.toLocaleString()} RWF
          </Text>
        </View>

        <View className="mt-8 pt-6 border-t border-slate-50">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-[9px] font-bold text-slate-400 uppercase">
                Cashier
              </Text>
              <Text className="text-xs font-bold text-slate-700">
                {cashierName}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[9px] font-bold text-slate-400 uppercase">
                Shift
              </Text>
              <Text className="text-xs font-bold text-slate-700">
                {shiftName}
              </Text>
            </View>
          </View>

          <View className="items-center">
            <View className="p-3 bg-white border border-slate-50 rounded-2xl shadow-sm">
              <Ionicons name="qr-code" size={80} color="#1E293B" />
            </View>
            <Text className="text-[8px] font-bold text-slate-300 mt-4 tracking-[3px]">
              THANK YOU FOR SHOPPING
            </Text>
          </View>
        </View>
      </View>

      <View className="h-2 bg-slate-900 w-full" />
    </View>
  );
}
