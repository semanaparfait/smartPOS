import {
  EmptyState,
  RestockModal,
  Tabs,
  WasteModal,
  formatQty,
  formatStock,
} from "@/components/inventory/stockKit";
import { brand } from "@/config/theme";
import { MONEY_UNIT } from "@/config/units";
import usePermissions from "@/store/Authentication/usePermissions";
import type { ProductType } from "@/store/products/productsType";
import useProduct, { isLowStock } from "@/store/products/useProduct";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { PageHeader } from "@/components/forms/FormKit";
import { tr } from "@/i18n";

const webNoOutline =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

// Column widths shared by the header and the rows so they line up.
const COLS = {
  name: { flex: 2.2 },
  stock: { flex: 1.1 },
  alert: { flex: 0.9 },
  cost: { flex: 1 },
  value: { flex: 1.1 },
  expiry: { flex: 1 },
  actions: { width: 236 },
};

const EXPIRING_DAYS = 7;
const FILTERS = [
  { value: "all", label: "All" },
  { value: "low", label: "Low" },
  { value: "out", label: "Out" },
  { value: "expiring", label: `Expiring in ${EXPIRING_DAYS} days` },
  { value: "setup", label: "Needs setup" },
];

// What stops an ingredient being tracked properly, in plain words for the owner.
const missing = (p: ProductType) =>
  [
    p.unit !== MONEY_UNIT && !(Number(p.buyingPrice) > 0) && "no cost, so dish costs are too low",
    p.lowStockLevel === null && "no alert level",
  ].filter(Boolean) as string[];

const rwf = (amount: number) => `${Math.round(amount).toLocaleString()} RWF`;
const isOut = (p: ProductType) => Number(p.stockQuantity) <= 0;
const isExpiring = (p: ProductType) =>
  !!p.expiryDate &&
  new Date(`${p.expiryDate}T00:00:00`).getTime() - Date.now() <
    EXPIRING_DAYS * 86_400_000;

function HeaderCell({ label, style, right }: { label: string; style: object; right?: boolean }) {
  return (
    <Text
      style={[style, { textAlign: right ? "right" : "left" }]}
      className="text-ink/40 text-[10px] font-bold uppercase tracking-widest px-2"
    >
      {label}
    </Text>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-ink/5 p-4" style={{ minWidth: 150 }}>
      <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2px]">{label}</Text>
      <Text numberOfLines={1} className="text-ink text-2xl font-semibold mt-1">
        {value}
      </Text>
    </View>
  );
}

function IconButton({
  icon,
  label,
  color = brand.ink,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      className="w-8 h-8 rounded-lg items-center justify-center border border-ink/10 ml-1.5 active:bg-ivory"
    >
      <Ionicons name={icon} size={15} color={color} />
    </Pressable>
  );
}

