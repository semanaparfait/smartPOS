import { brand } from "@/config/theme";
import { tr } from "@/i18n";
import useCart from "@/store/Cart/useCart";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useMaxHold } from "./holdKit";

const QUICK_MINUTES = [2, 5, 10, 15, 30];
const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined;

// Asks who the sale is for and how long to wait, then puts it aside.
export default function HoldSaleModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const holdCart = useCart((s) => s.holdCart);
  const max = useMaxHold();
  const quick = QUICK_MINUTES.filter((m) => m <= max);
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName("");
      setMinutes(String(quick[0] ?? max));
    }
  }, [visible]);

  const wait = Number(minutes);
  const validMinutes = Number.isInteger(wait) && wait >= 1 && wait <= max;
  const ready = !!name.trim() && validMinutes && !saving;

  const save = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      await holdCart(name.trim(), wait);
      Toast.show({
        type: "success",
        text1: tr("Sale on hold"),
        text2: `${name.trim()} · ${wait} min`,
      });
      onClose();
    } catch (error) {
      Toast.show({ type: "error", text1: tr("Could not hold the sale"), text2: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-ink/50 items-center justify-center p-4">
        <View className="bg-white rounded-2xl p-5 w-full" style={{ maxWidth: 420, gap: 16 }}>
          <View>
            <Text className="text-ink text-lg font-extrabold">{tr("Hold this sale")}</Text>
            <Text className="text-ink/50 text-[13px] mt-0.5">
              {tr("Serve others while the customer fetches what they forgot.")}
            </Text>
          </View>

          <View>
            <Text className="text-ink/60 text-[11px] font-bold uppercase tracking-wider mb-1.5">
              {tr("Customer name")}
            </Text>
            <View className="bg-ivory border border-ink/10 rounded-xl px-3.5">
              <TextInput
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={60}
                placeholder={tr("e.g. Jean")}
                placeholderTextColor={brand.inkDisabled}
                returnKeyType="done"
                onSubmitEditing={save}
                className="py-3 text-[15px] text-ink"
                style={webNoOutline}
              />
            </View>
          </View>

          <View>
            <Text className="text-ink/60 text-[11px] font-bold uppercase tracking-wider mb-1.5">
              {tr("Minutes to wait")}
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {quick.map((m) => {
                const on = minutes === String(m);
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMinutes(String(m))}
                    accessibilityState={{ selected: on }}
                    className={`h-10 min-w-[52px] px-3 rounded-xl items-center justify-center border ${
                      on ? "bg-ink border-ink" : "bg-white border-ink/10 active:bg-ivory"
                    }`}
                  >
                    <Text className={`text-sm font-bold ${on ? "text-white" : "text-ink"}`}>{m}</Text>
                  </Pressable>
                );
              })}
              <View className="h-10 flex-row items-center bg-ivory border border-ink/10 rounded-xl px-3 w-[96px]">
                <TextInput
                  value={minutes}
                  onChangeText={(v) => setMinutes(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  maxLength={3}
                  accessibilityLabel={tr("Minutes to wait")}
                  className="flex-1 text-[15px] text-ink"
                  style={webNoOutline}
                />
                <Text className="text-ink/40 text-xs font-bold">min</Text>
              </View>
            </View>
            <Text
              className="text-[11px] mt-1.5"
              style={{ color: minutes && !validMinutes ? brand.danger : brand.inkMuted }}
            >
              {tr("Up to")} {max} min
            </Text>
          </View>

          <View className="flex-row" style={{ gap: 10 }}>
            <Pressable
              onPress={onClose}
              className="h-12 px-5 rounded-xl border border-ink/10 items-center justify-center active:bg-ivory"
            >
              <Text className="text-ink text-sm font-bold">{tr("Cancel")}</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={!ready}
              className={`h-12 flex-1 rounded-xl bg-lime items-center justify-center active:bg-lime-dark ${
                ready ? "" : "opacity-50"
              }`}
            >
              {saving ? (
                <ActivityIndicator color={brand.ink} />
              ) : (
                <Text className="text-ink text-sm font-bold">{tr("Hold sale")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
