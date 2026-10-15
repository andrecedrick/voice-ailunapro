// /pricing copy in every supported language. OURS — see BRAND.md.
import { DEFAULT_LOCALE, type Locale } from "../config";
import { pricingDe } from "./de";
import { type PricingDict,pricingEn } from "./en";
import { pricingEs } from "./es";
import { pricingFr } from "./fr";
import { pricingIt } from "./it";
import { pricingPt } from "./pt";
import { pricingRu } from "./ru";
import { pricingZh } from "./zh";

export type { PricingDict };

const COPY: Record<Locale, PricingDict> = {
  en: pricingEn,
  fr: pricingFr,
  es: pricingEs,
  de: pricingDe,
  it: pricingIt,
  pt: pricingPt,
  ru: pricingRu,
  zh: pricingZh,
};

export function pricingCopy(locale: Locale): PricingDict {
  return COPY[locale] ?? COPY[DEFAULT_LOCALE];
}
