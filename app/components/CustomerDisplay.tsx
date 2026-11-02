import { BrandMark, useClock } from "@/components/brand";
import { brand } from "@/config/theme";
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
import { tr } from "@/i18n";

// Sent by the server for the till this display is paired with (never buying
// prices, staff or credit details).
interface DisplayOrder {
  id?: string;
  items: DisplayItem[];
  subtotal: number;
  tax: number;
  total: number;
  payments?: { method: string; amount: number }[];
}

// Only display.preview carries the picture; the other events leave it as it is.
type Served = { cashier?: string | null; cashierImage?: string | null };
type CartEvent = Served & { cart: DisplayCart };
type OrderEvent = Served & { order: DisplayOrder };

interface Snapshot {
  state: "idle" | "cart" | "paying" | "paid";
  // The code printed on the receipt; null until the cart becomes an order.
  order: string | null;
  items: DisplayItem[];
  total: number;
  subtotal: number | null;
  tax: number | null;
  payment: { methods: string[]; paid: number; change: number } | null;
}

const IDLE: Snapshot = {
  state: "idle",
  order: null,
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
// Below this the order table drops its Price column so names stay readable.
const FULL_TABLE_MIN_WIDTH = 600;
// Shared by the table header and rows so the columns line up.
const QTY_COLUMN = { width: 64 };
const PRICE_COLUMN = { width: 110 };
const TOTAL_COLUMN = { width: 120 };

const amount = (value: number) => Math.round(value).toLocaleString();
const money = (value: number) => `${amount(value)} RWF`;
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
    order: order.id?.split("-")[0].toUpperCase() ?? null,
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
      className="items-center justify-center overflow-hidden bg-ivory"
      style={{ width: size, height: size, borderRadius: size / 2 }}
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
          className="text-ink/50 font-semibold"
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
  showPrice,
}: {
  item: DisplayItem;
  highlighted: boolean;
  first: boolean;
  showPrice: boolean;
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
    >
      <View
        className={`flex-row items-center px-5 py-3 ${
          highlighted ? "bg-lime/30" : "bg-white"
        } ${first ? "" : "border-t border-ink/10"}`}
      >
        <ProductImage uri={item.image} name={item.name} size={56} />
        <Text
          numberOfLines={1}
          className="flex-1 ml-4 pr-3 text-ink text-lg font-semibold"
        >
          {item.name}
        </Text>
        <Text
          className="text-ink text-lg font-medium text-center"
          style={QTY_COLUMN}
        >
          {item.quantity}
        </Text>
        {showPrice && (
          <Text
            className="text-ink text-lg font-medium text-right"
            style={PRICE_COLUMN}
          >
            {amount(item.unitPrice)}
          </Text>
        )}
        <Text
          className="text-ink text-lg font-semibold text-right"
          style={TOTAL_COLUMN}
        >
          {amount(item.total)}
        </Text>
      </View>
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
          <Text className="text-ink/60 text-xs font-semibold uppercase tracking-[2px]">{tr("Pay with MoMo")}</Text>
          {!!payTo && (
            <Text numberOfLines={1} className="text-ink text-sm mt-0.5">{tr("To")} {payTo}
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
        <Text className="text-ink/80 text-sm font-semibold ml-1.5">{tr("Dial *182*8*1*")}{code}#
        </Text>
      </View>
    </View>
  );
}

// The worker signed in at the till; their name comes from the till itself.
function CashierCard({
  name,
  image,
}: {
  name: string | null;
  image: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const uri = secureUrl(image);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View className="flex-row items-center bg-white/5 border border-white/10 rounded-3xl px-4 py-3.5">
      <View className="w-11 h-11 rounded-full bg-lime/15 items-center justify-center overflow-hidden">
        {uri && !failed ? (
          <Image
            source={{ uri }}
            style={{ width: 44, height: 44 }}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        ) : name ? (
          <Text className="text-lime text-lg font-semibold">
            {name.trim().charAt(0).toUpperCase()}
          </Text>
        ) : (
          <Ionicons name="person-outline" size={20} color={brand.lime} />
        )}
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-white/50 text-xs font-semibold uppercase tracking-[2px]">{tr("Served by")}</Text>
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

function FooterItem({
  icon,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center">
      <Ionicons name={icon} size={24} color={brand.white} />
      <Text
        numberOfLines={1}
        className="text-white text-lg font-semibold ml-3"
      >
        {children}
      </Text>
    </View>
  );
}

const FooterDivider = () => <View className="w-px h-8 bg-white/20 mx-6" />;

// The slanted lime end of the top and bottom bars. `top` / `bottom` reach past
// the safe area so it runs to the edge of the screen.
function LimeSlant({ top = 0, bottom = 0 }: { top?: number; bottom?: number }) {
  return (
    <View
      className="absolute bg-lime"
      style={{
        top,
        bottom,
        left: -20,
        right: -40,
        transform: [{ skewX: "-24deg" }],
      }}
    />
  );
}

// `order`: the order's code, null for a sale with no order yet, left out to show
// no order at all.
function Footer({ order }: { order?: string | null }) {
  const { time, date } = useClock();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View
      className="flex-row bg-ink-soft overflow-hidden"
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="flex-1 flex-row items-center  py-5 gap-4 px-10 ">
        {order !== undefined && (
          <>
            <FooterItem icon="receipt-outline">
              {order ? (
                <>{tr("Order")} <Text className="text-lime ">#{order}</Text>
                </>
              ) : (
                "New order"
              )}
            </FooterItem>
            <FooterDivider />
          </>
        )}
        {width >= FULL_TABLE_MIN_WIDTH && (
          <>
            <FooterItem icon="calendar-outline">{date}</FooterItem>
            <FooterDivider />
          </>
        )}
        <FooterItem icon="time-outline">{time}</FooterItem>
      </View>
      <View className="flex-row items-center px-10">
        <LimeSlant bottom={-insets.bottom} />
        <Text className="text-ink text-sm">{tr("Powered by")} </Text>
        <Text className="text-ink text-lg font-semibold">{tr("SmartPOS")}</Text>
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
  const [cashierImage, setCashierImage] = useState<string | null>(null);
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
    const served = (payload: Served) => {
      if (payload?.cashier) setCashier(payload.cashier);
      if (payload?.cashierImage !== undefined)
        setCashierImage(payload.cashierImage);
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
    paddingBottom: 24,
    paddingHorizontal: 36,
  };

  // Every screen ends with the same full-width bar.
  const withFooter = (screen: React.ReactNode, order?: string | null) => (
    <View className="flex-1 bg-ink">
      <StatusBar hidden />
      {screen}
      <Footer order={order} />
    </View>
  );

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
    return withFooter(
      <View className="flex-1 overflow-hidden" style={pad}>
        <View
          className="absolute -right-28 -bottom-32 opacity-[0.06]"
          style={{ transform: [{ rotate: "-12deg" }] }}
        >
          <BrandMark size={460} receipt={brand.lime} check={brand.ink} />
        </View>
        <View className="absolute -top-44 -left-44 w-[460px] h-[460px] rounded-full border border-white/5" />

        <View className="flex-1 items-center justify-center">
          <Logo company={company} size={132} onDark />
          <Text className="text-lime text-sm font-semibold uppercase tracking-[4px] mt-8">{tr("Welcome to")}</Text>
          <Text
            className="text-white text-5xl font-semibold text-center mt-2"
            numberOfLines={2}
          >
            {name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}
            
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
          <Text className="text-white/60 text-lg text-center mt-8">{tr("Your items and total will appear here.")}</Text>
          <View className="mt-6">
            <AcceptedPayments onDark />
          </View>
        </View>
        {noticeBar}
      </View>,
    );
  }

  // ---------- Thank you ----------
  if (state === "paid") {
    const scale = tick.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
    });
    return withFooter(
      <View className="flex-1 overflow-hidden" style={pad}>
        <View className="absolute -top-44 -right-44 w-[520px] h-[520px] rounded-full bg-lime/5" />
        <View className="flex-1 items-center justify-center">
          <Animated.View style={{ opacity: tick, transform: [{ scale }] }}>
            <View className="w-28 h-28 rounded-full bg-lime items-center justify-center">
              <Ionicons name="checkmark" size={64} color={brand.ink} />
            </View>
          </Animated.View>
          <Text className="text-white text-5xl font-semibold text-center mt-8">{tr("Thank you!")}</Text>
          <Text className="text-white/60 text-xl text-center mt-3">{tr("Paid")} {money(snapshot.payment?.paid || snapshot.total)}
            {snapshot.payment?.methods.length
              ? ` · ${snapshot.payment.methods.map((m) => METHOD_LABEL[m] ?? m).join(" + ")}`
              : ""}
          </Text>
          {!!snapshot.payment?.change && (
            <View className="mt-8 bg-lime rounded-3xl px-10 py-5 items-center">
              <Text className="text-ink/60 text-sm font-semibold uppercase tracking-[2px]">{tr("Your change")}</Text>
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
      </View>,
      snapshot.order,
    );
  }

  // ---------- Sale in progress ----------
  const count = countItems(snapshot.items);
  const paying = state === "paying";
  const showPrice = width >= FULL_TABLE_MIN_WIDTH;

  const orderPanel = (
    <View
      className="flex-1 bg-ink overflow-hidden"
      style={{ ...pad, paddingTop: 24, paddingBottom: wide ? 24 : 16 }}
    >
      <View className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full border border-white/5" />
      <View className="flex-1">
        <View className="bg-white rounded-2xl overflow-hidden flex-shrink">
          <View className="flex-row items-center bg-ink-soft px-5 py-3.5">
            <Text className="flex-1 text-white text-base font-semibold">{tr("Item")}</Text>
            <Text
              className="text-white text-base font-semibold text-center"
              style={QTY_COLUMN}
            >{tr("Qty")}</Text>
            {showPrice && (
              <Text
                className="text-white text-base font-semibold text-right"
                style={PRICE_COLUMN}
              >{tr("Price")}</Text>
            )}
            <Text
              className="text-white text-base font-semibold text-right"
              style={TOTAL_COLUMN}
            >{tr("Total")}</Text>
          </View>
          <ScrollView
            ref={list}
            style={{ flexGrow: 0 }}
            showsVerticalScrollIndicator={false}
          >
            {snapshot.items.map((item, i) => (
              <OrderRow
                key={item.name}
                item={item}
                first={i === 0}
                showPrice={showPrice}
                highlighted={!paying && justAdded?.name === item.name}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );

  const totalPanel = (
    <View
      className={`bg-white/[0.04] justify-between ${wide ? "border-l" : "border-t"} border-white/10`}
      style={
        wide
          ? { ...pad, paddingTop: 24, width: Math.min(520, width * 0.38) }
          : {
              paddingHorizontal: 36,
              paddingVertical: 24,
            }
      }
    >
      <View className={wide ? "" : "mb-5"} style={{ gap: 12 }}>
        {momoCode ? (
          <MomoCard code={momoCode} payTo={company?.name} compact={!wide} />
        ) : (
          wide && (
            <View className="bg-white/5 border border-white/10 rounded-3xl p-5">
              <Text className="text-white/50 text-xs font-semibold uppercase tracking-[2px]">{tr("We accept")}</Text>
              <View className="mt-3">
                <AcceptedPayments onDark />
              </View>
            </View>
          )
        )}
        <CashierCard name={cashier} image={cashierImage} />
      </View>

      <View>
        {paying && snapshot.subtotal !== null && snapshot.tax ? (
          <View className="mb-4" style={{ gap: 6 }}>
            <View className="flex-row justify-between">
              <Text className="text-white/50 text-base">{tr("Subtotal")}</Text>
              <Text className="text-white/80 text-base">
                {money(snapshot.subtotal)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-white/50 text-base">{tr("Tax")}</Text>
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

  return withFooter(
    <>
      <View
        className="flex-row bg-ink-soft overflow-hidden"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-1 flex-row items-center  py-3.5 px-10">
          <Logo company={company} size={48} onDark />
          <View className="flex-1 ml-4">
            <Text
              numberOfLines={1}
              className="text-white text-xl font-semibold"
            >
              {company?.name ?? "Your order"}
            </Text>
            <Text numberOfLines={1} className="text-white/60 text-sm mt-0.5">
              {paying ? "Please check your order" : "Your order"}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center px-10">
          <LimeSlant top={-insets.top} />
          <Ionicons name="bag-handle-outline" size={22} color={brand.ink} />
          <Text className="text-ink text-lg font-semibold ml-2.5">
            {count} {tr("item")}{count === 1 ? "" : "s"}
          </Text>
        </View>
      </View>
      <View className={`flex-1 ${wide ? "flex-row" : ""}`}>
        {orderPanel}
        {totalPanel}
        {noticeBar}
      </View>
    </>,
    snapshot.order,
  );
}
