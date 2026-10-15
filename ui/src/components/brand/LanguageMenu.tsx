"use client";

/**
 * Language picker. OURS — see BRAND.md.
 *
 * Shows the current language's two-letter code beside a globe; the list gives
 * each language in its own script, so a Russian or Chinese speaker can find
 * theirs without reading English first.
 */
import { Check, Globe } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { LOCALE_NAMES, LOCALES } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageMenu({
  className,
  align = "end",
  compact = false,
}: {
  className?: string;
  align?: "start" | "end";
  /** Icon only, no code — for tight spots like the mobile top bar. */
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t.common.language}: ${LOCALE_NAMES[locale]}`}
          className={cn("al-chip-btn inline-flex", className)}
        >
          <Globe className="h-4 w-4 text-[color:var(--al-accent)]" />
          {!compact && (
            <span className="text-xs font-semibold uppercase tracking-wider">{locale}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="al-pop w-48">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {t.common.language}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            lang={code}
            onSelect={() => setLocale(code)}
            className="flex cursor-pointer items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {code}
              </span>
              {LOCALE_NAMES[code]}
            </span>
            {code === locale && <Check className="h-4 w-4 text-[color:var(--al-accent)]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
