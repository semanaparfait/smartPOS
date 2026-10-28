import {
  Input,
  Label,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Section,
} from "@/app/components/ownerComponents/FormKit";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Toast from "react-native-toast-message";

// Same minimum the backend enforces.
const MIN_LENGTH = 8;

const EMPTY = { current: "", next: "", confirm: "" };

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View className="flex-row items-center">
      <Ionicons
        name={ok ? "checkmark-circle" : "ellipse-outline"}
        size={14}
        color={ok ? brand.success : brand.inkDisabled}
      />
      <Text className={`text-xs ml-2 ${ok ? "text-ink" : "text-ink/50"}`}>{label}</Text>
    </View>
  );
}

export default function ChangePassword() {
  const router = useRouter();
  const { changePassword } = useAuth();
  const mustChange = useAuth((state) => state.profile?.mustChangePassword);

  const [form, setForm] = useState(EMPTY);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<typeof EMPTY>) => setForm((prev) => ({ ...prev, ...patch }));

  const longEnough = form.next.length >= MIN_LENGTH;
  const different = !!form.next && form.next !== form.current;
  const matches = !!form.confirm && form.confirm === form.next;
  const canSave = !!form.current && longEnough && different && matches;

  const handleSave = async () => {
    if (!canSave) {
      Toast.show({
        type: "error",
        text1: "Check your password",
        text2: "Fill in every field and meet all the rules below.",
      });
      return;
    }

    setSaving(true);
    try {
      await changePassword(form.current, form.next);
      setForm(EMPTY);
      Toast.show({ type: "success", text1: "Password changed", text2: "Use it next time you sign in." });
    } catch (error) {
      Toast.show({ type: "error", text1: "Could not change password", text2: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const eye = (
    <Pressable
      onPress={() => setVisible((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel={visible ? "Hide passwords" : "Show passwords"}
      className="flex-row items-center h-8 px-3 rounded-lg border border-ink/10 active:bg-ivory"
    >
      <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={14} color={brand.ink} />
      <Text className="text-ink text-xs font-bold ml-1.5">{visible ? "Hide" : "Show"}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-ivory"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          eyebrow="Settings"
          title="Change password"
          subtitle="The password you use to sign in with your email."
          onBack={() => router.back()}
        />

        {mustChange && (
          <View className="flex-row items-center bg-lime rounded-2xl px-4 py-3">
            <Ionicons name="alert-circle-outline" size={18} color={brand.ink} />
            <Text className="text-ink text-[13px] font-semibold ml-2.5 flex-1">
              You are using a temporary password. Please set your own.
            </Text>
          </View>
        )}

        <View style={{ maxWidth: 560, width: "100%", gap: 12 }}>
          <Section icon="lock-closed-outline" title="New password">
            <View style={{ gap: 18 }}>
              <View className="flex-row justify-end">{eye}</View>
              <View>
                <Label required>Current password</Label>
                <Input
                  icon="key-outline"
                  value={form.current}
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  placeholder="Your current password"
                  onChangeText={(current) => update({ current })}
                />
              </View>
              <View>
                <Label required>New password</Label>
                <Input
                  icon="lock-closed-outline"
                  value={form.next}
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  placeholder={`At least ${MIN_LENGTH} characters`}
                  onChangeText={(next) => update({ next })}
                />
              </View>
              <View>
                <Label required>Confirm new password</Label>
                <Input
                  icon="lock-closed-outline"
                  value={form.confirm}
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  placeholder="Type it again"
                  onChangeText={(confirm) => update({ confirm })}
                  onSubmitEditing={handleSave}
                />
              </View>
              <View className="pt-3 border-t border-ink/5" style={{ gap: 6 }}>
                <Rule ok={longEnough} label={`At least ${MIN_LENGTH} characters`} />
                <Rule ok={different} label="Different from your current password" />
                <Rule ok={matches} label="Both new passwords match" />
              </View>
            </View>
          </Section>

          <View className="flex-row" style={{ gap: 12 }}>
            <SecondaryButton
              label="Clear"
              icon="close-outline"
              disabled={saving}
              onPress={() => setForm(EMPTY)}
            />
            <PrimaryButton
              label="Change password"
              busyLabel="Saving..."
              icon="checkmark-circle-outline"
              busy={saving}
              onPress={handleSave}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
