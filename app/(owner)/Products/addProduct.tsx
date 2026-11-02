import { DateField, whoLine } from "@/components/inventory/stockKit";
import RecipeEditor, { type RecipeRow } from "@/components/kitchen/RecipeEditor";
import usePermissions from "@/store/Authentication/usePermissions";
import useCategory from "@/store/category/useCategory";
import useProduct from "@/store/products/useProduct";
import type { ProductType } from "@/store/products/productsType";
import { brand } from "@/config/theme";
import { playBeep } from "@/utils/beep";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { secureUrl, thumbUrl } from "@/utils/imageUrl";
const webNoOutline =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

const emptyProduct = {
  name: "",
  buyingPrice: 0,
  categoryId: "",
  sellingPrice: 0,
  picture: null as any,
  barCode: "",
  ingredients: "",
  active: true,
  isIngredient: false,
  trackStock: true,
  stockQuantity: "",
  lowStockLevel: "",
  unit: "Piece",
  sku: "",
  expiryDate: "",
  supplier: "",
  sendToKitchen: false,
  description: "",
};

// The form's starting values. `saved` marks the picture already on the server, so
// it is only uploaded again if it is replaced.
const formFrom = (existing: ProductType) => {
  const image = existing.images?.[0];
  return {
    ...emptyProduct,
    isIngredient: existing.isIngredient,
    trackStock: existing.trackStock,
    stockQuantity: String(Number(existing.stockQuantity ?? 0)),
    lowStockLevel:
      existing.lowStockLevel === null || existing.lowStockLevel === undefined
        ? ""
        : String(Number(existing.lowStockLevel)),
    unit: existing.unit ?? emptyProduct.unit,
    sku: existing.sku ?? "",
    expiryDate: existing.expiryDate ?? "",
    supplier: existing.supplier ?? "",
    description: existing.description ?? "",
    sendToKitchen: existing.sendToKitchen,
    name: existing.name,
    buyingPrice: Number(existing.buyingPrice) || 0,
    sellingPrice: Number(existing.sellingPrice) || 0,
    categoryId: existing.category?.id ?? "",
    picture: image ? { uri: image.url, saved: true } : null,
    barCode: existing.barCode ?? "",
    ingredients: existing.ingredients ?? "",
    active: existing.active,
  };
};

// How shops here really sell: by the crate, the heap, the jerrycan, the tot.
const UNIT_GROUPS = [
  { label: "Count", units: ["Piece", "Pair", "Dozen", "Set", "Roll", "Sheet"] },
  { label: "Packs", units: ["Pack", "Box", "Carton", "Crate", "Bundle", "Bag", "Sachet"] },
  { label: "Drinks", units: ["Bottle", "Can", "Glass", "Cup", "Jug", "Tot", "Shot", "Jerrycan"] },
  { label: "Food", units: ["Plate", "Portion", "Bowl", "Slice", "Skewer", "Loaf", "Buffet"] },
  { label: "Market", units: ["Heap", "Bunch", "Basin", "Sack", "Tray", "Tin", "Bucket"] },
  { label: "Measure", units: ["Kg", "Gram", "Tonne", "Litre", "Millilitre", "Metre", "Square metre"] },
  { label: "Health", units: ["Tablet", "Strip", "Capsule", "Vial", "Tube", "Dose"] },
  { label: "Services", units: ["Hour", "Day", "Night", "Room", "Session", "Visit", "Trip", "Person"] },
];
const CUSTOM_UNITS = "Custom";
const unitGroupOf = (unit: string) =>
  UNIT_GROUPS.find((g) => g.units.includes(unit))?.label ?? CUSTOM_UNITS;
const asOptions = (values: string[]) =>
  values.map((value) => ({ value, label: value }));

