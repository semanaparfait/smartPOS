// Why a worker owes the company, and how they pay it back.
import type { Ionicons } from "@expo/vector-icons";
import type { DebtKind, DebtPaymentMethod, DebtPaymentStatus } from "@/store/Finance/usePayroll";

type Icon = keyof typeof Ionicons.glyphMap;

export const DEBT_KINDS: { value: DebtKind; label: string; icon: Icon }[] = [
  { value: "ADVANCE", label: "Salary advance", icon: "wallet-outline" },
  { value: "SHORTAGE", label: "Money missing", icon: "alert-circle-outline" },
  { value: "GOODS", label: "Goods taken", icon: "bag-handle-outline" },
  { value: "DAMAGE", label: "Damage or loss", icon: "construct-outline" },
  { value: "EXPENSE", label: "Rejected expense", icon: "receipt-outline" },
  { value: "OTHER", label: "Other", icon: "ellipsis-horizontal-outline" },
];

export const DEBT_PAYMENT_METHODS: { value: DebtPaymentMethod; label: string; icon: Icon }[] = [
  { value: "CASH", label: "Cash", icon: "cash-outline" },
  { value: "MOMO", label: "MoMo", icon: "phone-portrait-outline" },
  { value: "SALARY", label: "From the salary", icon: "remove-circle-outline" },
];

export const DEBT_PAYMENT_STATUS: Record<DebtPaymentStatus, { label: string; color: string; bg: string }> = {
  APPROVED: { label: "Approved", color: "#16A34A", bg: "#16A34A1A" },
  PENDING: { label: "Waiting for approval", color: "#20283B", bg: "#D0E66B" },
  REJECTED: { label: "Rejected", color: "#DC2626", bg: "#DC26261A" },
};

export const debtKindMeta = (value: DebtKind) => DEBT_KINDS.find((k) => k.value === value) ?? DEBT_KINDS[DEBT_KINDS.length - 1];
export const debtMethodMeta = (value: DebtPaymentMethod) =>
  DEBT_PAYMENT_METHODS.find((m) => m.value === value) ?? DEBT_PAYMENT_METHODS[0];
