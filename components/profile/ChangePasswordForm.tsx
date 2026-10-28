import {
  Input,
  Label,
  PrimaryButton,
  SecondaryButton,
  Section,
} from "@/app/components/ownerComponents/FormKit";
import { ErrorNote, Rule } from "@/components/profile/profileKit";
import { brand } from "@/config/theme";
import useAuth from "@/store/Authentication/useAuth";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";

// Same minimum the backend enforces.
const MIN_LENGTH = 8;

const EMPTY = { current: "", next: "", confirm: "" };

// Change-own-password form, used by both the owner settings and the staff profile.
export default function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const { changePassword } = useAuth();
  const mustChange = useAuth((state) => state.profile?.mustChangePassword);

  const [form, setForm] = useState(EMPTY);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<typeof EMPTY>) => setForm((prev) => ({ ...prev, ...patch }));

  const longEnough = form.next.length >= MIN_LENGTH;
  const different = !!form.next && form.next !== form.current;
  const matches = !!form.confirm && form.confirm === form.next;
  const canSave = !!form.current && longEnough && different && matches;

  const handleSave = async () => {
    if (!canSave) {
      setError("Fill in every field and meet all the rules below.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await changePassword(form.current, form.next);
      setForm(EMPTY);
      Toast.show({ type: "success", text1: "Password changed", text2: "Use it next time you sign in." });
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof EMPTY, label: string, placeholder: string, isNew: boolean) => (
    <View>
      <Label required>{label}</Label>
      <Input
        icon={isNew ? "lock-closed-outline" : "key-outline"}
        value={form[key]}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoComplete={isNew ? "new-password" : "current-password"}
        placeholder={placeholder}
        onChangeText={(value) => update({ [key]: value })}
        onSubmitEditing={key === "confirm" ? handleSave : undefined}
      />
    </View>
  );

  return (
    <>
      {mustChange && (
        <View className="flex-row items-center bg-lime rounded-2xl px-4 py-3">
          <Ionicons name="alert-circle-outline" size={18} color={brand.ink} />
          <Text className="text-ink text-[13px] font-semibold ml-2.5 flex-1">
            You are using a temporary password. Please set your own.
          </Text>
        </View>
      )}

      <Section icon="lock-closed-outline" title="New password">
        <View style={{ gap: 18 }}>
          <View className="flex-row justify-end">
            <Pressable
              onPress={() => setVisible((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={visible ? "Hide passwords" : "Show passwords"}
              className="flex-row items-center h-8 px-3 rounded-lg border border-ink/10 active:bg-ivory"
            >
              <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={14} color={brand.ink} />
              <Text className="text-ink text-xs font-bold ml-1.5">{visible ? "Hide" : "Show"}</Text>
            </Pressable>
          </View>
          {field("current", "Current password", "Your current password", false)}
          {field("next", "New password", `At least ${MIN_LENGTH} characters`, true)}
          {field("confirm", "Confirm new password", "Type it again", true)}
          <View className="pt-3 border-t border-ink/5" style={{ gap: 6 }}>
            <Rule ok={longEnough} label={`At least ${MIN_LENGTH} characters`} />
            <Rule ok={different} label="Different from your current password" />
            <Rule ok={matches} label="Both new passwords match" />
          </View>
        </View>
      </Section>

      <ErrorNote message={error} />

      <View className="flex-row" style={{ gap: 12 }}>
        <SecondaryButton
          label="Clear"
          icon="close-outline"
          disabled={saving}
          onPress={() => {
            setForm(EMPTY);
            setError(null);
          }}
        />
        <PrimaryButton
          label="Change password"
          busyLabel="Saving..."
          icon="checkmark-circle-outline"
          busy={saving}
          onPress={handleSave}
        />
      </View>
    </>
  );
}
