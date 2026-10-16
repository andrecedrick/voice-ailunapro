"use client";

/**
 * Currency picker. OURS — see api/services/billing/currency.py.
 *
 * Lists only the currencies Stripe can actually charge in, so the amount shown
 * is the amount billed — we never convert. The first visit follows the
 * country our edge reports; after that the choice is remembered per browser.
 * Hidden while only one currency is on offer.
 */
import { Check, Coins } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { billingApi } from "@/lib/ailunapro-api";
import { cn } from "@/lib/utils";

const KEY = "al_currency";

export const CURRENCY_NAMES: Record<string, string> = {
  eur: "Euro", usd: "US dollar", gbp: "British pound", cad: "Canadian dollar",
  chf: "Swiss franc", aud: "Australian dollar", nzd: "New Zealand dollar",
  jpy: "Japanese yen", sgd: "Singapore dollar", aed: "UAE dirham",
  mad: "Moroccan dirham", tnd: "Tunisian dinar", sek: "Swedish krona",
  nok: "Norwegian krone", dkk: "Danish krone", pln: "Polish złoty",
  czk: "Czech koruna", ron: "Romanian leu", brl: "Brazilian real",
  mxn: "Mexican peso", inr: "Indian rupee", zar: "South African rand",
};

type Ctx = {
  currency: string | null;
  currencies: string[];
  setCurrency: (c: string) => void;
};

const CurrencyContext = createContext<Ctx>({ currency: null, currencies: [], setCurrency: () => {} });

export function useCurrency() {
  return useContext(CurrencyContext);
}

/** Reads the stored preference, then asks the API what is on offer. */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setState] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<string[]>([]);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {}
    void billingApi.plans(stored ?? undefined).then((r) => {
      if (r.error || !r.data) return;
      setCurrencies(r.data.currencies ?? []);
      setState(r.data.currency ?? null);
    });
  }, []);

  const setCurrency = useCallback((code: string) => {
    setState(code);
    try {
      localStorage.setItem(KEY, code);
    } catch {}
    // Prices are rendered from the plan catalog; reload keeps every screen
    // (billing, pricing, checkout) quoting the same currency.
    window.location.reload();
  }, []);

  const value = useMemo(() => ({ currency, currencies, setCurrency }), [currency, currencies, setCurrency]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/** The stored choice, for API calls made outside the provider. */
export function storedCurrency(): string | undefined {
  try {
    return localStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function CurrencyMenu({
  className,
  align = "end",
  compact = false,
}: {
  className?: string;
  align?: "start" | "end";
  compact?: boolean;
}) {
  const { currency, currencies, setCurrency } = useCurrency();
  const { t } = useI18n();
  const label = t.common.currency ?? "Currency";

  if (!currency || currencies.length < 2) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`${label}: ${currency.toUpperCase()}`} className={cn("al-chip-btn inline-flex", className)}>
          <Coins className="h-4 w-4 text-[color:var(--al-accent)]" />
          {!compact && <span className="text-xs font-semibold uppercase tracking-wider">{currency}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="al-pop w-56">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {currencies.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => setCurrency(code)}
            className="flex cursor-pointer items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-8 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{code}</span>
              {CURRENCY_NAMES[code] ?? code.toUpperCase()}
            </span>
            {code === currency && <Check className="h-4 w-4 text-[color:var(--al-accent)]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
