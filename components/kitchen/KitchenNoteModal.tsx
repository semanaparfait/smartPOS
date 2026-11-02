import { brand } from "@/config/theme";
import { useT } from "@/i18n";
import useCart from "@/store/Cart/useCart";
import React, { useEffect, useState } from "react";
import { Modal, Platform, Pressable, Text, TextInput, View } from "react-native";

// Asks what the kitchen should know about a product just added to the sale.
export default function KitchenNoteModal() {
  const productId = useCart((s) => s.noteProductId);
  const askNote = useCart((s) => s.askNote);
  const setItemNote = useCart((s) => s.setItemNote);
  const t = useT();
  const line = useCart((s) =>
    s.cartItems
      .flatMap((c) => c.items ?? [])
      .find((i) => i.product?.id === s.noteProductId),
  );
  const [note, setNote] = useState("");

  useEffect(() => {
    if (productId) setNote(useCart.getState().cartItems
      .flatMap((c) => c.items ?? [])
      .find((i) => i.product?.id === productId)?.note ?? "");
  }, [productId]);

  const close = () => askNote(null);
  const save = () => {
    if (productId && note.trim() !== (line?.note ?? "")) {
      setItemNote(productId, note.trim());
    }
    close();
  };

  return (
    <Modal visible={!!productId} transparent animationType="fade" onRequestClose={close}>
      <View className="flex-1 bg-ink/50 items-center justify-center p-4">
        <View className="bg-white rounded-2xl p-5 w-full" style={{ maxWidth: 400, gap: 14 }}>
          <View>
            <Text className="text-ink text-lg font-extrabold">{t("note.title")}</Text>
            <Text numberOfLines={1} className="text-ink/50 text-[13px] mt-0.5">
              {line?.product?.name}
            </Text>
          </View>
          <View className="bg-ivory border border-ink/10 rounded-xl px-3.5">
            <TextInput
              value={note}
              onChangeText={setNote}
              autoFocus
              multiline
              maxLength={255}
              textAlignVertical="top"
              placeholder={t("note.placeholder")}
              placeholderTextColor={brand.inkDisabled}
              className="py-3 text-[15px] text-ink min-h-[72px]"
              style={Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : undefined}
            />
          </View>
          <View className="flex-row" style={{ gap: 10 }}>
            <Pressable
              onPress={close}
              className="h-12 px-5 rounded-xl border border-ink/10 items-center justify-center active:bg-ivory"
            >
              <Text className="text-ink text-sm font-bold">{t("note.skip")}</Text>
            </Pressable>
            <Pressable
              onPress={save}
              className="h-12 flex-1 rounded-xl bg-lime items-center justify-center active:bg-lime-dark"
            >
              <Text className="text-ink text-sm font-bold">{t("note.save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
