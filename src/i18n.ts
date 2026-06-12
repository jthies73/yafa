import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import de from "./locales/de.json";

// ----------------------------------------------
// Global localization. English is the default and the fallback; the active
// locale persists across sessions. Language is fully decoupled from
// measurement units (a German UI can still display lbs/in and vice versa).
// ----------------------------------------------

export const SUPPORTED_LOCALES = ["en", "de"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_STORAGE_KEY = "yafa:locale";

function isSupported(value: string | null): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

// Saved preference → device language → strict "en" fallback. Resolved before
// the Vue app mounts so the first paint is already in the right language.
function resolveInitialLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isSupported(saved)) return saved;
  const device = navigator.language?.slice(0, 2).toLowerCase() ?? "";
  if (isSupported(device)) return device;
  return "en";
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: resolveInitialLocale(),
  fallbackLocale: "en",
  messages: { en, de },
});

document.documentElement.lang = i18n.global.locale.value;

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}
