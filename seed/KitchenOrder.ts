

export type OrderStatus =
  | "new_order"
  | "preparing"
  | "ready"
  | "served";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  note?: string;
  category?: string;
  price?: number;
  isStarted?: boolean;
  isDone?: boolean;
}



export interface TableInfo {
  tableNumber: string;
  section?: string;
}

export interface Order {
  id: string;
  orderNumber: string;

  status: OrderStatus;

  table: TableInfo;

  waiter: {
    id: string;
    name: string;
  };

  items: OrderItem[];

  priority: "normal" | "urgent" | "vip";

  paymentStatus: "pending" | "paid";

  // Time tracking
  createdAt: string;
  startedAt?: string;
  readyAt?: string;
  servedAt?: string;
  waitername?: string;

  estimatedPrepTime: number; // minutes
  elapsedTime?: number; // minutes

  // Kitchen info
  kitchenStation?: string; // Grill, Drinks, Bakery
  chefAssigned?: string;

  // UI
  colorTag?: string;
  isDelayed?: boolean;

  notes?: string;
}



export const orders: Order[] = [
  // ===================== NEW ORDERS (4) =====================
  {
    id: "1",
    orderNumber: "ORD-1001",
    status: "new_order",
    table: { tableNumber: "T12", section: "Terrace" },
    waiter: { id: "w1", name: "Kevin" },
    items: [
      { id: "i1", name: "Chicken Burger", quantity: 2, category: "Fast Food" },
      { id: "i2", name: "Mango Juice", quantity: 2, category: "Drinks" },
    ],
    priority: "normal",
    paymentStatus: "pending",
    createdAt: "2026-05-25T10:00:00Z",
    estimatedPrepTime: 20,
    kitchenStation: "Main Kitchen",
    colorTag: "#3B82F6",
    notes: "No onions in one burger",
  },
  {
    id: "2",
    orderNumber: "ORD-1002",
    status: "new_order",
    table: { tableNumber: "T03", section: "Indoor" },
    waiter: { id: "w2", name: "Alice" },
    items: [
      { id: "i3", name: "Beef Pizza", quantity: 1, category: "Fast Food" },
      { id: "i4", name: "Sprite", quantity: 2, category: "Drinks" },
    ],
    priority: "urgent",
    paymentStatus: "pending",
    createdAt: "2026-05-25T10:05:00Z",
    estimatedPrepTime: 25,
    kitchenStation: "Pizza Station",
    colorTag: "#EF4444",
  },
  {
    id: "3",
    orderNumber: "ORD-1003",
    status: "new_order",
    table: { tableNumber: "VIP-01", section: "VIP" },
    waiter: { id: "w3", name: "Brian" },
    items: [
      { id: "i5", name: "Grilled Chicken", quantity: 1, category: "Grill" },
      { id: "i6", name: "Orange Juice", quantity: 2, category: "Drinks" },
    ],
    priority: "vip",
    paymentStatus: "pending",
    createdAt: "2026-05-25T10:10:00Z",
    estimatedPrepTime: 30,
    kitchenStation: "Grill Station",
    colorTag: "#F59E0B",
  },
  {
    id: "4",
    orderNumber: "ORD-1004",
    status: "new_order",
    table: { tableNumber: "T08", section: "Terrace" },
    waiter: { id: "w4", name: "Emma" },
    items: [
      { id: "i7", name: "Chapati & Beans", quantity: 2, category: "Local" },
      { id: "i8", name: "Tea", quantity: 2, category: "Drinks" },
    ],
    priority: "normal",
    paymentStatus: "pending",
    createdAt: "2026-05-25T10:12:00Z",
    estimatedPrepTime: 15,
    kitchenStation: "Breakfast Station",
    colorTag: "#60A5FA",
  },

  // ===================== PREPARING (4) =====================
  {
    id: "5",
    orderNumber: "ORD-2001",
    status: "preparing",
    table: { tableNumber: "T01", section: "Indoor" },
    waiter: { id: "w1", name: "Kevin" },
    items: [
      { id: "i9", name: "Chicken Burger", quantity: 1, isStarted: true },
      { id: "i10", name: "Fries", quantity: 1 },
    ],
    priority: "normal",
    paymentStatus: "paid",
    createdAt: "2026-05-25T09:40:00Z",
    startedAt: "2026-05-25T09:45:00Z",
    estimatedPrepTime: 20,
    elapsedTime: 10,
    kitchenStation: "Main Kitchen",
    chefAssigned: "Chef John",
  },
  {
    id: "6",
    orderNumber: "ORD-2002",
    status: "preparing",
    table: { tableNumber: "T05", section: "Terrace" },
    waiter: { id: "w2", name: "Alice" },
    items: [
      { id: "i11", name: "Pizza Margherita", quantity: 1, isStarted: true },
      { id: "i12", name: "Cola", quantity: 2 },
    ],
    priority: "urgent",
    paymentStatus: "paid",
    createdAt: "2026-05-25T09:30:00Z",
    startedAt: "2026-05-25T09:35:00Z",
    estimatedPrepTime: 25,
    elapsedTime: 18,
    kitchenStation: "Pizza Station",
    chefAssigned: "Chef Mike",
  },
  {
    id: "7",
    orderNumber: "ORD-2003",
    status: "preparing",
    table: { tableNumber: "VIP-03", section: "VIP" },
    waiter: { id: "w3", name: "Brian" },
    items: [
      { id: "i13", name: "Steak", quantity: 1, isStarted: true },
      { id: "i14", name: "Wine Juice", quantity: 1 },
    ],
    priority: "vip",
    paymentStatus: "paid",
    createdAt: "2026-05-25T09:25:00Z",
    startedAt: "2026-05-25T09:30:00Z",
    estimatedPrepTime: 35,
    elapsedTime: 22,
    kitchenStation: "Grill Station",
    chefAssigned: "Chef Anna",
  },
  {
    id: "8",
    orderNumber: "ORD-2004",
    status: "preparing",
    table: { tableNumber: "T09", section: "Outside" },
    waiter: { id: "w4", name: "Emma" },
    items: [
      { id: "i15", name: "Rice & Beans", quantity: 2, isStarted: true },
      { id: "i16", name: "Water", quantity: 2 },
    ],
    priority: "normal",
    paymentStatus: "pending",
    createdAt: "2026-05-25T09:20:00Z",
    startedAt: "2026-05-25T09:25:00Z",
    estimatedPrepTime: 15,
    elapsedTime: 12,
    kitchenStation: "Hot Kitchen",
  },

  // ===================== READY (4) =====================
  {
    id: "9",
    orderNumber: "ORD-3001",
    status: "ready",
    table: { tableNumber: "T02", section: "Indoor" },
    waiter: { id: "w1", name: "Kevin" },
    items: [
      { id: "i17", name: "Burger", quantity: 2, isDone: true },
    ],
    priority: "normal",
    waitername: "Kevin",
    paymentStatus: "paid",
    createdAt: "2026-05-25T09:00:00Z",
    readyAt: "2026-05-25T09:25:00Z",
    estimatedPrepTime: 20,
    elapsedTime: 25,
    chefAssigned: "Chef John",
    kitchenStation: "Main Kitchen",
  },
  {
    id: "10",
    orderNumber: "ORD-3002",
    status: "ready",
    table: { tableNumber: "VIP-04", section: "VIP" },
    waiter: { id: "w2", name: "Alice" },
    items: [
      { id: "i18", name: "Pizza", quantity: 1, isDone: true },
    ],
    priority: "vip",
    paymentStatus: "paid",
    waitername: "Alice",
    createdAt: "2026-05-25T08:50:00Z",
    readyAt: "2026-05-25T09:15:00Z",
    estimatedPrepTime: 25,
    elapsedTime: 25,
    chefAssigned: "Chef Mike",
    kitchenStation: "Pizza Station",
  },
  {
    id: "11",
    orderNumber: "ORD-3003",
    status: "ready",
    table: { tableNumber: "T06", section: "Terrace" },
    waiter: { id: "w3", name: "Brian" },
    items: [
      { id: "i19", name: "Steak", quantity: 1, isDone: true },
    ],
    priority: "urgent",
    paymentStatus: "paid",
    waitername: "Brian",
    createdAt: "2026-05-25T08:40:00Z",
    readyAt: "2026-05-25T09:05:00Z",
    estimatedPrepTime: 30,
    elapsedTime: 25,
    chefAssigned: "Chef Anna",
    kitchenStation: "Grill Station",
  },
  {
    id: "12",
    orderNumber: "ORD-3004",
    status: "ready",
    table: { tableNumber: "T11", section: "Outside" },
    waiter: { id: "w4", name: "Emma" },
    items: [
      { id: "i20", name: "Chapati & Beans", quantity: 2, isDone: true },
    ],
    priority: "normal",
    paymentStatus: "paid",
      waitername: "Emma",
    createdAt: "2026-05-25T08:30:00Z",
    readyAt: "2026-05-25T08:55:00Z",
    estimatedPrepTime: 15,
    elapsedTime: 25,
    kitchenStation: "Main Kitchen",
  },

  // ===================== SERVED (4) =====================
  {
    id: "13",
    orderNumber: "ORD-4001",
    status: "served",
    table: { tableNumber: "T04", section: "Indoor" },
    waiter: { id: "w1", name: "Kevin" },
    items: [
      { id: "i21", name: "Burger", quantity: 1 },
    ],
    priority: "normal",
    paymentStatus: "paid",
    createdAt: "2026-05-25T08:10:00Z",
    readyAt: "2026-05-25T08:25:00Z",
    servedAt: "2026-05-25T08:30:00Z",
    estimatedPrepTime: 15,
  },
  {
    id: "14",
    orderNumber: "ORD-4002",
    status: "served",
    table: { tableNumber: "VIP-05", section: "VIP" },
    waiter: { id: "w2", name: "Alice" },
    items: [
      { id: "i22", name: "Pizza", quantity: 1 },
    ],
    priority: "vip",
    paymentStatus: "paid",
    createdAt: "2026-05-25T07:50:00Z",
    readyAt: "2026-05-25T08:10:00Z",
    servedAt: "2026-05-25T08:15:00Z",
    estimatedPrepTime: 20,
  },
  {
    id: "15",
    orderNumber: "ORD-4003",
    status: "served",
    table: { tableNumber: "T10", section: "Terrace" },
    waiter: { id: "w3", name: "Brian" },
    items: [
      { id: "i23", name: "Steak", quantity: 1 },
    ],
    priority: "urgent",
    paymentStatus: "paid",
    createdAt: "2026-05-25T07:30:00Z",
    readyAt: "2026-05-25T07:55:00Z",
    servedAt: "2026-05-25T08:00:00Z",
    estimatedPrepTime: 30,
  },
  {
    id: "16",
    orderNumber: "ORD-4004",
    status: "served",
    table: { tableNumber: "T13", section: "Outside" },
    waiter: { id: "w4", name: "Emma" },
    items: [
      { id: "i24", name: "Tea & Snacks", quantity: 2 },
    ],
    priority: "normal",
    paymentStatus: "paid",
    createdAt: "2026-05-25T07:10:00Z",
    readyAt: "2026-05-25T07:30:00Z",
    servedAt: "2026-05-25T07:35:00Z",
    estimatedPrepTime: 15,
  },
];