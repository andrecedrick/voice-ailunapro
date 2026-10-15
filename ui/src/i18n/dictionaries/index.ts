// Plain module (no "use client") so server components — the root layout's
// generateMetadata — can look a dictionary up too.
import { DEFAULT_LOCALE, type Locale } from "../config";
import { de } from "./de";
import { type Dict, en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { it } from "./it";
import { pt } from "./pt";
import { ru } from "./ru";
import { zh } from "./zh";

export type { Dict };

const DICTS: Record<Locale, Dict> = { en, fr, es, de, it, pt, ru, zh };

export function dictionaryFor(locale: Locale): Dict {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}
