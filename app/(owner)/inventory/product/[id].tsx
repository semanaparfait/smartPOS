import {
  AuditRow,
  EmptyState,
  MovementRow,
  RestockModal,
  formatQty,
  whoLine,
} from "@/components/inventory/stockKit";
import { brand } from "@/config/theme";
import usePermissions from "@/store/Authentication/usePermissions";
import type { AuditEntry, StockMovement } from "@/store/products/productsType";
import useProduct from "@/store/products/useProduct";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { PageHeader } from "@/components/forms/FormKit";

// One product's history: why the stock changed, and who edited it.
export default function ProductHistory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct((s) => s.products.find((p) => p.id === id));
  const getProducts = useProduct((s) => s.getProducts);
  const getStockMovements = useProduct((s) => s.getStockMovements);
  const getAuditLogs = useProduct((s) => s.getAuditLogs);
  const { can } = usePermissions();
  const router = useRouter();
  const canSeeEdits = can("reports.view");

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementTotal, setMovementTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restocking, setRestocking] = useState(false);
  // Restocking adds a row, so the list reloads from its first page.
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!product) getProducts();
  }, [product, getProducts]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    getStockMovements(id, page)
      .then((result) => {
        if (!current) return;
        setMovementTotal(result.total);
        setMovements((prev) => (page === 1 ? result.data : [...prev, ...result.data]));
      })
      .catch((error: Error) =>
        Toast.show({ type: "error", text1: "Could not load stock history", text2: error.message }),
      )
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [id, page, refresh, getStockMovements]);

  useEffect(() => {
    if (!canSeeEdits) return;
    getAuditLogs({ entityName: "products", entityId: id, limit: 50 })
      .then((result) => setEdits(result.data))
      .catch((error: Error) =>
        Toast.show({ type: "error", text1: "Could not load changes", text2: error.message }),
      );
  }, [id, canSeeEdits, getAuditLogs]);

  const unit = product?.unit ?? "";

  return (
    <ScrollView className="flex-1 bg-ivory w-full" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow="Inventory"
          title={product?.name ?? "Product history"}
          subtitle={product ? whoLine(product) : undefined}
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace("/(owner)/inventory")
          }
          right={
            !!product &&
            can("inventory.adjust") && (
              <Pressable
                onPress={() => setRestocking(true)}
                className="h-10 px-4 rounded-xl bg-lime items-center justify-center active:bg-lime-dark"
              >
                <Text className="text-ink text-sm font-bold">Restock</Text>
              </Pressable>
            )
          }
        />

        {!!product?.trackStock && (
          <View className="bg-ink rounded-2xl p-5">
            <Text className="text-white/50 text-[11px] font-bold uppercase tracking-[2px]">
              In stock
            </Text>
            <Text className="text-lime text-3xl font-semibold mt-1">
              {formatQty(product.stockQuantity)} {unit}
            </Text>
          </View>
        )}

        <View className="bg-white rounded-2xl border border-ink/5 px-5 pb-2">
          <Text className="text-ink text-[15px] font-extrabold pt-4 pb-2">Stock history</Text>
          {movements.length === 0 ? (
            loading ? (
              <View className="py-10 items-center">
                <ActivityIndicator color={brand.ink} />
              </View>
            ) : (
              <EmptyState
                icon="layers-outline"
                title="No stock changes yet"
                hint="Sales, restocks and counts will show here."
              />
            )
          ) : (
            movements.map((movement) => (
              <MovementRow key={movement.id} movement={movement} unit={unit} />
            ))
          )}
          {movements.length < movementTotal && (
            <Pressable
              onPress={() => setPage((p) => p + 1)}
              disabled={loading}
              className="h-12 items-center justify-center active:bg-ivory"
            >
              <Text className="text-ink text-sm font-bold">{loading ? "Loading..." : "Load more"}</Text>
            </Pressable>
          )}
        </View>

        {canSeeEdits && (
          <View className="bg-white rounded-2xl border border-ink/5 px-5 pb-2">
            <Text className="text-ink text-[15px] font-extrabold pt-4 pb-2">Changes</Text>
            {edits.length === 0 ? (
              <EmptyState icon="time-outline" title="No changes yet" hint="Edits to this product will show here." />
            ) : (
              edits.map((entry) => <AuditRow key={entry.id} entry={entry} />)
            )}
          </View>
        )}
      </View>
      <RestockModal
        product={restocking ? (product ?? null) : null}
        onClose={() => {
          setRestocking(false);
          setPage(1);
          setRefresh((n) => n + 1);
        }}
      />
    </ScrollView>
  );
}
