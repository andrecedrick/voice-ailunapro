/**
 * Voice AiLunaPro — language configuration.
 *
 * OURS (upstream has no src/i18n/), so a Dograh merge never conflicts here.
 * English is the default: every visitor sees English until they pick another
 * language from the menu, and that choice is remembered in a cookie so the
 * server renders the right language on the very first paint.
 */

export const LOCALES = ["en", "fr", "es", "de", "it", "pt", "ru", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie read by the root layout on the server and written by the language menu. */
export const LOCALE_COOKIE = "al_locale";

/** Native names, as each language's own speakers write them. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  zh: "中文",
};

/** BCP-47 tags for number and date formatting. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
  ru: "ru-RU",
  zh: "zh-CN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
