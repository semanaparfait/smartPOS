import { BrandMark, Eyebrow, Headline, Rise } from "@/components/brand";
import { brand, brandLogos } from "@/config/theme";
import useDeviceInfo, {
  type ActivationError,
} from "@/store/Device/useDeviceInfo";
import { fetchUniversalDeviceInfo } from "@/utils/device";
import { router } from "expo-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Headphones,
  KeyRound,
  Lock,
  Monitor,
  Rocket,
  Smartphone,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ActivationKeyProps = {
  onActivated?: () => void;
};

const CODE_LENGTH = 6;

const STEPS = [
  { icon: KeyRound, label: "Get your code from your admin" },
  { icon: Monitor, label: "Enter it on this terminal" },
  { icon: Rocket, label: "Start selling" },
];

// Turns the backend/network failure into a message staff can act on.
// Technical details stay in the console (see sendDeviceInfo / handleActivate).
function friendlyActivationError(
  error: ActivationError | null,
  screenError: string | null,
): string {
  if (screenError || !error) return "Activation failed. Please try again.";

  const message = error.message.toLowerCase();
  if (!error.status) {
    if (message.includes("payload")) {
      return "Couldn't read this device's details. Restart the app and try again.";
    }
    if (message.includes("api_url")) {
      return "This app isn't set up correctly. Please contact support.";
    }
    return "Can't reach SmartPOS. Check your internet connection.";
  }
  if (error.status === 404 || message.includes("company not found")) {
    return "No company matches this code. Check it with your admin.";
  }
  if (error.status === 409 || message.includes("duplicate")) {
    return "This device is already registered or waiting for approval. Ask your admin to approve it.";
  }
  if (error.status === 400) {
    return "Some device details are missing. Restart the app and try again.";
  }
  if (error.status >= 500) {
    return "SmartPOS is having a problem right now. Try again in a moment.";
  }
  return "Activation failed. Please try again.";
}

// Tracks the on-screen keyboard so the mobile layout can compact itself instead of scrolling.
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

