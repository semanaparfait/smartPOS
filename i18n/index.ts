import useAuth from "@/store/Authentication/useAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback } from "react";
import { create } from "zustand";
import en, { type TranslationKey } from "./en";
import fr from "./fr";
import rw from "./rw";
import sw from "./sw";
import frText from "./text/fr";
import rwText from "./text/rw";
import swText from "./text/sw";

// Each person picks their own language; it is saved on their account, so a shared
// till switches as soon as someone else signs in. Screens not translated yet stay
// in English.

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "rw", label: "Ikinyarwanda" },
  { code: "fr", label: "Français" },
  { code: "sw", label: "Kiswahili" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

const WORDS: Record<Language, Partial<Record<TranslationKey, string>>> = { en, rw, fr, sw };

// English text -> translation, for screens translated with tr().
const TEXTS: Record<Exclude<Language, "en">, Record<string, string>> = {
  rw: rwText,
  fr: frText,
  sw: swText,
};

// The last language chosen on this device, for screens before anyone signs in.
const STORAGE_KEY = "smartpos.language";

const isLanguage = (value: unknown): value is Language =>
  LANGUAGES.some((l) => l.code === value);

const useDeviceLanguage = create<{ language: Language }>(() => ({ language: "en" }));

AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (isLanguage(saved)) useDeviceLanguage.setState({ language: saved });
  })
  .catch(() => {});

export function useLanguage(): Language {
  const account = useAuth((s) => s.profile?.language);
  const device = useDeviceLanguage((s) => s.language);
  return isLanguage(account) ? account : device;
}

export const translate = (
  language: Language,
  key: TranslationKey,
  values?: Record<string, string | number>,
) => {
  const text = WORDS[language][key] ?? en[key];
  return values
    ? text.replace(/\{(\w+)\}/g, (match, name) =>
        name in values ? String(values[name]) : match,
      )
    : text;
};

// `t("cart.items", { count: 3 })` in the signed-in person's language.
export function useT() {
  const language = useLanguage();
  return useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(language, key, values),
    [language],
  );
}

const currentLanguage = (): Language => {
  const account = useAuth.getState().profile?.language;
  return isLanguage(account) ? account : useDeviceLanguage.getState().language;
};

// For code outside screens, such as messages shown by a store.
export const t = (key: TranslationKey, values?: Record<string, string | number>) =>
  translate(currentLanguage(), key, values);

// Most screens are translated by their English text: tr("Save changes"). Text
// with no translation yet stays in English. Open pages redraw when the language
// changes (see the layouts), so this needs no hook.
export const tr = (text: string) => {
  const language = currentLanguage();
  return language === "en" ? text : (TEXTS[language][text] ?? text);
};

// Switches at once, then saves it to the account. Throws if saving fails, after
// putting the previous language back.
export async function chooseLanguage(language: Language) {
  const previous = useAuth.getState().profile;
  useDeviceLanguage.setState({ language });
  AsyncStorage.setItem(STORAGE_KEY, language).catch(() => {});
  if (!previous) return;

  useAuth.setState({ profile: { ...previous, language } });
  try {
    await useAuth.getState().updateProfile({ language });
  } catch (error) {
    useAuth.setState({ profile: previous });
    throw error;
  }
}
