// One booking: who, what, the running cost, payments, and what to do next.
// Cancelling and refunding need their own permission and always ask why.
import { PAYMENT_META } from "@/components/orders/orderKit";
import {
  ActionButton,
  FieldLabel,
  MethodChips,
  MoneyInput,
  Pill,
  Row,
  ServiceThumb,
  webNoOutline,
} from "@/components/services/servicesKit";
import {
  BOOKING_STATUS,
  dateKey,
  elapsed,
  isTimed,
  kindMeta,
  priceMeta,
  runningTotal,
  rwf,
  timeOf,
} from "@/config/services";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import usePermissions from "@/store/Authentication/usePermissions";
import type { Booking, BookingPaymentMethod } from "@/store/Services/serviceTypes";
import useServices from "@/store/Services/useServices";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

const MIN_REASON = 3;
const CANCEL_REASONS = ["Customer did not come", "Customer changed plans", "Booked by mistake", "Problem with the room or item"];
const REFUND_REASONS = ["Cancelled booking", "Service not as promised", "Left early", "Charged by mistake"];

const when = (value: string) => {
  const date = new Date(value);
  return dateKey(date) === dateKey(new Date()) ? `${tr("Today")} ${timeOf(date)}` : `${dateKey(date)} ${timeOf(date)}`;
};

// Re-renders every 30 seconds so timers and running totals move.
export function useNow(active = true) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

