// Server-side only: imports next/headers, so a client import fails the build.
import { cookies } from "next/headers";

import { DEFAULT_LOCALE, isLocale, type Locale, LOCALE_COOKIE } from "./config";

/** The visitor's chosen language, or English when they never picked one. */
export async function getServerLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
