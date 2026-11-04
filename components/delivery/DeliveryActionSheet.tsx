import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useDelivery, { type DoorPayment } from "@/store/Delivery/useDelivery";
import type { OrderType } from "@/store/Order/OrderType";
import React, { useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";

export type Sheet =
  | { kind: "send"; order: OrderType }
  | { kind: "delivered"; order: OrderType }
  | { kind: "failed"; order: OrderType }
  | null;

const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;
const REASONS = ["Customer did not answer", "Wrong address", "Customer refused it"];
const DOOR_METHODS: DoorPayment["method"][] = ["CASH", "MOMO", "CARD"];
const METHOD_LABEL: Record<DoorPayment["method"], string> = { CASH: "Cash", MOMO: "MoMo", CARD: "Card" };

export const rwf = (n: string | number | undefined) => `${Math.round(Number(n) || 0).toLocaleString()} RWF`;
export const isPaid = (o: OrderType) => (o.status || "").toUpperCase() === "COMPLETED";
export const riderName = (o: OrderType) => o.rider?.employee?.name ?? o.rider?.name ?? o.outsideRider ?? null;

// Asks the one thing each step needs: who takes it, how the customer paid, or
// what went wrong.
export function ActionSheet({ sheet, hasRiders, onClose }: { sheet: Sheet; hasRiders: boolean; onClose: () => void }) {
  const riders = useDelivery((s) => s.riders);
  const send = useDelivery((s) => s.send);
  const delivered = useDelivery((s) => s.delivered);
  const notDelivered = useDelivery((s) => s.notDelivered);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [outside, setOutside] = useState("");
  const [method, setMethod] = useState<DoorPayment["method"]>("CASH");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const order = sheet?.order;
  const needsMoney = !!order && !isPaid(order);
  const hasRider = !!order && !!riderName(order);

  const reset = () => {
    setRiderId(null);
    setOutside("");
    setMethod("CASH");
    setReason("");
  };

  const who = riderId ? { riderId } : outside.trim() ? { outsideRider: outside.trim() } : {};

  const run = async () => {
    if (!sheet || !order || busy) return;
    setBusy(true);
    try {
      if (sheet.kind === "send") {
        await send(order.id, who);
        Toast.show({ type: "success", text1: tr("On the way"), text2: order.customerName ?? undefined });
      } else if (sheet.kind === "delivered") {
        await delivered(order.id, needsMoney ? [{ method, amount: Number(order.total) }] : undefined, who);
        Toast.show({
          type: "success",
          text1: tr("Delivered"),
          text2: needsMoney ? `${rwf(order.total)} ${tr("received")} (${METHOD_LABEL[method]})` : order.customerName ?? undefined,
        });
      } else {
        await notDelivered(order.id, reason.trim());
        Toast.show({ type: "success", text1: tr("Marked not delivered"), text2: order.customerName ?? undefined });
      }
      reset();
      onClose();
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Something went wrong"), text2: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Only a reason is ever required; who took it is optional.
  const ready = sheet?.kind === "failed" ? !!reason.trim() : true;

  const title =
    sheet?.kind === "send" ? tr("On the way") : sheet?.kind === "delivered" ? tr("Delivered") : tr("Not delivered");

  const chip = (label: string, on: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      className={`h-10 px-3 rounded-xl border justify-center ${on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"}`}
    >
      <Text className={`text-[13px] font-semibold ${on ? "text-white" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-ink/50 items-center justify-center p-4">
        <View className="bg-white rounded-2xl p-5 w-full" style={{ maxWidth: 440, gap: 14 }}>
          <View>
            <Text className="text-ink text-lg font-semibold">{title}</Text>
            <Text className="text-ink/50 text-[13px] mt-0.5">
              {[order?.customerName, order?.deliveryAddress].filter(Boolean).join(" · ")}
            </Text>
          </View>

          {hasRiders &&
            (sheet?.kind === "send" || sheet?.kind === "delivered") &&
            (hasRider ? (
              <Text className="text-ink text-[14px]">
                {tr("Taken by")} {riderName(order!)}
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                <Text className="text-ink/60 text-[11px] font-semibold uppercase tracking-wider">
                  {sheet?.kind === "delivered" ? tr("Who took it? (optional)") : tr("Who takes it (optional)")}
                </Text>
                {riders.length > 0 && (
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {riders.map((r) =>
                      chip(r.name, riderId === r.id, () => {
                        setRiderId(riderId === r.id ? null : r.id);
                        setOutside("");
                      }),
                    )}
                  </View>
                )}
                <View className="bg-ivory border border-ink/10 rounded-xl px-3.5">
                  <TextInput
                    value={outside}
                    onChangeText={(v) => {
                      setOutside(v);
                      if (v) setRiderId(null);
                    }}
                    placeholder={riders.length ? tr("Or type a name, e.g. Moto – Eric 0788…") : tr("Name, e.g. Moto – Eric 0788…")}
                    placeholderTextColor={brand.inkDisabled}
                    maxLength={100}
                    className="py-3 text-[15px] text-ink"
                    style={webNoOutline}
                  />
                </View>
              </View>
            ))}

          {sheet?.kind === "delivered" &&
            (needsMoney ? (
              <View style={{ gap: 8 }}>
                <Text className="text-ink text-[14px]">
                  {tr("Money received")}: <Text className="font-semibold">{rwf(order!.total)}</Text>. {tr("How did they pay?")}
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {DOOR_METHODS.map((m) => chip(tr(METHOD_LABEL[m]), method === m, () => setMethod(m)))}
                </View>
              </View>
            ) : (
              <Text className="text-ink text-[14px]">{tr("Already paid. The customer has it.")}</Text>
            ))}

          {sheet?.kind === "failed" && (
            <View style={{ gap: 8 }}>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {REASONS.map((r) => chip(tr(r), reason === tr(r), () => setReason(tr(r))))}
              </View>
              <View className="bg-ivory border border-ink/10 rounded-xl px-3.5">
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder={tr("What happened?")}
                  placeholderTextColor={brand.inkDisabled}
                  maxLength={300}
                  className="py-3 text-[15px] text-ink"
                  style={webNoOutline}
                />
              </View>
              <Text className="text-ink/40 text-xs">
                {order && isPaid(order)
                  ? tr("It was already paid: give the money back to the customer.")
                  : tr("The order is cancelled; nothing is taken from stock.")}
              </Text>
            </View>
          )}

          <View className="flex-row" style={{ gap: 10 }}>
            <Pressable
              onPress={() => {
                reset();
                onClose();
              }}
              className="h-12 px-5 rounded-xl border border-ink/10 items-center justify-center active:bg-ivory"
            >
              <Text className="text-ink text-sm font-semibold">{tr("Back")}</Text>
            </Pressable>
            <Pressable
              onPress={run}
              disabled={!ready || busy}
              className={`h-12 flex-1 rounded-xl items-center justify-center ${
                sheet?.kind === "failed" ? "bg-ink active:bg-ink/90" : "bg-lime active:bg-lime-dark"
              } ${ready ? "" : "opacity-50"}`}
            >
              {busy ? (
                <ActivityIndicator color={sheet?.kind === "failed" ? brand.white : brand.ink} />
              ) : (
                <Text className={`text-sm font-semibold ${sheet?.kind === "failed" ? "text-white" : "text-ink"}`}>
                  {sheet?.kind === "send"
                    ? tr("Mark on the way")
                    : sheet?.kind === "delivered"
                      ? needsMoney
                        ? `${tr("Received")} ${rwf(order?.total)}`
                        : tr("Yes, delivered")
                      : tr("Mark not delivered")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
