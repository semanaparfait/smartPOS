import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import usePermissions from "@/store/Authentication/usePermissions";
import useDelivery, { type DoorPayment } from "@/store/Delivery/useDelivery";
import type { OrderType } from "@/store/Order/OrderType";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type Tab = "waiting" | "onTheWay" | "done";
type Sheet =
  | { kind: "send"; order: OrderType }
  | { kind: "delivered"; order: OrderType }
  | { kind: "failed"; order: OrderType }
  | null;

const REFRESH_MS = 30_000;
const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;
const REASONS = ["Customer did not answer", "Wrong address", "Customer refused it"];
const DOOR_METHODS: DoorPayment["method"][] = ["CASH", "MOMO", "CARD"];
const METHOD_LABEL: Record<DoorPayment["method"], string> = { CASH: "Cash", MOMO: "MoMo", CARD: "Card" };

const rwf = (n: string | number | undefined) => `${Math.round(Number(n) || 0).toLocaleString()} RWF`;
const isPaid = (o: OrderType) => (o.status || "").toUpperCase() === "COMPLETED";
const riderName = (o: OrderType) => o.rider?.employee?.name ?? o.rider?.name ?? o.outsideRider ?? null;

const minutesSince = (iso?: string | null) =>
  iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000)) : 0;

function Tag({ label, tone }: { label: string; tone: "ink" | "lime" | "muted" | "danger" }) {
  const style = {
    ink: { pill: "bg-ink", fg: brand.lime },
    lime: { pill: "bg-lime/40", fg: brand.ink },
    muted: { pill: "bg-ivory border border-ink/10", fg: brand.inkMuted },
    danger: { pill: "bg-danger/10", fg: brand.danger },
  }[tone];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${style.pill}`}>
      <Text className="text-[11px] font-semibold" style={{ color: style.fg }}>
        {label}
      </Text>
    </View>
  );
}

function Button({
  label,
  icon,
  onPress,
  primary,
  danger,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-10 px-3.5 rounded-xl flex-row items-center justify-center ${
        primary
          ? "bg-lime active:bg-lime-dark"
          : danger
            ? "border border-red-200 active:bg-red-50"
            : "border border-ink/10 active:bg-ivory"
      }`}
      style={{ gap: 6 }}
    >
      <Ionicons name={icon} size={15} color={danger ? brand.danger : brand.ink} />
      <Text className="text-[13px] font-semibold" style={{ color: danger ? brand.danger : brand.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

function DeliveryCard({
  order,
  onAction,
  onPay,
}: {
  order: OrderType;
  onAction: (sheet: Exclude<Sheet, null>) => void;
  onPay: () => void;
}) {
  const status = order.deliveryStatus;
  const paid = isPaid(order);
  const who = riderName(order);
  const kitchen = (order.status || "").toUpperCase();
  const count = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-4" style={{ gap: 10 }}>
      <View className="flex-row items-start" style={{ gap: 12 }}>
        <View className="flex-1">
          <Text className="text-ink text-[15px] font-semibold">{order.customerName}</Text>
          <Text className="text-ink/60 text-[13px] mt-0.5">
            {order.deliveryAddress}
            {order.deliveryArea ? ` · ${order.deliveryArea}` : ""}
          </Text>
        </View>
        {order.customerPhone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
            accessibilityLabel={`${tr("Call")} ${order.customerName}`}
            className="h-10 px-3 rounded-xl border border-ink/10 flex-row items-center active:bg-ivory"
            style={{ gap: 6 }}
          >
            <Ionicons name="call-outline" size={15} color={brand.ink} />
            <Text className="text-ink text-[13px] font-semibold">{order.customerPhone}</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row flex-wrap items-center" style={{ gap: 6 }}>
        {status === "NOT_DELIVERED" ? (
          <Tag label={tr("Not delivered")} tone="danger" />
        ) : status === "DELIVERED" ? (
          <Tag label={tr("Delivered")} tone="ink" />
        ) : paid ? (
          <Tag label={tr("Paid")} tone="ink" />
        ) : order.payOnDelivery ? (
          <Tag label={`${tr("Collect")} ${rwf(order.total)} ${tr("at the door")}`} tone="lime" />
        ) : (
          <Tag label={tr("Not paid yet")} tone="danger" />
        )}
        {status === "WAITING" && (kitchen === "PREPARING" || kitchen === "PENDING" || kitchen === "READY") && order.items?.some((i) => i.product?.sendToKitchen) ? (
          <Tag label={kitchen === "READY" ? tr("Food ready") : tr("Kitchen is preparing")} tone="muted" />
        ) : null}
        {status === "ON_THE_WAY" && <Tag label={`${tr("On the way")} · ${minutesSince(order.sentAt)} min`} tone="muted" />}
      </View>

      <Text className="text-ink/50 text-xs">
        {count} {tr("items")} · {rwf(order.total)}
        {Number(order.deliveryFee) > 0 ? ` (${tr("fee")} ${rwf(order.deliveryFee)})` : ""}
        {who ? ` · ${tr("Taken by")} ${who}` : ` · ${tr("No rider yet")}`}
      </Text>
      {order.note ? <Text className="text-ink/60 text-xs">“{order.note}”</Text> : null}
      {order.deliveryProblem ? (
        <Text className="text-xs" style={{ color: brand.danger }}>
          {order.deliveryProblem}
        </Text>
      ) : null}

      {status === "WAITING" && (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {!paid && !order.payOnDelivery ? (
            <Button label={tr("Take payment")} icon="card-outline" onPress={onPay} primary />
          ) : (
            <Button label={tr("Send it")} icon="bicycle-outline" onPress={() => onAction({ kind: "send", order })} primary />
          )}
          <Button label={tr("Not delivered")} icon="close-circle-outline" onPress={() => onAction({ kind: "failed", order })} danger />
        </View>
      )}
      {status === "ON_THE_WAY" && (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          <Button label={tr("Delivered")} icon="checkmark-circle-outline" onPress={() => onAction({ kind: "delivered", order })} primary />
          <Button label={tr("Not delivered")} icon="close-circle-outline" onPress={() => onAction({ kind: "failed", order })} danger />
        </View>
      )}
    </View>
  );
}

// Asks the one thing each step needs: who takes it, how the customer paid, or
// what went wrong.
function ActionSheet({ sheet, onClose }: { sheet: Sheet; onClose: () => void }) {
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

  const run = async () => {
    if (!sheet || !order || busy) return;
    setBusy(true);
    try {
      if (sheet.kind === "send") {
        await send(order.id, riderId ? { riderId } : outside.trim() ? { outsideRider: outside.trim() } : {});
        Toast.show({ type: "success", text1: tr("On the way"), text2: order.customerName ?? undefined });
      } else if (sheet.kind === "delivered") {
        await delivered(order.id, needsMoney ? [{ method, amount: Number(order.total) }] : undefined);
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

  const ready =
    sheet?.kind === "failed" ? !!reason.trim() : sheet?.kind === "send" ? hasRider || !!riderId || !!outside.trim() : true;

  const title =
    sheet?.kind === "send" ? tr("Send it") : sheet?.kind === "delivered" ? tr("Delivered") : tr("Not delivered");

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
              {order?.customerName} · {order?.deliveryAddress}
            </Text>
          </View>

          {sheet?.kind === "send" &&
            (hasRider ? (
              <Text className="text-ink text-[14px]">
                {tr("Taken by")} {riderName(order!)}
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                <Text className="text-ink/60 text-[11px] font-semibold uppercase tracking-wider">{tr("Who takes it")}</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {riders.map((r) =>
                    chip(r.name, riderId === r.id, () => {
                      setRiderId(r.id);
                      setOutside("");
                    }),
                  )}
                </View>
                <View className="bg-ivory border border-ink/10 rounded-xl px-3.5">
                  <TextInput
                    value={outside}
                    onChangeText={(v) => {
                      setOutside(v);
                      if (v) setRiderId(null);
                    }}
                    placeholder={tr("Or an outside service, e.g. Moto – Eric 0788…")}
                    placeholderTextColor={brand.inkDisabled}
                    maxLength={100}
                    className="py-3 text-[15px] text-ink"
                    style={webNoOutline}
                  />
                </View>
                {riders.length === 0 && (
                  <Text className="text-ink/40 text-xs">
                    {tr("No riders yet. The owner can give a worker the \"Deliver orders\" permission.")}
                  </Text>
                )}
              </View>
            ))}

          {sheet?.kind === "delivered" &&
            (needsMoney ? (
              <View style={{ gap: 8 }}>
                <Text className="text-ink text-[14px]">
                  {tr("Collect")} <Text className="font-semibold">{rwf(order!.total)}</Text>. {tr("How did they pay?")}
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {DOOR_METHODS.map((m) => chip(tr(METHOD_LABEL[m]), method === m, () => setMethod(m)))}
                </View>
              </View>
            ) : (
              <Text className="text-ink text-[14px]">{tr("Already paid. The customer has it?")}</Text>
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
                    ? tr("Send it")
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

export default function Deliveries() {
  const router = useRouter();
  const { canAny } = usePermissions();
  const deliveries = useDelivery((s) => s.deliveries);
  const load = useDelivery((s) => s.load);
  const loadRiders = useDelivery((s) => s.loadRiders);
  const [tab, setTab] = useState<Tab>("waiting");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);

  const refresh = useCallback(async () => {
    try {
      await load();
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not load deliveries"), text2: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, [load]);

  // Fresh whenever the screen is open, and every 30 seconds while it stays open.
  useFocusEffect(
    useCallback(() => {
      refresh();
      if (canAny("deliveries.manage", "sales.create")) loadRiders().catch(() => {});
      const timer = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]),
  );

  const groups: Record<Tab, OrderType[]> = {
    waiting: deliveries.filter((d) => d.deliveryStatus === "WAITING"),
    onTheWay: deliveries.filter((d) => d.deliveryStatus === "ON_THE_WAY"),
    done: deliveries.filter((d) => d.deliveryStatus === "DELIVERED" || d.deliveryStatus === "NOT_DELIVERED"),
  };
  const collectedToday = groups.done
    .filter((d) => d.deliveryStatus === "DELIVERED" && d.payOnDelivery)
    .reduce((s, d) => s + Number(d.total || 0), 0);
  const toCollect = groups.onTheWay.filter((d) => !isPaid(d)).reduce((s, d) => s + Number(d.total || 0), 0);

  const TABS: { value: Tab; label: string }[] = [
    { value: "waiting", label: tr("To send") },
    { value: "onTheWay", label: tr("On the way") },
    { value: "done", label: tr("Done today") },
  ];

  const empty = {
    waiting: tr("Nothing waiting to go out."),
    onTheWay: tr("No deliveries on the road right now."),
    done: tr("No deliveries finished today yet."),
  }[tab];

  return (
    <SafeAreaView className="flex-1 bg-ivory" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
          />
        }
      >
        <View>
          <Text className="text-ink/40 text-[11px] font-semibold uppercase tracking-[2.4px]">{tr("Delivery")}</Text>
          <Text className="text-2xl font-semibold text-ink mt-1.5">{tr("Deliveries")}</Text>
          <Text className="text-ink/50 text-[13px] mt-1">
            {groups.onTheWay.length > 0
              ? `${groups.onTheWay.length} ${tr("on the way")}${toCollect > 0 ? ` · ${rwf(toCollect)} ${tr("still to collect")}` : ""}`
              : tr("Send orders out and mark them when the customer has them.")}
            {collectedToday > 0 ? ` · ${rwf(collectedToday)} ${tr("collected at doors today")}` : ""}
          </Text>
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {TABS.map((t) => {
            const on = tab === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => setTab(t.value)}
                accessibilityState={{ selected: on }}
                className={`h-10 flex-row items-center rounded-xl px-3.5 border ${
                  on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                }`}
                style={{ gap: 8 }}
              >
                <Text className={`text-[13px] font-semibold ${on ? "text-white" : "text-ink"}`}>{t.label}</Text>
                <Text className={`text-xs font-semibold ${on ? "text-lime" : "text-ink/35"}`}>{groups[t.value].length}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={brand.ink} />
          </View>
        ) : groups[tab].length === 0 ? (
          <View className="bg-white rounded-2xl border border-ink/5 py-12 items-center px-6">
            <Ionicons name="bicycle-outline" size={28} color={brand.inkDisabled} />
            <Text className="text-ink/60 text-[14px] mt-3 text-center">{empty}</Text>
          </View>
        ) : (
          groups[tab].map((order) => (
            <DeliveryCard
              key={order.id}
              order={order}
              onAction={setSheet}
              onPay={() =>
                router.push({ pathname: "/(tabs)/checkout/checkout", params: { orderId: order.id } })
              }
            />
          ))
        )}
      </ScrollView>
      <ActionSheet sheet={sheet} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}
