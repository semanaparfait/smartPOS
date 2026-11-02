import { formatQty } from "@/components/inventory/stockKit";
import { MONEY_UNIT, recipeMeasures } from "@/config/units";
import { brand } from "@/config/theme";
import useProduct from "@/store/products/useProduct";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { tr } from "@/i18n";

// `quantity` is text while it is being typed, e.g. "0.".
export type RecipeRow = { ingredientId: string; quantity: string };

const webNoOutline =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

const PORTIONS = [
  { label: "¼", value: 0.25 },
  { label: "½", value: 0.5 },
  { label: "1", value: 1 },
  { label: "2", value: 2 },
];

const round = (value: number) => Math.round(value * 1000) / 1000;

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`h-8 min-w-[40px] px-2.5 rounded-lg border items-center justify-center ${
        active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
      }`}
    >
      <Text className={`text-xs font-bold ${active ? "text-white" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}

// One line of a recipe. It is typed in whichever measure is easiest and saved in the
// ingredient's own unit, so 150 g of rice is kept as 0.15 Kg.
function RecipeAmount({
  name,
  unit,
  quantity,
  onChange,
  onRemove,
}: {
  name: string;
  unit: string;
  // In the ingredient's own unit.
  quantity: string;
  onChange: (quantity: string) => void;
  onRemove: () => void;
}) {
  const measures = recipeMeasures(unit);
  const [measure, setMeasure] = useState(measures[0]);
  const shown = (value: string, per: number) =>
    value === "" ? "" : String(round(Number(value) / per));
  // What was typed, so "0." isn't rewritten to "0" mid-number.
  const [typed, setTyped] = useState(() => shown(quantity, measure.per));

  const type = (value: string) => {
    const clean = value.replace(/[^0-9.]/g, "");
    setTyped(clean);
    onChange(clean === "" ? "" : String(round(Number(clean) * measure.per)));
  };

  const switchMeasure = (next: (typeof measures)[number]) => {
    setMeasure(next);
    setTyped(shown(quantity, next.per));
  };

  // Liquids and weights pick a measure; counted things are often split.
  const counted = measures.length === 1 && unit !== MONEY_UNIT;

  return (
    <View style={{ gap: 6 }}>
      <View className="flex-row items-center">
        <Text numberOfLines={1} className="flex-1 text-ink text-sm font-semibold pr-3">
          {name}
        </Text>
        <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3 h-11 w-[140px]">
          <TextInput
            value={typed}
            onChangeText={type}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={brand.inkDisabled}
            accessibilityLabel={`Amount of ${name}`}
            className="flex-1 text-[15px] text-ink"
            style={webNoOutline}
          />
          <Text numberOfLines={1} className="text-ink/40 text-xs font-bold ml-2">
            {measure.label}
          </Text>
        </View>
        <Pressable
          onPress={onRemove}
          accessibilityLabel={`Remove ${name}`}
          hitSlop={6}
          className="w-9 h-9 items-center justify-center ml-1 rounded-lg active:bg-ivory"
        >
          <Ionicons name="close" size={17} color={brand.inkMuted} />
        </Pressable>
      </View>

      <View className="flex-row flex-wrap justify-end pr-10" style={{ gap: 6 }}>
        {measures.length > 1 &&
          measures.map((option) => (
            <Chip
              key={option.label}
              label={option.label}
              active={option.label === measure.label}
              onPress={() => switchMeasure(option)}
            />
          ))}
        {counted &&
          PORTIONS.map((portion) => (
            <Chip
              key={portion.label}
              label={portion.label}
              active={Number(quantity) === portion.value}
              onPress={() => type(String(portion.value))}
            />
          ))}
      </View>

      {measures.length > 1 && Number(quantity) > 0 && (
        <Text className="text-ink/40 text-[11px] text-right pr-10">
          {measure.note ? `1 ${measure.label} = ${measure.note} · ` : ""}{tr("Takes")} {formatQty(quantity)} {unit} {tr("from stock")}</Text>
      )}
    </View>
  );
}

// What one unit of a product is made from, and what that costs at current prices.
export default function RecipeEditor({
  rows,
  sellingPrice,
  onChange,
}: {
  rows: RecipeRow[];
  sellingPrice: number;
  onChange: (rows: RecipeRow[]) => void;
}) {
  const products = useProduct((s) => s.products);
  const ingredients = products.filter((p) => p.isIngredient);
  const find = (id: string) => ingredients.find((p) => p.id === id);
  const left = ingredients.filter(
    (p) => p.active && !rows.some((r) => r.ingredientId === p.id),
  );
  const cost = rows.reduce(
    (sum, row) =>
      sum + Number(row.quantity || 0) * Number(find(row.ingredientId)?.buyingPrice ?? 0),
    0,
  );
  const change = (ingredientId: string, quantity: string) =>
    onChange(rows.map((r) => (r.ingredientId === ingredientId ? { ...r, quantity } : r)));

  if (!ingredients.length) {
    return (
      <Text className="text-ink/50 text-xs">{tr("No ingredients yet. Add them under Inventory, Ingredients, then choose them here.")}</Text>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {rows.map((row) => (
        <RecipeAmount
          key={row.ingredientId}
          name={find(row.ingredientId)?.name ?? "Ingredient"}
          unit={find(row.ingredientId)?.unit ?? ""}
          quantity={row.quantity}
          onChange={(quantity) => change(row.ingredientId, quantity)}
          onRemove={() => onChange(rows.filter((r) => r !== row))}
        />
      ))}

      {left.length > 0 && (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {left.map((ingredient) => (
            <Pressable
              key={ingredient.id}
              onPress={() =>
                onChange([...rows, { ingredientId: ingredient.id, quantity: "" }])
              }
              className="flex-row items-center h-9 px-3 rounded-xl border border-ink/10 active:bg-ivory"
            >
              <Ionicons name="add" size={14} color={brand.ink} />
              <Text className="text-ink text-xs font-bold ml-1">{ingredient.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {rows.length > 0 && (
        <View className="flex-row items-center justify-between bg-ivory rounded-xl px-4 py-3">
          <Text className="text-ink/60 text-xs font-bold">{tr("Cost to make one")}</Text>
          <Text className="text-ink text-sm font-semibold">
            {Math.round(cost).toLocaleString()} RWF
            {sellingPrice > 0
              ? ` · ${Math.round(sellingPrice - cost).toLocaleString()} RWF profit`
              : ""}
          </Text>
        </View>
      )}
    </View>
  );
}
