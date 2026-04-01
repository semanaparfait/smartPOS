export type PaymentMethod = "Cash" | "MoMo" | "Card" | "Credit";

export type OrderStatus = "completed" | "pending" | "cancelled";

export interface PurchasedItem {
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customer: string;
  purchasedItems: PurchasedItem[];
  totalItems: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  servedBy: string;
  createdAt: string;
}

export const orders: Order[] = [
  {
    id: "ORD-1001",
    customer: "Aline M.",
    purchasedItems: [
      { name: "Coca Cola 300ml", qty: 2, unitPrice: 600 },
      { name: "Chicken Pie", qty: 1, unitPrice: 1800 },
    ],
    totalItems: 3,
    totalAmount: 3000,
    paymentMethod: "Cash",
    status: "completed",
    servedBy: "Samuel M.",
    createdAt: "2026-04-01T09:10:00Z",
  },
  {
    id: "ORD-1002",
    customer: "Eric K.",
    purchasedItems: [
      { name: "Rolex", qty: 1, unitPrice: 2500 },
      { name: "Mineral Water", qty: 1, unitPrice: 400 },
    ],
    totalItems: 2,
    totalAmount: 2900,
    paymentMethod: "MoMo",
    status: "completed",
    servedBy: "Alice J.",
    createdAt: "2026-04-01T09:28:00Z",
  },
  {
    id: "ORD-1003",
    customer: "Nadia U.",
    purchasedItems: [
      { name: "Rice Plate", qty: 2, unitPrice: 2200 },
      { name: "Fanta Orange", qty: 2, unitPrice: 600 },
      { name: "Fruit Salad", qty: 1, unitPrice: 1200 },
    ],
    totalItems: 5,
    totalAmount: 6800,
    paymentMethod: "Card",
    status: "completed",
    servedBy: "Bob B.",
    createdAt: "2026-04-01T10:04:00Z",
  },
  {
    id: "ORD-1004",
    customer: "Jean P.",
    purchasedItems: [{ name: "Coffee", qty: 1, unitPrice: 800 }],
    totalItems: 1,
    totalAmount: 800,
    paymentMethod: "Credit",
    status: "pending",
    servedBy: "Samuel M.",
    createdAt: "2026-04-01T10:25:00Z",
  },
  {
    id: "ORD-1005",
    customer: "Diane R.",
    purchasedItems: [
      { name: "Inyange Milk 500ml", qty: 2, unitPrice: 800 },
      { name: "Bread", qty: 2, unitPrice: 700 },
    ],
    totalItems: 4,
    totalAmount: 3000,
    paymentMethod: "Cash",
    status: "completed",
    servedBy: "Alice J.",
    createdAt: "2026-04-01T11:16:00Z",
  },
  {
    id: "ORD-1006",
    customer: "Mugisha T.",
    purchasedItems: [
      { name: "Sunflower Oil 1L", qty: 1, unitPrice: 3000 },
      { name: "White Sugar 1kg", qty: 2, unitPrice: 1500 },
      { name: "Bar Soap (Blue)", qty: 3, unitPrice: 800 },
    ],
    totalItems: 6,
    totalAmount: 8400,
    paymentMethod: "Credit",
    status: "pending",
    servedBy: "Bob B.",
    createdAt: "2026-04-01T11:48:00Z",
  },
  {
    id: "ORD-1007",
    customer: "Sandra N.",
    purchasedItems: [
      { name: "Fries", qty: 1, unitPrice: 1800 },
      { name: "Juice", qty: 1, unitPrice: 900 },
    ],
    totalItems: 2,
    totalAmount: 2700,
    paymentMethod: "MoMo",
    status: "completed",
    servedBy: "Samuel M.",
    createdAt: "2026-04-01T12:07:00Z",
  },
  {
    id: "ORD-1008",
    customer: "Guest",
    purchasedItems: [
      { name: "Potato Crisps 50g", qty: 2, unitPrice: 700 },
      { name: "Skol Lager 33cl", qty: 2, unitPrice: 1000 },
    ],
    totalItems: 4,
    totalAmount: 3400,
    paymentMethod: "Card",
    status: "cancelled",
    servedBy: "Alice J.",
    createdAt: "2026-04-01T12:30:00Z",
  },
];
