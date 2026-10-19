import { BrandMark, Eyebrow, Headline, Rise } from "@/components/brand";
import { Field } from "@/components/brand/Field";
import { brand, brandLogos } from "@/config/theme";
import { fetchUniversalDeviceInfo } from "@/utils/device";
import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Send,
  User,
  type LucideIcon,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const SUPPORT = {
  phone: "0787845162",
  whatsapp: "250787845162",
  email: "support@smartpos.rw",
  address: "KN 5 Rd, Kigali",
  hours: "Mon – Sat · 8:00 – 18:00",
};

const TOPICS = ["Activation code", "Technical issue", "Billing", "Other"];

const CHANNELS: {
  key: "call" | "whatsapp" | "email";
  icon: LucideIcon;
  label: string;
  value: string;
}[] = [
  { key: "call", icon: Phone, label: "Call", value: SUPPORT.phone },
  { key: "whatsapp", icon: MessageCircle, label: "WhatsApp", value: "Fastest reply" },
  { key: "email", icon: Mail, label: "Email", value: SUPPORT.email },
];

// Support hours: Monday–Saturday, 08:00–18:00 local time.
const isSupportOpen = (now = new Date()) => {
  const day = now.getDay();
  const hour = now.getHours();
  return day !== 0 && hour >= 8 && hour < 18;
};

const openUrl = async (url: string, fallbackMessage: string) => {
  try {
    await Linking.openURL(url);
  } catch {
    Toast.show({ type: "error", text1: "Can't open app", text2: fallbackMessage });
  }
};

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/");
};

