import { ActionSheet, isPaid, riderName, rwf, type Sheet } from "@/components/delivery/DeliveryActionSheet";
import RiderBoard from "@/components/delivery/RiderBoard";
import { formatTime } from "@/components/orders/orderKit";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useAuth from "@/store/Authentication/useAuth";
import usePermissions from "@/store/Authentication/usePermissions";
import useDelivery from "@/store/Delivery/useDelivery";
import type { OrderType } from "@/store/Order/OrderType";
import { canSendSms, customerMessage, openCustomerMessage, proofTags, type NotifyBy } from "@/utils/deliveryProof";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type Tab = "waiting" | "onTheWay" | "done";

const REFRESH_MS = 30_000;


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

const CHANNEL_LABEL: Record<NotifyBy, string> = { WHATSAPP: "WhatsApp", SMS: "SMS" };

// The customer's code and the one tap that sends it. WhatsApp and SMS open on
// this phone with the message ready, so sending costs the shop nothing.
function CodeBox({ order }: { order: OrderType }) {
  const company = useAuth((s) => s.profile?.company);
  const codeSent = useDelivery((s) => s.codeSent);
  const sendCode = useDelivery((s) => s.sendCode);
  const [busy, setBusy] = useState(false);
  const preferred: NotifyBy = order.notifyBy ?? "WHATSAPP";
  const other: NotifyBy = preferred === "WHATSAPP" ? "SMS" : "WHATSAPP";

  // By hand: WhatsApp, or this phone's own SMS app, opens with the message ready.
  const openMessage = async (via: NotifyBy) => {
    const text = customerMessage(order, { name: company?.name, phone: company?.phone_number }, via);
    try {
      await openCustomerMessage(order.customerPhone!, text, via);
    } catch {
      Toast.show({
        type: "error",
        text1: via === "WHATSAPP" ? tr("Could not open WhatsApp") : tr("Could not open SMS"),
        text2: via === "SMS" ? tr("Send it on WhatsApp, or read the code to the customer.") : undefined,
      });
      return;
    }
    // Recorded when the message opens ready to go; staff still press Send in it.
    codeSent(order.id, via).catch(() => {});
    Toast.show({
      type: "info",
      text1: tr("Press Send in the message"),
      text2: via === "SMS" ? tr("The SMS goes from this phone's SIM card.") : undefined,
    });
  };

  const sendVia = async (via: NotifyBy) => {
    if (!order.customerPhone || busy) return;
    setBusy(true);
    try {
      if (via === "SMS") {
        // The server sends the SMS itself when it has an SMS provider.
        try {
          await sendCode(order.id);
          Toast.show({ type: "success", text1: tr("Code sent by SMS"), text2: order.customerPhone });
          return;
        } catch (error) {
          if ((error as { status?: number }).status !== 503) {
            Toast.show({ type: "error", text1: tr("Could not send the SMS"), text2: (error as Error).message });
            return;
          }
          // No SMS on the server: from this phone, if it can.
          if (!canSendSms()) {
            Toast.show({
              type: "error",
              text1: tr("SMS is not set up yet"),
              text2: tr("Send it on WhatsApp, or read the code to the customer."),
            });
            return;
          }
        }
      }
      await openMessage(via);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="bg-ivory rounded-xl p-3 flex-row flex-wrap items-center" style={{ gap: 12 }}>
      <View className="w-10 h-10 rounded-xl bg-ink items-center justify-center">
        <Ionicons name="key-outline" size={18} color={brand.lime} />
      </View>
      <View className="flex-1 min-w-[140px]">
        <Text className="text-ink/50 text-[11px]">{tr("Customer's delivery code")}</Text>
        <Text className="text-ink text-[18px] font-semibold" style={{ letterSpacing: 3 }}>
          {order.deliveryCode}
        </Text>
        <Text className="text-ink/50 text-[11px]">
          {order.codeSentAt
            ? `${tr("Sent")} · ${order.notifyBy === "SMS" ? "SMS" : "WhatsApp"} · ${formatTime(order.codeSentAt)}`
            : order.customerPhone
              ? tr("Not sent yet")
              : tr("No phone number: give it to the customer when they order.")}
        </Text>
      </View>
      {order.customerPhone ? (
        <View className="items-end" style={{ gap: 4 }}>
          <Button
            label={`${order.codeSentAt ? tr("Send again") : tr("Send on")} ${CHANNEL_LABEL[preferred]}`}
            icon={preferred === "WHATSAPP" ? "logo-whatsapp" : "chatbubble-outline"}
            onPress={() => sendVia(preferred)}
            primary={!order.codeSentAt}
          />
          {other ? (
            <Pressable onPress={() => sendVia(other)} className="py-1">
              <Text className="text-ink/60 text-[12px] underline">
                {tr("Use")} {CHANNEL_LABEL[other]}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ProofTags({ order }: { order: OrderType }) {
  const tags = proofTags(order);
  if (!tags.length) return null;
  return (
    <View className="flex-row flex-wrap" style={{ gap: 6 }}>
      {tags.map((tag, i) => (
        <View key={i} className={`flex-row items-center self-start rounded-full px-2.5 py-1 ${tag.pill}`} style={{ gap: 4 }}>
          <Ionicons name={tag.icon} size={12} color={tag.fg} />
          <Text className="text-[11px] font-semibold" style={{ color: tag.fg }}>
            {tag.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DeliveryCard({
  order,
  hasRiders,
  onAction,
  onPay,
}: {
  order: OrderType;
  hasRiders: boolean;
  onAction: (sheet: Exclude<Sheet, null>) => void;
  onPay: () => void;
}) {
  const status = order.deliveryStatus;
  const paid = isPaid(order);
  const who = riderName(order);
  const kitchen = (order.status || "").toUpperCase();
  const fromKitchen = !!order.items?.some((i) => i.product?.sendToKitchen);
  // Paid orders keep the kitchen's step separately.
  const cooking = paid ? !!order.kitchenStatus : kitchen === "PENDING" || kitchen === "PREPARING";
  const count = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <View className="bg-white rounded-2xl border border-ink/5 p-4" style={{ gap: 10 }}>
      <View className="flex-row items-start" style={{ gap: 12 }}>
        <View className="flex-1">
          <Text className="text-ink text-[15px] font-semibold">{order.customerName}</Text>
          {order.deliveryAddress || order.deliveryArea ? (
            <Text className="text-ink/60 text-[13px] mt-0.5">
              {[order.deliveryAddress, order.deliveryArea].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
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
        {status === "WAITING" && fromKitchen ? (
          <Tag label={cooking ? tr("Kitchen is preparing") : tr("Food ready")} tone="muted" />
        ) : null}
        {status === "ON_THE_WAY" && <Tag label={`${tr("On the way")} · ${minutesSince(order.sentAt)} min`} tone="muted" />}
      </View>

      <Text className="text-ink/50 text-xs">
        {count} {tr("items")} · {rwf(order.total)}
        {Number(order.deliveryFee) > 0 ? ` (${tr("fee")} ${rwf(order.deliveryFee)})` : ""}
        {who ? ` · ${tr("Taken by")} ${who}` : ""}
      </Text>
      {order.note ? <Text className="text-ink/60 text-xs">“{order.note}”</Text> : null}
      {order.deliveryProblem ? (
        <Text className="text-xs" style={{ color: brand.danger }}>
          {order.deliveryProblem}
        </Text>
      ) : null}

      {status === "DELIVERED" ? <ProofTags order={order} /> : null}
      {order.deliveryCodeRequired && order.deliveryCode && (status === "WAITING" || status === "ON_THE_WAY") ? (
        <CodeBox order={order} />
      ) : null}

      {status === "WAITING" && (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {!paid && !order.payOnDelivery ? (
            <Button label={tr("Take payment")} icon="card-outline" onPress={onPay} primary />
          ) : (
            <>
              <Button label={tr("Delivered")} icon="checkmark-circle-outline" onPress={() => onAction({ kind: "delivered", order })} primary />
              {hasRiders && (
                <Button label={tr("On the way")} icon="bicycle-outline" onPress={() => onAction({ kind: "send", order })} />
              )}
            </>
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

// Riders of a shop with its own riders get their own board: open jobs to pick,
// and theirs to carry.
export default function Deliveries() {
  const { can, isOwner, enforced } = usePermissions();
  const hasRiders = useAuth((s) => !!s.profile?.company?.deliveryRiders);
  if (hasRiders && !isOwner && enforced && can("deliveries.ride")) return <RiderBoard />;
  return <ShopDeliveries />;
}

function ShopDeliveries() {
  const router = useRouter();
  const { canAny } = usePermissions();
  const deliveries = useDelivery((s) => s.deliveries);
  const load = useDelivery((s) => s.load);
  const loadRiders = useDelivery((s) => s.loadRiders);
  const hasRiders = useAuth((s) => !!s.profile?.company?.deliveryRiders);
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
      if (hasRiders && canAny("deliveries.manage", "sales.create")) loadRiders().catch(() => {});
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
              hasRiders={hasRiders}
              onAction={setSheet}
              onPay={() =>
                router.push({ pathname: "/(till)/till/checkout/checkout", params: { orderId: order.id } })
              }
            />
          ))
        )}
      </ScrollView>
      <ActionSheet sheet={sheet} hasRiders={hasRiders} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}