// Everything used to make the food: what is left, what it cost, what to reorder.
export default function Ingredients() {
  const products = useProduct((s) => s.products);
  const getProducts = useProduct((s) => s.getProducts);
  const setProductActive = useProduct((s) => s.setProductActive);
  const { can } = usePermissions();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [restocking, setRestocking] = useState<ProductType | null>(null);
  const [wasting, setWasting] = useState<ProductType | null>(null);
  const canManage = can("products.manage");
  const canAdjust = can("inventory.adjust");

  useEffect(() => {
    getProducts();
  }, [getProducts]);

  const ingredients = useMemo(
    () => products.filter((p) => p.isIngredient),
    [products],
  );
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ingredients
      .filter((p) => !q || p.name?.toLowerCase().includes(q))
      .filter(
        (p) =>
          filter === "all" ||
          (filter === "low" && isLowStock(p)) ||
          (filter === "out" && isOut(p)) ||
          (filter === "expiring" && isExpiring(p)) ||
          (filter === "setup" && missing(p).length > 0),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ingredients, search, filter]);
  const totalValue = ingredients.reduce(
    (sum, p) => sum + Math.max(0, Number(p.stockQuantity)) * Number(p.buyingPrice),
    0,
  );

  const edit = (id?: string) =>
    router.push({
      pathname: "/(owner)/owner/inventory/AddIngredient",
      params: id ? { id } : {},
    });

  const toggleActive = async (ingredient: ProductType) => {
    try {
      await setProductActive(ingredient.id, !ingredient.active);
      Toast.show({
        type: "success",
        text1: ingredient.active ? "Ingredient deactivated" : "Ingredient activated",
        text2: ingredient.name,
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: tr("Could not update the ingredient"),
        text2: (error as Error).message,
      });
    }
  };

  return (
    <ScrollView className="flex-1 bg-ivory w-full" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow={tr("Inventory")}
          title={tr("Ingredients")}
          subtitle={tr("What your food is made from. Sales take these out of stock through recipes.")}
          right={
            canManage && (
              <Pressable
                onPress={() => edit()}
                className="flex-row items-center h-10 px-4 rounded-xl bg-lime active:bg-lime-dark"
              >
                <Ionicons name="add" size={18} color={brand.ink} />
                <Text className="text-ink text-sm font-bold ml-1">{tr("Add ingredient")}</Text>
              </Pressable>
            )
          }
        />

        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          <Stat label={tr("Ingredients")} value={ingredients.length.toLocaleString()} />
          <Stat label={tr("Stock value")} value={rwf(totalValue)} />
          <Stat label={tr("Low or out")} value={ingredients.filter((p) => isLowStock(p) || isOut(p)).length.toLocaleString()} />
          <Stat label={tr("Expiring soon")} value={ingredients.filter(isExpiring).length.toLocaleString()} />
        </View>

        <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
          <View className="p-4 border-b border-ink/5" style={{ gap: 12 }}>
            <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3 h-10 max-w-[320px]">
              <Ionicons name="search" size={16} color={brand.inkMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={tr("Search ingredients")}
                placeholderTextColor={brand.inkDisabled}
                className="flex-1 ml-2 text-[13px] text-ink"
                style={webNoOutline}
              />
            </View>
            <Tabs options={FILTERS} value={filter} onChange={setFilter} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="min-w-[960px] w-full">
              <View className="flex-row items-center bg-ivory px-3 py-3 border-b border-ink/5">
                <HeaderCell label={tr("Ingredient")} style={COLS.name} />
                <HeaderCell label={tr("In stock")} style={COLS.stock} right />
                <HeaderCell label={tr("Alert at")} style={COLS.alert} right />
                <HeaderCell label={tr("Cost")} style={COLS.cost} right />
                <HeaderCell label={tr("Value")} style={COLS.value} right />
                <HeaderCell label={tr("Expiry")} style={COLS.expiry} right />
                <HeaderCell label="" style={COLS.actions} />
              </View>

              {shown.length === 0 ? (
                <EmptyState
                  icon="nutrition-outline"
                  title={ingredients.length ? "Nothing here" : "No ingredients yet"}
                  hint={
                    ingredients.length
                      ? "Try another search or filter."
                      : "Add what your food is made from, then use it in recipes."
                  }
                />
              ) : (
                shown.map((ingredient, i) => {
                  const stock = Number(ingredient.stockQuantity);
                  return (
                    <View
                      key={ingredient.id}
                      className={`flex-row items-center px-3 py-3 ${i ? "border-t border-ink/5" : ""} ${
                        ingredient.active ? "" : "opacity-50"
                      }`}
                    >
                      <View style={COLS.name} className="px-2">
                        <Text numberOfLines={1} className="text-ink text-[13px] font-bold">
                          {ingredient.name}
                        </Text>
                        {missing(ingredient).length > 0 && (
                          <Text
                            numberOfLines={1}
                            className="text-[11px] mt-0.5"
                            style={{ color: brand.danger }}
                          >
                            {missing(ingredient).join(", ")}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          COLS.stock,
                          { color: isLowStock(ingredient) || isOut(ingredient) ? brand.danger : brand.ink },
                        ]}
                        className="text-[13px] font-semibold text-right px-2"
                      >
                        {formatStock(stock, ingredient)}
                      </Text>
                      <Text style={COLS.alert} className="text-ink/60 text-[12px] text-right px-2">
                        {ingredient.lowStockLevel === null
                          ? "—"
                          : formatQty(ingredient.lowStockLevel)}
                      </Text>
                      <Text style={COLS.cost} className="text-ink/60 text-[12px] text-right px-2">
                        {rwf(Number(ingredient.buyingPrice))}
                      </Text>
                      <Text style={COLS.value} className="text-ink text-[12px] text-right px-2">
                        {rwf(Math.max(0, stock) * Number(ingredient.buyingPrice))}
                      </Text>
                      <Text
                        style={[COLS.expiry, isExpiring(ingredient) ? { color: brand.danger } : undefined]}
                        className="text-ink/60 text-[12px] text-right px-2"
                      >
                        {ingredient.expiryDate ?? "—"}
                      </Text>
                      <View style={COLS.actions} className="flex-row justify-end items-center">
                        {canAdjust && (
                          <>
                            <Pressable
                              onPress={() => setRestocking(ingredient)}
                              accessibilityLabel={`Restock ${ingredient.name}`}
                              className="h-8 px-3 rounded-lg bg-ink items-center justify-center active:bg-ink-soft"
                            >
                              <Text className="text-white text-xs font-bold">{tr("Restock")}</Text>
                            </Pressable>
                            <IconButton
                              icon="trash-bin-outline"
                              label={`Record waste of ${ingredient.name}`}
                              onPress={() => setWasting(ingredient)}
                            />
                          </>
                        )}
                        <IconButton
                          icon="time-outline"
                          label={`History of ${ingredient.name}`}
                          onPress={() =>
                            router.push({
                              pathname: "/(owner)/owner/inventory/product/[id]",
                              params: { id: ingredient.id },
                            })
                          }
                        />
                        {canManage && (
                          <>
                            <IconButton
                              icon="create-outline"
                              label={`Edit ${ingredient.name}`}
                              onPress={() => edit(ingredient.id)}
                            />
                            <IconButton
                              icon="power-outline"
                              label={`${ingredient.active ? "Deactivate" : "Activate"} ${ingredient.name}`}
                              color={ingredient.active ? brand.danger : brand.ink}
                              onPress={() => toggleActive(ingredient)}
                            />
                          </>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      <RestockModal product={restocking} onClose={() => setRestocking(null)} />
      <WasteModal product={wasting} onClose={() => setWasting(null)} />
    </ScrollView>
  );
}
