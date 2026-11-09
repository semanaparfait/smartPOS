
// PENDING (new) → PREPARING → READY (kitchen) → SERVED → COMPLETED once paid; or CANCELLED.
export type OrderStatusValue = "PENDING" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED";

interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface OrderCompany extends BaseEntity {
  code: string;
  logo: string | null;
  name: string;
  email: string;
  phone_number: string;
  location: string;
  tin: string | null;
  type: string;
}

export interface OrderProductImage extends BaseEntity {
  name: string;
  url: string;
  // 300px version; use for cards and thumbnails.
  thumbnailUrl?: string;
  type: string;
  mimeType: string;
  size: number;
}

export interface OrderProduct extends BaseEntity {
  images: OrderProductImage[];
  name: string;
  buyingPrice: string;
  sellingPrice: string;
  barCode: string | null;
  ingredients: string | null;
  active: boolean;
  sendToKitchen?: boolean;
}

export interface OrderItemType extends BaseEntity {
  product: OrderProduct;
  quantity: number;
  totalPrice: string;
  // What one cost when it was paid for (recipe or buying price); null on old sales.
  unitCost?: string | number | null;
  note?: string | null;
}

export interface OrderEmployee extends BaseEntity {
  name: string;
  email: string;
  phone: string;
  salary: number;
  shift: string;
}

export interface OrderUser extends BaseEntity {
  employee: OrderEmployee | null;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface OrderType extends BaseEntity {
  company: OrderCompany;
  // Usually one of OrderStatusValue; kept open in case the API adds more.
  status: OrderStatusValue | (string & {});
  subtotal: string;
  tax: string;
  total: string;
  note: string | null;
  items: OrderItemType[];
  user: OrderUser;
  // Present once the order is completed (PATCH /orders/:id/complete).
  payments?: OrderPayment[];
  // Where it is served, from the floor map: "T04" / "Table" / "Restaurant".
  // Kept after the table is free again. Older backends leave these out.
  tableId?: string | null;
  tableName?: string | null;
  tableKind?: string | null;
  tableArea?: string | null;
  // Delivery orders; older backends leave these out (in store).
  type?: "IN_STORE" | "DELIVERY";
  deliveryStatus?: DeliveryStatus | null;
  deliveryFee?: string | number;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryArea?: string | null;
  rider?: OrderUser | null;
  outsideRider?: string | null;
  payOnDelivery?: boolean;
  // Who took the money at the door; their money check covers it.
  collectedBy?: OrderUser | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  deliveryProblem?: string | null;
  // The kitchen's step on a delivery paid before its food was ready.
  kitchenStatus?: "PENDING" | "PREPARING" | null;
}

export type DeliveryStatus = "WAITING" | "ON_THE_WAY" | "DELIVERED" | "NOT_DELIVERED";

// A payment recorded on a completed order.
export interface OrderPayment extends Partial<BaseEntity> {
  method: PaymentMethod | (string & {});
  amount: string | number;
  creditOwnerName?: string | null;
  creditOwnerPhone?: string | null;
  takenBy?: string | null;
}

export type OrdersResponse = OrderType[];

// PATCH /api/v1/orders/:orderId/complete
export type PaymentMethod = "CASH" | "MOMO" | "CARD" | "CREDIT";

export interface OrderPaymentInput {
  method: PaymentMethod;
  amount: number;
  // Required when method is CREDIT.
  creditOwnerName?: string;
  creditOwnerPhone?: string;
  takenBy?: string;
}

export interface CompleteOrderPayload {
  payments: OrderPaymentInput[];
}
