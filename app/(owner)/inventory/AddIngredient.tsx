import ImageSearch from "@/components/inventory/ImageSearch";
import { formatQty, formatStock } from "@/components/inventory/stockKit";
import { BUY_UNITS, MONEY_UNIT, USE_UNITS } from "@/config/units";
import { brand } from "@/config/theme";
import usePermissions from "@/store/Authentication/usePermissions";
import type { ProductType, UsedInProduct } from "@/store/products/productsType";
import useProduct from "@/store/products/useProduct";
import { secureUrl } from "@/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  ChoiceChips,
  Input,
  Label,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Section,
  TextArea,
  pickSquarePhoto,
} from "@/components/forms/FormKit";

const LIST_ROUTE = "/(owner)/inventory/Ingredients";
const UNITS = USE_UNITS.map((u) => u.value);

const numberOnly = (value: string) => value.replace(/[^0-9.]/g, "");
const rwf = (amount: number) => `${Math.round(amount).toLocaleString()} RWF`;
const text = (value: number | string | null | undefined) =>
  value === null || value === undefined ? "" : String(Number(value));

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-ink/5">
      <Text className="text-ink/50 text-xs">{label}</Text>
      <Text
        numberOfLines={1}
        className="text-ink text-[13px] font-semibold ml-3 flex-shrink"
        style={danger ? { color: brand.danger } : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

function IngredientForm({ existing }: { existing?: ProductType }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { can } = usePermissions();
  const products = useProduct((s) => s.products);
  const addProduct = useProduct((s) => s.addProduct);
  const updateProduct = useProduct((s) => s.updateProduct);
  const getUsedIn = useProduct((s) => s.getUsedIn);
  const canSetStock = can("inventory.adjust");
  const savedStock = existing ? text(existing.stockQuantity) : "";

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [photo, setPhoto] = useState<{ uri: string; file: Blob | null } | null>(null);
  // A picture chosen from the search, used instead of `photo`.
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  // No default: a forgotten choice would count eggs in Kg.
  const [unit, setUnit] = useState(existing?.unit ?? "");
  const [customUnit, setCustomUnit] = useState(
    !!existing && !UNITS.includes(existing.unit),
  );
  const [cost, setCost] = useState(existing ? text(existing.buyingPrice) : "");
  const [purchaseUnit, setPurchaseUnit] = useState(existing?.purchaseUnit ?? "");
  const [packQuantity, setPackQuantity] = useState(text(existing?.purchaseSize));
  const [packPrice, setPackPrice] = useState(
    existing?.purchaseSize
      ? String(Math.round(Number(existing.purchaseSize) * Number(existing.buyingPrice)))
      : "",
  );
  const [stock, setStock] = useState(savedStock);
  const [alertAt, setAlertAt] = useState(text(existing?.lowStockLevel));
  const [usedIn, setUsedIn] = useState<UsedInProduct[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    getUsedIn(existing.id)
      .then(setUsedIn)
      .catch(() => {});
  }, []);

  const trimmed = name.trim().toLowerCase();
  const duplicate = products.some(
    (p) => p.id !== existing?.id && p.name?.trim().toLowerCase() === trimmed,
  );
  const buyUnit = purchaseUnit.trim();
  const stockNumber = Number(stock || 0);
  const byValue = unit === MONEY_UNIT;
  const costNumber = byValue ? 1 : Number(cost || 0);
  const alertNumber = alertAt === "" ? null : Number(alertAt);
  const low = alertNumber !== null && stockNumber <= alertNumber;
  const status =
    stock === ""
      ? "Not counted yet"
      : stockNumber <= 0
        ? "Out of stock"
        : low
          ? "Low stock"
          : "In stock";
  const imageUri = pictureUrl ?? photo?.uri ?? secureUrl(existing?.images?.[0]?.url);

  const applyPack = (quantity: string, price: string) => {
    setPackQuantity(quantity);
    setPackPrice(price);
    if (Number(quantity) > 0 && Number(price) > 0) {
      setCost(String(Math.round((Number(price) / Number(quantity)) * 100) / 100));
    }
  };

  const reset = () => {
    setName("");
    setDescription("");
    setPhoto(null);
    setPictureUrl(null);
    setCost("");
    setPurchaseUnit("");
    setPackQuantity("");
    setPackPrice("");
    setStock("");
    setAlertAt("");
  };

  const save = async (addAnother: boolean) => {
    if (!name.trim() || !unit.trim()) {
      Toast.show({ type: "error", text1: "Enter a name and a unit" });
      return;
    }
    if (duplicate) {
      Toast.show({ type: "error", text1: `${name.trim()} already exists` });
      return;
    }
    if (buyUnit && !(Number(packQuantity) > 0)) {
      Toast.show({
        type: "error",
        text1: `How many ${unit} are in one ${buyUnit}?`,
      });
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("unit", unit.trim());
      // Blank clears these on the server.
      form.append("purchaseUnit", buyUnit);
      form.append("purchaseSize", buyUnit ? packQuantity : "");
      form.append("buyingPrice", String(costNumber));
      form.append("isIngredient", "true");
      form.append("trackStock", "true");
      form.append("description", description.trim());
      form.append("lowStockLevel", alertAt);
      if (!existing) form.append("sellingPrice", "0");
      // It replaces the current number, so an unchanged figure must not be sent:
      // a sale made while the page was open would be undone.
      if (canSetStock && stock !== "" && stock !== savedStock) {
        form.append("stockQuantity", stock);
      }
      if (pictureUrl) {
        form.append("pictureUrl", pictureUrl);
      } else if (photo) {
        if (Platform.OS === "web") {
          const picture = photo.file ?? (await fetch(photo.uri).then((r) => r.blob()));
          form.append("picture", picture as Blob, "ingredient.jpg");
        } else {
          form.append("picture", {
            uri: photo.uri,
            name: "ingredient.jpg",
            type: "image/jpeg",
          } as any);
        }
      }

      if (existing) await updateProduct(existing.id, form);
      else await addProduct(form);

      Toast.show({
        type: "success",
        text1: existing ? "Ingredient saved" : "Ingredient added",
        text2: name.trim(),
      });
      if (addAnother) reset();
      else router.replace(LIST_ROUTE);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not save the ingredient",
        text2: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const summary = (
    <View style={{ gap: 16 }}>
      <Section icon="analytics-outline" title="Summary">
        <View className="items-center mb-3">
          <Pressable
            onPress={async () => {
              const picked = await pickSquarePhoto();
              if (!picked) return;
              setPhoto(picked);
              setPictureUrl(null);
            }}
            accessibilityLabel={imageUri ? "Change photo" : "Add photo"}
            className="w-24 h-24 rounded-2xl bg-ivory border border-ink/10 items-center justify-center overflow-hidden active:opacity-80"
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={{ width: 96, height: 96 }} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={22} color={brand.inkDisabled} />
                <Text className="text-ink/40 text-[11px] mt-1">Add photo</Text>
              </>
            )}
          </Pressable>
          <Text numberOfLines={1} className="text-ink text-base font-bold mt-3">
            {name.trim() || "New ingredient"}
          </Text>
        </View>
        <Row label="Status" value={status} danger={stock !== "" && (stockNumber <= 0 || low)} />
        <Row
          label="In stock"
          value={formatStock(stockNumber, {
            unit,
            purchaseUnit: buyUnit || null,
            purchaseSize: packQuantity || null,
          })}
        />
        {!byValue && <Row label={`Cost per ${unit || "unit"}`} value={rwf(costNumber)} />}
        <Row label="Stock value" value={rwf(Math.max(0, stockNumber) * costNumber)} />
        {alertNumber !== null && (
          <Row label="Reorder at" value={`${formatQty(alertNumber)} ${unit}`} />
        )}
      </Section>

      {!!existing && (
        <Section icon="restaurant-outline" title="Used in" subtitle="Recipes that take this from stock">
          {usedIn.length === 0 ? (
            <Text className="text-ink/50 text-xs">Not in any recipe yet.</Text>
          ) : (
            usedIn.map((dish) => (
              <Row
                key={dish.id}
                label={dish.name}
                value={`${formatQty(dish.quantity)} ${unit}`}
              />
            ))
          )}
        </Section>
      )}
    </View>
  );

  const wide = width >= 1100;

  return (
    <ScrollView
      className="flex-1 bg-ivory w-full"
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="p-6" style={{ gap: 20 }}>
        <PageHeader
          eyebrow="Ingredients"
          title={existing ? `Edit ${existing.name}` : "Add ingredient"}
          subtitle="Stock used to make your food. It never appears on the till."
          onBack={() => router.replace(LIST_ROUTE)}
        />

        <View className={wide ? "flex-row items-start" : ""} style={{ gap: 16 }}>
          <View className={wide ? "flex-1" : ""} style={{ gap: 16 }}>
            <Section icon="nutrition-outline" title="About this ingredient">
              <View style={{ gap: 16 }}>
                <View>
                  <Label required>Name</Label>
                  <Input
                    icon="cube-outline"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Beef"
                  />
                  {duplicate && (
                    <Text className="text-xs mt-1.5" style={{ color: brand.danger }}>
                      This name is already in use.
                    </Text>
                  )}
                </View>
                <View>
                  <Label>Storage notes</Label>
                  <TextArea
                    value={description}
                    onChangeText={setDescription}
                    placeholder="e.g. Keep frozen, use within 3 days"
                  />
                </View>
              </View>
            </Section>

            <Section
              icon="image-outline"
              title="Picture"
              subtitle="Search, paste a link, or tap the photo in the summary to upload"
            >
              <ImageSearch name={name} selected={pictureUrl} onPick={setPictureUrl} />
            </Section>

            <Section
              icon="scale-outline"
              title="How the kitchen uses it"
              subtitle="Rice by Kg, oil by Litre, eggs, onions or a whole chicken by Piece"
            >
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {USE_UNITS.map((option) => {
                  const active = !customUnit && unit === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setCustomUnit(false);
                        setUnit(option.value);
                        if (option.value === MONEY_UNIT) setPurchaseUnit("");
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      className={`flex-row items-center rounded-xl border p-3 ${
                        active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                      }`}
                      style={{ flexGrow: 1, flexBasis: 200 }}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={active ? brand.lime : brand.inkMuted}
                      />
                      <View className="flex-1 ml-2.5">
                        <Text className={`text-[13px] font-bold ${active ? "text-white" : "text-ink"}`}>
                          {option.value} · {option.how}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className={`text-[11px] mt-0.5 ${active ? "text-white/60" : "text-ink/50"}`}
                        >
                          {option.examples}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => {
                    setCustomUnit(true);
                    setUnit("");
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: customUnit }}
                  className={`flex-row items-center rounded-xl border p-3 ${
                    customUnit ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                  }`}
                  style={{ flexGrow: 1, flexBasis: 200 }}
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={customUnit ? brand.lime : brand.inkMuted}
                  />
                  <Text className={`text-[13px] font-bold ml-2.5 ${customUnit ? "text-white" : "text-ink"}`}>
                    Something else
                  </Text>
                </Pressable>
              </View>
              {byValue && (
                <Text className="text-ink/60 text-xs leading-[18px] mt-3">
                  For things bought by value, not weight. If you buy 500 RWF of spices and
                  each pot uses 100 RWF of it, enter 500 as stock and 100 in the recipe.
                </Text>
              )}
              {customUnit && (
                <View className="mt-3">
                  <Input
                    value={unit}
                    onChangeText={setUnit}
                    maxLength={20}
                    placeholder="Type your own unit"
                  />
                </View>
              )}
            </Section>

            {!byValue && (
            <Section
              icon="calculator-outline"
              title="How you buy it"
              subtitle="Only if it arrives differently, like eggs by the tray or onions by the Kg"
            >
              <View style={{ gap: 16 }}>
                <View>
                  <Label>You buy it by the</Label>
                  <ChoiceChips
                    options={BUY_UNITS.filter((option) => option.value !== unit).map((option) => ({
                      value: option.value,
                      label: option.value,
                    }))}
                    value={buyUnit}
                    onChange={(value) => {
                      setPurchaseUnit(value === buyUnit ? "" : value);
                      const size = BUY_UNITS.find((option) => option.value === value)?.size;
                      if (size && value !== buyUnit) applyPack(String(size), packPrice);
                    }}
                  />
                  <View className="mt-2">
                    <Input
                      icon="cube-outline"
                      value={purchaseUnit}
                      onChangeText={setPurchaseUnit}
                      maxLength={20}
                      placeholder="Or type another, e.g. Basin"
                    />
                  </View>
                </View>
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  <View className="flex-1" style={{ minWidth: 150 }}>
                    <Label>{buyUnit ? `${unit || "Units"} in one ${buyUnit}` : "You buy"}</Label>
                    <Input
                      value={packQuantity}
                      onChangeText={(val) => applyPack(numberOnly(val), packPrice)}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 25"
                      suffix={unit}
                    />
                  </View>
                  <View className="flex-1" style={{ minWidth: 150 }}>
                    <Label>{buyUnit ? `Price of one ${buyUnit}` : "For a total of"}</Label>
                    <Input
                      value={packPrice}
                      onChangeText={(val) => applyPack(packQuantity, numberOnly(val))}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 30000"
                      suffix="RWF"
                    />
                  </View>
                </View>
                {!!buyUnit && (
                  <View className="flex-row items-start bg-ivory rounded-xl px-3.5 py-3">
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={brand.inkMuted}
                      style={{ marginTop: 1 }}
                    />
                    <Text className="flex-1 text-ink/70 text-xs leading-[18px] ml-2">
                      {Number(packQuantity) > 0
                        ? `1 ${buyUnit} = ${formatQty(packQuantity)} ${unit}. Deliveries are entered by the ${buyUnit}, the kitchen uses ${unit}.`
                        : `${buyUnit} sizes differ between sellers. Measure one of yours and enter how many ${unit || "units"} it holds. A good average is enough.`}
                    </Text>
                  </View>
                )}
                <View>
                  <Label>{`Cost per ${unit || "unit"}`}</Label>
                  <Input
                    value={cost}
                    onChangeText={(val) => setCost(numberOnly(val))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    suffix="RWF"
                  />
                </View>
              </View>
            </Section>
            )}

            <Section icon="layers-outline" title="Stock" subtitle="What you have now and when to reorder">
              <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                {canSetStock && (
                  <View className="flex-1" style={{ minWidth: 150 }}>
                    <Label>{existing ? "Counted stock" : "In stock now"}</Label>
                    <Input
                      value={stock}
                      onChangeText={(val) => setStock(numberOnly(val))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      suffix={unit}
                    />
                  </View>
                )}
                <View className="flex-1" style={{ minWidth: 150 }}>
                  <Label>Low-stock alert at</Label>
                  <Input
                    value={alertAt}
                    onChangeText={(val) => setAlertAt(numberOnly(val))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    suffix={unit}
                  />
                </View>
              </View>
            </Section>

            {!wide && summary}

            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              <SecondaryButton
                label="Cancel"
                icon="close"
                disabled={saving}
                onPress={() => router.replace(LIST_ROUTE)}
              />
              {!existing && (
                <SecondaryButton
                  label="Save & add another"
                  icon="add"
                  disabled={saving}
                  onPress={() => save(true)}
                />
              )}
              <PrimaryButton
                label={existing ? "Save changes" : "Save ingredient"}
                busyLabel="Saving..."
                icon="checkmark-circle-outline"
                busy={saving}
                onPress={() => save(false)}
              />
            </View>
          </View>

          {wide && <View style={{ width: 320 }}>{summary}</View>}
        </View>
      </View>
    </ScrollView>
  );
}

// `?id=` edits that ingredient; without it, a new one is added.
export default function AddIngredient() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const products = useProduct((s) => s.products);
  const getProducts = useProduct((s) => s.getProducts);
  const existing = id ? products.find((p) => p.id === id) : undefined;

  useEffect(() => {
    if (!products.length) getProducts();
  }, [products.length, getProducts]);

  if (id && !existing) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory">
        <ActivityIndicator color={brand.ink} />
      </View>
    );
  }

  return <IngredientForm key={id ?? "new"} existing={existing} />;
}
