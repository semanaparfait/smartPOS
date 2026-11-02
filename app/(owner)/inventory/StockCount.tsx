import { EmptyState, Tabs, formatQty } from "@/components/inventory/stockKit";
import { brand } from "@/config/theme";
import useProduct from "@/store/products/useProduct";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import {
  PageHeader,
  PrimaryButton,
} from "@/components/forms/FormKit";

const webNoOutline =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

const SCOPES = [
  { value: "ingredients", label: "Ingredients" },
  { value: "all", label: "Everything counted" },
];

const rwf = (amount: number) => `${Math.round(amount).toLocaleString()} RWF`;

// Walk the storeroom, type what is really there, and see what is missing.
export default function StockCount() {
  const products = useProduct((s) => s.products);
  const getProducts = useProduct((s) => s.getProducts);
  const updateProduct = useProduct((s) => s.updateProduct);
  const router = useRouter();
  const [scope, setScope] = useState("ingredients");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProducts();
  }, [getProducts]);

  const rows = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.active &&
            p.trackStock &&
            (scope === "all" || p.isIngredient),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products, scope],
  );

  // Only rows that were counted and came out different.
  const changed = rows.filter(
    (p) =>
      counts[p.id] !== undefined &&
      counts[p.id] !== "" &&
      Number(counts[p.id]) !== Number(p.stockQuantity),
  );
  const difference = changed.reduce(
    (sum, p) =>
      sum +
      (Number(counts[p.id]) - Number(p.stockQuantity)) * Number(p.buyingPrice),
    0,
  );

  const save = async () => {
    if (!changed.length) {
      Toast.show({ type: "info", text1: "No differences to save" });
      return;
    }
    setSaving(true);
    const failed: string[] = [];
    // One at a time, so a problem with one row keeps the others.
    for (const product of changed) {
      try {
        const form = new FormData();
        form.append("stockQuantity", counts[product.id]);
        await updateProduct(product.id, form);
      } catch {
        failed.push(product.name);
      }
    }
    setSaving(false);

    if (failed.length) {
      Toast.show({
        type: "error",
        text1: "Some counts were not saved",
        text2: failed.join(", "),
      });
      return;
    }
    Toast.show({
      type: "success",
      text1: "Stock count saved",
      text2: `${changed.length} updated.`,
    });
    router.replace("/(owner)/inventory/Ingredients");
  };

  return (
    <ScrollView
      className="flex-1 bg-ivory w-full"
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow="Inventory"
          title="Stock count"
          subtitle="Type what is really there. Leave a row empty to skip it."
        />
        <Tabs options={SCOPES} value={scope} onChange={setScope} />

        <View className="bg-white rounded-2xl border border-ink/5 px-5">
          {rows.length === 0 ? (
            <EmptyState
              icon="clipboard-outline"
              title="Nothing to count"
              hint="Products appear here when their stock is tracked."
            />
          ) : (
            rows.map((product, i) => {
              const counted = counts[product.id] ?? "";
              const diff =
                counted === ""
                  ? null
                  : Number(counted) - Number(product.stockQuantity);
              return (
                <View
                  key={product.id}
                  className={`flex-row items-center py-3 ${i ? "border-t border-ink/5" : ""}`}
                >
                  <View className="flex-1 pr-3">
                    <Text numberOfLines={1} className="text-ink text-sm font-semibold">
                      {product.name}
                    </Text>
                    <Text className="text-ink/50 text-xs mt-0.5">
                      Expected {formatQty(product.stockQuantity)} {product.unit}
                    </Text>
                  </View>
                  {diff !== null && (
                    <Text
                      className="text-sm font-semibold mr-3"
                      style={{ color: diff < 0 ? brand.danger : brand.ink }}
                    >
                      {diff > 0 ? "+" : ""}
                      {formatQty(diff)}
                    </Text>
                  )}
                  <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3 h-11 w-[130px]">
                    <TextInput
                      value={counted}
                      onChangeText={(val) =>
                        setCounts((prev) => ({
                          ...prev,
                          [product.id]: val.replace(/[^0-9.]/g, ""),
                        }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="Count"
                      placeholderTextColor={brand.inkDisabled}
                      accessibilityLabel={`Counted ${product.name}`}
                      className="flex-1 text-[15px] text-ink"
                      style={webNoOutline}
                    />
                    <Text numberOfLines={1} className="text-ink/40 text-xs font-bold ml-2">
                      {product.unit}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View className="flex-row flex-wrap items-center" style={{ gap: 12 }}>
          <View className="flex-1" style={{ minWidth: 200 }}>
            <Text className="text-ink text-sm font-semibold">
              {changed.length} difference{changed.length === 1 ? "" : "s"}
            </Text>
            <Text
              className="text-xs mt-0.5"
              style={{ color: difference < 0 ? brand.danger : brand.inkMuted }}
            >
              {difference > 0 ? "+" : ""}
              {rwf(difference)} at current cost
            </Text>
          </View>
          <PrimaryButton
            label="Save count"
            busyLabel="Saving..."
            icon="checkmark-circle-outline"
            busy={saving}
            onPress={save}
          />
        </View>
      </View>
    </ScrollView>
  );
}
