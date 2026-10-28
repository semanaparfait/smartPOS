import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import usePermissions from "@/store/Authentication/usePermissions";
import useOrder from "@/store/Order/Order";
import type { OrderPaymentInput, PaymentMethod } from "@/store/Order/OrderType";
import { confirmDialog, notify } from "@/store/Dialog/useDialog";
import { brand } from "@/config/theme";
import ReceiptPrinter from "../../components/receipt-printer";

type PaymentOption = "cash" | "momo" | "card" | "credit";
type PaymentMode = "single" | "split";

const paymentCards: Array<{
  key: PaymentOption;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    key: "cash",
    label: "Cash",
    subtitle: "Physical cash",
    icon: "cash-outline",
  },
  {
    key: "momo",
    label: "MoMo",
    subtitle: "Mobile transfer",
    icon: "phone-portrait-outline",
  },
  {
    key: "card",
    label: "Card",
    subtitle: "POS terminal",
    icon: "card-outline",
  },
  {
    key: "credit",
    label: "Credit",
    subtitle: "Pay later",
    icon: "time-outline",
  },
];

const cardFor = (key: PaymentOption) =>
  paymentCards.find((card) => card.key === key)!;

const API_METHOD: Record<PaymentOption, PaymentMethod> = {
  cash: "CASH",
  momo: "MOMO",
  card: "CARD",
  credit: "CREDIT",
};

function SectionCard({
  title,
  step,
  right,
  children,
}: {
  title: string;
  step?: number;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-5">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          {step !== undefined && (
            <View className="w-6 h-6 rounded-full bg-lime items-center justify-center mr-2.5">
              <Text className="text-[11px] font-extrabold text-ink">
                {step}
              </Text>
            </View>
          )}
          <Text className="text-base font-extrabold text-ink tracking-tight">
            {title}
          </Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

