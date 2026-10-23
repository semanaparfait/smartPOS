import AddProduct from "@/app/(owner)/Products/addProduct";
import ViewProduct from "@/app/(owner)/Products/viewProduct";
import { brand } from "@/config/theme";
import useCategory from "@/store/category/useCategory";
import useProduct from "@/store/products/useProduct";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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

export default function Products() {
  const [activeTab, setActiveTab] = useState<Tab>("view");
  const { products } = useProduct();
  const { categoriesResponse } = useCategory();
  const { width } = useWindowDimensions();

  const stats = useMemo(() => {
    const active = products.filter((p) => p.active).length;
    const margins = products
      .map((p) => {
        const sell = Number(p.sellingPrice) || 0;
        const buy = Number(p.buyingPrice) || 0;
        return sell > 0 ? ((sell - buy) / sell) * 100 : null;
      })
      .filter((m): m is number => m !== null);
    const avgMargin = margins.length
      ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length)
      : 0;
    return { total: products.length, active, inactive: products.length - active, avgMargin };
  }, [products]);

  const cardWidth =
    width >= 1300 ? "23.8%" : width >= 900 ? "48.9%" : "100%";

  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "view", label: "Catalog", icon: "grid-outline" },
    { key: "add", label: "New Product", icon: "add-circle-outline" },
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
              {activeTab === "view" ? "Products" : "Add a new product"}
            </Text>
            <Text className="text-ink/50 text-[13px] mt-0.5">
              {activeTab === "view"
                ? "Manage your catalog, prices and availability."
                : "Fill in the details below — it will be available on the POS right away."}
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
              icon="cube"
              label="Total products"
              value={stats.total.toLocaleString()}
              hint="In your catalog"
              width={cardWidth}
            />
            <StatCard
              icon="checkmark-circle-outline"
              label="Active"
              value={stats.active.toLocaleString()}
              hint={`${stats.inactive} inactive`}
              width={cardWidth}
            />
            <StatCard
              icon="folder-open-outline"
              label="Categories"
              value={categoriesResponse.length.toLocaleString()}
              hint="Product groups"
              width={cardWidth}
            />
            <StatCard
              icon="trending-up"
              label="Avg. margin"
              value={`${stats.avgMargin}%`}
              hint="Across priced products"
              width={cardWidth}
            />
          </View>
        )}

        {activeTab === "view" ? (
          <ViewProduct />
        ) : (
          <AddProduct onSaved={() => setActiveTab("view")} />
        )}
      </View>
    </ScrollView>
  );
}
