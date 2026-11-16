// Proof that a delivery reached the right person: the customer's code, where the
// rider was, and the messages that carry the code to the customer.
import { brand } from "@/config/theme";
import { tr, type Language } from "@/i18n";
import type { OrderType } from "@/store/Order/OrderType";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";

export type NotifyBy = "WHATSAPP" | "SMS";
export type Position = { lat: number; lng: number; accuracy: number | null };

// ---------------------------------------------------------------- phone numbers

// "0788 123 456", "+250788123456" and "788123456" all become "250788123456".
export function intlPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("250")) return digits;
  if (digits.length === 10 && digits.startsWith("0")) return `250${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `250${digits}`;
  return digits;
}

// ---------------------------------------------------------------- remembered per customer

// How each customer likes to get the code, kept on this device by phone number.
const PREFS_KEY = "smartpos.customerPrefs.v1";
export type CustomerPrefs = { notifyBy: NotifyBy; language: Language };

async function readPrefs(): Promise<Record<string, CustomerPrefs>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(PREFS_KEY)) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export async function prefsFor(phone: string): Promise<CustomerPrefs | null> {
  const key = intlPhone(phone);
  if (key.length < 9) return null;
  return (await readPrefs())[key] ?? null;
}

export async function rememberPrefs(phone: string, prefs: CustomerPrefs) {
  const key = intlPhone(phone);
  if (key.length < 9) return;
  try {
    const all = await readPrefs();
    all[key] = prefs;
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(all));
  } catch {
    // Only a convenience: the till just asks again next time.
  }
}

// ---------------------------------------------------------------- the customer's message

type Parts = { full: string; short: string; pay: string; payShort: string; link: string };

// {shop} {name} {code} {phone} {amount} {url}. Kinyarwanda, French and Swahili
// need a check by a native speaker before going live.
const MESSAGES: Record<Language, Parts> = {
  en: {
    full: "{shop}: Hello {name}, your order is on its way. Your delivery code is {code}. Give it to the rider only when your order is in your hands, never by phone.{pay} {link}Problem? Call {phone}.",
    short: "{shop}: Order on the way. Code {code}. Give it to the rider only when you have your order, never by phone.{pay} Help: {phone}",
    pay: " Please pay {amount} RWF at the door.",
    payShort: " Pay {amount} RWF at the door.",
    link: "Your code and QR: {url} ",
  },
  rw: {
    full: "{shop}: Muraho {name}, komande yawe iri mu nzira. Kode yawe ni {code}. Uyihe umumotari ari uko wakiriye komande yawe gusa, ntuyitange kuri telefone.{pay} {link}Ikibazo? Hamagara {phone}.",
    short: "{shop}: Komande iri mu nzira. Kode {code}. Uyihe umumotari wamaze kwakira komande gusa, si kuri telefone.{pay} Ubufasha: {phone}",
    pay: " Uzishyura {amount} RWF uyakiriye.",
    payShort: " Kwishyura: {amount} RWF.",
    link: "Reba kode na QR: {url} ",
  },
  fr: {
    full: "{shop} : Bonjour {name}, votre commande est en route. Votre code de livraison est {code}. Donnez-le au livreur seulement quand vous avez la commande en main, jamais par téléphone.{pay} {link}Un problème ? Appelez le {phone}.",
    short: "{shop}: Commande en route. Code {code}. Donnez-le au livreur seulement quand vous avez la commande, jamais par telephone.{pay} Aide: {phone}",
    pay: " À payer à la livraison : {amount} RWF.",
    payShort: " A payer: {amount} RWF.",
    link: "Votre code et QR : {url} ",
  },
  sw: {
    full: "{shop}: Habari {name}, oda yako iko njiani. Namba yako ya uthibitisho ni {code}. Mpe msafirishaji tu ukiwa umepokea oda yako, kamwe usiitoe kwa simu.{pay} {link}Tatizo? Piga {phone}.",
    short: "{shop}: Oda iko njiani. Namba {code}. Mpe msafirishaji ukiwa umepokea oda tu, si kwa simu.{pay} Msaada: {phone}",
    pay: " Utalipa {amount} RWF ukipokea.",
    payShort: " Lipa {amount} RWF.",
    link: "Ona namba na QR: {url} ",
  },
};

const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));

// Letters like é make an SMS hold 70 characters instead of 160, so SMS go plain.
const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function customerMessage(
  order: OrderType,
  shop: { name?: string | null; phone?: string | null },
  via: NotifyBy,
): string {
  const lang = (order.customerLanguage ?? "rw") as Language;
  const parts = MESSAGES[lang] ?? MESSAGES.en;
  const toCollect = order.payOnDelivery && (order.status || "").toUpperCase() !== "COMPLETED";
  const amount = Math.round(Number(order.total) || 0).toLocaleString("en-US");
  const values = {
    shop: shop.name?.trim() || "SmartPOS",
    name: order.customerName?.trim().split(" ")[0] || "",
    code: order.deliveryCode ?? "",
    phone: shop.phone?.trim() || "",
    amount,
    url: order.deliveryTrackUrl ?? "",
  };
  if (via === "SMS") {
    const pay = toCollect ? fill(parts.payShort, values) : "";
    return plain(fill(parts.short, { ...values, pay }));
  }
  const pay = toCollect ? fill(parts.pay, values) : "";
  const link = order.deliveryTrackUrl ? fill(parts.link, values) : "";
  return fill(parts.full, { ...values, pay, link }).replace(/\s{2,}/g, " ");
}

// Only a phone or tablet can send SMS (and only with a SIM that has SMS credit).
export const canSendSms = () => Platform.OS === "android" || Platform.OS === "ios";

// Opens WhatsApp, or the phone's own SMS app, with the message ready to send.
// Both are free for the shop: staff only tap Send.
export async function openCustomerMessage(phone: string, text: string, via: NotifyBy) {
  // A computer or browser has no SIM: the SMS link opens nothing (or an app
  // that can't send), so say so instead of looking sent.
  if (via === "SMS" && !canSendSms()) throw new Error("no-sms");
  const to = intlPhone(phone);
  const body = encodeURIComponent(text);
  const url =
    via === "WHATSAPP"
      ? `https://wa.me/${to}?text=${body}`
      : `sms:+${to}${Platform.OS === "ios" ? "&" : "?"}body=${body}`;
  await Linking.openURL(url);
}