// Quantities can be parts of a unit, e.g. 1.5 kg.
const quantityOnly = (value: string) => value.replace(/[^0-9.]/g, "");

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-5">
      <View className="flex-row items-center mb-4">
        <View className="w-9 h-9 rounded-xl bg-ivory items-center justify-center">
          <Ionicons name={icon} size={17} color={brand.ink} />
        </View>
        <View className="ml-3">
          <Text className="text-ink text-[15px] font-extrabold tracking-tight">{title}</Text>
          {subtitle && <Text className="text-ink/40 text-[11px] mt-0.5">{subtitle}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

function Label({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text className="text-ink/60 text-[11px] font-bold uppercase tracking-wider mb-1.5">
      {children}
      {required && <Text style={{ color: brand.danger }}> *</Text>}
    </Text>
  );
}

function Input({
  icon,
  suffix,
  right,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  icon?: keyof typeof Ionicons.glyphMap;
  suffix?: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3.5 min-h-[48px]">
      {icon && <Ionicons name={icon} size={17} color={brand.inkDisabled} />}
      <TextInput
        placeholderTextColor={brand.inkDisabled}
        className={`flex-1 py-3 text-[15px] text-ink ${icon ? "ml-2.5" : ""}`}
        style={webNoOutline}
        {...props}
      />
      {suffix && <Text className="text-ink/40 text-xs font-bold ml-2">{suffix}</Text>}
      {right}
    </View>
  );
}

function Choices({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`px-3.5 h-10 rounded-xl border items-center justify-center ${
              active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
            }`}
          >
            <Text className={`text-xs font-bold ${active ? "text-white" : "text-ink"}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center">
      <View className="flex-1 pr-3">
        <Text className="text-ink text-sm font-semibold">{label}</Text>
        <Text className="text-ink/40 text-[11px] mt-0.5">{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: brand.inkDisabled, true: brand.ink }}
        thumbColor={value ? brand.lime : brand.white}
      />
    </View>
  );
}

// Adds a product, or edits `existing` when one is given.
export default function AddProduct({
  existing,
  onSaved,
  onCancel,
}: {
  existing?: ProductType;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { categoriesResponse, getCategories } = useCategory();
  const {
    products,
    getProducts,
    addProduct,
    updateProduct,
    setProductActive,
    getRecipe,
    saveRecipe,
  } = useProduct();
  const { width } = useWindowDimensions();
  const { can } = usePermissions();
  const router = useRouter();
  const canSetStock = can("inventory.adjust");

  const [product, setProduct] = useState(() =>
    existing ? formFrom(existing) : emptyProduct,
  );
  const update = (changes: Partial<typeof emptyProduct>) =>
    setProduct((prev) => ({ ...prev, ...changes }));
  const [showMore, setShowMore] = useState(false);
  const [unitGroup, setUnitGroup] = useState(() => unitGroupOf(product.unit));
  const [isScannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recipe, setRecipe] = useState<RecipeRow[]>([]);
  // What the server has, so an unchanged recipe isn't saved again.
  const [savedRecipe, setSavedRecipe] = useState("[]");
  const showRecipe = product.sendToKitchen && !product.isIngredient;

  // Categories are normally loaded by the catalog tab; load them if we opened here first.
  useEffect(() => {
    if (categoriesResponse.length === 0) getCategories();
    if (products.length === 0) getProducts();
    if (!existing || existing.isIngredient) return;
    getRecipe(existing.id)
      .then((lines) => {
        const rows = lines.map((line) => ({
          ingredientId: line.ingredientId,
          quantity: String(line.quantity),
        }));
        setRecipe(rows);
        setSavedRecipe(JSON.stringify(rows));
      })
      .catch(() => Toast.show({ type: "error", text1: "Could not load the recipe" }));
  }, []);

  const isWide = width >= 1100;

  const buy = product.buyingPrice;
  const sell = product.sellingPrice;
  const profit = sell - buy;
  const marginPct = sell > 0 ? Math.round((profit / sell) * 100) : 0;
  const hasPricing = buy > 0 || sell > 0;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const image = result.assets[0];
      setProduct((prev) => ({
        ...prev,
        picture: image,
      }));
    }
  };

  const openScanner = async () => {
    const { status } = await requestPermission();
    if (status === "granted") {
      setScannerVisible(true);
    } else {
      Alert.alert("Permission Denied", "We need camera access to scan codes.");
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    await playBeep();
    setProduct((prev) => ({ ...prev, barCode: data }));
    setScannerVisible(false);
    setScanned(false);
  };

  // For products with no barcode; one that already has a code keeps showing it.
  const showSku = !product.barCode.trim() || !!existing?.sku;

  const handleSave = async () => {
    if (!product.name || (!product.categoryId && !product.isIngredient)) {
      Toast.show({
        type: "error",
        text1: "Missing information",
        text2: product.isIngredient
          ? "Please fill in the name."
          : "Please fill in the product name and select a category.",
      });
      return;
    }

    if (!product.picture && !product.isIngredient) {
      Toast.show({
        type: "error",
        text1: "Image Required",
        text2: "Please select at least one product picture.",
      });
      return;
    }

    if (showRecipe && recipe.some((row) => !(Number(row.quantity) > 0))) {
      Toast.show({
        type: "error",
        text1: "Recipe amounts needed",
        text2: "Enter how much of each ingredient one is made with.",
      });
      return;
    }

    if (product.sellingPrice <= 0 && !product.isIngredient) {
      Toast.show({
        type: "error",
        text1: "Sell price needed",
        text2: "The sell price must be above 0.",
      });
      return;
    }

    if (!product.unit.trim()) {
      Toast.show({ type: "error", text1: "Unit needed", text2: "Choose or type a unit." });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", product.name);
      formData.append("buyingPrice", String(product.buyingPrice));
      formData.append("sellingPrice", String(product.sellingPrice));
      if (product.categoryId) formData.append("categoryId", product.categoryId);
      formData.append("isIngredient", String(product.isIngredient));
      // When editing they are always sent, so that emptying a field clears it.
      if (existing || product.barCode?.trim()) {
        formData.append("barCode", product.barCode);
      }
      if (existing || product.ingredients?.trim()) {
        formData.append("ingredients", product.ingredients);
      }
      formData.append("unit", product.unit.trim());
      formData.append("trackStock", String(product.trackStock));
      formData.append("sendToKitchen", String(product.sendToKitchen));
      // Blank clears these on the server.
      formData.append("sku", showSku ? product.sku.trim() : "");
      formData.append("supplier", product.supplier.trim());
      formData.append("description", product.description.trim());
      formData.append("expiryDate", product.expiryDate);
      formData.append("lowStockLevel", product.lowStockLevel);
      // It replaces the current number, so an unchanged figure must not be sent:
      // a sale made while the form was open would be undone.
      if (
        canSetStock &&
        product.trackStock &&
        product.stockQuantity !== "" &&
        (!existing ||
          Number(product.stockQuantity) !== Number(existing.stockQuantity))
      ) {
        formData.append("stockQuantity", product.stockQuantity);
      }

      if (product.picture?.uri && !product.picture.saved) {
        if (Platform.OS === "web") {
          const picture = await fetch(product.picture.uri).then((response) =>
            response.blob(),
          );
          formData.append("picture", picture, "product.jpg");
        } else {
          formData.append("picture", {
            uri: product.picture.uri,
            name: "product.jpg",
            type: product.picture.mimeType || "image/jpeg",
          } as any);
        }
      }

      let productId = existing?.id;
      if (existing) {
        await updateProduct(existing.id, formData);
        if (product.active !== existing.active) {
          await setProductActive(existing.id, product.active);
        }
      } else {
        productId = (await addProduct(formData)).id;
      }
      if (showRecipe && JSON.stringify(recipe) !== savedRecipe) {
        try {
          await saveRecipe(
            productId!,
            recipe.map((row) => ({
              ingredientId: row.ingredientId,
              quantity: Number(row.quantity),
            })),
          );
        } catch (error) {
          // Saving the product again would add a duplicate, so it isn't retried here.
          Toast.show({
            type: "error",
            text1: "Product saved, but not its recipe",
            text2: (error as Error).message,
          });
          onSaved?.();
          return;
        }
      }
      Toast.show({
        type: "success",
        text1: "Product Saved",
        text2: existing
          ? "Your changes have been saved."
          : "Your product has been added successfully.",
      });
      if (!existing) {
        setProduct(emptyProduct);
        setRecipe([]);
      }
      onSaved?.();
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const imageCard = (
    <Section
      icon="image-outline"
      title="Product photo"
      subtitle={product.isIngredient ? "Optional for ingredients" : "Square image, shown on the POS"}
    >
      <Pressable
        onPress={pickImage}
        accessibilityRole="button"
        accessibilityLabel={product.picture ? "Change photo" : "Upload photo"}
        className={`aspect-square w-full rounded-2xl items-center justify-center overflow-hidden ${
          product.picture ? "bg-ivory" : "bg-ivory border-2 border-dashed border-ink/15 active:bg-ink/5"
        }`}
      >
        {product.picture ? (
          <Image
            source={{ uri: secureUrl(product.picture.uri) }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <>
            <View className="w-14 h-14 rounded-2xl bg-white border border-ink/5 items-center justify-center mb-3">
              <Ionicons name="cloud-upload-outline" size={26} color={brand.ink} />
            </View>
            <Text className="text-ink text-sm font-bold">Upload photo</Text>
            <Text className="text-ink/40 text-[11px] mt-1">PNG or JPG · 1:1</Text>
          </>
        )}
      </Pressable>

      {product.picture && (
        <View className="flex-row mt-3" style={{ gap: 8 }}>
          <Pressable
            onPress={pickImage}
            className="flex-1 flex-row items-center justify-center h-10 rounded-xl border border-ink/10 active:bg-ivory"
          >
            <Ionicons name="swap-horizontal" size={15} color={brand.ink} />
            <Text className="text-ink text-xs font-bold ml-1.5">Change</Text>
          </Pressable>
          <Pressable
            onPress={() => setProduct((prev) => ({ ...prev, picture: null }))}
            className="flex-1 flex-row items-center justify-center h-10 rounded-xl border border-ink/10 active:bg-red-50"
          >
            <Ionicons name="trash-outline" size={15} color={brand.danger} />
            <Text className="text-xs font-bold ml-1.5" style={{ color: brand.danger }}>
              Remove
            </Text>
          </Pressable>
        </View>
      )}
    </Section>
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <View className={isWide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
        {/* LEFT — photo */}
        <View style={isWide ? { width: 320 } : undefined}>{imageCard}</View>

        {/* RIGHT — details */}
        <View className="flex-1" style={{ gap: 16 }}>
          {!!existing && (
            <View className="flex-row items-center bg-white rounded-2xl border border-ink/5 px-5 py-3.5">
              <Ionicons name="time-outline" size={16} color={brand.inkMuted} />
              <Text className="flex-1 text-ink/60 text-xs ml-2.5">{whoLine(existing)}</Text>
              {can("inventory.view") && (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(owner)/inventory/product/[id]",
                      params: { id: existing.id },
                    })
                  }
                  hitSlop={8}
                >
                  <Text className="text-ink text-xs font-bold ml-3">History</Text>
                </Pressable>
              )}
            </View>
          )}

          <Section icon="pricetag-outline" title="Basic information">
            <View style={{ gap: 16 }}>
              <View>
                <Label required>Product name</Label>
                <Input
                  icon="cube-outline"
                  value={product.name}
                  placeholder="e.g. Organic Coffee"
                  onChangeText={(val) => setProduct((prev) => ({ ...prev, name: val }))}
                />
              </View>

              {!product.isIngredient && (
              <View>
                <Label required>Category</Label>
                {categoriesResponse.length === 0 ? (
                  <View className="flex-row items-center bg-ivory rounded-xl px-3.5 h-12">
                    <ActivityIndicator size="small" color={brand.ink} />
                    <Text className="text-ink/40 text-xs ml-2">Loading categories...</Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {categoriesResponse.map((category) => {
                      const active = product.categoryId === category.id;
                      return (
                        <Pressable
                          key={category.id}
                          onPress={() =>
                            setProduct((prev) => ({ ...prev, categoryId: category.id }))
                          }
                          className={`flex-row items-center pl-1.5 pr-3.5 py-1.5 rounded-xl border ${
                            active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                          }`}
                        >
                          <View className="w-7 h-7 rounded-lg bg-ivory overflow-hidden items-center justify-center">
                            {category.image?.url ? (
                              <Image
                                source={{ uri: thumbUrl(category.image) }}
                                style={{ width: 28, height: 28 }}
                              />
                            ) : (
                              <Ionicons name="folder-outline" size={14} color={brand.inkMuted} />
                            )}
                          </View>
                          <Text
                            className={`text-xs font-bold ml-2 ${active ? "text-white" : "text-ink"}`}
                          >
                            {category.name}
                          </Text>
                          {active && (
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color={brand.lime}
                              style={{ marginLeft: 6 }}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
              )}

              <ToggleRow
                label="Ingredient"
                hint="Used to make other products, like beef or cooking oil. Never sold on the till."
                value={product.isIngredient}
                onChange={(isIngredient) =>
                  update(
                    isIngredient
                      ? { isIngredient, trackStock: true, sendToKitchen: false }
                      : { isIngredient },
                  )
                }
              />

              {!!existing && (
                <ToggleRow
                  label="Active"
                  hint="Turn off to stop selling this product."
                  value={product.active}
                  onChange={(active) => update({ active })}
                />
              )}
            </View>
          </Section>

          <Section icon="cash-outline" title="Pricing" subtitle="Prices in Rwandan francs">
            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <Label>{product.isIngredient ? `Cost per ${product.unit || "unit"}` : "Buy price"}</Label>
                <Input
                  keyboardType="numeric"
                  placeholder="0"
                  suffix="RWF"
                  value={product.buyingPrice ? String(product.buyingPrice) : ""}
                  onChangeText={(val) =>
                    setProduct((prev) => ({ ...prev, buyingPrice: Number(val) || 0 }))
                  }
                />
              </View>
              {!product.isIngredient && (
                <View className="flex-1">
                  <Label>Sell price</Label>
                  <Input
                    keyboardType="numeric"
                    placeholder="0"
                    suffix="RWF"
                    value={product.sellingPrice ? String(product.sellingPrice) : ""}
                    onChangeText={(val) =>
                      setProduct((prev) => ({ ...prev, sellingPrice: Number(val) || 0 }))
                    }
                  />
                </View>
              )}
            </View>

            {hasPricing && !product.isIngredient && (
              <View
                className={`flex-row items-center justify-between mt-4 rounded-xl px-4 py-3 ${
                  profit < 0 ? "bg-red-50" : "bg-ink"
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={profit < 0 ? "trending-down" : "trending-up"}
                    size={16}
                    color={profit < 0 ? brand.danger : brand.lime}
                  />
                  <Text
                    className="text-xs font-bold ml-2"
                    style={{ color: profit < 0 ? brand.danger : "rgba(255,255,255,0.7)" }}
                  >
                    {profit < 0 ? "Selling below cost" : "Profit per unit"}
                  </Text>
                </View>
                <Text
                  className="text-sm font-extrabold"
                  style={{ color: profit < 0 ? brand.danger : brand.lime }}
                >
                  {profit >= 0 ? "+" : ""}
                  {profit.toLocaleString()} RWF · {marginPct}%
                </Text>
              </View>
            )}
          </Section>

          <Section icon="layers-outline" title="Stock" subtitle="How this product is counted">
            <View style={{ gap: 16 }}>
              <View>
                <Label>{`Unit · ${product.unit || "Not chosen"}`}</Label>
                <Choices
                  options={asOptions([...UNIT_GROUPS.map((g) => g.label), CUSTOM_UNITS])}
                  value={unitGroup}
                  onChange={(group) => {
                    setUnitGroup(group);
                    if (group === CUSTOM_UNITS) update({ unit: "" });
                  }}
                />
                <View className="mt-3 pt-3 border-t border-ink/5">
                  {unitGroup === CUSTOM_UNITS ? (
                    <Input
                      icon="create-outline"
                      value={product.unit}
                      maxLength={20}
                      placeholder="Type your own unit"
                      onChangeText={(unit) => update({ unit })}
                    />
                  ) : (
                    <Choices
                      options={asOptions(
                        UNIT_GROUPS.find((g) => g.label === unitGroup)?.units ?? [],
                      )}
                      value={product.unit}
                      onChange={(unit) => update({ unit })}
                    />
                  )}
                </View>
              </View>
              <ToggleRow
                label="Track stock"
                hint="Turn off for cooked meals and services."
                value={product.trackStock}
                onChange={(trackStock) => update({ trackStock })}
              />
              {product.trackStock && (
                <View className="flex-row" style={{ gap: 12 }}>
                  {canSetStock && (
                    <View className="flex-1">
                      <Label>Quantity in stock</Label>
                      <Input
                        keyboardType="decimal-pad"
                        placeholder="0"
                        value={product.stockQuantity}
                        onChangeText={(val) => update({ stockQuantity: quantityOnly(val) })}
                      />
                    </View>
                  )}
                  <View className="flex-1">
                    <Label>Low-stock alert at</Label>
                    <Input
                      keyboardType="decimal-pad"
                      placeholder="0"
                      value={product.lowStockLevel}
                      onChangeText={(val) => update({ lowStockLevel: quantityOnly(val) })}
                    />
                  </View>
                </View>
              )}
            </View>
          </Section>

          {showRecipe && (
            <Section
              icon="restaurant-outline"
              title="Recipe"
              subtitle="What one is made from. Each sale takes these out of stock."
            >
              <RecipeEditor
                rows={recipe}
                sellingPrice={product.sellingPrice}
                onChange={setRecipe}
              />
            </Section>
          )}

          <Section icon="barcode-outline" title="Details" subtitle="Optional">
            <View style={{ gap: 16 }}>
              <View>
                <Label>Barcode / QR code</Label>
                <Input
                  icon="barcode-outline"
                  value={product.barCode}
                  placeholder="Scan or enter code"
                  onChangeText={(val) => setProduct((prev) => ({ ...prev, barCode: val }))}
                  right={
                    <Pressable
                      onPress={openScanner}
                      accessibilityLabel="Scan barcode"
                      className="flex-row items-center bg-ink rounded-lg px-3 h-8 ml-2 active:bg-ink-soft"
                    >
                      <Ionicons name="scan-outline" size={14} color={brand.lime} />
                      <Text className="text-white text-[11px] font-bold ml-1.5">Scan</Text>
                    </Pressable>
                  }
                />
              </View>

              {showSku && (
                <View>
                  <Label>SKU / product code</Label>
                  <Input
                    icon="pricetags-outline"
                    value={product.sku}
                    placeholder="For products without a barcode"
                    onChangeText={(sku) => update({ sku })}
                  />
                </View>
              )}

              <View>
                <Label>Ingredients</Label>
                <View className="bg-ivory border border-ink/10 rounded-xl px-3.5">
                  <TextInput
                    value={product.ingredients}
                    placeholder="e.g. Sugar, Milk, Coffee"
                    placeholderTextColor={brand.inkDisabled}
                    multiline
                    textAlignVertical="top"
                    className="py-3 text-[15px] text-ink min-h-[84px]"
                    style={webNoOutline}
                    onChangeText={(val) => setProduct((prev) => ({ ...prev, ingredients: val }))}
                  />
                </View>
              </View>

              {!product.isIngredient && (
                <ToggleRow
                  label="Show in kitchen"
                  hint="Off means the kitchen never sees this product."
                  value={product.sendToKitchen}
                  onChange={(sendToKitchen) => update({ sendToKitchen })}
                />
              )}

              <Pressable
                onPress={() => setShowMore((open) => !open)}
                accessibilityRole="button"
                className="flex-row items-center justify-between pt-4 border-t border-ink/5"
              >
                <Text className="text-ink text-sm font-semibold">More details</Text>
                <Ionicons
                  name={showMore ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={brand.inkMuted}
                />
              </Pressable>

              {showMore && (
                <>
                  <View>
                    <Label>Expiry date</Label>
                    <DateField
                      value={product.expiryDate}
                      placeholder="Choose a date"
                      onChange={(expiryDate) => update({ expiryDate })}
                    />
                  </View>
                  <View>
                    <Label>Supplier</Label>
                    <Input
                      icon="business-outline"
                      value={product.supplier}
                      placeholder="Who you reorder from"
                      onChangeText={(supplier) => update({ supplier })}
                    />
                  </View>
                  <View>
                    <Label>Short description</Label>
                    <View className="bg-ivory border border-ink/10 rounded-xl px-3.5">
                      <TextInput
                        value={product.description}
                        placeholder="A short note about this product"
                        placeholderTextColor={brand.inkDisabled}
                        multiline
                        textAlignVertical="top"
                        className="py-3 text-[15px] text-ink min-h-[84px]"
                        style={webNoOutline}
                        onChangeText={(description) => update({ description })}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </Section>

          {/* Actions */}
          <View className="flex-row" style={{ gap: 12 }}>
            <Pressable
              onPress={() => (existing ? onCancel?.() : setProduct(emptyProduct))}
              disabled={isSubmitting}
              className="h-14 px-6 flex-row items-center justify-center rounded-xl bg-white border border-ink/10 active:bg-ivory"
            >
              <Ionicons name={existing ? "close" : "refresh"} size={16} color={brand.ink} />
              <Text className="text-ink text-sm font-bold ml-2">
                {existing ? "Cancel" : "Reset"}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={isSubmitting}
              className={`h-14 flex-1 flex-row items-center justify-center rounded-xl ${
                isSubmitting ? "bg-lime-dark" : "bg-lime active:bg-lime-dark"
              }`}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color={brand.ink} />
                  <Text className="text-ink text-base font-bold ml-2">Saving...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={brand.ink} />
                  <Text className="text-ink text-base font-bold ml-2">
                    {existing ? "Save Changes" : "Save Product"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Barcode scanner */}
      <Modal visible={isScannerVisible} animationType="slide">
        <View className="flex-1 bg-black">
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "code128"],
            }}
          />
          <View className="flex-1 justify-center items-center">
            <View className="w-64 h-64">
              {/* Corner brackets */}
              <View className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-lime rounded-tl-2xl" />
              <View className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-lime rounded-tr-2xl" />
              <View className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-lime rounded-bl-2xl" />
              <View className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-lime rounded-br-2xl" />
            </View>
            <View className="flex-row items-center mt-6 bg-ink/80 px-4 py-2.5 rounded-full">
              <Ionicons name="scan-outline" size={16} color={brand.lime} />
              <Text className="text-white text-sm font-semibold ml-2">
                Align the code within the frame
              </Text>
            </View>
          </View>
          <Pressable
            className="absolute top-12 left-6 w-11 h-11 rounded-full bg-ink/80 items-center justify-center active:bg-ink"
            onPress={() => setScannerVisible(false)}
            accessibilityLabel="Close scanner"
          >
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        </View>
      </Modal>
    </ScrollView>
  );
}
