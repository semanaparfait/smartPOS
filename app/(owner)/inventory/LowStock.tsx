import {
  EmptyState,
  RestockModal,
  Tabs,
  formatQty,
} from "@/components/inventory/stockKit";
import { brand } from "@/config/theme";
import usePermissions from "@/store/Authentication/usePermissions";
import type { ProductType } from "@/store/products/productsType";
import useProduct from "@/store/products/useProduct";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { PageHeader } from "../../components/ownerComponents/FormKit";

const VIEWS = [
  { value: "low", label: "Low stock" },
  { value: "7", label: "Expiring in 7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

const daysUntil = (date: string) =>
  Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86_400_000);

const expiryLabel = (date: string) => {
  const days = daysUntil(date);
  if (days < 0) return `Expired ${date}`;
  if (days === 0) return "Expires today";
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
};

export default function LowStock() {
  const lowStock = useProduct((s) => s.lowStock);
  const getLowStock = useProduct((s) => s.getLowStock);
  const getExpiring = useProduct((s) => s.getExpiring);
  const { can } = usePermissions();
  const router = useRouter();
  const [view, setView] = useState("low");
  const [expiring, setExpiring] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [restocking, setRestocking] = useState<ProductType | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    (view === "low" ? getLowStock() : getExpiring(Number(view)).then((p) => current && setExpiring(p)))
      .catch((error: Error) =>
        Toast.show({ type: "error", text1: "Could not load products", text2: error.message }),
      )
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [view, getLowStock, getExpiring]);

  const rows = view === "low" ? lowStock : expiring;

  return (
    <ScrollView className="flex-1 bg-ivory w-full" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow="Inventory"
          title="Low stock & expiry"
          subtitle="What to reorder and what to sell soon."
        />
        <Tabs options={VIEWS} value={view} onChange={setView} />

        <View className="bg-white rounded-2xl border border-ink/5 px-5">
          {loading && rows.length === 0 ? (
            <View className="py-14 items-center">
              <ActivityIndicator color={brand.ink} />
            </View>
          ) : rows.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="All good"
              hint={view === "low" ? "Nothing is at its alert level." : "Nothing expires in this time."}
            />
          ) : (
            rows.map((product, i) => (
              <View
                key={product.id}
                className={`flex-row items-center py-3 ${i ? "border-t border-ink/5" : ""}`}
              >
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(owner)/inventory/product/[id]",
                      params: { id: product.id },
                    })
                  }
                  className="flex-1 pr-3 active:opacity-60"
                >
                  <Text numberOfLines={1} className="text-ink text-sm font-semibold">
                    {product.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="text-xs mt-0.5"
                    style={{ color: brand.danger }}
                  >
                    {view === "low"
                      ? `${formatQty(product.stockQuantity)} ${product.unit} left · alert at ${formatQty(product.lowStockLevel)}`
                      : expiryLabel(product.expiryDate!)}
                  </Text>
                </Pressable>
                {view === "low" && can("inventory.adjust") && (
                  <Pressable
                    onPress={() => setRestocking(product)}
                    accessibilityLabel={`Restock ${product.name}`}
                    className="h-9 px-3 rounded-lg bg-ink items-center justify-center active:bg-ink-soft"
                  >
                    <Text className="text-white text-xs font-bold">Restock</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View>
      </View>
      <RestockModal product={restocking} onClose={() => setRestocking(null)} />
    </ScrollView>
  );
}