export default function ActivationKey({ onActivated }: ActivationKeyProps) {
  const inputRef = useRef<TextInput>(null);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [deviceMeta, setDeviceMeta] = useState({
    deviceName: "Loading...",
    deviceOs: "Loading...",
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const { sendDeviceInfo, lastActivationError } = useDeviceInfo();
  // Unexpected exceptions thrown on this screen (not from the request itself).
  const [screenError, setScreenError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const compact = keyboardVisible && !isWide;

  useEffect(() => {
    const loadDeviceId = async () => {
      try {
        const info = await fetchUniversalDeviceInfo();
        setDeviceId(info.deviceId);
        setDeviceMeta({
          deviceName: info.deviceName,
          deviceOs: info.deviceOs,
        });
      } catch (error) {
        console.warn("Unable to load device ID.", error);
      }
    };

    loadDeviceId();
  }, []);

  const isFilled = value.length === CODE_LENGTH;
  const isLoading = status === "loading";
  const canSubmit = isFilled && !isLoading;

  const handleChange = (text: string) => {
    const cleaned = text
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, CODE_LENGTH);
    setValue(cleaned);
    if (status !== "idle") setStatus("idle");
  };

  const handleActivate = async () => {
    if (!canSubmit) return;
    setScreenError(null);
    setStatus("loading");
    try {
      const payload = {
        deviceId: deviceId,
        deviceName: deviceMeta.deviceName,
        deviceOs: deviceMeta.deviceOs,
        companyCode: value,
      };

      const registered = await sendDeviceInfo(payload);

      if (!registered) {
        // Full details for troubleshooting; the screen shows a friendly message.
        console.warn(
          "Activation failed:",
          useDeviceInfo.getState().lastActivationError,
        );
        setStatus("error");
        return;
      }

      setStatus("success");
      onActivated?.();
    } catch (error) {
      setScreenError(
        error instanceof Error ? error.message : String(error),
      );
      setStatus("error");
    }
  };

  const boxStyle = (index: number) => {
    const char = value[index];
    if (status === "error")
      return { box: "bg-red-50 border-red-400", text: "text-red-700" };
    if (status === "success")
      return { box: "bg-lime border-lime", text: "text-ink" };
    if (char) return { box: "bg-ink border-ink", text: "text-lime" };
    if (focused && index === value.length)
      return { box: "bg-white border-lime", text: "text-ink" };
    return { box: "bg-ivory border-ink/10", text: "text-ink" };
  };

  // ---------------- Pieces ----------------
  const deviceCard = (
    <View className="flex-row items-center gap-3 rounded-2xl bg-ivory p-3">
      <View className="w-11 h-11 rounded-xl bg-ink items-center justify-center">
        <Smartphone size={20} color={brand.lime} strokeWidth={2} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-ink text-sm font-bold">
          {deviceMeta.deviceName}
        </Text>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          className="text-ink/50 text-[11px] font-mono mt-0.5"
        >
          {deviceId ? `RW - ${deviceId} - POS` : "Detecting device..."}
        </Text>
      </View>
      {status === "success" ? (
        <View className="flex-row items-center gap-1.5 rounded-full bg-lime px-2.5 py-1">
          <View className="w-1.5 h-1.5 rounded-full bg-ink" />
          <Text className="text-ink text-[11px] font-bold">Active</Text>
        </View>
      ) : (
        <View className="flex-row items-center gap-1.5 rounded-full bg-white border border-ink/10 px-2.5 py-1">
          <View className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <Text className="text-ink/70 text-[11px] font-bold">Pending</Text>
        </View>
      )}
    </View>
  );

  const codeEntry = (
    <View>
      <View className="flex-row items-center justify-between mb-2.5">
        <Text className="text-ink/70 text-xs font-semibold">Company code</Text>
        <Text className="text-ink/40 text-xs font-semibold">
          {value.length}/{CODE_LENGTH}
        </Text>
      </View>

      <Pressable onPress={() => inputRef.current?.focus()}>
        <View className="flex-row gap-2">
          {Array.from({ length: CODE_LENGTH }).map((_, index) => {
            const char = value[index];
            const { box, text } = boxStyle(index);
            const isCaret =
              focused && !char && index === value.length && !isLoading;
            return (
              <View
                key={index}
                className={`flex-1 h-14 rounded-xl border-2 items-center justify-center ${box}`}
              >
                {char ? (
                  <Text className={`text-xl font-extrabold ${text}`}>
                    {char}
                  </Text>
                ) : isCaret ? (
                  <View className="w-0.5 h-6 bg-ink" />
                ) : null}
              </View>
            );
          })}
        </View>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={handleActivate}
          autoFocus={isWide}
          maxLength={CODE_LENGTH}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          caretHidden
          editable={!isLoading}
          returnKeyType="go"
          accessibilityLabel="Company code"
          className="absolute inset-0"
          style={{ opacity: 0, color: "transparent" }}
        />
      </Pressable>

      {/* Reserved line so the layout never shifts */}
      <View className="min-h-7 py-1.5 flex-row items-center gap-2">
        {status === "error" && (
          <>
            <AlertCircle size={14} color={brand.danger} />
            <Text className="text-red-600 text-xs font-medium flex-1">
              {friendlyActivationError(lastActivationError, screenError)}
            </Text>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 size={14} color={brand.success} />
            <Text className="text-green-700 text-xs font-medium">
              Device activated
            </Text>
          </>
        )}
      </View>

      <Pressable
        className={`h-14 rounded-xl flex-row items-center justify-center gap-2 ${
          canSubmit || isLoading ? "bg-lime active:bg-lime-dark" : "bg-lime/40"
        }`}
        onPress={handleActivate}
        disabled={!canSubmit}
      >
        {isLoading ? (
          <>
            <ActivityIndicator size="small" color={brand.ink} />
            <Text className="text-ink text-base font-bold">Verifying...</Text>
          </>
        ) : (
          <>
            <Text
              className={`text-base font-bold ${canSubmit ? "text-ink" : "text-ink/50"}`}
            >
              Activate device
            </Text>
            <ArrowRight
              size={18}
              color={canSubmit ? brand.ink : brand.inkDisabled}
              strokeWidth={2.5}
            />
          </>
        )}
      </Pressable>
    </View>
  );

  const supportLink = (
    <Pressable
      onPress={() => router.push("/ContactUs")}
      className="flex-row items-center justify-center gap-1.5 py-2 active:opacity-60"
    >
      <Text className="text-ink/50 text-sm">Don't have a code?</Text>
      <Text className="text-ink text-sm font-bold underline">
        Contact support
      </Text>
    </Pressable>
  );

  const cardShadow = {
    shadowColor: brand.ink,
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  };

  // ---------- Desktop / tablet ----------
  if (isWide) {
    return (
      <View className="flex-1 flex-row bg-ivory">
        <StatusBar barStyle="light-content" backgroundColor={brand.ink} />

        <View className="flex-1 bg-ink px-12 py-10 justify-between overflow-hidden">
          <View className="absolute -right-28 -bottom-32 opacity-[0.07]">
            <View style={{ transform: [{ rotate: "-12deg" }] }}>
              <BrandMark size={560} receipt={brand.lime} check={brand.ink} />
            </View>
          </View>
          <View className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full border border-white/5" />

          <Image
            source={brandLogos.dark}
            style={{ width: 150, height: 44 }}
            resizeMode="contain"
            accessibilityLabel="SmartPOS"
          />

          <View className="max-w-[520px]">
            <Rise>
              <Eyebrow tone="dark">Device setup</Eyebrow>
            </Rise>
            <Rise delay={80}>
              <View className="mt-6">
                <Headline
                  tone="dark"
                  lead="Activate"
                  mark="this terminal."
                  size={width >= 1100 ? 60 : 48}
                />
              </View>
            </Rise>

            <Rise delay={160}>
              <View className="mt-10 gap-3">
                {STEPS.map(({ icon: Icon, label }, i) => (
                  <View key={label} className="flex-row items-center gap-4">
                    <View className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 items-center justify-center">
                      <Icon size={18} color={brand.lime} strokeWidth={2} />
                    </View>
                    <Text className="text-white/40 text-xs font-bold">
                      0{i + 1}
                    </Text>
                    <Text className="text-white/85 text-base font-semibold">
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </Rise>
          </View>

          <View className="flex-row items-center gap-2">
            <Lock size={13} color="rgba(255,255,255,0.45)" />
            <Text className="text-white/45 text-xs">
              Secured by your organization's IT policy
            </Text>
          </View>
        </View>

        <View className="flex-1 items-center justify-center px-10">
          <View className="w-full max-w-[400px]">
            <Rise delay={120}>
              <Text className="text-ink text-3xl font-extrabold tracking-tight">
                Activate device
              </Text>
              <Text className="text-ink/60 text-base mt-2">
                Enter the 6-character code from your admin.
              </Text>
            </Rise>

            <Rise delay={200}>
              <View className="mt-8 rounded-3xl bg-white p-6 gap-6" style={cardShadow}>
                {deviceCard}
                {codeEntry}
              </View>
            </Rise>

            <View className="mt-5">{supportLink}</View>
          </View>
        </View>
      </View>
    );
  }

  // ---------- Mobile: fits one screen, no scrolling ----------
  return (
    <View className="flex-1 bg-ivory">
      <StatusBar barStyle="light-content" backgroundColor={brand.ink} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          className={`bg-ink rounded-b-[32px] px-6 overflow-hidden ${
            compact ? "pb-16" : "pb-20"
          }`}
          style={{ paddingTop: insets.top + (compact ? 12 : 20) }}
        >
          <View className="absolute -right-16 -bottom-20 opacity-[0.08]">
            <View style={{ transform: [{ rotate: "-12deg" }] }}>
              <BrandMark size={240} receipt={brand.lime} check={brand.ink} />
            </View>
          </View>

          <View className="flex-row items-center justify-between w-full max-w-[420px] self-center">
            <Image
              source={brandLogos.dark}
              style={{ width: 120, height: 35 }}
              resizeMode="contain"
              accessibilityLabel="SmartPOS"
            />
            <Pressable
              onPress={() => router.push("/ContactUs")}
              accessibilityLabel="Contact support"
              className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 items-center justify-center active:bg-white/20"
            >
              <Headphones size={18} color={brand.white} />
            </Pressable>
          </View>

          {!compact && (
            <Rise delay={60}>
              <View className="mt-8 w-full max-w-[420px] self-center">
                <Headline tone="dark" lead="Activate" mark="this device." size={34} />
                <Text className="text-white/60 text-base mt-3">
                  Enter the code from your admin to get started.
                </Text>
              </View>
            </Rise>
          )}
        </View>

        <View className="flex-1 px-5 -mt-14">
          <Rise delay={140}>
            <View
              className="w-full max-w-[420px] self-center rounded-3xl bg-white p-5 gap-5"
              style={cardShadow}
            >
              {!compact && deviceCard}
              {codeEntry}
            </View>
          </Rise>

          {!compact && (
            <View
              className="flex-1 justify-end items-center"
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              {supportLink}
              <View className="flex-row items-center gap-1.5 mt-1">
                <Lock size={11} color={brand.inkMuted} />
                <Text className="text-ink/40 text-[11px]">
                  Secured by your organization's IT policy
                </Text>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
