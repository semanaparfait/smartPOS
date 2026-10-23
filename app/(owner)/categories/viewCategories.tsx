import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import useCategory from "@/store/category/useCategory";
import useProduct from "@/store/products/useProduct";
import { brand } from "@/config/theme";

type Layout = "grid" | "list";
type Sort = "name" | "products" | "newest";

const GAP = 12;
// Tiles never get narrower than this; more width means more columns.
const MIN_TILE_WIDTH = 230;
const MAX_COLUMNS = 6;
const PAGE_SIZE: Record<Layout, number> = { grid: 24, list: 15 };
// Sidebar (96) + page padding (2 × 24); used until the grid measures itself.
const CHROME_WIDTH = 96 + 48;

const SORTS: { key: Sort; label: string }[] = [
  { key: "name", label: "A–Z" },
  { key: "products", label: "Most products" },
  { key: "newest", label: "Newest" },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function Thumb({ uri, size }: { uri?: string; size: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <View
      className="rounded-lg bg-ivory border border-ink/5 overflow-hidden items-center justify-center"
      style={{ width: size, height: size }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons name="image-outline" size={size * 0.4} color={brand.inkDisabled} />
      )}
    </View>
  );
}

function ShareBar({ ratio }: { ratio: number }) {
  return (
    <View className="h-1 rounded-full bg-ink/10 overflow-hidden">
      <View
        className="h-full rounded-full bg-ink"
        style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
      />
    </View>
  );
}

function SegmentButton({
  active,
  onPress,
  children,
  label,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className={`h-8 px-3 rounded-lg flex-row items-center justify-center ${
        active ? "bg-ink" : "active:bg-ivory"
      }`}
    >
      {children}
    </Pressable>
  );
}

function Pager({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  // Compact page list: first, last, current ± 1, with gaps.
  const pages: (number | "gap")[] = [];
  for (let i = 0; i < pageCount; i++) {
    if (i === 0 || i === pageCount - 1 || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }

  const NavButton = ({ icon, target, label }: { icon: "chevron-back" | "chevron-forward"; target: number; label: string }) => {
    const disabled = target < 0 || target >= pageCount;
    return (
      <Pressable
        onPress={() => !disabled && onChange(target)}
        disabled={disabled}
        accessibilityLabel={label}
        className={`w-8 h-8 rounded-lg items-center justify-center border border-ink/10 ${
          disabled ? "opacity-40" : "bg-white active:bg-ivory"
        }`}
      >
        <Ionicons name={icon} size={14} color={brand.ink} />
      </Pressable>
    );
  };

  return (
    <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 12 }}>
      <Text className="text-ink/50 text-xs">
        Showing <Text className="text-ink font-bold">{from}–{to}</Text> of{" "}
        <Text className="text-ink font-bold">{total}</Text>
      </Text>
      {pageCount > 1 && (
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <NavButton icon="chevron-back" target={page - 1} label="Previous page" />
          {pages.map((p, i) =>
            p === "gap" ? (
              <Text key={`gap-${i}`} className="text-ink/30 text-xs px-1">
                …
              </Text>
            ) : (
              <Pressable
                key={p}
                onPress={() => onChange(p)}
                accessibilityLabel={`Page ${p + 1}`}
                accessibilityState={{ selected: p === page }}
                className={`min-w-[32px] h-8 px-2 rounded-lg items-center justify-center ${
                  p === page ? "bg-ink" : "active:bg-white"
                }`}
              >
                <Text className={`text-xs font-bold ${p === page ? "text-lime" : "text-ink/60"}`}>
                  {p + 1}
                </Text>
              </Pressable>
            ),
          )}
          <NavButton icon="chevron-forward" target={page + 1} label="Next page" />
        </View>
      )}
    </View>
  );
}

