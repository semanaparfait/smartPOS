import { orderStatus, paymentsOf, toNumber } from "@/components/orders/orderKit";
import type { Expense } from "@/store/Finance/useExpenses";
import { dayKey, paidAt } from "@/store/Finance/useFinanceVerification";
import type { OrderPayment, OrderType, OrderUser, PaymentMethod } from "@/store/Order/OrderType";
import type { CheckedPayment } from "@/store/Services/serviceTypes";

// Methods the owner counts by hand. Credit is money still owed, so it's listed, not counted.
export const COUNTED: PaymentMethod[] = ["CASH", "MOMO", "CARD"];

// What each worker should hand in for one day: sales and booking money by method,
// less bills they paid from the till.
export interface WorkerDay {
  user: OrderUser;
  orders: OrderType[]; // every order of the day, newest first
  completed: OrderType[];
  pending: OrderType[];
  cancelled: OrderType[];
  expected: Record<PaymentMethod, number>;
  credits: { order: OrderType; payment: OrderPayment }[];
  unrecorded: OrderType[]; // completed but no payment details
  sales: number;
  // Booking money the worker took (refunds subtract); already inside `expected`.
  services: number;
  servicePayments: CheckedPayment[];
  // Bills the worker paid out of the till that day; already taken off `expected`.
  paidOut: Expense[];
}

export const emptyMethods = (): Record<PaymentMethod, number> => ({ CASH: 0, MOMO: 0, CARD: 0, CREDIT: 0 });

// Service payments are fetched for the day already, so they are not filtered here.
// Till expenses still waiting count too: the money left the drawer either way.
// A rejected one does not, so the worker answers for it in the count.
const fromTill = { TILL_CASH: "CASH", TILL_MOMO: "MOMO" } as const;

export const buildWorkerDays = (
  orders: OrderType[],
  date: string,
  servicePayments: CheckedPayment[] = [],
  expenses: Expense[] = [],
): WorkerDay[] => {
  const byUser = new Map<string, WorkerDay>();
  const get = (user: OrderUser) => {
    let w = byUser.get(user.id);
    if (!w) {
      w = {
        user,
        orders: [],
        completed: [],
        pending: [],
        cancelled: [],
        expected: emptyMethods(),
        credits: [],
        unrecorded: [],
        sales: 0,
        services: 0,
        servicePayments: [],
        paidOut: [],
      };
      byUser.set(user.id, w);
    }
    return w;
  };

  for (const o of orders) {
    if (!o.user) continue;
    const status = orderStatus(o);
    if (status === "COMPLETED" && dayKey(new Date(paidAt(o))) === date) {
      const w = get(o.user);
      w.orders.push(o);
      w.completed.push(o);
      w.sales += toNumber(o.total);
      const payments = paymentsOf(o);
      if (payments.length === 0) w.unrecorded.push(o);
      for (const p of payments) {
        const m = p.method?.toUpperCase() as PaymentMethod;
        if (!(m in w.expected)) continue;
        w.expected[m] += toNumber(p.amount);
        if (m === "CREDIT") w.credits.push({ order: o, payment: p });
      }
    } else if (status !== "COMPLETED" && dayKey(new Date(o.createdAt)) === date) {
      const w = get(o.user);
      w.orders.push(o);
      if (status === "PENDING") w.pending.push(o);
      if (status === "CANCELLED") w.cancelled.push(o);
    }
  }

  for (const p of servicePayments) {
    if (!p.takenBy) continue;
    const w = get({ id: p.takenBy.id, name: p.takenBy.name } as OrderUser);
    const amount = (p.isRefund ? -1 : 1) * toNumber(p.amount);
    w.services += amount;
    w.expected[p.method] += amount;
    w.servicePayments.push(p);
  }

  for (const e of expenses) {
    const method = e.paidFrom === "TILL_CASH" || e.paidFrom === "TILL_MOMO" ? fromTill[e.paidFrom] : null;
    if (!method || !e.recordedBy || e.status === "REJECTED" || e.startDate !== date) continue;
    const w = get({ id: e.recordedBy.id, name: e.recordedBy.name } as OrderUser);
    w.expected[method] -= toNumber(e.amount);
    w.paidOut.push(e);
  }

  for (const w of byUser.values()) {
    w.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [...byUser.values()].sort((a, b) => b.sales + b.services - (a.sales + a.services));
};
