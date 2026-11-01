import {
  EmptyState,
  RestockModal,
  formatQty,
} from "@/components/inventory/stockKit";
import { brand } from "@/config/theme";
import usePermissions from "@/store/Authentication/usePermissions";
import type { ProductType } from "@/store/products/productsType";
import useProduct, { isLowStock } from "@/store/products/useProduct";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { PageHeader } from "./../components/ownerComponents/FormKit";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-ink/5 p-4" style={{ minWidth: 130 }}>
      <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2px]">{label}</Text>
      <Text className="text-ink text-2xl font-semibold mt-1">{value.toLocaleString()}</Text>
    </View>
  );
}

// Every product whose stock is counted, with what is left.
export default function Inventory() {
  const products = useProduct((s) => s.products);
  const getProducts = useProduct((s) => s.getProducts);
  const { can } = usePermissions();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [restocking, setRestocking] = useState<ProductType | null>(null);

  useEffect(() => {
    getProducts();
  }, [getProducts]);

  const tracked = useMemo(
    () => products.filter((p) => p.trackStock && p.active),
    [products],
  );
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tracked
      .filter((p) => !q || p.name?.toLowerCase().includes(q))
      .sort((a, b) => Number(a.stockQuantity) - Number(b.stockQuantity));
  }, [tracked, search]);

  return (
    <ScrollView className="flex-1 bg-ivory w-full" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow="Inventory"
          title="Stock levels"
          subtitle="Stock drops when an order is paid, not at checkout."
        />

        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          <Stat label="Counted" value={tracked.length} />
          <Stat label="Low" value={tracked.filter(isLowStock).length} />
          <Stat label="Out" value={tracked.filter((p) => Number(p.stockQuantity) <= 0).length} />
        </View>

        <View className="bg-white rounded-2xl border border-ink/5 px-5 pb-2">
          <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3 h-10 my-4">
            <Ionicons name="search" size={16} color={brand.inkMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search products"
              placeholderTextColor={brand.inkDisabled}
              className="flex-1 ml-2 text-[13px] text-ink"
              style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined}
            />
          </View>

          {shown.length === 0 ? (
            <EmptyState
              icon="layers-outline"
              title="Nothing to show"
              hint="Turn on Track stock on a product to count it here."
            />
          ) : (
            shown.map((product) => {
              const low = isLowStock(product) || Number(product.stockQuantity) <= 0;
              return (
                <View key={product.id} className="flex-row items-center py-3 border-t border-ink/5">
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
                    <Text numberOfLines={1} className="text-ink/50 text-xs mt-0.5">
                      {product.lowStockLevel !== null
                        ? `Alert at ${formatQty(product.lowStockLevel)}`
                        : "No alert set"}
                    </Text>
                  </Pressable>
                  <Text
                    className="text-sm font-semibold mr-3"
                    style={{ color: low ? brand.danger : brand.ink }}
                  >
                    {formatQty(product.stockQuantity)} {product.unit}
                  </Text>
                  {can("inventory.adjust") && (
                    <Pressable
                      onPress={() => setRestocking(product)}
                      accessibilityLabel={`Restock ${product.name}`}
                      className="h-9 px-3 rounded-lg bg-ink items-center justify-center active:bg-ink-soft"
                    >
                      <Text className="text-white text-xs font-bold">Restock</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </View>
      </View>
      <RestockModal product={restocking} onClose={() => setRestocking(null)} />
    </ScrollView>
  );
}