export default function ViewCategories({ onAdd }: { onAdd?: () => void }) {
  const { categoriesResponse, getCategories, deleteCategory, loading } = useCategory();
  const { products } = useProduct();
  const { width: windowWidth } = useWindowDimensions();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [layout, setLayout] = useState<Layout>("grid");
  const [page, setPage] = useState(0);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  useEffect(() => {
    const fetchCategories = async () => {
      await getCategories();
    };
    fetchCategories();
  }, []);

  // Any change to what is shown starts again from the first page.
  useEffect(() => {
    setPage(0);
  }, [search, sort, layout]);

  const productCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const id = p.category?.id;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const totalCategorized = useMemo(
    () => Array.from(productCount.values()).reduce((a, b) => a + b, 0),
    [productCount],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? categoriesResponse.filter((c) => c.name?.toLowerCase().includes(q))
      : [...categoriesResponse];
    list.sort((a, b) => {
      if (sort === "products") {
        return (productCount.get(b.id) ?? 0) - (productCount.get(a.id) ?? 0);
      }
      if (sort === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [categoriesResponse, search, sort, productCount]);

  const pageSize = PAGE_SIZE[layout];
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const gridWidth = measuredWidth || Math.max(0, windowWidth - CHROME_WIDTH);
  const columns = Math.max(
    1,
    Math.min(MAX_COLUMNS, Math.floor((gridWidth + GAP) / (MIN_TILE_WIDTH + GAP))),
  );
  const tileWidth = Math.floor((gridWidth - GAP * (columns - 1)) / columns);

  const confirmDelete = (id: string, name: string, count: number) => {
    const warning =
      count > 0
        ? `"${name}" still has ${count} product${count === 1 ? "" : "s"}. Delete it anyway?`
        : `Delete "${name}"? This cannot be undone.`;

    const run = async () => {
      await deleteCategory(id);
      const error = useCategory.getState().error;
      if (error) Alert.alert("Could not delete", error);
    };

    if (Platform.OS === "web") {
      if (window.confirm(warning)) run();
      return;
    }
    Alert.alert("Delete category", warning, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  };

  const DeleteButton = ({ id, name, count }: { id: string; name: string; count: number }) => (
    <Pressable
      onPress={() => confirmDelete(id, name, count)}
      accessibilityLabel={`Delete ${name}`}
      hitSlop={6}
      className="w-7 h-7 rounded-md items-center justify-center active:bg-red-50"
    >
      <Ionicons name="trash-outline" size={14} color={brand.danger} />
    </Pressable>
  );

  const isFirstPage = safePage === 0;

  return (
    <View style={{ gap: 14 }}>
      {/* Toolbar */}
      <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 10 }}>
        <View className="flex-row items-center flex-1 min-w-[220px] max-w-[360px] bg-white border border-ink/10 rounded-xl px-3 h-10">
          <Ionicons name="search" size={16} color={brand.inkMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search categories"
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

        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="flex-row bg-white border border-ink/10 rounded-xl p-1">
            {SORTS.map((s) => (
              <SegmentButton
                key={s.key}
                active={sort === s.key}
                onPress={() => setSort(s.key)}
                label={`Sort by ${s.label}`}
              >
                <Text className={`text-xs font-bold ${sort === s.key ? "text-white" : "text-ink/60"}`}>
                  {s.label}
                </Text>
              </SegmentButton>
            ))}
          </View>
          <View className="flex-row bg-white border border-ink/10 rounded-xl p-1">
            <SegmentButton active={layout === "grid"} onPress={() => setLayout("grid")} label="Grid view">
              <Ionicons name="grid-outline" size={14} color={layout === "grid" ? brand.lime : brand.inkMuted} />
            </SegmentButton>
            <SegmentButton active={layout === "list"} onPress={() => setLayout("list")} label="List view">
              <Ionicons name="list-outline" size={16} color={layout === "list" ? brand.lime : brand.inkMuted} />
            </SegmentButton>
          </View>
        </View>
      </View>

      {/* Content */}
      <View onLayout={(e) => setMeasuredWidth(e.nativeEvent.layout.width)}>
        {loading && categoriesResponse.length === 0 ? (
          <View className="py-16 items-center bg-white rounded-2xl border border-ink/5">
            <ActivityIndicator color={brand.ink} />
            <Text className="text-ink/40 text-xs mt-3">Loading categories...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View className="py-16 items-center bg-white rounded-2xl border border-ink/5">
            <View className="w-14 h-14 rounded-2xl bg-ivory items-center justify-center mb-3">
              <Ionicons name="pricetags-outline" size={24} color={brand.inkDisabled} />
            </View>
            <Text className="text-ink text-sm font-bold">
              {categoriesResponse.length === 0 ? "No categories yet" : "No matching categories"}
            </Text>
            <Text className="text-ink/40 text-xs mt-1">
              {categoriesResponse.length === 0
                ? "Create one to start organising your products."
                : `Nothing matches “${search}”.`}
            </Text>
            {categoriesResponse.length === 0 && onAdd && (
              <Pressable
                onPress={onAdd}
                className="flex-row items-center mt-4 bg-lime rounded-xl px-4 h-10 active:bg-lime-dark"
              >
                <Ionicons name="add" size={16} color={brand.ink} />
                <Text className="text-ink text-[13px] font-bold ml-1.5">New Category</Text>
              </Pressable>
            )}
          </View>
        ) : layout === "grid" ? (
          /* GRID — compact tiles, many per row */
          <View className="flex-row flex-wrap" style={{ gap: GAP }}>
            {onAdd && !search && isFirstPage && (
              <Pressable
                onPress={onAdd}
                style={{ width: tileWidth }}
                className="flex-row items-center rounded-xl border-2 border-dashed border-ink/15 px-3 py-3 active:bg-white"
              >
                <View className="w-11 h-11 rounded-lg bg-lime items-center justify-center">
                  <Ionicons name="add" size={20} color={brand.ink} />
                </View>
                <View className="ml-3">
                  <Text className="text-ink text-[13px] font-bold">New category</Text>
                  <Text className="text-ink/40 text-[11px]">Photo and name</Text>
                </View>
              </Pressable>
            )}

            {visible.map((category) => {
              const count = productCount.get(category.id) ?? 0;
              const share = totalCategorized ? count / totalCategorized : 0;
              return (
                <View
                  key={category.id}
                  style={{ width: tileWidth }}
                  className="bg-white rounded-xl border border-ink/5 px-3 pt-3 pb-2.5"
                >
                  <View className="flex-row items-center">
                    <Thumb uri={category.image?.url} size={44} />
                    <View className="flex-1 ml-3 pr-1">
                      <Text numberOfLines={1} className="text-ink text-[13px] font-bold">
                        {category.name}
                      </Text>
                      <Text className={`text-[11px] mt-0.5 ${count ? "text-ink/50" : "text-ink/30"}`}>
                        {count ? `${count} ${count === 1 ? "product" : "products"}` : "No products"}
                      </Text>
                    </View>
                    <DeleteButton id={category.id} name={category.name} count={count} />
                  </View>
                  <View className="mt-2.5">
                    <ShareBar ratio={share} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* LIST — dense table */
          <View className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
            <View className="flex-row items-center bg-ivory px-4 py-2.5 border-b border-ink/5">
              <Text className="flex-1 text-ink/40 text-[10px] font-bold uppercase tracking-widest">
                Category
              </Text>
              <Text className="w-[180px] text-ink/40 text-[10px] font-bold uppercase tracking-widest">
                Products
              </Text>
              <Text className="w-[110px] text-ink/40 text-[10px] font-bold uppercase tracking-widest text-right">
                Added
              </Text>
              <View className="w-10" />
            </View>
            {visible.map((category, index) => {
              const count = productCount.get(category.id) ?? 0;
              const share = totalCategorized ? count / totalCategorized : 0;
              return (
                <View
                  key={category.id}
                  className={`flex-row items-center px-4 py-2 ${
                    index === visible.length - 1 ? "" : "border-b border-ink/5"
                  }`}
                >
                  <View className="flex-1 flex-row items-center pr-4">
                    <Thumb uri={category.image?.url} size={34} />
                    <Text numberOfLines={1} className="flex-1 ml-3 text-ink text-[13px] font-semibold">
                      {category.name}
                    </Text>
                  </View>
                  <View className="w-[180px] pr-6" style={{ gap: 4 }}>
                    <Text className="text-ink text-xs font-bold">
                      {count}{" "}
                      <Text className="text-ink/40 font-medium">
                        · {Math.round(share * 100)}%
                      </Text>
                    </Text>
                    <ShareBar ratio={share} />
                  </View>
                  <Text className="w-[110px] text-ink/50 text-xs text-right">
                    {formatDate(category.createdAt)}
                  </Text>
                  <View className="w-10 items-end">
                    <DeleteButton id={category.id} name={category.name} count={count} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {filtered.length > 0 && (
        <Pager
          page={safePage}
          pageCount={pageCount}
          total={filtered.length}
          pageSize={pageSize}
          onChange={setPage}
        />
      )}
    </View>
  );
}
