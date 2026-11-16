
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
  // Made at another station than its category's; null = the category's.
  stationId?: string | null;
}

export interface OrderItemType extends BaseEntity {
  product: OrderProduct;
  quantity: number;
  totalPrice: string;
  // What one cost when it was paid for (recipe or buying price); null on old sales.
  unitCost?: string | number | null;
  note?: string | null;
  // The kitchen station that makes it (null without stations).
  stationId?: string | null;
}

// One kitchen station's part of an order. `items`: after the part was served
// and more was ordered, only the new item ids; null = all the station's items.
export type StationPartStatus = "PENDING" | "PREPARING" | "READY" | "SERVED";
export interface StationPart {
  status: StationPartStatus;
  items: string[] | null;
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
  // Each kitchen station's part, by station id; null without stations.
  stationStatus?: Record<string, StationPart> | null;
  // Delivery codes (owner setting); older backends leave these out (off).
  // The customer gets the code; the rider must get it from them to finish.
  deliveryCodeRequired?: boolean;
  // Only for till and owner, never in a rider's own list.
  deliveryCode?: string | null;
  // Public page with the code and its QR, for the customer.
  deliveryTrackUrl?: string | null;
  notifyBy?: "WHATSAPP" | "SMS" | null;
  customerLanguage?: "en" | "rw" | "fr" | "sw" | null;
  codeSentAt?: string | null;
  arrivedAt?: string | null;
  deliveryProof?: DeliveryProof | null;
}

// How a delivery was confirmed, filled in by the server when it is marked delivered.
export interface DeliveryProof {
  method: "CODE" | "QR" | "NO_CODE";
  // NO_CODE: delivered without the customer's code.
  flags?: "NO_CODE"[];
  photoUrl?: string | null;
  note?: string | null;
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
