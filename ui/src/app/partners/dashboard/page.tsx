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
    howTitle: "Comment ça marche",
    steps: [
      "Partagez votre lien. Toute personne qui s'inscrit par ce lien vous est créditée automatiquement.",
      "Elle obtient une remise sur son abonnement — c'est votre argument, pas un service qu'on vous rend.",
      "Vous êtes payé chaque mois. Cet espace affiche chaque inscription et chaque euro, lus en direct depuis Stripe.",
    ],
    lostTitle: "Vous n'avez plus le lien ?",
    lostBody: "Votre espace s'ouvre depuis le lien personnel envoyé par e-mail à votre inscription (objet : « votre code partenaire »). Retrouvez cet e-mail et cliquez sur le bouton, ou collez ci-dessous le code et le jeton qu'il contient.",
    badTitle: "Ce lien ne fonctionne pas",
    badBody: "Le jeton est incomplet ou ne correspond pas au code. Reprenez le lien depuis l'e-mail reçu à votre inscription — en le copiant en entier, il est long.",
    retry: "Saisir mes identifiants",
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
    howTitle: "How it works",
    steps: [
      "Share your link. Anyone who signs up through it is credited to you automatically.",
      "They get a discount on their subscription — that is your argument, not a favour to you.",
      "You get paid monthly. This space shows every sign-up and every euro, read live from Stripe.",
    ],
    lostTitle: "Lost your link?",
    lostBody: "Your space opens from the personal link emailed at sign-up (subject: \"your partner code\"). Find that email and click the button, or paste the code and token it contains below.",
    badTitle: "This link does not work",
    badBody: "The token is incomplete or does not match the code. Take the link from your sign-up email again — copy all of it, it is long.",
    retry: "Enter my credentials",
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

  // No credentials yet. A partner who lands here is lost, so the page explains
  // the programme and where the link lives before asking for anything.
  if (!creds) {
    return (
      <div className="mx-auto max-w-xl space-y-5 p-6">
        <div>
          <h1 className="text-2xl font-semibold">{t.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.noLink}</p>
        </div>

        <div className="card-weave space-y-3 border p-5">
          <h2 className="text-sm font-semibold">{t.howTitle}</h2>
          <ol className="space-y-2.5">
            {t.steps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-foreground">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="card-weave space-y-2 border p-5">
          <h2 className="text-sm font-semibold">{t.lostTitle}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t.lostBody}</p>
        </div>

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
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <div className="card-weave space-y-2 border border-red-500/30 bg-red-500/[0.04] p-5">
          <h1 className="text-lg font-semibold">{t.badTitle}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{t.badBody}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => {
              setCreds(null);
              setError(null);
            }}
          >
            {t.retry}
          </button>
          <a href="/partners" className="rounded-md border border-border px-4 py-2 text-sm">
            {t.join}
          </a>
        </div>
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
