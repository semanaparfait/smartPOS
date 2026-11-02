import { LANGUAGES, chooseLanguage, useLanguage, useT } from "@/i18n";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";

// The four languages, saved to the signed-in person's account.
export default function LanguagePicker() {
  const language = useLanguage();
  const t = useT();

  return (
    <View style={{ gap: 10 }}>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {LANGUAGES.map((option) => {
          const active = option.code === language;
          return (
            <Pressable
              key={option.code}
              onPress={() =>
                chooseLanguage(option.code).catch((error: Error) =>
                  Toast.show({
                    type: "error",
                    text1: t("language.saveFailed"),
                    text2: error.message,
                  }),
                )
              }
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              className={`items-center rounded-xl py-2.5 px-3 ${
                active ? "bg-ink" : "bg-ivory active:bg-ink/10"
              }`}
              style={{ flexGrow: 1, flexBasis: "45%" }}
            >
              <Text className={`text-sm font-semibold ${active ? "text-lime" : "text-ink/70"}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-ink/50 text-xs">{t("language.hint")}</Text>
    </View>
  );
}