// A required reason: quick picks plus free text.
function ReasonField({
  value,
  onChange,
  picks,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  picks: string[];
  placeholder: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View className="flex-row flex-wrap" style={{ gap: 6 }}>
        {picks.map((pick) => {
          const active = value === tr(pick);
          return (
            <Pressable
              key={pick}
              onPress={() => onChange(tr(pick))}
              className={`px-3 py-1.5 rounded-full border ${active ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
            >
              <Text className={`text-xs font-semibold ${active ? "text-lime" : "text-ink/70"}`}>{tr(pick)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View className="bg-ivory border border-ink/10 rounded-xl px-3.5">
        <TextInput
          value={value}
          onChangeText={onChange}
          maxLength={255}
          multiline
          placeholder={placeholder}
          placeholderTextColor={brand.inkDisabled}
          className="py-3 text-[15px] text-ink min-h-[64px]"
          style={webNoOutline}
        />
      </View>
    </View>
  );
}

export default function BookingSheet({ bookingId, onClose }: { bookingId: string | null; onClose: () => void }) {
  const booking = useServices((s) => s.bookings.find((b) => b.id === bookingId) ?? null);
  const checkIn = useServices((s) => s.checkIn);
  const checkOut = useServices((s) => s.checkOut);
  const cancelBooking = useServices((s) => s.cancelBooking);
  const refundBooking = useServices((s) => s.refundBooking);
  const addPayment = useServices((s) => s.addPayment);
  const { can } = usePermissions();
  const canRefund = can("services.refund");
  const now = useNow(booking?.status === "ACTIVE");

  const [method, setMethod] = useState<BookingPaymentMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  // The cancel or refund form, open instead of the normal actions.
  const [panel, setPanel] = useState<"cancel" | "refund" | null>(null);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<BookingPaymentMethod | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setMethod(null);
    setAmount("");
    setDiscount("");
    setPanel(null);
    setReason("");
    setRefundMethod(null);
    setRefundAmount("");
  }, [bookingId]);

  if (!booking) return null;

  const price = priceMeta(booking.priceUnit);
  const live = runningTotal(booking, now);
  const due = Math.max(0, live.total - Number(discount || 0));
  const owed = Math.round((due - booking.paid) * 100) / 100;
  const status = BOOKING_STATUS[booking.status];
  const open = booking.status === "RESERVED" || booking.status === "ACTIVE";
  const canPay = booking.status !== "CANCELLED" && (booking.status === "ACTIVE" || booking.balance > 0);
  const refundable = canRefund && booking.paid > 0;

  // Fills the amount with what is still owed when a method is chosen.
  const pickMethod = (value: BookingPaymentMethod | null) => {
    setMethod(value);
    if (value && !amount && owed > 0) setAmount(String(owed));
  };

  const openPanel = (which: "cancel" | "refund") => {
    setPanel(which);
    setReason("");
    if (which === "refund") {
      // The method it was paid with, and everything paid, to start from.
      const last = [...booking.payments].reverse().find((p) => !p.isRefund);
      setRefundMethod(last?.method ?? "CASH");
      setRefundAmount(String(booking.paid));
    }
  };

  const run = async (key: string, action: () => Promise<Booking>, done: string) => {
    setBusy(key);
    try {
      const updated = await action();
      Toast.show({ type: "success", text1: tr(done), text2: `${updated.customerName} · ${updated.code}` });
      setMethod(null);
      setAmount("");
      setPanel(null);
      setReason("");
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not update the booking"), text2: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const confirmCancel = () => {
    if (reason.trim().length < MIN_REASON) return Toast.show({ type: "error", text1: tr("Say why it is cancelled") });
    run("cancel", () => cancelBooking(booking.id, reason.trim()), "Booking cancelled");
  };

  const confirmRefund = () => {
    const value = Number(refundAmount);
    if (!refundMethod || !(value > 0)) return Toast.show({ type: "error", text1: tr("Enter how much to give back") });
    if (value > booking.paid) return Toast.show({ type: "error", text1: `${tr("Only")} ${rwf(booking.paid)} ${tr("was paid")}` });
    if (reason.trim().length < MIN_REASON) return Toast.show({ type: "error", text1: tr("Say why the money is given back") });
    run("refund", () => refundBooking(booking.id, refundMethod, value, reason.trim()), "Refund recorded");
  };

  const payment = method && Number(amount) > 0 ? { method, amount: Number(amount) } : undefined;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-ink/50 items-center justify-center p-4">
        <View className="bg-white rounded-2xl w-full overflow-hidden" style={{ maxWidth: 520, maxHeight: "94%" }}>
          <View className="flex-row items-center px-5 pt-5 pb-3 border-b border-ink/5" style={{ gap: 12 }}>
            <ServiceThumb uri={booking.service.imageUrl} icon={kindMeta(booking.service.kind).icon} />
            <View className="flex-1">
              <Text numberOfLines={1} className="text-ink text-lg font-bold">
                {booking.service.name}
                {booking.unit ? ` · ${booking.unit.name}` : ""}
              </Text>
              <View className="flex-row items-center mt-1" style={{ gap: 8 }}>
                <Pill {...status} />
                <Text className="text-ink/40 text-xs font-semibold tracking-widest">{booking.code}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} accessibilityLabel={tr("Close")} className="w-9 h-9 rounded-lg items-center justify-center active:bg-ivory">
              <Ionicons name="close" size={20} color={brand.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <View>
              <Row label={tr("Customer")} value={booking.customerName} strong />
              {booking.customerPhone && <Row label={tr("Phone")} value={booking.customerPhone} />}
              <Row label={tr("People")} value={String(booking.people)} />
              <Row label={tr(booking.status === "RESERVED" ? "Expected" : "Started")} value={when(booking.checkedInAt ?? booking.startAt)} />
              {booking.endAt && booking.status !== "COMPLETED" && booking.status !== "CANCELLED" && (
                <Row label={tr("Until")} value={when(booking.endAt)} />
              )}
              {booking.checkedOutAt && <Row label={tr("Finished")} value={when(booking.checkedOutAt)} />}
              {booking.status === "ACTIVE" && booking.checkedInAt && (
                <Row label={tr("Time so far")} value={elapsed(booking.checkedInAt, now)} strong />
              )}
              {booking.takenBy && <Row label={tr("Booked by")} value={booking.takenBy.name} />}
            </View>

            {!!booking.note && (
              <View className="bg-ivory rounded-xl px-3.5 py-2.5">
                <Text className="text-ink/70 text-[13px]">{booking.note}</Text>
              </View>
            )}
            {!!booking.cancelReason && (
              <View className="rounded-xl px-3.5 py-2.5" style={{ backgroundColor: "#DC26261A" }}>
                <Text className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: brand.danger }}>
                  {tr("Why it was cancelled")}
                </Text>
                <Text className="text-ink text-[13px] mt-0.5">{booking.cancelReason}</Text>
              </View>
            )}

            <View className="bg-ivory rounded-xl px-4 py-3">
              {live.quantity > 0 ? (
                <Row
                  label={`${live.quantity} ${tr(live.quantity === 1 ? price.one : price.many)} × ${rwf(booking.unitPrice)}`}
                  value={rwf(live.quantity * Number(booking.unitPrice))}
                />
              ) : (
                <Row label={tr("Price")} value={`${rwf(booking.unitPrice)} ${tr(price.per)}`} />
              )}
              {Number(booking.discount) > 0 && <Row label={tr("Discount")} value={`- ${rwf(booking.discount)}`} />}
              {booking.status === "ACTIVE" && Number(discount) > 0 && <Row label={tr("Discount")} value={`- ${rwf(discount)}`} />}
              {booking.status !== "CANCELLED" && (
                <Row label={tr(booking.status === "ACTIVE" ? "Total if they leave now" : "Total")} value={rwf(due)} strong />
              )}
              <Row label={tr("Paid")} value={rwf(booking.paid)} />
              {booking.refunded > 0 && <Row label={tr("Refunded")} value={rwf(booking.refunded)} />}
              {booking.status !== "CANCELLED" && (
                <Row label={owed < 0 ? tr("Give back") : tr("Still owed")} value={rwf(Math.abs(owed))} strong />
              )}
              {booking.status === "CANCELLED" && booking.paid > 0 && (
                <Row label={tr("Kept, not refunded")} value={rwf(booking.paid)} strong />
              )}
              {booking.status === "ACTIVE" && isTimed(booking.priceUnit) && (
                <Text className="text-ink/40 text-[11px] mt-1">{tr("Never less than what was booked. Rounded up when they check out.")}</Text>
              )}
            </View>

            {booking.payments.length > 0 && (
              <View>
                <FieldLabel>{tr("Payments")}</FieldLabel>
                {booking.payments.map((p) => (
                  <View key={p.id} className="py-1.5 border-b border-ink/5">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <Ionicons
                          name={p.isRefund ? "return-up-back-outline" : PAYMENT_META[p.method].icon}
                          size={15}
                          color={p.isRefund ? brand.danger : brand.inkMuted}
                        />
                        <Text className="text-ink text-[13px] ml-2">
                          {p.isRefund ? `${tr("Refund")} · ` : ""}
                          {tr(PAYMENT_META[p.method].label)}
                        </Text>
                        <Text numberOfLines={1} className="text-ink/40 text-xs ml-2 flex-1">
                          {when(p.createdAt)}
                          {p.takenBy ? ` · ${p.takenBy.name}` : ""}
                        </Text>
                      </View>
                      <Text className="text-[13px] font-semibold" style={{ color: p.isRefund ? brand.danger : brand.ink }}>
                        {p.isRefund ? "- " : ""}
                        {rwf(p.amount)}
                      </Text>
                    </View>
                    {p.isRefund && !!p.reason && <Text className="text-ink/60 text-xs mt-0.5 ml-6">{p.reason}</Text>}
                  </View>
                ))}
              </View>
            )}

            {panel === "cancel" && (
              <View className="border border-ink/10 rounded-xl p-4" style={{ gap: 10 }}>
                <Text className="text-ink text-[15px] font-semibold">{tr("Cancel this booking")}</Text>
                <Text className="text-ink/50 text-xs">
                  {tr(
                    booking.status === "ACTIVE"
                      ? "It stops now and the place is freed. Money paid stays recorded until you refund it."
                      : "Money paid stays recorded until you refund it.",
                  )}
                </Text>
                <FieldLabel>{tr("Why (required)")}</FieldLabel>
                <ReasonField value={reason} onChange={setReason} picks={CANCEL_REASONS} placeholder={tr("Write the reason")} />
              </View>
            )}

            {panel === "refund" && (
              <View className="border border-ink/10 rounded-xl p-4" style={{ gap: 10 }}>
                <Text className="text-ink text-[15px] font-semibold">{tr("Give money back")}</Text>
                <Text className="text-ink/50 text-xs">
                  {tr("Up to")} {rwf(booking.paid)}
                </Text>
                <MethodChips value={refundMethod} onChange={setRefundMethod} />
                <MoneyInput value={refundAmount} placeholder={tr("Amount")} onChange={setRefundAmount} />
                <FieldLabel>{tr("Why (required)")}</FieldLabel>
                <ReasonField value={reason} onChange={setReason} picks={REFUND_REASONS} placeholder={tr("Write the reason")} />
              </View>
            )}

            {!panel && booking.status === "ACTIVE" && (
              <View>
                <FieldLabel>{tr("Discount (optional)")}</FieldLabel>
                <MoneyInput value={discount} placeholder="0" onChange={setDiscount} />
              </View>
            )}

            {!panel && canPay && (
              <View style={{ gap: 10 }}>
                <FieldLabel>{tr(booking.status === "ACTIVE" ? "Payment at checkout" : "Take a payment")}</FieldLabel>
                <MethodChips value={method} onChange={pickMethod} allowNone={booking.status === "ACTIVE"} />
                {method && <MoneyInput value={amount} placeholder={tr("Amount")} onChange={setAmount} />}
              </View>
            )}

            {!panel && !canRefund && (open || booking.paid > 0) && (
              <Text className="text-ink/40 text-xs">{tr("Cancelling or refunding needs permission. Ask the owner or a manager.")}</Text>
            )}
          </ScrollView>

          <View className="flex-row flex-wrap px-5 pb-5 pt-3 border-t border-ink/5" style={{ gap: 10 }}>
            {panel ? (
              <>
                <ActionButton label={tr("Back")} icon="arrow-back" tone="plain" onPress={() => setPanel(null)} />
                {panel === "cancel" ? (
                  <ActionButton label={tr("Cancel booking")} icon="close-circle-outline" tone="ink" busy={busy === "cancel"} onPress={confirmCancel} />
                ) : (
                  <ActionButton
                    label={`${tr("Refund")} ${Number(refundAmount) > 0 ? rwf(refundAmount) : ""}`}
                    icon="return-up-back-outline"
                    tone="ink"
                    busy={busy === "refund"}
                    onPress={confirmRefund}
                  />
                )}
              </>
            ) : (
              <>
                {canRefund && open && (
                  <ActionButton label={tr("Cancel booking")} icon="close-circle-outline" tone="plain" onPress={() => openPanel("cancel")} />
                )}
                {refundable && (
                  <ActionButton label={tr("Refund")} icon="return-up-back-outline" tone="plain" onPress={() => openPanel("refund")} />
                )}
                {booking.status === "RESERVED" && (
                  <>
                    {payment && (
                      <ActionButton
                        label={tr("Take payment")}
                        icon="cash-outline"
                        tone="ink"
                        busy={busy === "pay"}
                        onPress={() => run("pay", () => addPayment(booking.id, payment.method, payment.amount), "Payment taken")}
                      />
                    )}
                    <ActionButton
                      label={tr("Check in")}
                      icon="log-in-outline"
                      busy={busy === "in"}
                      onPress={() => run("in", () => checkIn(booking.id), "Checked in")}
                    />
                  </>
                )}
                {booking.status === "ACTIVE" && (
                  <ActionButton
                    label={payment ? `${tr("Check out and take")} ${rwf(payment.amount)}` : tr("Check out")}
                    icon="log-out-outline"
                    busy={busy === "out"}
                    onPress={() => run("out", () => checkOut(booking.id, Number(discount) || undefined, payment), "Checked out")}
                  />
                )}
                {booking.status === "COMPLETED" && booking.balance > 0 && (
                  <ActionButton
                    label={tr("Take payment")}
                    icon="cash-outline"
                    busy={busy === "pay"}
                    onPress={() =>
                      payment
                        ? run("pay", () => addPayment(booking.id, payment.method, payment.amount), "Payment taken")
                        : Toast.show({ type: "error", text1: tr("Choose how they pay") })
                    }
                  />
                )}
                {!open && !(booking.status === "COMPLETED" && booking.balance > 0) && (
                  <ActionButton label={tr("Close")} icon="checkmark" tone="plain" onPress={onClose} />
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
