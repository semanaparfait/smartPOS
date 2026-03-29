import { Ionicons } from "@expo/vector-icons";

export type PaymentMethod = "Cash" | "MoMo" | "Card" | "Credit";

export type PurchasedItem = {
  name: string;
  qty: number;
};

export type Order = {
  id: string;
  customer: string;
  items: number;
  purchasedItems: PurchasedItem[];
  total: number;
  time: string;
  payment: PaymentMethod;
  takenBy?: string;
};

export const orders: Order[] = [
  {
    id: "ORD-9101",
    customer: "Aline M.",
    items: 3,
    purchasedItems: [
      { name: "Coca Cola 50cl", qty: 1 },
      { name: "Chicken Pie", qty: 2 },
    ],
    total: 22400,
    time: "09:10",
    payment: "Cash",
  },
  {
    id: "ORD-9102",
    customer: "Eric K.",
    items: 2,
    purchasedItems: [
      { name: "Mineral Water", qty: 1 },
      { name: "Rolex", qty: 1 },
    ],
    total: 12800,
    time: "09:28",
    payment: "MoMo",
  },
  {
    id: "ORD-9103",
    customer: "Nadia U.",
    items: 5,
    purchasedItems: [
      { name: "Rice Plate", qty: 2 },
      { name: "Fanta Orange", qty: 2 },
      { name: "Fruit Salad", qty: 1 },
    ],
    total: 46200,
    time: "10:04",
    payment: "Card",
  },
  {
    id: "ORD-9104",
    customer: "Jean P.",
    items: 1,
    purchasedItems: [{ name: "Coffee", qty: 1 }],
    total: 6800,
    time: "10:25",
    payment: "Credit",
    takenBy: "Samuel M.",
  },
  {
    id: "ORD-9105",
    customer: "Diane R.",
    items: 4,
    purchasedItems: [
      { name: "Milk", qty: 2 },
      { name: "Bread", qty: 2 },
    ],
    total: 30500,
    time: "11:16",
    payment: "Cash",
  },
  {
    id: "ORD-9106",
    customer: "Mugisha T.",
    items: 6,
    purchasedItems: [
      { name: "Cooking Oil", qty: 1 },
      { name: "Sugar 1kg", qty: 2 },
      { name: "Soap", qty: 3 },
    ],
    total: 39000,
    time: "11:48",
    payment: "Credit",
    takenBy: "Yvette P.",
  },
  {
    id: "ORD-9107",
    customer: "Sandra N.",
    items: 2,
    purchasedItems: [
      { name: "Fries", qty: 1 },
      { name: "Juice", qty: 1 },
    ],
    total: 15700,
    time: "12:07",
    payment: "MoMo",
  },
];

export const paymentTone: Record<
  PaymentMethod,
  {
    bg: string;
    text: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  Cash: {
    bg: "#DDF7E5",
    text: "#166534",
    icon: "cash-outline",
  },
  MoMo: {
    bg: "#E4ECFF",
    text: "#1E40AF",
    icon: "phone-portrait-outline",
  },
  Card: {
    bg: "#FFF3D8",
    text: "#B45309",
    icon: "card-outline",
  },
  Credit: {
    bg: "#FDE2E2",
    text: "#B91C1C",
    icon: "time-outline",
  },
};