export default function ContactUs() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [focusedField, setFocusedField] = useState<
    "name" | "phone" | "message" | null
  >(null);
  const [submitted, setSubmitted] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [open, setOpen] = useState(isSupportOpen());

  useEffect(() => {
    fetchUniversalDeviceInfo()
      .then(({ deviceId: id }) => setDeviceId(id))
      .catch(() => setDeviceId(null));
    const timer = setInterval(() => setOpen(isSupportOpen()), 60000);
    return () => clearInterval(timer);
  }, []);

  const attachDevice = topic === "Activation code" && !!deviceId;

  const composeMessage = () =>
    [
      `Hello SmartPOS support,`,
      ``,
      `Topic: ${topic}`,
      `Name: ${name.trim()}`,
      phone.trim() ? `Phone: ${phone.trim()}` : null,
      attachDevice ? `Device ID: RW - ${deviceId} - POS` : null,
      ``,
      message.trim(),
    ]
      .filter((line) => line !== null)
      .join("\n");

  const openChannel = (key: "call" | "whatsapp" | "email") => {
    if (key === "call") {
      openUrl(`tel:${SUPPORT.phone}`, `Call us on ${SUPPORT.phone}.`);
    } else if (key === "whatsapp") {
      openUrl(
        `https://wa.me/${SUPPORT.whatsapp}`,
        `Message us on WhatsApp at ${SUPPORT.phone}.`,
      );
    } else {
      openUrl(`mailto:${SUPPORT.email}`, `Email us at ${SUPPORT.email}.`);
    }
  };

  const validate = () => {
    setSubmitted(true);
    return !!name.trim() && !!message.trim();
  };

  const sendWhatsApp = () => {
    if (!validate()) return;
    openUrl(
      `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(composeMessage())}`,
      `Message us on WhatsApp at ${SUPPORT.phone}.`,
    );
  };

  const sendEmail = () => {
    if (!validate()) return;
    openUrl(
      `mailto:${SUPPORT.email}?subject=${encodeURIComponent(
        `SmartPOS · ${topic}`,
      )}&body=${encodeURIComponent(composeMessage())}`,
      `Email us at ${SUPPORT.email}.`,
    );
  };

  // ---------------- Pieces ----------------
  const statusPill = (
    <View className="self-start flex-row items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5">
      <View
        className={`w-2 h-2 rounded-full ${open ? "bg-lime" : "bg-white/40"}`}
      />
      <Text className="text-white/80 text-xs font-semibold">
        {open ? "Support is online" : "Closed · back at 8:00"}
      </Text>
    </View>
  );

  const backButton = (
    <Pressable
      onPress={goBack}
      accessibilityLabel="Go back"
      className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 items-center justify-center active:bg-white/20"
    >
      <ArrowLeft size={18} color={brand.white} />
    </Pressable>
  );

  const channelTiles = (
    <View className="flex-row gap-2.5">
      {CHANNELS.map(({ key, icon: Icon, label }) => (
        <Pressable
          key={key}
          onPress={() => openChannel(key)}
          className="flex-1 items-center rounded-2xl bg-ivory py-4 active:bg-ink/10"
        >
          <View
            className={`w-11 h-11 rounded-xl items-center justify-center ${
              key === "whatsapp" ? "bg-lime" : "bg-ink"
            }`}
          >
            <Icon
              size={20}
              color={key === "whatsapp" ? brand.ink : brand.lime}
              strokeWidth={2}
            />
          </View>
          <Text className="text-ink text-sm font-bold mt-2.5">{label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const infoRows = (tone: "light" | "dark") => {
    const iconColor = tone === "dark" ? brand.lime : brand.ink;
    const text = tone === "dark" ? "text-white/80" : "text-ink/70";
    return (
      <View className="gap-3">
        <View className="flex-row items-center gap-3">
          <Clock size={16} color={iconColor} />
          <Text className={`${text} text-sm`}>{SUPPORT.hours}</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <MapPin size={16} color={iconColor} />
          <Text className={`${text} text-sm`}>{SUPPORT.address}</Text>
        </View>
      </View>
    );
  };

  const form = (
    <View className="gap-4">
      <View>
        <Text className="text-xs font-semibold mb-2 text-ink/70">Topic</Text>
        <View className="flex-row flex-wrap gap-2">
          {TOPICS.map((t) => {
            const active = t === topic;
            return (
              <Pressable
                key={t}
                onPress={() => setTopic(t)}
                className={`rounded-full px-3.5 py-2 border ${
                  active
                    ? "bg-ink border-ink"
                    : "bg-white border-ink/15 active:bg-ivory"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? "text-lime" : "text-ink/70"
                  }`}
                >
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className={isWide ? "flex-row gap-3" : "gap-4"}>
        <View className={isWide ? "flex-1" : ""}>
          <Field
            label="Your name"
            icon={User}
            focused={focusedField === "name"}
            error={submitted && !name.trim() ? "Enter your name" : undefined}
            placeholder="Full name"
            autoComplete="name"
            value={name}
            onChangeText={setName}
            onFocus={() => setFocusedField("name")}
            onBlur={() => setFocusedField(null)}
          />
        </View>
        <View className={isWide ? "flex-1" : ""}>
          <Field
            label="Phone (optional)"
            icon={Phone}
            focused={focusedField === "phone"}
            placeholder="07X XXX XXXX"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
            onFocus={() => setFocusedField("phone")}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      <Field
        label="Message"
        icon={MessageSquareText}
        focused={focusedField === "message"}
        error={submitted && !message.trim() ? "Write a short message" : undefined}
        placeholder="How can we help?"
        multiline
        value={message}
        onChangeText={setMessage}
        onFocus={() => setFocusedField("message")}
        onBlur={() => setFocusedField(null)}
      />

      {attachDevice && (
        <View className="flex-row items-center gap-2">
          <View className="w-4 h-4 rounded-full bg-lime items-center justify-center">
            <Check size={10} color={brand.ink} strokeWidth={3} />
          </View>
          <Text className="text-ink/60 text-xs">
            Your device ID will be included
          </Text>
        </View>
      )}

      <View className={isWide ? "flex-row gap-3 mt-1" : "gap-3 mt-1"}>
        <Pressable
          onPress={sendWhatsApp}
          className={`h-14 rounded-xl bg-lime active:bg-lime-dark flex-row items-center justify-center gap-2 ${
            isWide ? "flex-[1.4]" : ""
          }`}
        >
          <Send size={17} color={brand.ink} strokeWidth={2.25} />
          <Text className="text-ink text-base font-bold">Send on WhatsApp</Text>
        </Pressable>
        <Pressable
          onPress={sendEmail}
          className={`h-14 rounded-xl border border-ink/20 flex-row items-center justify-center gap-2 active:bg-ivory ${
            isWide ? "flex-1" : ""
          }`}
        >
          <Mail size={17} color={brand.ink} />
          <Text className="text-ink text-base font-bold">Send by email</Text>
        </Pressable>
      </View>
    </View>
  );

  const cardShadow = {
    shadowColor: brand.ink,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  };

  // ---------- Desktop / tablet ----------
  if (isWide) {
    return (
      <View className="flex-1 flex-row bg-ivory">
        <StatusBar barStyle="light-content" backgroundColor={brand.ink} />

        <View className="w-[42%] bg-ink px-12 py-10 justify-between overflow-hidden">
          <View className="absolute -right-28 -bottom-32 opacity-[0.07]">
            <View style={{ transform: [{ rotate: "-12deg" }] }}>
              <BrandMark size={520} receipt={brand.lime} check={brand.ink} />
            </View>
          </View>

          <View className="flex-row items-center gap-4">
            {backButton}
            <Image
              source={brandLogos.dark}
              style={{ width: 140, height: 41 }}
              resizeMode="contain"
              accessibilityLabel="SmartPOS"
            />
          </View>

          <View>
            <Rise>
              <Eyebrow tone="dark">Support</Eyebrow>
            </Rise>
            <Rise delay={80}>
              <View className="mt-6">
                <Headline
                  tone="dark"
                  lead="How can we"
                  mark="help you?"
                  size={width >= 1200 ? 56 : 46}
                />
              </View>
            </Rise>
            <Rise delay={160}>
              <View className="mt-6">{statusPill}</View>
            </Rise>

            <Rise delay={240}>
              <View className="mt-10 gap-2.5">
                {CHANNELS.map(({ key, icon: Icon, label, value }) => (
                  <Pressable
                    key={key}
                    onPress={() => openChannel(key)}
                    className="flex-row items-center gap-4 rounded-2xl bg-white/5 border border-white/10 p-3.5 active:bg-white/10"
                  >
                    <View className="w-11 h-11 rounded-xl bg-lime items-center justify-center">
                      <Icon size={20} color={brand.ink} strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-base font-bold">{label}</Text>
                      <Text className="text-white/50 text-sm">{value}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </Rise>
          </View>

          {infoRows("dark")}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center items-center px-12 py-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-[560px]">
            <Rise delay={120}>
              <Text className="text-ink text-3xl font-extrabold tracking-tight">
                Send us a message
              </Text>
              <Text className="text-ink/60 text-base mt-2">
                We usually reply within a few hours.
              </Text>
            </Rise>
            <Rise delay={200}>
              <View className="mt-8 rounded-3xl bg-white p-6" style={cardShadow}>
                {form}
              </View>
            </Rise>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------- Mobile ----------
  return (
    <View className="flex-1 bg-ivory">
      <StatusBar barStyle="light-content" backgroundColor={brand.ink} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            className="bg-ink rounded-b-[32px] px-6 pb-20 overflow-hidden"
            style={{ paddingTop: insets.top + 16 }}
          >
            <View className="absolute -right-16 -bottom-20 opacity-[0.08]">
              <View style={{ transform: [{ rotate: "-12deg" }] }}>
                <BrandMark size={240} receipt={brand.lime} check={brand.ink} />
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              {backButton}
              <Image
                source={brandLogos.dark}
                style={{ width: 110, height: 32 }}
                resizeMode="contain"
                accessibilityLabel="SmartPOS"
              />
            </View>

            <Rise delay={60}>
              <View className="mt-8">
                <Headline tone="dark" lead="How can we" mark="help you?" size={32} />
                <View className="mt-4">{statusPill}</View>
              </View>
            </Rise>
          </View>

          <View className="px-5 -mt-12 gap-4">
            <Rise delay={120}>
              <View className="rounded-3xl bg-white p-4" style={cardShadow}>
                {channelTiles}
              </View>
            </Rise>

            <Rise delay={180}>
              <View className="rounded-3xl bg-white p-5" style={cardShadow}>
                <Text className="text-ink text-lg font-extrabold tracking-tight mb-4">
                  Send a message
                </Text>
                {form}
              </View>
            </Rise>

            <View className="rounded-2xl bg-white border border-ink/5 p-4">
              {infoRows("light")}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
