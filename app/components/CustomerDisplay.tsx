import { BrandMark, useClock } from "@/components/brand";
import { brand, brandLogos } from "@/config/theme";
import type { PublicCompany } from "@/store/Device/useDeviceInfo";
import type { DisplayCart, DisplayItem } from "@/store/Realtime/displayPreview";
import {
  onDeviceEvent,
  useDeviceSocketState,
} from "@/store/Realtime/useDeviceSocket";
import { secureUrl } from "@/utils/imageUrl";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Sent by the server for the till this display is paired with (never buying
// prices, staff or credit details).
interface DisplayOrder {
  items: DisplayItem[];
  subtotal: number;
  tax: number;
  total: number;
  payments?: { method: string; amount: number }[];
}

type CartEvent = { cart: DisplayCart; cashier?: string | null };
type OrderEvent = { order: DisplayOrder; cashier?: string | null };

interface Snapshot {
  state: "idle" | "cart" | "paying" | "paid";
  items: DisplayItem[];
  total: number;
  subtotal: number | null;
  tax: number | null;
  payment: { methods: string[]; paid: number; change: number } | null;
}

const IDLE: Snapshot = {
  state: "idle",
  items: [],
  total: 0,
  subtotal: null,
  tax: null,
  payment: null,
};

// How long "Thank you" stays up before going back to the welcome screen.
const PAID_SCREEN_MS = 10_000;
// The till's own cart (display.preview) is newer than the server's display.cart
// for this long after it arrives, while the till's saves catch up.
const PREVIEW_WINS_MS = 2_500;
// How long the "Just added" card stays.
const JUST_ADDED_MS = 4_000;

const money = (value: number) => `${Math.round(value).toLocaleString()} RWF`;
const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  MOMO: "MoMo",
  CARD: "Card",
  CREDIT: "Credit",
};
const ACCEPTED: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Cash", icon: "cash-outline" },
  { label: "MoMo", icon: "phone-portrait-outline" },
  { label: "Card", icon: "card-outline" },
];

const countItems = (items: DisplayItem[]) =>
  items.reduce((n, i) => n + (i.quantity || 0), 0);

const fromCart = (cart: DisplayCart): Snapshot =>
  cart.items?.length
    ? {
        ...IDLE,
        state: "cart",
        items: cart.items,
        total: Number(cart.total) || 0,
      }
    : IDLE;

const fromOrder = (order: DisplayOrder, state: "paying" | "paid"): Snapshot => {
  const total = Number(order.total) || 0;
  const paid = (order.payments ?? []).reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );
  return {
    state,
    items: order.items ?? [],
    total,
    subtotal: Number(order.subtotal) || null,
    tax: Number(order.tax) || null,
    payment:
      state === "paid"
        ? {
            methods: [...new Set((order.payments ?? []).map((p) => p.method))],
            paid,
            change: Math.max(0, paid - total),
          }
        : null,
  };
};

// The line whose quantity went up, if any (by name: the only stable key sent).
const findAdded = (before: DisplayItem[], after: DisplayItem[]) => {
  const old = new Map(before.map((i) => [i.name, i.quantity]));
  return after.find((i) => i.quantity > (old.get(i.name) ?? 0)) ?? null;
};

