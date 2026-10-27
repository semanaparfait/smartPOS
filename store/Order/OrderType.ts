
export type OrderStatusValue = "PENDING" | "COMPLETED" | "CANCELLED";

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
  type: string;
}

export interface OrderProductImage extends BaseEntity {
  name: string;
  url: string;
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
}

export interface OrderItemType extends BaseEntity {
  product: OrderProduct;
  quantity: number;
  totalPrice: string;
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
}

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