// ---------------------------------------------------------------- where the rider is

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

// The rider's position, or null when location is off, refused, or this build
// doesn't have it yet (an update reached a device built before expo-location).
export async function getPosition(): Promise<Position | null> {
  try {
    const Location = await import("expo-location");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const fix = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      12_000,
    );
    const pos = fix ?? (await Location.getLastKnownPositionAsync());
    if (!pos) return null;
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- the QR on the customer's phone

// The customer's page shows a QR holding "SPD1:<orderId>:<code>". A plain code
// works too, so a hand-typed or other-app QR still goes through.
export function readScannedCode(data: string, orderId: string): { code: string } | { error: string } {
  const text = data.trim();
  const tagged = text.match(/^SPD1:([^:]+):(\d{4,8})$/);
  if (tagged) {
    return tagged[1] === orderId ? { code: tagged[2] } : { error: tr("This QR is for a different order.") };
  }
  const fromLink = text.match(/[?&]code=(\d{4,8})/);
  if (fromLink) return { code: fromLink[1] };
  if (/^\d{4,8}$/.test(text)) return { code: text };
  return { error: tr("This QR is not a delivery code.") };
}

// ---------------------------------------------------------------- what the owner sees

export type ProofTag = { label: string; pill: string; fg: string; icon: "shield-checkmark" | "alert-circle" | "location-outline" | "camera-outline" };

const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

// Done = ink pill with lime text; problems = danger; things to note = ivory.
export function proofTags(order: OrderType): ProofTag[] {
  const proof = order.deliveryProof;
  if (!proof) return [];
  const flags = proof.flags ?? [];
  const tags: ProofTag[] = [];
  if (proof.method === "NO_CODE") {
    tags.push({ label: tr("No code · check it"), pill: "bg-danger/10", fg: brand.danger, icon: "alert-circle" });
  } else {
    tags.push({
      label: proof.method === "QR" ? tr("QR confirmed") : tr("Code confirmed"),
      pill: "bg-ink",
      fg: brand.lime,
      icon: "shield-checkmark",
    });
  }
  if (flags.includes("AWAY")) {
    tags.push({
      label: proof.distanceM != null ? `${tr("Confirmed")} ${km(proof.distanceM)} ${tr("from the address")}` : tr("Confirmed away from the address"),
      pill: "bg-danger/10",
      fg: brand.danger,
      icon: "location-outline",
    });
  }
  if (flags.includes("NO_GPS")) {
    tags.push({ label: tr("No location"), pill: "bg-ivory border border-ink/10", fg: brand.ink, icon: "location-outline" });
  }
  if (proof.photoUrl) {
    tags.push({ label: tr("Photo"), pill: "bg-ivory border border-ink/10", fg: brand.ink, icon: "camera-outline" });
  }
  return tags;
}

// Needs the owner's eye: no code, or confirmed far from where it should be.
export const needsCheck = (order: OrderType) =>
  !!order.deliveryProof && (order.deliveryProof.method === "NO_CODE" || !!order.deliveryProof.flags?.includes("AWAY"));
