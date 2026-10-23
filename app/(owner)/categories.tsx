import AddCategory from "@/app/(owner)/categories/addCategory";
import ViewCategories from "@/app/(owner)/categories/viewCategories";
import { brand } from "@/config/theme";
import useCategory from "@/store/category/useCategory";
import useProduct from "@/store/products/useProduct";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

type Tab = "view" | "add";

function StatCard({
  icon,
  label,
  value,
  hint,
  dark,
  width,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint: string;
  dark?: boolean;
  width: any;
}) {
  return (
    <View
      style={{ width }}
      className={`rounded-2xl p-5 border ${dark ? "bg-ink border-ink" : "bg-white border-ink/5"}`}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-[11px] font-bold uppercase tracking-[2px] ${dark ? "text-white/50" : "text-ink/40"}`}
        >
          {label}
        </Text>
        <View
          className={`w-9 h-9 rounded-xl items-center justify-center ${dark ? "bg-lime" : "bg-ivory"}`}
        >
          <Ionicons name={icon} size={17} color={brand.ink} />
        </View>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        className={`text-[28px] font-extrabold tracking-tight mt-2 ${dark ? "text-lime" : "text-ink"}`}
      >
        {value}
      </Text>
      <Text className={`text-xs mt-1 ${dark ? "text-white/50" : "text-ink/40"}`}>{hint}</Text>
    </View>
  );
}

export default function Categories() {
  const [activeTab, setActiveTab] = useState<Tab>("view");
  const { categoriesResponse } = useCategory();
  const { products, getProducts } = useProduct();
  const { width } = useWindowDimensions();

  // Product counts per category need the product list.
  useEffect(() => {
    if (products.length === 0) getProducts();
  }, []);

  const stats = useMemo(() => {
    const used = new Set(products.map((p) => p.category?.id).filter(Boolean));
    const withProducts = categoriesResponse.filter((c) => used.has(c.id)).length;
    const categorized = products.filter((p) => p.category?.id).length;
    return {
      total: categoriesResponse.length,
      withProducts,
      empty: categoriesResponse.length - withProducts,
      categorized,
      avg: withProducts ? Math.round(categorized / withProducts) : 0,
    };
  }, [categoriesResponse, products]);

  const cardWidth =
    width >= 1300 ? "23.8%" : width >= 900 ? "48.9%" : "100%";

  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "view", label: "All Categories", icon: "grid-outline" },
    { key: "add", label: "New Category", icon: "add-circle-outline" },
  ];

  return (
    <ScrollView
      className="flex-1 bg-ivory w-full"
      contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
      showsVerticalScrollIndicator
      nestedScrollEnabled
    >
      <View className="p-6" style={{ gap: 20 }}>
        {/* Header */}
        <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 12 }}>
          <View>
            <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2.4px]">
              Inventory
            </Text>
            <Text className="text-ink text-2xl font-extrabold tracking-tight">
              {activeTab === "view" ? "Categories" : "Add a new category"}
            </Text>
            <Text className="text-ink/50 text-[13px] mt-0.5">
              {activeTab === "view"
                ? "Group your products so cashiers find them faster."
                : "Give it a clear name and a photo — it shows up as a tab on the POS."}
            </Text>
          </View>

          <View className="flex-row bg-white border border-ink/10 rounded-xl p-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  className={`flex-row items-center px-4 h-10 rounded-lg ${
                    active ? "bg-ink" : "active:bg-ivory"
                  }`}
                >
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={active ? brand.lime : brand.inkMuted}
                  />
                  <Text
                    className={`text-[13px] font-bold ml-2 ${active ? "text-white" : "text-ink/60"}`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Stats */}
        {activeTab === "view" && (
          <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
            <StatCard
              dark
              icon="folder-open"
              label="Total categories"
              value={stats.total.toLocaleString()}
              hint="Product groups"
              width={cardWidth}
            />
            <StatCard
              icon="checkmark-circle-outline"
              label="In use"
              value={stats.withProducts.toLocaleString()}
              hint="Have at least one product"
              width={cardWidth}
            />
            <StatCard
              icon="file-tray-outline"
              label="Empty"
              value={stats.empty.toLocaleString()}
              hint="No products assigned yet"
              width={cardWidth}
            />
            <StatCard
              icon="cube-outline"
              label="Products"
              value={stats.categorized.toLocaleString()}
              hint={`≈ ${stats.avg} per category in use`}
              width={cardWidth}
            />
          </View>
        )}

        {activeTab === "view" ? (
          <ViewCategories onAdd={() => setActiveTab("add")} />
        ) : (
          <AddCategory onSaved={() => setActiveTab("view")} />
        )}
      </View>
    </ScrollView>
  );
}
