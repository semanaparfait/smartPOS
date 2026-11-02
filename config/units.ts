import type { Ionicons } from "@expo/vector-icons";

// Every ingredient has one unit the kitchen uses, which stock, alerts and costs are
// kept in, and optionally one unit it is bought by, with a size linked to it.

// For things bought by value, like 500 RWF of spices with 100 RWF of it in each pot:
// the amount itself is money, so one unit always costs 1 RWF.
export const MONEY_UNIT = "RWF";

export const USE_UNITS: {
  value: string;
  how: string;
  examples: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "Kg", how: "Weighed", examples: "Rice, sugar, beans, beef", icon: "scale-outline" },
  { value: "Gram", how: "Very small weights", examples: "Yeast, saffron", icon: "scale-outline" },
  { value: "Litre", how: "Poured", examples: "Oil, milk, sauce", icon: "water-outline" },
  { value: "Millilitre", how: "Very small amounts poured", examples: "Vanilla, food colour", icon: "water-outline" },
  { value: "Piece", how: "Counted one by one", examples: "Eggs, onions, whole chicken", icon: "ellipse-outline" },
  { value: "Bunch", how: "Tied together", examples: "Coriander, spring onions", icon: "leaf-outline" },
  { value: "Bottle", how: "Used by the bottle", examples: "Soda, water, beer", icon: "wine-outline" },
  { value: MONEY_UNIT, how: "Bought by price", examples: "Spices, garlic, ginger", icon: "cash-outline" },
];

// Sizes differ between sellers and regions, so each shop enters its own. Only a
// dozen is always the same.
export const BUY_UNITS: { value: string; size?: number }[] = [
  { value: "Kg" },
  { value: "Litre" },
  { value: "Sack" },
  { value: "Bag" },
  { value: "Basin" },
  { value: "Bucket" },
  { value: "Tray" },
  { value: "Crate" },
  { value: "Carton" },
  { value: "Pack" },
  { value: "Jerrycan" },
  { value: "Dozen", size: 12 },
];

// What a recipe can be typed in, as how much of the ingredient's unit one is. Cups
// and spoons are for liquids only: a cup of rice has no fixed weight.
const LITRE_MEASURES = [
  { label: "ml", per: 0.001 },
  { label: "Tsp", per: 0.005, note: "5 ml" },
  { label: "Tbsp", per: 0.015, note: "15 ml" },
  { label: "Cup", per: 0.25, note: "250 ml" },
];

export type RecipeMeasure = { label: string; per: number; note?: string };

export const recipeMeasures = (unit: string): RecipeMeasure[] => {
  if (unit === "Kg") return [{ label: "g", per: 0.001 }, { label: "Kg", per: 1 }];
  if (unit === "Gram") return [{ label: "g", per: 1 }, { label: "Kg", per: 1000 }];
  if (unit === "Litre") return [...LITRE_MEASURES, { label: "Litre", per: 1 }];
  if (unit === "Millilitre")
    return [...LITRE_MEASURES.map((m) => ({ ...m, per: m.per * 1000 })), { label: "Litre", per: 1000 }];
  return [{ label: unit, per: 1 }];
};
