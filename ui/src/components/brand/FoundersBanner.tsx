"use client";

/**
 * Founders offer banner. OURS — see api/services/billing/growth.py.
 * Everything shown is real: seats counted in Stripe, one fixed end date for
 * every visitor, discount dropping wave by wave. Hidden once the offer closes.
 */
import { Flame, Timer, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n";
import { type FoundersOffer, growthApi } from "@/lib/ailunapro-api";

type Txt = {
  title: string;
  wave: (w: number, left: number) => string;
  discount: (p: number) => string;
  lifetime: string;
  next: (p: number) => string;
  lastWave: string;
  seats: (left: number, total: number) => string;
  ends: string;
  units: [string, string, string, string];
};

const TXT: Record<string, Txt> = {
  fr: {
    title: "Offre Fondateurs",
    wave: (w, left) => `Vague ${w} : plus que ${left} place${left > 1 ? "s" : ""}`,
    discount: (p) => `−${p} % sur le 1er mois`,
    lifetime: "Prix actuels garantis à vie",
    next: (p) => (p > 0 ? `Vague suivante : −${p} %` : "Vague suivante : sans remise"),
    lastWave: "Dernière vague avant les nouveaux prix",
    seats: (l, t) => `${l} / ${t} places Fondateur restantes`,
    ends: "Fin de l'offre dans",
    units: ["j", "h", "min", "s"],
  },
  en: {
    title: "Founders offer",
    wave: (w, left) => `Wave ${w}: only ${left} seat${left > 1 ? "s" : ""} left`,
    discount: (p) => `−${p}% off your first month`,
    lifetime: "Today's prices locked for life",
    next: (p) => (p > 0 ? `Next wave: −${p}%` : "Next wave: no discount"),
    lastWave: "Last wave before new prices",
    seats: (l, t) => `${l} / ${t} founder seats left`,
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
  const taken = (offer.seats_taken / offer.seats_total) * 100;

  return (
    <div className="card-weave relative overflow-hidden border border-cyan-400/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
            <Flame className="h-4 w-4" /> {t.title}
          </div>
          <div className="text-lg font-semibold">{t.wave(offer.wave, offer.wave_seats_left)}</div>
          <div className="text-sm text-muted-foreground">
            {offer.percent_off > 0 ? `${t.discount(offer.percent_off)} · ` : ""}
            {t.lifetime}
            {" · "}
            {offer.next_percent_off === null ? t.lastWave : t.next(offer.next_percent_off)}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <Timer className="h-3.5 w-3.5" /> {t.ends}
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums">
            {parts.map((v, i) => (
              <span key={i} className="ml-2">
                {String(v).padStart(2, "0")}
                <span className="text-sm font-normal text-muted-foreground">{t.units[i]}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> {t.seats(offer.seats_left, offer.seats_total)}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${taken}%` }} />
        </div>
      </div>
    </div>
  );
}
