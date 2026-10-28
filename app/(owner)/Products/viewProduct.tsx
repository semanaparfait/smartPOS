import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useProduct from "@/store/products/useProduct";
import useCategory from "@/store/category/useCategory";
import { brand } from "@/config/theme";

import { secureUrl, thumbUrl } from "@/utils/imageUrl";
const formatRwf = (amount: number) => `${amount.toLocaleString()} RWF`;
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

// Column widths shared by the header and the rows so they line up.
const COLS = {
  product: { flex: 2.4 },
  category: { flex: 1.2 },
  buy: { flex: 1.1 },
  sell: { flex: 1.1 },
  margin: { flex: 1 },
  status: { flex: 0.9 },
  updated: { flex: 1 },
  actions: { width: 84 },
};

function HeaderCell({
  label,
  style,
  align = "left",
}: {
  label: string;
  style: object;
  align?: "left" | "right" | "center";
}) {
  return (
    <Text
      style={[style, { textAlign: align }]}
      className="text-ink/40 text-[10px] font-bold uppercase tracking-widest px-2"
    >
      {label}
    </Text>
  );
}

function ProductThumb({ uri }: { uri?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <View className="w-11 h-11 rounded-xl bg-ivory border border-ink/5 items-center justify-center overflow-hidden">
      {uri && !failed ? (
        <Image
          source={{ uri: secureUrl(uri) }}
          style={{ width: 44, height: 44 }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons name="image-outline" size={18} color={brand.inkDisabled} />
      )}
    </View>
  );
}

export default function ViewProduct() {
  const { products, getProducts, deleteProduct, loading } = useProduct();
  const { categoriesResponse, getCategories } = useCategory();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    const fetchProducts = async () => {
      await getProducts();
      await getCategories();
    };
    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryFilter !== "all" && product.category?.id !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        product.name?.toLowerCase().includes(q) ||
        product.barCode?.toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter]);

  const confirmDelete = (id: string, name: string) => {
    const run = async () => {
      try {
        await deleteProduct(id);
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${name}"? This cannot be undone.`)) run();
      return;
    }
    Alert.alert("Delete product", `Delete "${name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  };

  const categoryChips = [
    { id: "all", name: "All" },
    ...categoriesResponse.map((c) => ({ id: c.id, name: c.name })),
  ];

  return (
    <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
      {/* Toolbar */}
      <View className="px-5 pt-5 pb-4 border-b border-ink/5" style={{ gap: 14 }}>
        <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 12 }}>
          <View className="flex-row items-center">
            <Text className="text-ink text-lg font-extrabold tracking-tight">
              Catalog
            </Text>
            <View className="ml-2 min-w-[26px] h-[22px] px-2 rounded-full bg-lime items-center justify-center">
              <Text className="text-ink text-[11px] font-extrabold">
                {filtered.length}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3 h-10 w-[300px] max-w-full">
            <Ionicons name="search" size={16} color={brand.inkMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or barcode"
              placeholderTextColor={brand.inkDisabled}
              className="flex-1 ml-2 text-[13px] text-ink"
              style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={16} color={brand.inkDisabled} />
              </Pressable>
            )}
          </View>
        </View>

        {categoriesResponse.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row" style={{ gap: 8 }}>
              {categoryChips.map((chip) => {
                const active = categoryFilter === chip.id;
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => setCategoryFilter(chip.id)}
                    className={`px-3.5 py-1.5 rounded-full border ${
                      active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${active ? "text-lime" : "text-ink/60"}`}
                    >
                      {chip.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="min-w-[980px] w-full">
          <View className="flex-row items-center bg-ivory px-3 py-3 border-b border-ink/5">
            <HeaderCell label="Product" style={COLS.product} />
            <HeaderCell label="Category" style={COLS.category} />
            <HeaderCell label="Buy price" style={COLS.buy} align="right" />
            <HeaderCell label="Sell price" style={COLS.sell} align="right" />
            <HeaderCell label="Margin" style={COLS.margin} align="right" />
            <HeaderCell label="Status" style={COLS.status} align="center" />
            <HeaderCell label="Updated" style={COLS.updated} align="right" />
            <HeaderCell label="" style={COLS.actions} />
          </View>

          {loading && products.length === 0 ? (
            <View className="py-16 items-center">
              <ActivityIndicator color={brand.ink} />
              <Text className="text-ink/40 text-xs mt-3">Loading products...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View className="py-16 items-center">
              <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center mb-3">
                <Ionicons name="cube-outline" size={26} color={brand.inkDisabled} />
              </View>
              <Text className="text-ink text-sm font-bold">
                {products.length === 0 ? "No products yet" : "No matching products"}
              </Text>
              <Text className="text-ink/40 text-xs mt-1">
                {products.length === 0
                  ? "Add your first product to start selling."
                  : "Try another search or category."}
              </Text>
            </View>
          ) : (
            filtered.map((product, index) => {
              const buy = Number(product.buyingPrice) || 0;
              const sell = Number(product.sellingPrice) || 0;
              const profit = sell - buy;
              const marginPct = sell > 0 ? Math.round((profit / sell) * 100) : 0;
              const isLast = index === filtered.length - 1;

              return (
                <View
                  key={product.id}
                  className={`flex-row items-center px-3 py-3 ${isLast ? "" : "border-b border-ink/5"}`}
                >
                  {/* Product */}
                  <View style={COLS.product} className="flex-row items-center px-2">
                    <ProductThumb uri={thumbUrl(product.images?.[0])} />
                    <View className="ml-3 flex-1">
                      <Text numberOfLines={1} className="text-ink text-[13px] font-bold">
                        {product.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="text-ink/40 text-[11px] mt-0.5"
                        style={{ fontFamily: MONO }}
                      >
                        {product.barCode || "No barcode"}
                      </Text>
                    </View>
                  </View>

                  {/* Category */}
                  <View style={COLS.category} className="px-2 items-start">
                    {product.category?.name ? (
                      <View className="px-2.5 py-1 rounded-md bg-ivory border border-ink/5">
                        <Text numberOfLines={1} className="text-ink/70 text-[11px] font-semibold">
                          {product.category.name}
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-ink/30 text-xs">—</Text>
                    )}
                  </View>

                  <Text
                    style={[COLS.buy, { fontFamily: MONO }]}
                    className="text-ink/60 text-[12px] text-right px-2"
                  >
                    {formatRwf(buy)}
                  </Text>
                  <Text
                    style={[COLS.sell, { fontFamily: MONO }]}
                    className="text-ink text-[12px] font-bold text-right px-2"
                  >
                    {formatRwf(sell)}
                  </Text>

                  {/* Margin */}
                  <View style={COLS.margin} className="px-2 items-end">
                    <Text
                      className="text-[12px] font-bold"
                      style={{ fontFamily: MONO, color: profit < 0 ? brand.danger : brand.ink }}
                    >
                      {profit >= 0 ? "+" : ""}
                      {profit.toLocaleString()}
                    </Text>
                    <Text className="text-ink/40 text-[10px] font-semibold">{marginPct}%</Text>
                  </View>

                  {/* Status */}
                  <View style={COLS.status} className="items-center px-2">
                    <View
                      className={`flex-row items-center px-2.5 py-1 rounded-full ${
                        product.active ? "bg-lime" : "bg-ivory border border-ink/10"
                      }`}
                    >
                      <View
                        className="w-1.5 h-1.5 rounded-full mr-1.5"
                        style={{ backgroundColor: product.active ? brand.ink : brand.danger }}
                      />
                      <Text
                        className="text-[10px] font-extrabold"
                        style={{ color: product.active ? brand.ink : brand.danger }}
                      >
                        {product.active ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>

                  <Text style={COLS.updated} className="text-ink/50 text-[12px] text-right px-2">
                    {formatDate(product.updatedAt)}
                  </Text>

                  {/* Actions */}
                  <View style={COLS.actions} className="flex-row justify-end" >
                    <Pressable
                      accessibilityLabel={`Edit ${product.name}`}
                      className="w-8 h-8 rounded-lg items-center justify-center border border-ink/10 active:bg-ivory mr-1.5"
                    >
                      <Ionicons name="create-outline" size={15} color={brand.ink} />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(product.id, product.name)}
                      accessibilityLabel={`Delete ${product.name}`}
                      className="w-8 h-8 rounded-lg items-center justify-center border border-ink/10 active:bg-red-50"
                    >
                      <Ionicons name="trash-outline" size={15} color={brand.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
