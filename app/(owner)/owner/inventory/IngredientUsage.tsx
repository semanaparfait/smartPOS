import { EmptyState, Tabs, formatQty } from "@/components/inventory/stockKit";
import { PageHeader } from "@/components/forms/FormKit";
import { brand } from "@/config/theme";
import type { IngredientUsage as Usage } from "@/store/products/productsType";
import useProduct from "@/store/products/useProduct";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { tr } from "@/i18n";

const PERIODS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

// Above this share of what recipes used, unexplained loss is worth looking into.
const WATCH_PCT = 5;

// Column widths shared by the header and the rows so they line up.
const COLS = {
  name: { flex: 1.8 },
  used: { flex: 1 },
  wasted: { flex: 1 },
  received: { flex: 1 },
  counted: { flex: 1.1 },
  value: { flex: 1.1 },
  share: { flex: 0.8 },
};

const rwf = (amount: number) => `${Math.round(amount).toLocaleString()} RWF`;
const missingOf = (row: Usage) => Math.max(0, -row.counted);
// Unexplained loss as a share of what recipes used and staff recorded as waste.
const shareOf = (row: Usage) =>
  row.used + row.wasted > 0 ? Math.round((missingOf(row) / (row.used + row.wasted)) * 100) : 0;

function Stat({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: string;
  hint: string;
  danger?: boolean;
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-ink/5 p-4" style={{ minWidth: 170 }}>
      <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2px]">{label}</Text>
      <Text
        numberOfLines={1}
        className="text-ink text-2xl font-semibold mt-1"
        style={danger ? { color: brand.danger } : undefined}
      >
        {value}
      </Text>
      <Text className="text-ink/40 text-[11px] mt-1">{hint}</Text>
    </View>
  );
}

function Heading({ style, label, left }: { style: object; label: string; left?: boolean }) {
  return (
    <Text
      style={style}
      className={`text-ink/40 text-[10px] font-bold uppercase tracking-widest px-2 ${left ? "" : "text-right"}`}
    >
      {label}
    </Text>
  );
}

function Cell({
  style,
  children,
  strong,
  danger,
}: {
  style: object;
  children: React.ReactNode;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <Text
      style={[style, danger ? { color: brand.danger } : undefined]}
      className={`text-[12px] text-right px-2 ${strong ? "text-ink font-semibold" : "text-ink/60"}`}
    >
      {children}
    </Text>
  );
}

