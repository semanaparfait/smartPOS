import Paged from "@/components/lists/Paged";
import { AuditRow, EmptyState, Tabs } from "@/components/inventory/stockKit";
import { brand } from "@/config/theme";
import usePermissions from "@/store/Authentication/usePermissions";
import type { AuditEntry } from "@/store/products/productsType";
import useProduct from "@/store/products/useProduct";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { PageHeader } from "@/components/forms/FormKit";
import { tr } from "@/i18n";

const ACTIONS = [
  { value: "", label: "All" },
  { value: "CREATE", label: "Added" },
  { value: "UPDATE", label: "Edited" },
  { value: "DELETE", label: "Deleted" },
];

// Who changed which product, newest first.
export default function ActivityLogs() {
  const getAuditLogs = useProduct((s) => s.getAuditLogs);
  const getProducts = useProduct((s) => s.getProducts);
  const products = useProduct((s) => s.products);
  const { can } = usePermissions();
  const router = useRouter();
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!products.length) getProducts();
  }, [products.length, getProducts]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    getAuditLogs({ entityName: "products", page, limit: 50, ...(action ? { action } : {}) })
      .then((result) => {
        if (!current) return;
        setTotal(result.total);
        setEntries((prev) => (page === 1 ? result.data : [...prev, ...result.data]));
      })
      .catch((error: Error) =>
        Toast.show({ type: "error", text1: tr("Could not load activity"), text2: error.message }),
      )
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [action, page, getAuditLogs]);

  const nameOf = (entry: AuditEntry) =>
    products.find((p) => p.id === entry.entityId)?.name ?? entry.changes?.name ?? "a product";

  return (
    <ScrollView className="flex-1 bg-ivory w-full" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow={tr("Inventory")}
          title={tr("Activity logs")}
          subtitle={tr("Who added or changed products, and when.")}
        />
        <Tabs
          options={ACTIONS}
          value={action}
          onChange={(value) => {
            setAction(value);
            setPage(1);
          }}
        />

        <View className="bg-white rounded-2xl border border-ink/5 px-5">
          {entries.length === 0 ? (
            loading ? (
              <View className="py-14 items-center">
                <ActivityIndicator color={brand.ink} />
              </View>
            ) : (
              <EmptyState icon="time-outline" title={tr("No activity yet")} hint={tr("Product changes will show here.")} />
            )
          ) : (
            <Paged items={entries} render={(entry) => (
              <AuditRow
                key={entry.id}
                entry={entry}
                name={nameOf(entry)}
                onPress={
                  can("inventory.view") && entry.entityId
                    ? () =>
                        router.push({
                          pathname: "/(owner)/owner/inventory/product/[id]",
                          params: { id: entry.entityId! },
                        })
                    : undefined
                }
              />
            )} />
          )}
          {entries.length < total && (
            <Pressable
              onPress={() => setPage((p) => p + 1)}
              disabled={loading}
              className="h-12 items-center justify-center active:bg-ivory"
            >
              <Text className="text-ink text-sm font-bold">{loading ? "Loading..." : "Load more"}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
