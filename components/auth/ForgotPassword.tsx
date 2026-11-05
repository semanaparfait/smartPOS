import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { ArrowLeft, KeyRound, Lock, Mail, MessageCircle } from "lucide-react-native";
import { API_URL } from "@/config/api";
import { brand } from "@/config/theme";
import { tr } from "@/i18n";

type Step = "email" | "code" | "support" | "done";

const post = async (path: string, body: object) => {
  const response = await fetch(`${API_URL}/api/v1/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(". ") : data?.message;
    throw new Error(message || tr("Something went wrong. Try again."));
  }
  return data?.data ?? data;
};

function Input({
  icon: Icon,
  ...props
}: React.ComponentProps<typeof TextInput> & { icon: React.ComponentType<{ size?: number; color?: string }> }) {
  return (
    <View className="flex-row items-center h-14 rounded-xl border border-ink/15 bg-ivory/60 px-4 gap-3">
      <Icon size={18} color={brand.inkMuted} />
      <TextInput placeholderTextColor={brand.inkDisabled} className="flex-1 text-ink text-base" {...props} />
    </View>
  );
}

// Forgot password, for owners and managers who sign in with email. With email
// set up on the server, a 6-digit code comes by email; otherwise SmartPOS gets
// the request and calls them with a new password.
export default function ForgotPassword({ initialEmail, onBack }: { initialEmail: string; onBack: (email?: string) => void }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askForCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(tr("Enter the email you sign in with."));
    setBusy(true);
    setError(null);
    try {
      const res = await post("forgot-password", { email: email.trim() });
      setStep(res?.way === "email" ? "code" : "support");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!/^\d{6}$/.test(code)) return setError(tr("The code is the 6 digits from the email."));
    if (password.length < 8) return setError(tr("Use at least 8 characters."));
    if (password !== confirm) return setError(tr("The two passwords are not the same."));
    setBusy(true);
    setError(null);
    try {
      await post("reset-password", { email: email.trim(), code, newPassword: password });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const button = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} disabled={busy} className="h-14 rounded-xl flex-row items-center justify-center gap-2 bg-lime active:bg-lime-dark">
      {busy ? <ActivityIndicator size="small" color={brand.ink} /> : <Text className="text-ink text-base font-bold">{label}</Text>}
    </Pressable>
  );

  return (
    <View className="flex-1 justify-between gap-5">
      <View className="gap-4">
        <Pressable onPress={() => onBack()} className="flex-row items-center gap-1.5 self-start" hitSlop={8}>
          <ArrowLeft size={16} color={brand.inkMuted} />
          <Text className="text-ink/60 text-sm font-semibold">{tr("Back to sign in")}</Text>
        </Pressable>

        {step === "email" && (
          <>
            <Text className="text-ink text-lg font-bold">{tr("Forgot your password?")}</Text>
            <Text className="text-ink/60 text-sm">{tr("Enter the email you sign in with. We'll send you a code to choose a new password.")}</Text>
            <Input
              icon={Mail}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              placeholder={tr("name@company.com")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={askForCode}
            />
          </>
        )}

        {step === "code" && (
          <>
            <Text className="text-ink text-lg font-bold">{tr("Check your email")}</Text>
            <Text className="text-ink/60 text-sm">
              {tr("We sent a 6-digit code to")} {email.trim()}. {tr("It works for 30 minutes. Look in your spam folder too.")}
            </Text>
            <Input icon={KeyRound} value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))} placeholder="123456" keyboardType="number-pad" autoComplete="one-time-code" />
            <Input icon={Lock} value={password} onChangeText={setPassword} placeholder={tr("New password (at least 8 characters)")} secureTextEntry autoCapitalize="none" />
            <Input icon={Lock} value={confirm} onChangeText={setConfirm} placeholder={tr("Type it again")} secureTextEntry autoCapitalize="none" returnKeyType="go" onSubmitEditing={reset} />
            <Pressable onPress={askForCode} disabled={busy} className="self-start" hitSlop={8}>
              <Text className="text-ink/60 text-xs font-semibold underline">{tr("Send a new code")}</Text>
            </Pressable>
          </>
        )}

        {step === "support" && (
          <>
            <View className="w-12 h-12 rounded-2xl bg-lime items-center justify-center">
              <MessageCircle size={22} color={brand.ink} />
            </View>
            <Text className="text-ink text-lg font-bold">{tr("We'll help you sign in")}</Text>
            <Text className="text-ink/60 text-sm">
              {tr("If this email has a SmartPOS account, our team has your request. We'll call you with a new password, which you change after signing in.")}
            </Text>
          </>
        )}

        {step === "done" && (
          <>
            <Text className="text-ink text-lg font-bold">{tr("Password changed")}</Text>
            <Text className="text-ink/60 text-sm">{tr("Sign in with your new password.")}</Text>
          </>
        )}

        {error && (
          <View className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-3">
            <Text className="text-red-700 text-sm font-medium">{error}</Text>
          </View>
        )}
      </View>

      {step === "email" && button(tr("Send me a code"), askForCode)}
      {step === "code" && button(tr("Change my password"), reset)}
      {(step === "support" || step === "done") && button(tr("Back to sign in"), () => onBack(email.trim()))}
    </View>
  );
}
