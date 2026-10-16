"use client";

/**
 * Partner dashboard. OURS — see api/services/billing/growth.py.
 *
 * Opened from the signed link emailed at sign-up (?code=&token=). Those
 * credentials are then remembered in this browser, so the sidebar entry works
 * without the link. Payout is a request: nothing is transferred automatically,
 * the figures are emailed to us and paid by hand after checking.
 */
import { BadgeEuro, Check, Loader2, Users, Wallet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { useI18n } from "@/i18n";
import {
  errorDetail,
  growthApi,
  type PartnerStats,
  rememberPartner,
  storedPartner,
} from "@/lib/ailunapro-api";

const TXT = {
  fr: {
    title: "Espace partenaire",
    signups: "Inscriptions avec votre code",
    active: "Clients actifs",
    earning: "Encore rémunérés",
    mrr: "Revenu mensuel généré",
    com: "Votre commission ce mois-ci",
    terms: (f: number, r: number, m: number) => `${f} % du 1er paiement, puis ${r} % pendant ${m} mois.`,
    noLink: "Ouvrez le lien reçu par e-mail à votre inscription, ou collez votre code et votre jeton ci-dessous.",
    code: "Code (LUNA-…)",
    token: "Jeton du lien",
    open: "Ouvrir mon espace",
    bad: "Lien ou jeton invalide.",
    join: "Pas encore partenaire ? Obtenir mon code",
    payout: "Demander mon paiement",
    payoutSending: "Envoi…",
    payoutDone: "Demande envoyée. Nous vérifions puis vous payons manuellement.",
    payoutNone: "Aucune commission à verser pour l'instant.",
    payoutNote: "Paiement manuel après vérification, sous 7 jours ouvrés. Les paiements de moins de 30 jours ne sont pas encore éligibles (délai de remboursement).",
  },
  en: {
    title: "Partner space",
    signups: "Sign-ups with your code",
    active: "Active customers",
    earning: "Still earning",
    mrr: "Monthly revenue generated",
    com: "Your commission this month",
    terms: (f: number, r: number, m: number) => `${f}% of the first payment, then ${r}% for ${m} months.`,
    noLink: "Open the link emailed at sign-up, or paste your code and token below.",
    code: "Code (LUNA-…)",
    token: "Link token",
    open: "Open my space",
    bad: "Invalid link or token.",
    join: "Not a partner yet? Get my code",
    payout: "Request my payout",
    payoutSending: "Sending…",
    payoutDone: "Request sent. We check it and pay you by hand.",
    payoutNone: "No commission to pay out yet.",
    payoutNote: "Paid manually after review, within 7 business days. Payments under 30 days old are not eligible yet (refund window).",
  },
};

function Dashboard() {
  const { locale, tag } = useI18n();
  const t = locale === "fr" ? TXT.fr : TXT.en;
  const params = useSearchParams();

  const [creds, setCreds] = useState<{ code: string; token: string } | null>(null);
  const [form, setForm] = useState({ code: "", token: "" });
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payout, setPayout] = useState<"idle" | "busy" | "done">("idle");

  useEffect(() => {
    const code = params.get("code");
    const token = params.get("token");
    if (code && token) {
      rememberPartner(code.toUpperCase(), token);
      setCreds({ code: code.toUpperCase(), token });
      return;
    }
    setCreds(storedPartner());
  }, [params]);

  const load = useCallback(async (c: { code: string; token: string }) => {
    const r = await growthApi.partnerStats(c.code, c.token);
    if (r.error || !r.data) {
      setError(errorDetail(r.error) === "invalid_token" ? t.bad : (errorDetail(r.error) ?? t.bad));
      return;
    }
    setError(null);
    setStats(r.data);
  }, [t.bad]);

  useEffect(() => {
    if (creds) void load(creds);
  }, [creds, load]);

  const eur = (c: number) => new Intl.NumberFormat(tag, { style: "currency", currency: "EUR" }).format(c / 100);
  const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  // No credentials yet: let the partner paste them, or go sign up.
  if (!creds) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.noLink}</p>
        <form
          className="card-weave space-y-3 border p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const c = { code: form.code.trim().toUpperCase(), token: form.token.trim() };
            rememberPartner(c.code, c.token);
            setCreds(c);
          }}
        >
          <input className={field} required placeholder={t.code} value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className={field} required placeholder={t.token} value={form.token}
            onChange={(e) => setForm({ ...form, token: e.target.value })} />
          <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">{t.open}</button>
        </form>
        <a href="/partners" className="inline-block text-sm text-[color:var(--al-accent)]">{t.join}</a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6">
        <p className="text-sm text-red-400">{error}</p>
        <button
          className="rounded-md border border-border px-4 py-2 text-sm"
          onClick={() => {
            setCreds(null);
            setError(null);
          }}
        >
          {t.open}
        </button>
      </div>
    );
  }

  if (!stats) return <Loader2 className="m-6 h-5 w-5 animate-spin" />;

  const tiles: [typeof Users, string, string][] = [
    [Users, t.signups, String(stats.signups)],
    [Users, t.active, String(stats.active)],
    [BadgeEuro, t.earning, `${stats.earning} / ${stats.active}`],
    [BadgeEuro, t.mrr, eur(stats.mrr_cents)],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t.title} · <span className="font-mono">{stats.code}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.terms(stats.first_pct, stats.recurring_pct, stats.months)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map(([Icon, label, value]) => (
          <div key={label} className="card-weave border p-5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5" /> {label}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {/* Payout: a request, never an automatic transfer. */}
      <div className="card-weave space-y-3 border p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> {t.com}
            </div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{eur(stats.commission_cents)}</div>
          </div>
          {payout === "done" ? (
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <Check className="h-4 w-4" /> {t.payoutDone}
            </p>
          ) : (
            <button
              disabled={payout === "busy" || stats.commission_cents <= 0}
              onClick={async () => {
                setPayout("busy");
                const r = await growthApi.requestPayout(stats.code, creds.token);
                setPayout(r.error ? "idle" : "done");
                if (r.error) setError(errorDetail(r.error) ?? t.bad);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {payout === "busy" && <Loader2 className="h-4 w-4 animate-spin" />}
              {stats.commission_cents > 0 ? (payout === "busy" ? t.payoutSending : t.payout) : t.payoutNone}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t.payoutNote}</p>
      </div>
    </div>
  );
}

export default function PartnerDashboardPage() {
  return (
    <Suspense fallback={<Loader2 className="m-6 h-5 w-5 animate-spin" />}>
      <Dashboard />
    </Suspense>
  );
}
