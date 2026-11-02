import { EmptyState, Tabs, formatQty } from "@/components/inventory/stockKit";
import { brand } from "@/config/theme";
import type { IngredientUsage as Usage } from "@/store/products/productsType";
import useProduct from "@/store/products/useProduct";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { PageHeader } from "@/components/forms/FormKit";

const PERIODS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

// Column widths shared by the header and the rows so they line up.
const COLS = {
  name: { flex: 2 },
  used: { flex: 1 },
  usedValue: { flex: 1 },
  wasted: { flex: 1 },
  wastedValue: { flex: 1 },
  received: { flex: 1 },
};

const rwf = (amount: number) => `${Math.round(amount).toLocaleString()} RWF`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-ink/5 p-4" style={{ minWidth: 170 }}>
      <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2px]">{label}</Text>
      <Text numberOfLines={1} className="text-ink text-2xl font-semibold mt-1">
        {value}
      </Text>
    </View>
  );
}

function Cell({ style, children, strong }: { style: object; children: React.ReactNode; strong?: boolean }) {
  return (
    <Text
      style={style}
      className={`text-[12px] text-right px-2 ${strong ? "text-ink font-semibold" : "text-ink/60"}`}
    >
      {children}
    </Text>
  );
}

function Heading({ style, label }: { style: object; label: string }) {
  return (
    <Text
      style={style}
      className="text-ink/40 text-[10px] font-bold uppercase tracking-widest text-right px-2"
    >
      {label}
    </Text>
  );
}

// Where the ingredients went: into food, into the bin, or still in stock.
export default function IngredientUsage() {
  const getIngredientUsage = useProduct((s) => s.getIngredientUsage);
  const [days, setDays] = useState("30");
  const [rows, setRows] = useState<Usage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    setLoading(true);
    getIngredientUsage(Number(days))
      .then((result) => current && setRows(result))
      .catch((error: Error) =>
        Toast.show({ type: "error", text1: "Could not load the report", text2: error.message }),
      )
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [days, getIngredientUsage]);

  const usedValue = rows.reduce((sum, r) => sum + r.used * r.cost, 0);
  const wastedValue = rows.reduce((sum, r) => sum + r.wasted * r.cost, 0);
  const receivedValue = rows.reduce((sum, r) => sum + r.received * r.cost, 0);
  const wastePct =
    usedValue + wastedValue > 0
      ? Math.round((wastedValue / (usedValue + wastedValue)) * 100)
      : 0;

  return (
    <ScrollView className="flex-1 bg-ivory w-full" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow="Inventory"
          title="Ingredient usage"
          subtitle="Money values use today's cost of each ingredient."
        />
        <Tabs options={PERIODS} value={days} onChange={setDays} />

        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          <Stat label="Used in food" value={rwf(usedValue)} />
          <Stat label="Wasted" value={rwf(wastedValue)} />
          <Stat label="Waste rate" value={`${wastePct}%`} />
          <Stat label="Received" value={rwf(receivedValue)} />
        </View>

        <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="min-w-[760px] w-full">
              <View className="flex-row items-center bg-ivory px-3 py-3 border-b border-ink/5">
                <Text
                  style={COLS.name}
                  className="text-ink/40 text-[10px] font-bold uppercase tracking-widest px-2"
                >
                  Ingredient
                </Text>
                <Heading style={COLS.used} label="Used" />
                <Heading style={COLS.usedValue} label="Value" />
                <Heading style={COLS.wasted} label="Wasted" />
                <Heading style={COLS.wastedValue} label="Value" />
                <Heading style={COLS.received} label="Received" />
              </View>

              {loading && rows.length === 0 ? (
                <View className="py-14 items-center">
                  <ActivityIndicator color={brand.ink} />
                </View>
              ) : rows.length === 0 ? (
                <EmptyState
                  icon="bar-chart-outline"
                  title="Nothing to show"
                  hint="Add ingredients and recipes, and usage will build up with each sale."
                />
              ) : (
                rows.map((row, i) => (
                  <View
                    key={row.id}
                    className={`flex-row items-center px-3 py-3 ${i ? "border-t border-ink/5" : ""}`}
                  >
                    <Text
                      numberOfLines={1}
                      style={COLS.name}
                      className="text-ink text-[13px] font-bold px-2"
                    >
                      {row.name}
                    </Text>
                    <Cell style={COLS.used} strong>
                      {formatQty(row.used)} {row.unit}
                    </Cell>
                    <Cell style={COLS.usedValue}>{rwf(row.used * row.cost)}</Cell>
                    <Cell style={COLS.wasted} strong>
                      {formatQty(row.wasted)} {row.unit}
                    </Cell>
                    <Cell style={COLS.wastedValue}>{rwf(row.wasted * row.cost)}</Cell>
                    <Cell style={COLS.received}>
                      {formatQty(row.received)} {row.unit}
                    </Cell>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}