function Logo({
  company,
  size,
  onDark,
}: {
  company?: PublicCompany | null;
  size: number;
  onDark?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const uri = secureUrl(company?.logo ?? null);
  const radius = Math.round(size * 0.24);
  if (uri && !failed)
    return (
      <View
        className="bg-white items-center justify-center overflow-hidden"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      </View>
    );
  if (company?.name)
    return (
      <View
        className={`items-center justify-center ${onDark ? "bg-lime" : "bg-ink"}`}
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <Text
          style={{
            fontSize: size * 0.42,
            color: onDark ? brand.ink : brand.lime,
          }}
          className="font-semibold"
        >
          {company.name.trim().charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  return <BrandMark size={size} receipt={brand.lime} check={brand.ink} />;
}

function ProductImage({
  uri,
  name,
  size,
}: {
  uri: string | null;
  name: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const src = secureUrl(uri);
  return (
    <View
      className={`items-center justify-center overflow-hidden ${src && !failed ? "bg-white" : "bg-white/10"}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
      }}
    >
      {src && !failed ? (
        <Image
          source={{ uri: src }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          className="text-white/50 font-semibold"
          style={{ fontSize: size * 0.36 }}
        >
          {name.trim().charAt(0).toUpperCase() || "?"}
        </Text>
      )}
    </View>
  );
}

// A row that fades and slides in when it first appears.
function OrderRow({
  item,
  highlighted,
  first,
}: {
  item: DisplayItem;
  highlighted: boolean;
  first: boolean;
}) {
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [appear]);

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [
          {
            translateY: appear.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }}
      className={`flex-row items-center p-3 pr-5 rounded-2xl border ${
        highlighted
          ? "bg-lime/10 border-lime/50"
          : "bg-white/[0.04] border-white/[0.06]"
      } ${first ? "" : "mt-2.5"}`}
    >
      <ProductImage uri={item.image} name={item.name} size={64} />
      <View className="flex-1 ml-4 pr-3">
        <Text numberOfLines={1} className="text-white text-lg font-semibold">
          {item.name}
        </Text>
        <Text className="text-white/50 text-sm mt-0.5">
          {money(item.unitPrice)} each
        </Text>
      </View>
      <View
        className={`min-w-[44px] h-9 px-3 rounded-full items-center justify-center mr-5 ${highlighted ? "bg-lime" : "bg-white/10"}`}
      >
        <Text
          className={`text-base font-semibold ${highlighted ? "text-ink" : "text-white"}`}
        >
          ×{item.quantity}
        </Text>
      </View>
      <Text
        className={`text-lg font-semibold min-w-[110px] text-right ${highlighted ? "text-lime" : "text-white"}`}
      >
        {money(item.total)}
      </Text>
    </Animated.View>
  );
}

// The shop's MoMo Pay merchant code, with the code to dial (MTN Rwanda).
function MomoCard({
  code,
  payTo,
  compact,
}: {
  code: string;
  payTo?: string | null;
  compact?: boolean;
}) {
  return (
    <View className="bg-lime rounded-3xl p-5 overflow-hidden">
      <View className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-ink/5" />
      <View className="flex-row items-center">
        <View className="w-11 h-11 rounded-2xl bg-ink items-center justify-center">
          <Ionicons
            name="phone-portrait-outline"
            size={20}
            color={brand.lime}
          />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-ink/60 text-xs font-semibold uppercase tracking-[2px]">
            Pay with MoMo
          </Text>
          {!!payTo && (
            <Text numberOfLines={1} className="text-ink text-sm mt-0.5">
              To {payTo}
            </Text>
          )}
        </View>
      </View>
      <Text
        className="text-ink font-semibold tracking-[4px] mt-4"
        style={{ fontSize: compact ? 30 : 40 }}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {code}
      </Text>
      <View className="flex-row items-center self-start bg-ink/10 rounded-xl px-3 py-1.5 mt-2">
        <Ionicons name="keypad-outline" size={14} color={brand.ink} />
        <Text className="text-ink/80 text-sm font-semibold ml-1.5">
          Dial *182*8*1*{code}#
        </Text>
      </View>
    </View>
  );
}

// The worker signed in at the till; their name comes from the till itself.
function CashierCard({ name }: { name: string | null }) {
  return (
    <View className="flex-row items-center bg-white/5 border border-white/10 rounded-3xl px-4 py-3.5">
      <View className="w-11 h-11 rounded-full bg-lime/15 items-center justify-center">
        {name ? (
          <Text className="text-lime text-lg font-semibold">
            {name.trim().charAt(0).toUpperCase()}
          </Text>
        ) : (
          <Ionicons name="person-outline" size={20} color={brand.lime} />
        )}
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-white/50 text-xs font-semibold uppercase tracking-[2px]">
          Served by
        </Text>
        <Text
          numberOfLines={1}
          className={`text-lg font-semibold ${name ? "text-white" : "text-white/60"}`}
        >
          {name ?? "Your cashier"}
        </Text>
      </View>
      <Ionicons name="happy-outline" size={22} color={brand.lime} />
    </View>
  );
}

function Footer({ onDark }: { onDark?: boolean }) {
  const { time, date } = useClock();
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center">
        <Ionicons
          name="time-outline"
          size={16}
          color={onDark ? "rgba(255,255,255,0.5)" : brand.inkMuted}
        />
        <Text
          className={`text-sm ml-2 ${onDark ? "text-white/60" : "text-ink/50"}`}
        >
          {time} · {date}
        </Text>
      </View>
      <View className="flex-row items-center">
        <Text
          className={`text-xs mr-2 ${onDark ? "text-white/40" : "text-ink/40"}`}
        >
          Powered by
        </Text>
        <Image
          source={onDark ? brandLogos.dark : brandLogos.light}
          style={{ width: 92, height: 22 }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

function AcceptedPayments({ onDark }: { onDark?: boolean }) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {ACCEPTED.map((m) => (
        <View
          key={m.label}
          className={`flex-row items-center rounded-full px-3 py-1.5 ${onDark ? "bg-white/10" : "bg-white border border-ink/10"}`}
        >
          <Ionicons
            name={m.icon}
            size={14}
            color={onDark ? brand.lime : brand.ink}
          />
          <Text
            className={`text-sm ml-1.5 ${onDark ? "text-white/80" : "text-ink/70"}`}
          >
            {m.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Customer-facing screen: no one signs in. It shows the cart and payment of the
// till the owner paired it with, live over the device's own connection.
export default function CustomerDisplay({
  company,
  momoCode: initialMomoCode,
}: {
  company?: PublicCompany | null;
  momoCode?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [snapshot, setSnapshot] = useState<Snapshot>(IDLE);
  const [justAdded, setJustAdded] = useState<DisplayItem | null>(null);
  const [cashier, setCashier] = useState<string | null>(null);
  const connected = useDeviceSocketState((s) => s.connected);
  const known = useDeviceSocketState((s) => s.known);
  const paired = useDeviceSocketState((s) => !!s.displayForId);
  const liveMomoCode = useDeviceSocketState((s) => s.momoCode);
  const current = useRef<Snapshot>(IDLE);
  const previewAt = useRef(0);
  const paidTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const list = useRef<ScrollView>(null);
  const tick = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const show = (next: Snapshot) => {
      if (paidTimer.current) clearTimeout(paidTimer.current);
      const added =
        next.state === "cart"
          ? findAdded(current.current.items, next.items)
          : null;
      if (added) {
        setJustAdded(added);
        if (addedTimer.current) clearTimeout(addedTimer.current);
        addedTimer.current = setTimeout(
          () => setJustAdded(null),
          JUST_ADDED_MS,
        );
      }
      if (next.state !== "cart") setJustAdded(null);
      current.current = next;
      setSnapshot(next);
      if (next.state === "paid") {
        tick.setValue(0);
        Animated.spring(tick, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }).start();
        paidTimer.current = setTimeout(() => show(IDLE), PAID_SCREEN_MS);
      }
    };
    // An empty cart only clears a sale still being built, never one being paid.
    const showCart = (cart: DisplayCart) => {
      const next = fromCart(cart);
      if (next.state === "idle" && current.current.state !== "cart") return;
      show(next);
    };

    // Any display event may say who is serving at the till.
    const served = (payload: { cashier?: string | null }) => {
      if (payload?.cashier) setCashier(payload.cashier);
    };

    const stops = [
      onDeviceEvent<CartEvent>("display.preview", (payload) => {
        previewAt.current = Date.now();
        served(payload);
        showCart(payload.cart);
      }),
      onDeviceEvent<CartEvent>("display.cart", (payload) => {
        served(payload);
        if (Date.now() - previewAt.current < PREVIEW_WINS_MS) return;
        showCart(payload.cart);
      }),
      onDeviceEvent<OrderEvent>("display.order", (payload) => {
        served(payload);
        show(fromOrder(payload.order, "paying"));
      }),
      onDeviceEvent<OrderEvent>("display.paid", (payload) => {
        served(payload);
        show(fromOrder(payload.order, "paid"));
      }),
      onDeviceEvent("display.cleared", () => show(IDLE)),
    ];
    return () => {
      stops.forEach((stop) => stop());
      if (paidTimer.current) clearTimeout(paidTimer.current);
      if (addedTimer.current) clearTimeout(addedTimer.current);
    };
  }, [tick]);

  // Keep the newest line in view.
  useEffect(() => {
    if (justAdded)
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
  }, [justAdded, snapshot.items.length]);

  const { state } = snapshot;
  const wide = width >= 900 && width > height * 0.9;
  const name = company?.name || "Welcome";
  // DESIGN PREVIEW: "000000" until the backend sends the shop's real code.
  // The server's live value once connected, the one from verify before that.
  const momoCode = (known ? liveMomoCode : initialMomoCode) || null;
  const notice = !connected
    ? "Reconnecting…"
    : known && !paired
      ? "Not paired with a till yet. The owner can choose one on the device page."
      : null;
  const pad = {
    paddingTop: insets.top + 28,
    paddingBottom: insets.bottom + 24,
    paddingHorizontal: 36,
  };

  const noticeBar = notice && (
    <View className="absolute self-center bottom-6 flex-row items-center bg-ink/90 rounded-full px-4 py-2">
      <Ionicons
        name={
          connected ? "information-circle-outline" : "cloud-offline-outline"
        }
        size={15}
        color={brand.lime}
      />
      <Text className="text-white/80 text-xs ml-2">{notice}</Text>
    </View>
  );

  // ---------- Welcome ----------
  if (state === "idle") {
    return (
      <View className="flex-1 bg-ink overflow-hidden" style={pad}>
        <StatusBar hidden />
        <View
          className="absolute -right-28 -bottom-32 opacity-[0.06]"
          style={{ transform: [{ rotate: "-12deg" }] }}
        >
          <BrandMark size={460} receipt={brand.lime} check={brand.ink} />
        </View>
        <View className="absolute -top-44 -left-44 w-[460px] h-[460px] rounded-full border border-white/5" />

        <View className="flex-1 items-center justify-center">
          <Logo company={company} size={132} onDark />
          <Text className="text-lime text-sm font-semibold uppercase tracking-[4px] mt-8">
            Welcome to
          </Text>
          <Text
            className="text-white text-5xl font-semibold text-center mt-2"
            numberOfLines={2}
          >
            {name}
          </Text>
          {(company?.location || company?.type) && (
            <View className="flex-row items-center mt-3">
              <Ionicons
                name="location-outline"
                size={16}
                color="rgba(255,255,255,0.5)"
              />
              <Text className="text-white/50 text-base ml-1.5">
                {[
                  company?.location,
                  company?.type &&
                    company.type.charAt(0) +
                      company.type.slice(1).toLowerCase(),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
          )}
          <Text className="text-white/60 text-lg text-center mt-8">
            Your items and total will appear here.
          </Text>
          <View className="mt-6">
            <AcceptedPayments onDark />
          </View>
        </View>
        <Footer onDark />
        {noticeBar}
      </View>
    );
  }

  // ---------- Thank you ----------
  if (state === "paid") {
    const scale = tick.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
    });
    return (
      <View className="flex-1 bg-ink overflow-hidden" style={pad}>
        <StatusBar hidden />
        <View className="absolute -top-44 -right-44 w-[520px] h-[520px] rounded-full bg-lime/5" />
        <View className="flex-1 items-center justify-center">
          <Animated.View
            style={{ opacity: tick, transform: [{ scale }] }}
            className="w-28 h-28 rounded-full bg-lime items-center justify-center"
          >
            <Ionicons name="checkmark" size={64} color={brand.ink} />
          </Animated.View>
          <Text className="text-white text-5xl font-semibold text-center mt-8">
            Thank you!
          </Text>
          <Text className="text-white/60 text-xl text-center mt-3">
            Paid {money(snapshot.payment?.paid || snapshot.total)}
            {snapshot.payment?.methods.length
              ? ` · ${snapshot.payment.methods.map((m) => METHOD_LABEL[m] ?? m).join(" + ")}`
              : ""}
          </Text>
          {!!snapshot.payment?.change && (
            <View className="mt-8 bg-lime rounded-3xl px-10 py-5 items-center">
              <Text className="text-ink/60 text-sm font-semibold uppercase tracking-[2px]">
                Your change
              </Text>
              <Text className="text-ink text-4xl font-semibold mt-1">
                {money(snapshot.payment.change)}
              </Text>
            </View>
          )}
          <Text className="text-white/50 text-lg text-center mt-8">
            {company?.name
              ? `See you again soon at ${company.name}.`
              : "See you again soon."}
          </Text>
        </View>
        <Footer onDark />
      </View>
    );
  }

  // ---------- Sale in progress ----------
  const count = countItems(snapshot.items);
  const paying = state === "paying";

  const orderPanel = (
    <View
      className="flex-1 bg-ink overflow-hidden"
      style={wide ? pad : { ...pad, paddingBottom: 16 }}
    >
      <View className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full border border-white/5" />
      <View className="flex-row items-center pb-5 mb-5 border-b border-white/10">
        <Logo company={company} size={52} onDark />
        <View className="flex-1 ml-4">
          <Text numberOfLines={1} className="text-white text-xl font-semibold">
            {company?.name ?? "Your order"}
          </Text>
          <Text className="text-white/50 text-sm mt-0.5">
            {paying ? "Please check your order" : "Your order"}
          </Text>
        </View>
        <View className="flex-row items-center bg-lime/15 rounded-full px-3.5 py-1.5">
          <Ionicons name="bag-handle-outline" size={15} color={brand.lime} />
          <Text className="text-lime text-sm font-semibold ml-1.5">
            {count} item{count === 1 ? "" : "s"}
          </Text>
        </View>
      </View>
      <ScrollView
        ref={list}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {snapshot.items.map((item, i) => (
          <OrderRow
            key={item.name}
            item={item}
            first={i === 0}
            highlighted={!paying && justAdded?.name === item.name}
          />
        ))}
      </ScrollView>
      {wide && (
        <View className="mt-5">
          <Footer onDark />
        </View>
      )}
    </View>
  );

  const totalPanel = (
    <View
      className={`bg-white/[0.04] justify-between ${wide ? "border-l" : "border-t"} border-white/10`}
      style={
        wide
          ? { ...pad, width: Math.min(520, width * 0.38) }
          : {
              paddingHorizontal: 36,
              paddingVertical: 24,
              paddingBottom: insets.bottom + 24,
            }
      }
    >
      <View className={wide ? "" : "mb-5"} style={{ gap: 12 }}>
        {momoCode ? (
          <MomoCard code={momoCode} payTo={company?.name} compact={!wide} />
        ) : (
          wide && (
            <View className="bg-white/5 border border-white/10 rounded-3xl p-5">
              <Text className="text-white/50 text-xs font-semibold uppercase tracking-[2px]">
                We accept
              </Text>
              <View className="mt-3">
                <AcceptedPayments onDark />
              </View>
            </View>
          )
        )}
        <CashierCard name={cashier} />
      </View>

      <View>
        {paying && snapshot.subtotal !== null && snapshot.tax ? (
          <View className="mb-4" style={{ gap: 6 }}>
            <View className="flex-row justify-between">
              <Text className="text-white/50 text-base">Subtotal</Text>
              <Text className="text-white/80 text-base">
                {money(snapshot.subtotal)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-white/50 text-base">Tax</Text>
              <Text className="text-white/80 text-base">
                {money(snapshot.tax)}
              </Text>
            </View>
            <View className="h-px bg-white/10 mt-2" />
          </View>
        ) : null}
        <Text className="text-white/50 text-sm font-semibold uppercase tracking-[2px]">
          {paying ? "Total to pay" : "Total"}
        </Text>
        <Text
          className="text-lime font-semibold mt-1"
          style={{ fontSize: wide ? 60 : 44 }}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {money(snapshot.total)}
        </Text>
        <View className="flex-row items-center mt-4 bg-white/5 rounded-2xl px-4 py-3">
          <Ionicons
            name={paying ? "card-outline" : "scan-outline"}
            size={18}
            color={brand.lime}
          />
          <Text className="text-white/80 text-base ml-2.5 flex-1">
            {paying
              ? "Please pay at the counter."
              : "Items appear here as they are added."}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View className={`flex-1 ${wide ? "flex-row" : ""} bg-ink`}>
      <StatusBar hidden />
      {orderPanel}
      {totalPanel}
      {noticeBar}
    </View>
  );
}
