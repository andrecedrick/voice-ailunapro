"use client";

/**
 * Founders offer banner. OURS — see api/services/billing/growth.py.
 * Everything shown is real: seats counted in Stripe, one fixed end date for
 * every visitor, discount dropping wave by wave. Hidden once the offer closes.
 * Styled for both themes: own dark surface, so it reads the same on white.
 */
import { Flame, Infinity as InfinityIcon, Timer, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n";
import { type FoundersOffer, growthApi } from "@/lib/ailunapro-api";

type Txt = {
  tag: string;
  title: (p: number) => string;
  titleNoDiscount: string;
  sub: (left: number, total: number) => string;
  lifetime: string;
  lifetimeSub: string;
  nextWave: (p: number) => string;
  lastWave: string;
  seatsLeft: (n: number) => string;
  taken: (n: number) => string;
  ends: string;
  units: [string, string, string, string];
};

const TXT: Record<string, Txt> = {
  fr: {
    tag: "OFFRE FONDATEURS",
    title: (p) => `−${p} % sur votre 1er mois`,
    titleNoDiscount: "Prix Fondateur, garanti à vie",
    sub: (left, total) => `Il reste ${left} place${left > 1 ? "s" : ""} sur ${total}`,
    lifetime: "À vie",
    lifetimeSub: "Vos prix n'augmenteront jamais",
    nextWave: (p) => (p > 0 ? `Ensuite : −${p} %` : "Ensuite : plus de remise"),
    lastWave: "Dernière vague avant la hausse des prix",
    seatsLeft: (n) => `${n} restante${n > 1 ? "s" : ""}`,
    taken: (n) => `${n} déjà prise${n > 1 ? "s" : ""}`,
    ends: "L'offre se termine dans",
    units: ["j", "h", "min", "s"],
  },
  en: {
    tag: "FOUNDERS OFFER",
    title: (p) => `−${p}% on your first month`,
    titleNoDiscount: "Founder pricing, locked for life",
    sub: (left, total) => `${left} seat${left > 1 ? "s" : ""} left out of ${total}`,
    lifetime: "For life",
    lifetimeSub: "Your price will never go up",
    nextWave: (p) => (p > 0 ? `Then: −${p}%` : "Then: no discount left"),
    lastWave: "Last wave before prices rise",
    seatsLeft: (n) => `${n} left`,
    taken: (n) => `${n} taken`,
    ends: "Offer ends in",
    units: ["d", "h", "min", "s"],
  },
};

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function FoundersBanner() {
  const { locale } = useI18n();
  const t = TXT[locale] ?? TXT.en;
  const [offer, setOffer] = useState<FoundersOffer | null>(null);
  const now = useNow();

  useEffect(() => {
    void growthApi.founders().then((r) => setOffer(r.error ? null : (r.data ?? null)));
  }, []);

  if (!offer?.open) return null;
  const left = Math.max(0, new Date(offer.ends_at).getTime() - now);
  if (left === 0) return null;

  const parts = [86400_000, 3600_000, 60_000, 1000].map((unit, i, all) =>
    Math.floor((i === 0 ? left : left % all[i - 1]) / unit),
  );
  const pctTaken = Math.round((offer.seats_taken / offer.seats_total) * 100);
  const urgent = offer.wave_seats_left <= 3;

  return (
    <div className="relative overflow-hidden rounded-2xl p-[1.5px] shadow-[0_18px_48px_-12px_rgba(124,58,237,0.55)]">
      {/* Gradient edge */}
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#7C3AED,#22D3EE,#A855F7)]" />

      <div className="relative overflow-hidden rounded-[15px] bg-[#0B1020] px-6 py-5 text-white">
        {/* Soft glows */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#7C3AED]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-10 h-64 w-64 rounded-full bg-[#22D3EE]/20 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
          {/* Left: the offer */}
          <div className="min-w-[260px] flex-1 space-y-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/40 bg-[#22D3EE]/10 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#67E8F9]">
              <Flame className="h-3 w-3" /> {t.tag}
            </span>

            <h3 className="font-[family-name:var(--font-sora)] text-[26px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
              {offer.percent_off > 0 ? (
                <span className="bg-[linear-gradient(135deg,#C4B5FD,#67E8F9)] bg-clip-text text-transparent">
                  {t.title(offer.percent_off)}
                </span>
              ) : (
                t.titleNoDiscount
              )}
            </h3>

            <p className="text-sm text-slate-300">
              <span className={urgent ? "font-semibold text-[#FDA4AF]" : "font-semibold text-white"}>
                {t.sub(offer.seats_left, offer.seats_total)}
              </span>
              {" · "}
              {offer.next_percent_off === null ? t.lastWave : t.nextWave(offer.next_percent_off)}
            </p>
          </div>

          {/* Middle: lifetime promise */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <InfinityIcon className="h-5 w-5 shrink-0 text-[#67E8F9]" />
            <div className="leading-tight">
              <div className="font-[family-name:var(--font-sora)] text-base font-bold">{t.lifetime}</div>
              <div className="text-xs text-slate-400">{t.lifetimeSub}</div>
            </div>
          </div>

          {/* Right: countdown */}
          <div className="text-right">
            <div className="mb-1.5 flex items-center justify-end gap-1.5 text-[11px] uppercase tracking-wider text-slate-400">
              <Timer className="h-3.5 w-3.5" /> {t.ends}
            </div>
            <div className="flex gap-1.5">
              {parts.map((v, i) => (
                <div
                  key={i}
                  className="min-w-[54px] rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5 text-center"
                >
                  <div className="font-mono text-[22px] font-bold leading-none tabular-nums">
                    {String(v).padStart(2, "0")}
                  </div>
                  <div className="mt-1 text-[10px] uppercase text-slate-400">{t.units[i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Seats bar */}
        <div className="relative mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Users className="h-3.5 w-3.5" /> {t.taken(offer.seats_taken)}
            </span>
            <span className={urgent ? "font-semibold text-[#FDA4AF]" : "text-slate-300"}>
              {t.seatsLeft(offer.seats_left)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#22D3EE,#7C3AED)] transition-[width] duration-700"
              style={{ width: `${Math.max(pctTaken, 2)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