// Where the ingredients went, and how much went missing that nothing explains.
export default function IngredientUsage() {
  const getIngredientUsage = useProduct((s) => s.getIngredientUsage);
  const router = useRouter();
  const [days, setDays] = useState("30");
  const [rows, setRows] = useState<Usage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    setLoading(true);
    getIngredientUsage(Number(days))
      .then((result) => current && setRows(result))
      .catch((error: Error) =>
        Toast.show({ type: "error", text1: tr("Could not load the report"), text2: error.message }),
      )
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [days, getIngredientUsage]);

  const usedValue = rows.reduce((sum, r) => sum + r.used * r.cost, 0);
  const wastedValue = rows.reduce((sum, r) => sum + r.wasted * r.cost, 0);
  const missingValue = rows.reduce((sum, r) => sum + missingOf(r) * r.cost, 0);
  const counted = rows.some((r) => r.counted !== 0);
  const wastePct =
    usedValue + wastedValue > 0
      ? Math.round((wastedValue / (usedValue + wastedValue)) * 100)
      : 0;
  // Biggest money loss first, so the owner starts with what matters most.
  const sorted = [...rows].sort(
    (a, b) => missingOf(b) * b.cost - missingOf(a) * a.cost || b.used - a.used,
  );

  return (
    <ScrollView className="flex-1 bg-ivory w-full" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow={tr("Inventory")}
          title={tr("Usage and losses")}
          subtitle={tr("What recipes used, what was wasted, and what is missing. Values use today's cost.")}
          right={
            <Pressable
              onPress={() => router.push("/(owner)/owner/inventory/StockCount")}
              className="flex-row items-center h-10 px-4 rounded-xl bg-ink active:bg-ink-soft"
            >
              <Ionicons name="clipboard-outline" size={16} color={brand.lime} />
              <Text className="text-white text-sm font-bold ml-2">{tr("Count stock")}</Text>
            </Pressable>
          }
        />
        <Tabs options={PERIODS} value={days} onChange={setDays} />

        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          <Stat label={tr("Used in food")} value={rwf(usedValue)} hint={tr("Taken out by recipes")} />
          <Stat
            label={tr("Wasted")}
            value={rwf(wastedValue)}
            hint={`${wastePct}% of what was used`}
          />
          <Stat
            label={tr("Unexplained loss")}
            value={counted ? rwf(missingValue) : "No count yet"}
            hint={tr("Missing at a stock count")}
            danger={missingValue > 0}
          />
        </View>

        <View className="flex-row items-start bg-white rounded-2xl border border-ink/5 p-4">
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={brand.inkMuted}
            style={{ marginTop: 1 }}
          />
          <Text className="flex-1 text-ink/70 text-xs leading-[18px] ml-2.5">
            {counted
              ? "Unexplained loss is stock a count found missing that no sale or recorded waste explains. It usually means waste nobody recorded, recipe amounts set too low, or theft. Check the ingredients at the top first."
              : "Count your stock to see what is missing. The app compares the count with what recipes and recorded waste say should be left, and shows the difference here."}
          </Text>
        </View>

        <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="min-w-[900px] w-full">
              <View className="flex-row items-center bg-ivory px-3 py-3 border-b border-ink/5">
                <Heading style={COLS.name} label={tr("Ingredient")} left />
                <Heading style={COLS.used} label={tr("Used")} />
                <Heading style={COLS.wasted} label={tr("Wasted")} />
                <Heading style={COLS.received} label={tr("Received")} />
                <Heading style={COLS.counted} label={tr("Count difference")} />
                <Heading style={COLS.value} label={tr("Missing value")} />
                <Heading style={COLS.share} label={tr("Of use")} />
              </View>

              {loading && rows.length === 0 ? (
                <View className="py-14 items-center">
                  <ActivityIndicator color={brand.ink} />
                </View>
              ) : rows.length === 0 ? (
                <EmptyState
                  icon="bar-chart-outline"
                  title={tr("Nothing to show")}
                  hint={tr("Add ingredients and recipes, and usage will build up with each sale.")}
                />
              ) : (
                sorted.map((row, i) => {
                  const missing = missingOf(row);
                  const share = shareOf(row);
                  const watch = missing > 0 && share >= WATCH_PCT;
                  return (
                    <View
                      key={row.id}
                      className={`flex-row items-center px-3 py-3 ${i ? "border-t border-ink/5" : ""}`}
                    >
                      <View style={COLS.name} className="px-2">
                        <Text numberOfLines={1} className="text-ink text-[13px] font-bold">
                          {row.name}
                        </Text>
                        {watch && (
                          <Text className="text-[11px] mt-0.5" style={{ color: brand.danger }}>{tr("Worth checking")}</Text>
                        )}
                      </View>
                      <Cell style={COLS.used} strong>
                        {formatQty(row.used)} {row.unit}
                      </Cell>
                      <Cell style={COLS.wasted}>
                        {formatQty(row.wasted)} {row.unit}
                      </Cell>
                      <Cell style={COLS.received}>
                        {formatQty(row.received)} {row.unit}
                      </Cell>
                      <Cell style={COLS.counted} strong danger={row.counted < 0}>
                        {row.counted === 0
                          ? "—"
                          : `${row.counted > 0 ? "+" : ""}${formatQty(row.counted)} ${row.unit}`}
                      </Cell>
                      <Cell style={COLS.value} danger={missing > 0}>
                        {missing > 0 ? rwf(missing * row.cost) : "—"}
                      </Cell>
                      <Cell style={COLS.share} danger={watch}>
                        {missing > 0 ? `${share}%` : "—"}
                      </Cell>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}
