"use client";

/**
 * Top bar from the AiLunaPro_Voice_Dashboard template. OURS — see BRAND.md.
 *
 * Breadcrumb · ⌘K search · help · language · theme · "New agent".
 * Responsive the template's way: the search field collapses to an icon below
 * md, labels drop on small screens, and the mobile menu button opens the
 * sidebar sheet.
 */
import { CircleHelp, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { useSidebar } from "@/components/ui/sidebar";
import { useI18n } from "@/i18n";

import { CommandPalette } from "./CommandPalette";
import { CurrencyMenu } from "./CurrencyMenu";
import { LanguageMenu } from "./LanguageMenu";
import { navItemFor } from "./nav";
import { toggleTheme } from "./theme";

export function AppTopbar() {
  const { toggleSidebar } = useSidebar();
  const { t } = useI18n();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const [dark, setDark] = useState(true);

  const current = navItemFor(pathname);
  const crumb = current ? t.nav[current.key] : null;

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    setDark(document.documentElement.classList.contains("dark"));

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="al-topbar">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={t.common.menu}
          className="al-chip-btn al-chip-square inline-flex md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/overview" className="md:hidden" aria-label="Voice AiLunaPro">
          <BrandLogo pill className="h-4" />
        </Link>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm md:flex">
          <span className="whitespace-nowrap text-muted-foreground">{t.common.product}</span>
          {crumb && (
            <>
              <span aria-hidden className="text-muted-foreground/60">/</span>
              <span aria-current="page" className="truncate font-semibold">{crumb}</span>
            </>
          )}
        </nav>

        <div className="flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={t.topbar.search}
            className="al-search hidden md:flex"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate text-left">{t.topbar.search}</span>
            <kbd className="al-kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={t.topbar.search}
            className="al-chip-btn al-chip-square inline-flex md:hidden"
          >
            <Search className="h-4 w-4" />
          </button>

          <a
            href="mailto:service@ailunapro.com"
            aria-label={t.topbar.help}
            title={t.topbar.help}
            className="al-chip-btn al-chip-square hidden sm:inline-flex"
          >
            <CircleHelp className="h-4 w-4" />
          </a>

          <CurrencyMenu />
          <LanguageMenu />

          <button
            type="button"
            onClick={() => setDark(toggleTheme() === "dark")}
            aria-label={t.common.theme}
            title={t.common.theme}
            className="al-chip-btn al-chip-square hidden sm:inline-flex"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Link href="/workflow/create" className="al-cta" aria-label={t.topbar.newAgent}>
            <Plus className="h-4 w-4" />
            <span className="hidden whitespace-nowrap lg:inline">{t.topbar.newAgent}</span>
          </Link>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
