"use client";

/**
 * Voice AiLunaPro — i18n runtime.
 *
 * OURS (upstream has no src/i18n/). A tiny, dependency-free layer: the root
 * layout reads the locale cookie on the server and hands it to <I18nProvider>,
 * so the first paint is already in the visitor's language — no flash of
 * English, no hydration mismatch. Components call `useI18n()` and read typed
 * strings off `t`.
 *
 * Scope, deliberately: the app shell (sidebar, top bar, command palette,
 * overview, sign-in/up, footer). Deeper Dograh screens stay in English, which is
 * also the default language, so a visitor who never touches the menu sees one
 * consistent language everywhere. See BRAND.md §4.
 */
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { DEFAULT_LOCALE, type Locale, LOCALE_COOKIE, LOCALE_TAGS } from "./config";
import { type Dict, dictionaryFor } from "./dictionaries";
import { en } from "./dictionaries/en";

type I18nValue = {
  locale: Locale;
  /** BCP-47 tag for Intl formatting, e.g. "fr-FR". */
  tag: string;
  t: Dict;
  setLocale: (next: Locale) => void;
};

const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  tag: LOCALE_TAGS[DEFAULT_LOCALE],
  t: en,
  setLocale: () => {},
});

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      // One year; Lax so it rides along on normal navigation only.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      // Server components (metadata, the layout) re-render in the new language.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, tag: LOCALE_TAGS[locale], t: dictionaryFor(locale), setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
