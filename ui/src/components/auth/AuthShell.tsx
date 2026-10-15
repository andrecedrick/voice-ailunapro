"use client";

// Shared two-column auth shell, used by BOTH the Stack Auth handler
// (/handler/[...stack], cloud) and the local/OSS auth pages (/auth/login,
// /auth/signup). LEFT: a glass card that wraps the auth form (`children`).
// RIGHT (lg+ only): the brand panel — logo, value proposition, enterprise CTA
// (passed in as `enterpriseSlot`). Mobile collapses to the single card column.
// The form column scrolls and stays centered so tall (sign-up) forms never clip.
//
// BRAND: copy comes from the i18n dictionaries and a language menu sits in the
// top corner, so a visitor can switch language before they even sign in.
// Layout and look follow the AiLunaPro_Voice_Dashboard template. See BRAND.md.

import type { ReactNode } from "react";

import { LanguageMenu } from "@/components/brand/LanguageMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { useI18n } from "@/i18n";

export function AuthShell({
  children,
  enterpriseSlot,
}: {
  children: ReactNode;
  enterpriseSlot?: ReactNode;
}) {
  const { t } = useI18n();
  const a = t.auth;

  return (
    <div className="grid min-h-screen w-full bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      {/* Form column (LEFT) — scrolls and stays centered so tall forms never clip. */}
      <main className="auth-imprint relative flex min-h-screen flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
          <div className="lg:invisible">
            <BrandLogo pill className="h-5" />
          </div>
          <LanguageMenu />
        </div>

        <div className="flex flex-1 items-center justify-center p-5 sm:p-10">
          <div className="al-auth-card w-full max-w-[420px] space-y-6">{children}</div>
        </div>
      </main>

      {/* Brand panel (RIGHT) — hidden on mobile */}
      <aside className="al-auth-panel relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div className="relative">
          <BrandLogo className="h-7" />
        </div>

        <div className="relative max-w-md space-y-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ailunapro-mark.png"
            alt=""
            aria-hidden
            className="al-float h-28 w-28 select-none drop-shadow-[0_0_40px_rgba(34,211,238,0.35)]"
          />
          <h1 className="al-gradient-text text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
            {a.tagline}
          </h1>
          <ul className="flex flex-wrap gap-2">
            {a.highlights.map((point) => (
              <li
                key={point}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mb-4 max-w-md space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-zinc-100">{a.enterpriseTitle}</h2>
          <p className="text-sm leading-relaxed text-zinc-400">{a.enterpriseBody}</p>
          {enterpriseSlot}
        </div>
      </aside>
    </div>
  );
}
