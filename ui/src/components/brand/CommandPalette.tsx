"use client";

/**
 * ⌘K / Ctrl+K command palette, from the dashboard template. OURS — see BRAND.md.
 *
 * Navigation and a handful of real actions only: every entry goes somewhere
 * that exists. The template's demo entries (AI copilot, fake notifications)
 * were left out because nothing in the product backs them.
 */
import { LifeBuoy, type LucideIcon, Megaphone, Plus, Search, SunMoon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

import { NAV_ITEMS } from "./nav";
import { toggleTheme } from "./theme";

type Entry = {
  id: string;
  group: "screens" | "actions";
  label: string;
  icon: LucideIcon;
  run: () => void;
};

/** Accent- and case-insensitive match, so "telephonie" finds "Téléphonie". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (fn: () => void) => {
      onOpenChange(false);
      fn();
    },
    [onOpenChange],
  );

  const entries = useMemo<Entry[]>(() => {
    const screens: Entry[] = NAV_ITEMS.map((item) => ({
      id: `nav:${item.url}`,
      group: "screens",
      label: t.nav[item.key],
      icon: item.icon,
      run: () => router.push(item.url),
    }));
    const actions: Entry[] = [
      { id: "new-agent", group: "actions", label: t.palette.newAgent, icon: Plus, run: () => router.push("/workflow/create") },
      { id: "new-campaign", group: "actions", label: t.palette.newCampaign, icon: Megaphone, run: () => router.push("/campaigns/new") },
      { id: "theme", group: "actions", label: t.palette.toggleTheme, icon: SunMoon, run: () => void toggleTheme() },
      {
        id: "support",
        group: "actions",
        label: t.palette.contactSupport,
        icon: LifeBuoy,
        run: () => {
          window.location.href = "mailto:service@ailunapro.com";
        },
      },
    ];
    return [...screens, ...actions];
  }, [router, t]);

  const results = useMemo(() => {
    const q = fold(query.trim());
    return q ? entries.filter((e) => fold(e.label).includes(q)) : entries;
  }, [entries, query]);

  // Fresh search every time the palette opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    // DialogContent suppresses Radix auto-focus; focus the field ourselves.
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = results[active];
      if (entry) go(entry.run);
    }
  };

  let index = -1;
  const groups: Array<[Entry["group"], string]> = [
    ["screens", t.palette.screens],
    ["actions", t.palette.actions],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="al-palette gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">{t.palette.title}</DialogTitle>
        <DialogDescription className="sr-only">{t.palette.hint}</DialogDescription>

        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.palette.placeholder}
            aria-label={t.palette.placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls="al-palette-list"
            aria-activedescendant={results[active] ? `al-pal-${results[active].id}` : undefined}
            className="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div
          ref={listRef}
          id="al-palette-list"
          role="listbox"
          className="max-h-[min(60vh,420px)] overflow-y-auto p-2"
        >
          {results.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">{t.palette.empty}</p>
          )}
          {groups.map(([group, heading]) => {
            const rows = results.filter((r) => r.group === group);
            if (rows.length === 0) return null;
            return (
              <div key={group} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {heading}
                </p>
                {rows.map((entry) => {
                  index += 1;
                  const i = index;
                  const Icon = entry.icon;
                  return (
                    <button
                      key={entry.id}
                      id={`al-pal-${entry.id}`}
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      data-index={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(entry.run)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                        i === active ? "al-palette-row-active" : "text-foreground/90",
                      )}
                    >
                      <span className="al-icon-tile">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 truncate">{entry.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <p className="border-t px-4 py-2.5 text-[11px] text-muted-foreground">{t.palette.hint}</p>
      </DialogContent>
    </Dialog>
  );
}
