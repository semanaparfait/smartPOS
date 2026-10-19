import Checkout from "@/app/components/cart";
import { Eyebrow } from "@/components/brand";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import useCart from "@/store/Cart/useCart";
import useCategory from "@/store/category/useCategory";
import useItem from "@/store/Item/useItem";
import type { ProductType } from "@/store/products/productsType";
import useProduct from "@/store/products/useProduct";
import {
  ImageOff,
  PackageSearch,
  ScanBarcode,
  Search,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const LIST_PADDING = 20;
const CARD_GAP = 12;
const COLUMNS = 5; // products per row
const MIN_CARD_WIDTH = 110; // on narrow screens, use fewer columns instead of squashing
const MAX_IMAGE_HEIGHT = 120;

export default function ProductScreen() {
  const { width } = useWindowDimensions();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [productPaneWidth, setProductPaneWidth] = useState<number>(0);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);

  const { products, getProducts } = useProduct();
  const { addItem, addByBarCode, updateItem } = useItem();
  const { getOrCreateActiveCart, getCart, incrementItemQuantity } = useCart();
  const { categoriesResponse, getCategories } = useCategory();
  const { fetchProfile } = useAuth();
  const profile = useAuth((state) => state.profile);

  const barcodeInputRef = useRef<TextInput>(null);
  const searchFocusedRef = useRef(false);
  const lastProductTap = useRef<{ productId: string; timestamp: number } | null>(null);

  const effectivePaneWidth = productPaneWidth || Math.floor(width * 0.6);
  const innerWidth = effectivePaneWidth - LIST_PADDING * 2;
  const columns = Math.max(
    2,
    Math.min(
      COLUMNS,
      Math.floor((innerWidth + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP)),
    ),
  );
  const cardWidth = Math.floor(
    (innerWidth - CARD_GAP * (columns - 1)) / columns,
  );
  const imageHeight = Math.min(MAX_IMAGE_HEIGHT, Math.round(cardWidth * 0.75));

  useEffect(() => {
    Promise.allSettled([getCategories(), getProducts(), fetchProfile()]).finally(
      () => setLoading(false),
    );
  }, []);

  // Keep the hidden scanner input focused so a barcode scanner can type into it —
  // but never steal focus while staff are typing in the search box.
  useEffect(() => {
    const focusTimer = setInterval(() => {
      if (searchFocusedRef.current) return;
      if (barcodeInputRef.current && !barcodeInputRef.current.isFocused()) {
        barcodeInputRef.current.focus();
      }
    }, 1500);
    return () => clearInterval(focusTimer);
  }, []);

  const setSearchFocus = (focused: boolean) => {
    searchFocusedRef.current = focused;
    setSearchFocused(focused);
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const id = p.category?.id;
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== "All" && p.category?.id !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.barCode?.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, search]);

  const handleProductPaneLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== productPaneWidth) {
      setProductPaneWidth(nextWidth);
    }
  };

  const handleAddToCart = async (productId: string, quantity: number) => {
    const now = Date.now();
    const previousTap = lastProductTap.current;
    const isDoubleTap =
      previousTap?.productId === productId && now - previousTap.timestamp < 300;
    lastProductTap.current = isDoubleTap ? null : { productId, timestamp: now };

    try {
      const cartId = await getOrCreateActiveCart();

      if (isDoubleTap) {
        const updatedItem = incrementItemQuantity(productId);

        if (updatedItem) {
          try {
            await updateItem(updatedItem.itemId, updatedItem.quantity);
            await getCart();
            Toast.show({ type: "success", text1: "Quantity increased" });
          } catch (error: any) {
            await getCart();
            throw error;
          }
          return;
        }
      }

      await addItem(cartId, productId, quantity);
      await getCart();

      Toast.show({ type: "success", text1: "Item added to cart" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to add item to cart",
        text2: error?.message || "Something went wrong",
      });
    }
  };

  const handleBarcodeSubmit = async () => {
    const codeToScan = barcodeValue.trim();
    if (!codeToScan) return;

    try {
      const cartId = await getOrCreateActiveCart();
      await addByBarCode(cartId, codeToScan);
      await getCart();

      Toast.show({
        type: "success",
        text1: "Barcode item added!",
        text2: `Code: ${codeToScan}`,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to scan barcode",
        text2: error?.message || "Could not resolve product code",
      });
    } finally {
      setBarcodeValue("");
    }
  };

  const renderProduct = ({ item }: { item: ProductType }) => {
    const imageUrl = item.images?.[0]?.url;
    const showImage = !!imageUrl && !failedImages.includes(item.id);

    return (
      <Pressable
        onPress={() => handleAddToCart(item.id, 1)}
        accessibilityLabel={`Add ${item.name} to cart`}
        className="overflow-hidden rounded-xl bg-white border border-ink/5 p-2 active:opacity-80"
        style={{
          width: cardWidth,
          shadowColor: brand.ink,
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        }}
      >
        {/* Whole product visible (contain), not cropped/zoomed */}
        <View
          className="rounded-lg bg-ivory items-center justify-center overflow-hidden"
          style={{ height: imageHeight }}
        >
          {showImage ? (
            // Remote images need explicit pixel sizes — className sizing isn't applied to Image here.
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: imageHeight - 12 }}
              resizeMode="contain"
              onError={() => setFailedImages((prev) => [...prev, item.id])}
            />
          ) : (
            <ImageOff size={22} color={brand.inkDisabled} />
          )}
        </View>

        <View className="px-1 pt-2 pb-0.5">
          {item.category?.name ? (
            <Text
              numberOfLines={1}
              className="text-[10px] font-bold uppercase tracking-[1px] text-ink/40"
            >
              {item.category.name}
            </Text>
          ) : null}
          <Text
            numberOfLines={2}
            className="text-[13px] font-semibold text-ink leading-[17px] min-h-[34px] mt-0.5"
          >
            {item.name}
          </Text>
          <Text className="text-base font-extrabold text-ink tracking-tight mt-1.5">
            {Number(item.sellingPrice || 0).toLocaleString()}
            <Text className="text-[10px] font-semibold text-ink/40"> RWF</Text>
          </Text>
        </View>
      </Pressable>
    );
  };

  const CategoryChip = ({
    id,
    label,
    count,
  }: {
    id: string;
    label: string;
    count: number;
  }) => {
    const active = selectedCategory === id;
    return (
      <Pressable
        onPress={() =>
          setSelectedCategory(active && id !== "All" ? "All" : id)
        }
        style={{ height: 40 }}
        className={`mr-2 flex-row items-center justify-center gap-1.5 rounded-full border px-4 ${
          active
            ? "bg-ink border-ink"
            : "bg-white border-ink/10 active:bg-ivory"
        }`}
      >
        <Text
          numberOfLines={1}
          className={`text-sm font-semibold ${active ? "text-white" : "text-ink/70"}`}
        >
          {label}
        </Text>
        <Text
          className={`text-xs font-bold ${active ? "text-lime" : "text-ink/35"}`}
        >
          {count}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ivory" edges={["top"]}>
      {/* Hidden receiver for the barcode scanner */}
      <TextInput
        ref={barcodeInputRef}
        value={barcodeValue}
        onChangeText={setBarcodeValue}
        onSubmitEditing={handleBarcodeSubmit}
        showSoftInputOnFocus={false}
        submitBehavior="submit"
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
      />

      <View className="flex-1 flex-row">
        <View style={{ flex: 2 }} onLayout={handleProductPaneLayout}>
          {/* Header */}
          <View className="px-5 pt-5 pb-4 flex-row items-end justify-between gap-4">
            <View className="shrink">
              <Eyebrow>{profile?.name ? `Hi, ${profile.name.split(" ")[0]}` : "Point of sale"}</Eyebrow>
              <View className="flex-row items-baseline gap-2 mt-2.5">
                <Text className="text-2xl font-extrabold text-ink tracking-tight">
                  Products
                </Text>

              </View>
            </View>

            <View className="flex-row items-center gap-2 flex-1 justify-end">
              <View
                className={`flex-row items-center h-11 flex-1 max-w-[340px] rounded-xl border px-3.5 gap-2.5 ${
                  searchFocused ? "bg-white border-ink" : "bg-white border-ink/10"
                }`}
              >
                <Search size={17} color={brand.inkMuted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  onFocus={() => setSearchFocus(true)}
                  onBlur={() => setSearchFocus(false)}
                  placeholder="Search name or barcode"
                  placeholderTextColor={brand.inkDisabled}
                  selectionColor={brand.ink}
                  returnKeyType="search"
                  className="flex-1 h-full text-sm text-ink"
                />
                {search ? (
                  <Pressable
                    onPress={() => setSearch("")}
                    hitSlop={8}
                    accessibilityLabel="Clear search"
                    className="w-5 h-5 rounded-full bg-ink/10 items-center justify-center"
                  >
                    <X size={12} color={brand.ink} strokeWidth={2.5} />
                  </Pressable>
                ) : null}
              </View>

              <View
                className="h-11 flex-row items-center gap-2 rounded-xl bg-white border border-ink/10 px-3"
                accessibilityLabel={
                  searchFocused ? "Scanner paused while searching" : "Scanner ready"
                }
              >
                <ScanBarcode size={17} color={brand.ink} />
                <View
                  className={`w-2 h-2 rounded-full ${
                    searchFocused ? "bg-ink/20" : "bg-lime-dark"
                  }`}
                />
              </View>
            </View>
          </View>

          {/* Categories */}
          <View className="mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: LIST_PADDING }}
            >
              <CategoryChip id="All" label="All" count={products.length} />
              {categoriesResponse?.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  id={cat.id}
                  label={cat.name}
                  count={categoryCounts[cat.id] ?? 0}
                />
              ))}
            </ScrollView>
          </View>

          {/* Product grid */}
          {loading && products.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={brand.ink} />
            </View>
          ) : (
            <FlatList
              className="flex-1"
              key={columns}
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id.toString()}
              numColumns={columns}
              columnWrapperStyle={{ gap: CARD_GAP, marginBottom: CARD_GAP }}
              contentContainerStyle={{
                paddingHorizontal: LIST_PADDING,
                paddingBottom: LIST_PADDING,
                flexGrow: 1,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center py-20">
                  <View className="w-16 h-16 rounded-2xl bg-white border border-ink/5 items-center justify-center">
                    <PackageSearch size={28} color={brand.inkMuted} />
                  </View>
                  <Text className="text-ink text-base font-bold mt-4">
                    No products found
                  </Text>
                  <Text className="text-ink/50 text-sm mt-1">
                    {search
                      ? "Try a different name or barcode"
                      : "Nothing in this category yet"}
                  </Text>
                </View>
              }
            />
          )}
        </View>
        <Checkout />
      </View>
    </SafeAreaView>
  );
}