function MethodChips({
  value,
  onChange,
  disabledKey,
  cards = paymentCards,
}: {
  value: PaymentOption;
  onChange: (key: PaymentOption) => void;
  disabledKey?: PaymentOption;
  cards?: typeof paymentCards;
}) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {cards.map((card) => {
        const active = value === card.key;
        const taken = disabledKey === card.key;
        return (
          <Pressable
            key={card.key}
            onPress={() => onChange(card.key)}
            className={`flex-row items-center px-3 py-2 rounded-lg border ${
              active
                ? "bg-ink border-ink"
                : "bg-white border-ink/10 active:bg-ivory"
            }`}
            style={{ opacity: taken && !active ? 0.4 : 1 }}
          >
            <Ionicons
              name={card.icon}
              size={14}
              color={active ? brand.lime : brand.inkMuted}
            />
            <Text
              className={`text-xs font-bold ml-1.5 ${active ? "text-white" : "text-ink"}`}
            >
              {card.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({
  label,
  icon,
  ...inputProps
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-wider mb-1.5">
        {label}
      </Text>
      <View className="flex-row items-center bg-ivory border border-ink/10 rounded-xl px-4">
        <Ionicons name={icon} size={18} color={brand.inkDisabled} />
        <TextInput
          placeholderTextColor={brand.inkDisabled}
          className="flex-1 py-3.5 ml-3 text-base font-semibold text-ink"
          {...inputProps}
        />
      </View>
    </View>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { fetchOrderById, orders, cancelOrder, completeOrder } = useOrder();
  const { can } = usePermissions();
  const canSplit = can("sales.split_payment");
  const canCancel = can("sales.cancel");
  // Credit only shows for roles allowed to sell on credit.
  const allowedCards = paymentCards.filter(
    (c) => c.key !== "credit" || can("sales.credit"),
  );
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { width } = useWindowDimensions();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  // Coming straight from checkout, the order is already in memory.
  const preloaded = useOrder((s) =>
    s.justCheckedOut?.id === orderId ? s.justCheckedOut : null,
  );
  const [loading, setLoading] = useState(!preloaded);
  const [currentOrder, setCurrentOrder] = useState<any>(preloaded);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (preloaded) return;
      if (orderId && typeof orderId === "string") {
        try {
          setLoading(true);
          const result = await fetchOrderById(orderId);
          if (result) {
            setCurrentOrder(result);
          }
        } catch (error) {
          console.error("Error fetching receipt mapping context:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchOrderDetails();
  }, [orderId, fetchOrderById]);

  const activeOrder =
    currentOrder || orders?.find((o: any) => o.id === orderId);

  const totalAmount = useMemo(
    () => parseFloat(String(activeOrder?.subtotal || "0")),
    [activeOrder],
  );
  const vat = useMemo(
    () =>
      parseFloat(String(activeOrder?.tax || "0")) ||
      Math.round(totalAmount * 0.18),
    [activeOrder, totalAmount],
  );
  const grandTotal = useMemo(
    () => parseFloat(String(activeOrder?.total || "0")) || totalAmount + vat,
    [activeOrder, totalAmount, vat],
  );
  const totalItems = useMemo(
    () =>
      activeOrder?.items?.reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0,
      ) || 0,
    [activeOrder],
  );

  const saleCode = useMemo(() => {
    if (activeOrder?.id) return activeOrder.id.split("-")[0].toUpperCase();
    return `SL-${Math.floor(100000 + Math.random() * 900000)}`;
  }, [activeOrder]);

  const [paymentOption, setPaymentOption] = useState<PaymentOption>("cash");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("single");
  const [splitMethodOne, setSplitMethodOne] = useState<PaymentOption>("cash");
  const [splitMethodTwo, setSplitMethodTwo] = useState<PaymentOption>("card");
  const [splitAmountOne, setSplitAmountOne] = useState("");
  const [creditPrimaryPerson, setCreditPrimaryPerson] = useState("");
  const [creditTakenBy, setCreditTakenBy] = useState("");
  const [creditOwnerPhone, setCreditOwnerPhone] = useState("");

  const splitOneValue = Number(splitAmountOne || 0);
  const splitTwoValue = Math.max(grandTotal - splitOneValue, 0);
  const splitOverpay = Math.max(splitOneValue - grandTotal, 0);
  const splitUsesCredit =
    splitMethodOne === "credit" || splitMethodTwo === "credit";
  const splitOneRatio =
    grandTotal > 0 ? Math.min(Math.max(splitOneValue / grandTotal, 0), 1) : 0;
  const showCreditDetails =
    (paymentMode === "single" && paymentOption === "credit") ||
    (paymentMode === "split" && splitUsesCredit);

  const warn = (title: string, message: string) => {
    notify({ title, message, tone: "warning" });
    return false;
  };

  const isCreditDetailsValid = () => {
    if (!creditPrimaryPerson.trim()) {
      return warn(
        "Missing credit owner",
        "Enter the name of the person this credit belongs to.",
      );
    }
    if (!creditTakenBy.trim()) {
      return warn(
        'Missing "Taken by"',
        "Enter the name of the person who took the goods on credit.",
      );
    }
    if (!creditOwnerPhone.trim()) {
      return warn(
        "Missing phone number",
        "Enter a phone number for the credit owner.",
      );
    }
    return true;
  };

  // One payment entry in the shape PATCH /orders/:id/complete expects.
  const toPayment = (
    option: PaymentOption,
    amount: number,
  ): OrderPaymentInput =>
    option === "credit"
      ? {
          method: "CREDIT",
          amount,
          creditOwnerName: creditPrimaryPerson.trim(),
          creditOwnerPhone: creditOwnerPhone.trim(),
          takenBy: creditTakenBy.trim(),
        }
      : { method: API_METHOD[option], amount };

  // Validates the form and returns the payments, or null if something is missing.
  const buildPayments = (): OrderPaymentInput[] | null => {
    if (paymentMode === "single") {
      if (paymentOption === "credit" && !isCreditDetailsValid()) return null;
      return [toPayment(paymentOption, grandTotal)];
    }

    if (splitMethodOne === splitMethodTwo) {
      warn(
        "Choose different methods",
        "Pick two different methods for a split payment.",
      );
      return null;
    }
    if (splitOneValue <= 0) {
      warn("Invalid split", "Enter a valid amount for the first payment.");
      return null;
    }
    if (splitOneValue >= grandTotal) {
      warn(
        "Invalid split",
        "The first amount must be less than the total so the second method can cover the rest.",
      );
      return null;
    }
    if (splitUsesCredit && !isCreditDetailsValid()) return null;

    return [
      toPayment(splitMethodOne, splitOneValue),
      toPayment(splitMethodTwo, splitTwoValue),
    ];
  };

  const handleFinishTransaction = async () => {
    if (!activeOrder || submitting) return;
    const payments = buildPayments();
    if (!payments) return;

    setSubmitting(true);
    try {
      await completeOrder(activeOrder.id, payments);
      const summary = payments
        .map(
          (p) =>
            `${cardFor(p.method.toLowerCase() as PaymentOption).label} ${p.amount.toLocaleString()} RWF`,
        )
        .join(" + ");
      await notify({
        title: "Sale completed",
        message: `#${saleCode} is paid: ${summary}.`,
        tone: "success",
      });
      router.replace("/(tabs)/products/products");
    } catch (error) {
      notify({
        title: "Could not complete sale",
        message:
          error instanceof Error
            ? error.message
            : "Check your connection and try again.",
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Leaves checkout without touching the order; it stays PENDING and can be resumed from Orders.
  const handleBack = () =>
    router.canGoBack()
      ? router.back()
      : router.replace("/(tabs)/products/products");

  const handleCancelOrder = async () => {
    if (!activeOrder || cancelling) return;
    const confirmed = await confirmDialog({
      title: "Cancel this order?",
      message: `#${saleCode} for ${grandTotal.toLocaleString()} RWF will be cancelled. This cannot be undone.`,
      tone: "danger",
      confirmLabel: "Cancel order",
      cancelLabel: "Keep order",
    });
    if (!confirmed) return;

    setCancelling(true);
    try {
      await cancelOrder(activeOrder.id);
      setCurrentOrder(null);
      await notify({
        title: "Order cancelled",
        message: `#${saleCode} has been cancelled.`,
        tone: "success",
      });
      handleBack();
    } catch (error) {
      notify({
        title: "Could not cancel order",
        message:
          error instanceof Error
            ? error.message
            : "Check your connection and try again.",
        tone: "danger",
      });
    } finally {
      setCancelling(false);
    }
  };

  if (loading && !activeOrder) {
    return (
      <View className="flex-1 justify-center items-center bg-ivory">
        <View className="bg-white p-6 rounded-2xl items-center border border-ink/5">
          <ActivityIndicator size="large" color={brand.ink} />
          <Text className="text-ink/60 font-semibold text-xs mt-4">
            Loading checkout...
          </Text>
        </View>
      </View>
    );
  }

  const isLandscape = width > 768;
  const selectedCard = cardFor(paymentOption);

  return (
    <SafeAreaView className="flex-1 bg-ivory">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: isLandscape ? 32 : 16,
          paddingVertical: 24,
          paddingBottom: 48,
        }}
      >
        {/* TOP BAR */}
        <View className="flex-row items-center mb-6">
          <Pressable
            onPress={handleBack}
            accessibilityLabel="Go back"
            className="w-12 h-12 bg-white rounded-xl border border-ink/10 items-center justify-center mr-4 active:bg-ivory"
          >
            <Ionicons name="arrow-back" size={22} color={brand.ink} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-[2.4px]">
              Checkout
            </Text>
            <Text className="text-2xl font-extrabold text-ink tracking-tight">
              Finalize Sale
            </Text>
          </View>
          <View className="flex-row items-center bg-white border border-ink/10 rounded-full px-3 py-1.5">
            <Ionicons name="receipt-outline" size={14} color={brand.inkMuted} />
            <Text className="text-xs font-bold text-ink ml-1.5">
              #{saleCode}
            </Text>
          </View>
        </View>

        <View
          className={isLandscape ? "flex-row items-start" : "flex-col"}
          style={{ gap: 24 }}
        >
          {/* LEFT: RECEIPT */}
          <View className={isLandscape ? "w-[40%]" : "w-full"}>
            <ReceiptPrinter
              order={activeOrder}
              paymentLabel={
                paymentMode === "single"
                  ? cardFor(paymentOption).label
                  : `${cardFor(splitMethodOne).label} + ${cardFor(splitMethodTwo).label}`
              }
              cutoutColor={brand.ivory}
            />
          </View>

          {/* RIGHT: PAYMENT */}
          <View className="flex-1" style={{ gap: 16 }}>
            {/* AMOUNT DUE */}
            <View className="bg-ink rounded-2xl p-5 overflow-hidden">
              <View
                className="absolute rounded-full bg-lime/10"
                style={{ width: 180, height: 180, right: -60, top: -70 }}
              />
              <View className="flex-row items-center justify-between">
                <Text className="text-white/60 text-[11px] font-bold uppercase tracking-[2.4px]">
                  Amount Due
                </Text>
                <View className="flex-row items-center bg-lime rounded-full px-2.5 py-1">
                  <Ionicons
                    name="bag-handle-outline"
                    size={12}
                    color={brand.ink}
                  />
                  <Text className="text-[11px] font-extrabold text-ink ml-1">
                    {totalItems} {totalItems === 1 ? "item" : "items"}
                  </Text>
                </View>
              </View>
              <Text className="text-4xl font-extrabold text-lime mt-2 tracking-tight">
                {grandTotal.toLocaleString()}
                <Text className="text-lg font-bold text-white/60"> RWF</Text>
              </Text>
              <View
                className="flex-row mt-4 pt-4 border-t border-white/10"
                style={{ gap: 28 }}
              >
                <View>
                  <Text className="text-white/40 text-[10px] font-bold uppercase tracking-wider">
                    Subtotal
                  </Text>
                  <Text className="text-sm font-bold text-white mt-0.5">
                    {totalAmount.toLocaleString()} RWF
                  </Text>
                </View>
                <View>
                  <Text className="text-white/40 text-[10px] font-bold uppercase tracking-wider">
                    Tax (18% VAT)
                  </Text>
                  <Text className="text-sm font-bold text-white mt-0.5">
                    {vat.toLocaleString()} RWF
                  </Text>
                </View>
              </View>
            </View>

            {/* PAYMENT METHOD */}
            <SectionCard
              step={1}
              title="Payment Method"
              right={
                <View className="flex-row rounded-lg bg-ivory border border-ink/5 p-1">
                  {(canSplit
                    ? (["single", "split"] as PaymentMode[])
                    : (["single"] as PaymentMode[])
                  ).map((mode) => {
                    const active = paymentMode === mode;
                    return (
                      <Pressable
                        key={mode}
                        onPress={() => setPaymentMode(mode)}
                        className={`flex-row items-center px-3 py-1.5 rounded-md ${active ? "bg-ink" : ""}`}
                      >
                        <Ionicons
                          name={
                            mode === "single"
                              ? "wallet-outline"
                              : "git-branch-outline"
                          }
                          size={13}
                          color={active ? brand.lime : brand.inkMuted}
                        />
                        <Text
                          className={`text-xs font-bold ml-1.5 ${active ? "text-white" : "text-ink/60"}`}
                        >
                          {mode === "single" ? "Single" : "Split"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              }
            >
              {paymentMode === "single" && (
                <>
                  <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                    {allowedCards.map((card) => {
                      const isActive = paymentOption === card.key;
                      return (
                        <Pressable
                          key={card.key}
                          onPress={() => setPaymentOption(card.key)}
                          className={`p-4 rounded-xl border ${
                            isActive
                              ? "bg-ink border-ink"
                              : "bg-white border-ink/10 active:bg-ivory"
                          }`}
                          style={{
                            width: isLandscape ? "48%" : "47%",
                            flexGrow: 1,
                          }}
                        >
                          <View className="flex-row items-center justify-between mb-3">
                            <View
                              className={`w-10 h-10 rounded-lg items-center justify-center ${
                                isActive ? "bg-ink-soft" : "bg-ivory"
                              }`}
                            >
                              <Ionicons
                                name={card.icon}
                                size={20}
                                color={isActive ? brand.lime : brand.ink}
                              />
                            </View>
                            <View
                              className={`w-5 h-5 rounded-full items-center justify-center ${
                                isActive ? "bg-lime" : "border-2 border-ink/10"
                              }`}
                            >
                              {isActive && (
                                <Ionicons
                                  name="checkmark"
                                  size={13}
                                  color={brand.ink}
                                />
                              )}
                            </View>
                          </View>
                          <Text
                            className={`text-base font-extrabold tracking-tight ${isActive ? "text-white" : "text-ink"}`}
                          >
                            {card.label}
                          </Text>
                          <Text
                            className={`text-xs mt-0.5 ${isActive ? "text-white/60" : "text-ink/40"}`}
                          >
                            {card.subtitle}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View className="flex-row items-center justify-between mt-4 rounded-xl px-4 py-3 bg-ivory border border-dashed border-ink/10">
                    <View className="flex-row items-center flex-1">
                      <Ionicons
                        name={selectedCard.icon}
                        size={16}
                        color={brand.ink}
                      />
                      <Text className="text-xs text-ink/60 ml-2 flex-1">
                        Collect full amount via{" "}
                        <Text className="font-extrabold text-ink">
                          {selectedCard.label}
                        </Text>
                      </Text>
                    </View>
                    <Text className="text-sm font-extrabold text-ink">
                      {grandTotal.toLocaleString()} RWF
                    </Text>
                  </View>
                </>
              )}

              {paymentMode === "split" && (
                <View style={{ gap: 16 }}>
                  <Text className="text-ink/40 text-xs -mt-1">
                    Enter the first amount — the remainder goes to the second
                    method automatically.
                  </Text>

                  {/* First payment */}
                  <View
                    className="rounded-xl border border-ink/10 p-4"
                    style={{ gap: 12 }}
                  >
                    <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-wider">
                      First payment
                    </Text>
                    <MethodChips
                      value={splitMethodOne}
                      onChange={setSplitMethodOne}
                      disabledKey={splitMethodTwo}
                      cards={allowedCards}
                    />
                    <View
                      className="flex-row items-center bg-ivory rounded-xl border px-4"
                      style={{
                        borderColor:
                          splitOverpay > 0
                            ? brand.danger
                            : "rgba(32,40,59,0.1)",
                      }}
                    >
                      <TextInput
                        value={splitAmountOne}
                        onChangeText={setSplitAmountOne}
                        placeholder="0"
                        placeholderTextColor={brand.inkDisabled}
                        keyboardType="numeric"
                        className="flex-1 py-3.5 text-xl font-extrabold text-ink outline-none"
                      />
                      <Text className="text-sm font-bold text-ink/40">RWF</Text>
                    </View>
                  </View>

                  {/* Second payment */}
                  <View
                    className="rounded-xl border border-ink/10 p-4"
                    style={{ gap: 12 }}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-ink/40 text-[11px] font-bold uppercase tracking-wider">
                        Second payment
                      </Text>
                      <Text className="text-sm font-extrabold text-ink">
                        {splitTwoValue.toLocaleString()} RWF
                      </Text>
                    </View>
                    <MethodChips
                      value={splitMethodTwo}
                      onChange={setSplitMethodTwo}
                      disabledKey={splitMethodOne}
                      cards={allowedCards}
                    />
                  </View>

                  {/* Allocation */}
                  <View style={{ gap: 8 }}>
                    <View className="flex-row h-2.5 rounded-full overflow-hidden bg-ivory">
                      <View
                        className="bg-ink"
                        style={{ flex: splitOneRatio }}
                      />
                      <View
                        className="bg-lime"
                        style={{ flex: 1 - splitOneRatio }}
                      />
                    </View>
                    <View className="flex-row justify-between">
                      <View className="flex-row items-center">
                        <View className="w-2 h-2 rounded-full bg-ink mr-1.5" />
                        <Text className="text-xs font-bold text-ink">
                          {cardFor(splitMethodOne).label} ·{" "}
                          {Math.max(splitOneValue, 0).toLocaleString()} RWF
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="w-2 h-2 rounded-full bg-lime mr-1.5" />
                        <Text className="text-xs font-bold text-ink">
                          {cardFor(splitMethodTwo).label} ·{" "}
                          {splitTwoValue.toLocaleString()} RWF
                        </Text>
                      </View>
                    </View>
                    {splitMethodOne === splitMethodTwo && (
                      <View className="flex-row items-center bg-ivory rounded-lg px-3 py-2">
                        <Ionicons
                          name="warning-outline"
                          size={14}
                          color={brand.danger}
                        />
                        <Text
                          className="text-xs font-semibold ml-2"
                          style={{ color: brand.danger }}
                        >
                          Choose two different payment methods
                        </Text>
                      </View>
                    )}
                    {splitOverpay > 0 && (
                      <View className="flex-row items-center bg-ivory rounded-lg px-3 py-2">
                        <Ionicons
                          name="alert-circle-outline"
                          size={14}
                          color={brand.danger}
                        />
                        <Text
                          className="text-xs font-semibold ml-2"
                          style={{ color: brand.danger }}
                        >
                          First amount is too high by{" "}
                          {splitOverpay.toLocaleString()} RWF
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </SectionCard>

            {/* CREDIT DETAILS */}
            {showCreditDetails && (
              <SectionCard
                step={2}
                title="Credit Details"
                right={
                  <View className="bg-ivory border border-ink/10 rounded-full px-2.5 py-1">
                    <Text className="text-[10px] font-bold text-ink/60 uppercase tracking-wider">
                      Required
                    </Text>
                  </View>
                }
              >
                <View style={{ gap: 14 }}>
                  {paymentMode === "split" && (
                    <Text className="text-xs text-ink/40 -mt-1">
                      Part of this sale is on credit — record who is
                      responsible.
                    </Text>
                  )}
                  <Field
                    label="Credit owner"
                    icon="person-outline"
                    value={creditPrimaryPerson}
                    onChangeText={setCreditPrimaryPerson}
                    placeholder="Primary person for this credit"
                  />
                  <Field
                    label="Taken by"
                    icon="people-outline"
                    value={creditTakenBy}
                    onChangeText={setCreditTakenBy}
                    placeholder="Person who took this credit"
                  />
                  <Field
                    label="Owner phone"
                    icon="call-outline"
                    value={creditOwnerPhone}
                    onChangeText={setCreditOwnerPhone}
                    placeholder="07X XXX XXXX"
                    keyboardType="phone-pad"
                  />
                </View>
              </SectionCard>
            )}

            {/* ACTIONS */}
            <View className="flex-row mt-2" style={{ gap: 12 }}>
              {canCancel && (
                <Pressable
                  onPress={handleCancelOrder}
                  disabled={cancelling || submitting || !activeOrder}
                  className={`h-14 flex-row items-center justify-center px-5 rounded-xl bg-white border border-ink/10 active:bg-red-50 ${
                    cancelling || submitting ? "opacity-60" : ""
                  }`}
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color={brand.danger} />
                  ) : (
                    <Ionicons name="close" size={18} color={brand.danger} />
                  )}
                  <Text
                    className="text-sm font-bold ml-1.5"
                    style={{ color: brand.danger }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleFinishTransaction}
                disabled={submitting || !activeOrder}
                className={`h-14 flex-1 flex-row items-center justify-between px-5 rounded-xl bg-lime active:bg-lime-dark ${
                  submitting || !activeOrder ? "opacity-60" : ""
                }`}
              >
                <View className="flex-row items-center">
                  {submitting ? (
                    <ActivityIndicator size="small" color={brand.ink} />
                  ) : (
                    <Ionicons
                      name="print-outline"
                      size={20}
                      color={brand.ink}
                    />
                  )}
                  <Text className="text-ink text-base font-bold ml-2">
                    {submitting ? "Completing sale…" : "Print & Finish"}
                  </Text>
                </View>
                <Text className="text-ink text-sm font-extrabold">
                  {grandTotal.toLocaleString()} RWF
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
