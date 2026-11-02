// Kinds of costs, how often they repeat, and how much of them falls on a day.
// Repeating costs are spread over the days they cover, so a single day's profit
// carries its share of the month's rent and salaries.
import type { Ionicons } from "@expo/vector-icons";
import type { Expense, ExpenseCategory, ExpensePaidFrom, ExpenseRepeat, ExpenseStatus } from "@/store/Finance/useExpenses";

type Icon = keyof typeof Ionicons.glyphMap;

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: Icon }[] = [
  { value: "RENT", label: "Rent", icon: "home-outline" },
  { value: "ELECTRICITY", label: "Electricity", icon: "flash-outline" },
  { value: "WATER", label: "Water", icon: "water-outline" },
  { value: "INTERNET", label: "Internet & phone", icon: "wifi-outline" },
  { value: "WAGES", label: "Other wages", icon: "people-outline" },
  { value: "TRANSPORT", label: "Transport", icon: "car-outline" },
  { value: "SUPPLIES", label: "Supplies", icon: "basket-outline" },
  { value: "MAINTENANCE", label: "Repairs", icon: "construct-outline" },
  { value: "TAX", label: "Taxes & fees", icon: "document-text-outline" },
  { value: "MARKETING", label: "Advertising", icon: "megaphone-outline" },
  { value: "OTHER", label: "Other", icon: "ellipsis-horizontal-outline" },
];

export const EXPENSE_REPEATS: { value: ExpenseRepeat; label: string; per: string }[] = [
  { value: "ONCE", label: "One time", per: "" },
  { value: "DAILY", label: "Every day", per: "per day" },
  { value: "WEEKLY", label: "Every week", per: "per week" },
  { value: "MONTHLY", label: "Every month", per: "per month" },
  { value: "YEARLY", label: "Every year", per: "per year" },
];

export const PAID_FROM: { value: ExpensePaidFrom; label: string; icon: Icon; hint: string }[] = [
  { value: "TILL_CASH", label: "Cash from the till", icon: "cash-outline", hint: "Comes off the cash your drawer should hold today." },
  { value: "TILL_MOMO", label: "MoMo from the till", icon: "phone-portrait-outline", hint: "Comes off the MoMo your drawer should hold today." },
  { value: "OWN_MONEY", label: "My own money", icon: "person-outline", hint: "The company owes it back to you once approved." },
  { value: "OTHER", label: "Other", icon: "ellipsis-horizontal-outline", hint: "Paid some other way, e.g. by the owner." },
];

export const EXPENSE_STATUS: Record<ExpenseStatus, { label: string; color: string; bg: string }> = {
  APPROVED: { label: "Approved", color: "#16A34A", bg: "#16A34A1A" },
  PENDING: { label: "Waiting for approval", color: "#20283B", bg: "#D0E66B" },
  REJECTED: { label: "Rejected", color: "#DC2626", bg: "#DC26261A" },
};

export const paidFromMeta = (value: ExpensePaidFrom | null) => PAID_FROM.find((p) => p.value === value);

// Counts against the profit: recorded by a manager, or approved.
export const counts = (expense: Expense) => !expense.status || expense.status === "APPROVED";

export const categoryMeta = (value: ExpenseCategory) =>
  EXPENSE_CATEGORIES.find((c) => c.value === value) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

export const repeatMeta = (value: ExpenseRepeat) =>
  EXPENSE_REPEATS.find((r) => r.value === value) ?? EXPENSE_REPEATS[0];

const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const daysInYear = (d: Date) => (new Date(d.getFullYear(), 1, 29).getMonth() === 1 ? 366 : 365);

// How much of the expense falls on this day.
export function shareOn(expense: Expense, day: Date) {
  const key = dayKey(day);
  if (key < expense.startDate || (expense.endDate && key > expense.endDate)) return 0;
  const amount = Number(expense.amount);
  switch (expense.repeat) {
    case "ONCE":
      return key === expense.startDate ? amount : 0;
    case "DAILY":
      return amount;
    case "WEEKLY":
      return amount / 7;
    case "MONTHLY":
      return amount / daysInMonth(day);
    case "YEARLY":
      return amount / daysInYear(day);
  }
}

// What one month of a cost comes to, to compare repeating costs.
export function monthlyAmount(expense: Pick<Expense, "amount" | "repeat">) {
  const amount = Number(expense.amount);
  return { ONCE: 0, DAILY: amount * 30.44, WEEKLY: (amount * 52) / 12, MONTHLY: amount, YEARLY: amount / 12 }[expense.repeat];
}

export const isRunning = (expense: Expense, today = dayKey(new Date())) =>
  expense.repeat !== "ONCE" && expense.startDate <= today && (!expense.endDate || expense.endDate >= today);

// Costs of the days in [from, to): by category, salaries apart.
export function costsBetween(expenses: Expense[], monthlySalaries: number, from: Date, to: Date) {
  const byCategory = new Map<ExpenseCategory, number>();
  let salaries = 0;
  for (let day = new Date(from); day < to; day.setDate(day.getDate() + 1)) {
    salaries += monthlySalaries / daysInMonth(day);
    for (const expense of expenses) {
      if (!counts(expense)) continue;
      const share = shareOn(expense, day);
      if (share) byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + share);
    }
  }
  const categories = [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const total = salaries + categories.reduce((sum, c) => sum + c.amount, 0);
  return { categories, salaries, total };
}
