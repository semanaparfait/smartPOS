import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Check,
  Delete,
  Eye,
  EyeOff,
  Keyboard,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { Field } from "@/components/brand/Field";
import DeviceSecretPrompt from "@/components/devices/DeviceSecretPrompt";
import {
  BrandMark,
  Eyebrow,
  Headline,
  Rise,
  useClock,
} from "@/components/brand";
import { brand, brandLogos } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import { fetchUniversalDeviceInfo } from "@/utils/device";

const MAX_PIN = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const Key = ({
  onPress,
  onLongPress,
  disabled,
  ghost,
  children,
  accessibilityLabel,
}: {
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  ghost?: boolean;
  children: React.ReactNode;
  accessibilityLabel?: string;
}) => (
  <Pressable
    onPress={onPress}
    onLongPress={onLongPress}
    disabled={disabled}
    accessibilityLabel={accessibilityLabel}
    className={`w-[31%] h-16 rounded-xl items-center justify-center ${
      ghost ? "active:bg-ink/5" : "bg-ivory active:bg-ink/10"
    }`}
  >
    {children}
  </Pressable>
);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(
    null,
  );
  const [signingIn, setSigningIn] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const { login, pinLogin } = useAuth();

  const router = useRouter();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const pinInputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const insets = useSafeAreaInsets();
  const clock = useClock();

  useEffect(() => {
    fetchUniversalDeviceInfo()
      .then(({ deviceId: resolvedDeviceId }) => setDeviceId(resolvedDeviceId))
      .catch((error) => console.error("Failed to resolve device ID:", error));
  }, []);

  const goToHome = (role: string) => {
    if (role === "admin" || role === "OWNER") {
      router.replace("/(owner)/dashboard");
    } else {
      router.replace("/(tabs)/products/products");
    }
  };

  // -------- PIN Verification -----------
  const verifyPin = async (submittedPin: string) => {
    if (!deviceId) return;

    setVerifying(true);
    try {
      const userProfile = await pinLogin(submittedPin, deviceId);

      if (!userProfile) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPinError(true);
        setPin("");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goToHome(userProfile.role);
    } catch (error) {
      console.error("PIN login error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPinError(true);
      setPin("");
    } finally {
      setVerifying(false);
    }
  };

  const handlePress = (val: string) => {
    if (verifying) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPinError(false);
    setPin((prev) => (prev.length >= MAX_PIN ? prev : prev + val));
  };

  const handleBackspace = () => {
    if (verifying) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (verifying) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setPinError(false);
    setPin("");
  };

  // Hardware keyboard on native: hidden input mirrors the PIN.
  const handlePinTyped = (text: string) => {
    if (verifying) return;
    setPinError(false);
    setPin(text.replace(/\D/g, "").slice(0, MAX_PIN));
  };

  // Keyboard on web / desktop.
  useEffect(() => {
    if (Platform.OS !== "web" || isEmailLogin) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) handlePress(e.key);
      else if (e.key === "Backspace") handleBackspace();
      else if (e.key === "Escape") handleClear();
      else return;
      e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEmailLogin, verifying]);

  useEffect(() => {
    if (pin.length === MAX_PIN && !isEmailLogin) {
      const timer = setTimeout(() => verifyPin(pin), 150);
      return () => clearTimeout(timer);
    }
  }, [pin, isEmailLogin]);

  // -------- Email & Password Verification -----------
  const handleEmailLogin = async () => {
    if (signingIn) return;

    if (!deviceId) {
      Toast.show({
        type: "error",
        text1: "Device ID unavailable",
        text2: "Please wait a moment and try again.",
      });
      return;
    }

    setSubmitted(true);
    if (!password || !EMAIL_PATTERN.test(email.trim())) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setAuthError(null);
    setSigningIn(true);
    try {
      const userProfile = await login(deviceId, email.trim(), password);
      if (!userProfile) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAuthError("Incorrect email or password");
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Toast.show({
        type: "success",
        text1: "Login Successful",
        text2: "Welcome back!",
      });
      goToHome(userProfile.role);
    } catch (error) {
      console.log("Login error:", error);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setAuthError("Couldn't sign in. Check your connection and try again.");
    } finally {
      setSigningIn(false);
    }
  };

  const switchMode = (toEmail: boolean) => {
    if (toEmail === isEmailLogin) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEmailLogin(toEmail);
    setPin("");
    setPinError(false);
    setSubmitted(false);
    setEmailTouched(false);
    setAuthError(null);
  };

  const dotClass = (index: number) => {
    if (pinError) return "bg-red-500 border-red-500";
    if (index < pin.length) return "bg-ink border-ink";
    return "bg-transparent border-ink/20";
  };

  // ---------------- UI ----------------
  const pinPanel = (
    <View>
      <Pressable
        onPress={() => pinInputRef.current?.focus()}
        className="h-16 flex-row items-center justify-center gap-4"
      >
        {verifying ? (
          <ActivityIndicator color={brand.ink} />
        ) : (
          Array.from({ length: MAX_PIN }).map((_, i) => (
            <View
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 ${dotClass(i)}`}
            />
          ))
        )}
      </Pressable>

      <Text
        className={`text-center text-xs font-medium -mt-1 ${
          pinError ? "text-red-600" : "text-transparent"
        }`}
      >
        Incorrect PIN, try again
      </Text>

      {Platform.OS !== "web" && (
        <TextInput
          ref={pinInputRef}
          value={pin}
          onChangeText={handlePinTyped}
          onSubmitEditing={() => pin.length === MAX_PIN && verifyPin(pin)}
          showSoftInputOnFocus={false}
          keyboardType="number-pad"
          maxLength={MAX_PIN}
          caretHidden
          autoFocus
          blurOnSubmit={false}
          editable={!verifying}
          accessibilityLabel="PIN"
          style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
        />
      )}

      <View className="flex-row flex-wrap justify-between gap-y-3 mt-4">
        {KEYS.map((n) => (
          <Key key={n} onPress={() => handlePress(n)} disabled={verifying}>
            <Text className="text-ink text-2xl font-semibold">{n}</Text>
          </Key>
        ))}
        <Key ghost onPress={handleClear} disabled={verifying}>
          <Text className="text-ink/50 text-xs font-bold uppercase tracking-[1.5px]">
            Clear
          </Text>
        </Key>
        <Key onPress={() => handlePress("0")} disabled={verifying}>
          <Text className="text-ink text-2xl font-semibold">0</Text>
        </Key>
        <Key
          ghost
          onPress={handleBackspace}
          onLongPress={handleClear}
          disabled={verifying}
          accessibilityLabel="Delete"
        >
          <Delete size={24} color={brand.ink} strokeWidth={1.75} />
        </Key>
      </View>
    </View>
  );

  const emailLooksValid = EMAIL_PATTERN.test(email.trim());
  const emailError =
    submitted && !email.trim()
      ? "Enter your email"
      : (submitted || emailTouched) && email.trim() && !emailLooksValid
        ? "Enter a valid email"
        : undefined;
  const passwordError =
    submitted && !password ? "Enter your password" : undefined;
  const canSignIn = !!email.trim() && !!password && !signingIn;

  const emailPanel = (
    <View className="flex-1 justify-between gap-5">
      <View className="gap-4">
        <View className="flex-row items-center gap-3 mb-1">
          <View className="w-11 h-11 rounded-full bg-ink items-center justify-center">
            <UserRound size={20} color={brand.lime} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-ink text-base font-bold">Staff account</Text>
            <Text className="text-ink/50 text-xs">Owners & managers</Text>
          </View>
        </View>

        {authError && (
          <View className="flex-row items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-3.5 py-3">
            <AlertCircle size={16} color={brand.danger} />
            <Text className="text-red-700 text-sm font-medium flex-1">
              {authError}
            </Text>
          </View>
        )}

        <Field
          label="Email address"
          icon={Mail}
          focused={focusedField === "email"}
          error={emailError}
          placeholder="name@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          blurOnSubmit={false}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setAuthError(null);
          }}
          onSubmitEditing={() => passwordRef.current?.focus()}
          onFocus={() => setFocusedField("email")}
          onBlur={() => {
            setFocusedField(null);
            if (email.trim()) setEmailTouched(true);
          }}
          right={
            emailLooksValid ? (
              <View className="w-5 h-5 rounded-full bg-green-600 items-center justify-center">
                <Check size={12} color={brand.white} strokeWidth={3} />
              </View>
            ) : null
          }
        />

        <Field
          ref={passwordRef}
          label="Password"
          icon={Lock}
          focused={focusedField === "password"}
          error={passwordError}
          placeholder="Enter your password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setAuthError(null);
          }}
          onSubmitEditing={handleEmailLogin}
          onFocus={() => setFocusedField("password")}
          onBlur={() => setFocusedField(null)}
          right={
            <Pressable
              onPress={() => setShowPassword((s) => !s)}
              hitSlop={10}
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff size={18} color={brand.inkMuted} />
              ) : (
                <Eye size={18} color={brand.inkMuted} />
              )}
            </Pressable>
          }
        />
      </View>

      <Pressable
        onPress={handleEmailLogin}
        disabled={signingIn}
        className={`h-14 rounded-xl flex-row items-center justify-center gap-2 ${
          canSignIn || signingIn ? "bg-lime active:bg-lime-dark" : "bg-lime/40"
        }`}
      >
        {signingIn ? (
          <>
            <ActivityIndicator size="small" color={brand.ink} />
            <Text className="text-ink text-base font-bold">Signing in...</Text>
          </>
        ) : (
          <>
            <Text
              className={`text-base font-bold ${canSignIn ? "text-ink" : "text-ink/50"}`}
            >
              Sign in
            </Text>
            <ArrowRight
              size={18}
              color={canSignIn ? brand.ink : brand.inkDisabled}
              strokeWidth={2.5}
            />
          </>
        )}
      </Pressable>
    </View>
  );

  const subtitle = isEmailLogin
    ? "Sign in with your work email"
    : "Enter your PIN to start your shift";

  const modeSwitch = (
    <View className="flex-row rounded-xl bg-ivory p-1">
      {[
        { label: "PIN", email: false },
        { label: "Email", email: true },
      ].map((tab) => {
        const active = tab.email === isEmailLogin;
        return (
          <Pressable
            key={tab.label}
            onPress={() => switchMode(tab.email)}
            className={`flex-1 h-10 rounded-lg items-center justify-center ${
              active ? "bg-ink" : ""
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                active ? "text-lime" : "text-ink/60"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const signInCard = (
    <View
      className="rounded-3xl bg-white p-5"
      style={{
        shadowColor: brand.ink,
        shadowOpacity: 0.1,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 16 },
        elevation: 6,
      }}
    >
      {modeSwitch}
      {/* Fixed min height so the card doesn't jump when switching PIN ↔ Email */}
      <View className="mt-5" style={{ minHeight: 392 }}>
        {isEmailLogin ? emailPanel : pinPanel}
      </View>
    </View>
  );

  const footer = (
    <View className="mt-6">
      <View className="flex-row items-center justify-center gap-1.5">
        <Lock size={12} color={brand.inkMuted} />
        <Text className="text-ink/50 text-xs">Authorized staff only</Text>
      </View>
      <DeviceSecretPrompt deviceId={deviceId} />
    </View>
  );

  const clockBlock = (
    <View className="items-end">
      <Text className="text-white text-xl font-bold tracking-tight">
        {clock.time}
      </Text>
      <Text className="text-white/50 text-xs font-medium">{clock.date}</Text>
    </View>
  );

  // ---------- Desktop / tablet: brand panel + sign-in column ----------
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

          <View className="flex-row items-center justify-between">
            <Image
              source={brandLogos.dark}
              style={{ width: 150, height: 44 }}
              resizeMode="contain"
              accessibilityLabel="SmartPOS"
            />
            {clockBlock}
          </View>

          <View className="max-w-[520px]">
            <Rise>
              <Eyebrow tone="dark">Point of sale</Eyebrow>
            </Rise>
            <Rise delay={80}>
              <View className="mt-6">
                <Headline
                  tone="dark"
                  lead="Every sale,"
                  mark="in control."
                  size={width >= 1100 ? 60 : 48}
                />
              </View>
            </Rise>
            <Rise delay={160}>
              <Text className="text-white/60 text-lg leading-relaxed mt-5">
                Orders, payments and tables in one place.
              </Text>
            </Rise>
          </View>

          <View className="flex-row flex-wrap gap-2.5">
            {[
              { icon: Zap, label: "Fast checkout" },
              { icon: ShieldCheck, label: "Secure access" },
              { icon: BarChart3, label: "Live sales" },
            ].map(({ icon: Icon, label }) => (
              <View
                key={label}
                className="flex-row items-center gap-2 rounded-full bg-white/5 border border-white/10 pl-1.5 pr-4 py-1.5"
              >
                <View className="w-7 h-7 rounded-full bg-lime items-center justify-center">
                  <Icon size={14} color={brand.ink} strokeWidth={2.5} />
                </View>
                <Text className="text-white/80 text-sm font-semibold">
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center items-center px-10 py-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-[380px]">
            <Rise delay={120}>
              <Text className="text-ink text-3xl font-extrabold tracking-tight">
                Welcome back
              </Text>
              <Text className="text-ink/60 text-base mt-2">{subtitle}</Text>
            </Rise>

            <Rise delay={200}>
              <View className="mt-8">{signInCard}</View>
            </Rise>

            {!isEmailLogin && (
              <View className="flex-row items-center justify-center gap-2 mt-5">
                <Keyboard size={14} color={brand.inkMuted} />
                <Text className="text-ink/50 text-xs">
                  You can also type your PIN on the keyboard
                </Text>
              </View>
            )}
            {footer}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------- Mobile: ink header + overlapping card ----------
  return (
    <View className="flex-1 bg-ivory">
      <StatusBar barStyle="light-content" backgroundColor={brand.ink} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            className="bg-ink rounded-b-[32px] px-6 pb-24 overflow-hidden"
            style={{ paddingTop: insets.top + 20 }}
          >
            <View className="absolute -right-16 -bottom-20 opacity-[0.08]">
              <View style={{ transform: [{ rotate: "-12deg" }] }}>
                <BrandMark size={260} receipt={brand.lime} check={brand.ink} />
              </View>
            </View>

            <View className="flex-row items-center justify-between w-full max-w-[420px] self-center">
              <Image
                source={brandLogos.dark}
                style={{ width: 124, height: 36 }}
                resizeMode="contain"
                accessibilityLabel="SmartPOS"
              />
              {clockBlock}
            </View>

            <Rise delay={60}>
              <View className="mt-10 w-full max-w-[420px] self-center">
                <Headline tone="dark" lead="Welcome" mark="back." size={36} />
                <Text className="text-white/60 text-base mt-3">{subtitle}</Text>
              </View>
            </Rise>
          </View>

          <View className="px-5 -mt-16">
            <Rise delay={140}>
              <View className="w-full max-w-[420px] self-center">
                {signInCard}
              </View>
            </Rise>
            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
