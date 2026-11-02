import type { PaymentMethod } from "@/store/Order/OrderType";

export type ServiceKind = "ROOM" | "SPACE" | "ACTIVITY" | "TICKET" | "RENTAL" | "OTHER";
export type PriceUnit = "HOUR" | "NIGHT" | "DAY" | "SESSION" | "PERSON" | "FIXED";
export type UnitStatus = "AVAILABLE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE";
export type BookingStatus = "RESERVED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
// BOOK = reserve ahead, START = here now, SELL = ticket paid and done at once.
export type BookingMode = "BOOK" | "START" | "SELL";
export type BookingPaymentMethod = Exclude<PaymentMethod, "CREDIT">;

export interface ServiceUnit {
  id: string;
  name: string;
  status: UnitStatus;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  kind: ServiceKind;
  priceUnit: PriceUnit;
  // Decimals come back from the server as text.
  price: number | string;
  capacity: number | null;
  deposit: number | string;
  active: boolean;
  units: ServiceUnit[];
}

export interface Person {
  id: string;
  name: string;
}

export interface BookingPayment {
  id: string;
  method: BookingPaymentMethod;
  amount: number | string;
  // Money given back; `reason` says why.
  isRefund: boolean;
  reason: string | null;
  createdAt: string;
  takenBy: Person | null;
}

export interface Booking {
  id: string;
  code: string;
  service: Pick<Service, "id" | "name" | "kind" | "imageUrl" | "priceUnit">;
  unit: Pick<ServiceUnit, "id" | "name"> | null;
  customerName: string;
  customerPhone: string | null;
  people: number;
  startAt: string;
  endAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  status: BookingStatus;
  priceUnit: PriceUnit;
  unitPrice: number | string;
  quantity: number | string;
  discount: number | string;
  total: number | string;
  note: string | null;
  cancelReason: string | null;
  takenBy: Person | null;
  payments: BookingPayment[];
  // Taken minus refunded.
  paid: number;
  refunded: number;
  balance: number;
  createdAt: string;
}

export interface NewBooking {
  serviceId: string;
  unitId?: string;
  mode: BookingMode;
  customerName?: string;
  customerPhone?: string;
  people?: number;
  sessions?: number;
  startAt?: string;
  endAt?: string;
  note?: string;
  payment?: { method: BookingPaymentMethod; amount: number };
}

export interface Takings {
  // After refunds.
  total: number;
  refunded: number;
  byMethod: Partial<Record<BookingPaymentMethod, number>>;
  byService: { serviceId: string; name: string; amount: number }[];
}
