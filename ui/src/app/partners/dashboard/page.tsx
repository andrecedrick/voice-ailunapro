"use client";

/** Influencer dashboard: signups, active customers, commission. OURS. */
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useI18n } from "@/i18n";
import { errorDetail, growthApi, type PartnerStats } from "@/lib/ailunapro-api";

const TXT = {
  fr: {
    title: "Tableau de bord partenaire",
    signups: "Inscriptions avec votre code",
    active: "Clients actifs",
    mrr: "Revenu mensuel généré",
    com: "Votre commission ce mois-ci",
    earning: "Encore rémunérés",
    bad: "Lien invalide.",
    terms: (f: number, r: number, m: number) => `${f} % du 1er paiement, puis ${r} % pendant ${m} mois.`,
    window: (n: number, total: number) => `${n} client(s) sur ${total} encore dans la fenêtre de ${total === n ? "" : ""}commission.`,
  },
  en: {
    title: "Partner dashboard",
    signups: "Sign-ups with your code",
    active: "Active customers",
    mrr: "Monthly revenue generated",
    com: "Your commission this month",
    earning: "Still earning",
    bad: "Invalid link.",
    terms: (f: number, r: number, m: number) => `${f}% of the first payment, then ${r}% for ${m} months.`,
    window: (n: number, total: number) => `${n} of ${total} customers still inside the commission window.`,
  },
};

function Dashboard() {
  const { locale, tag } = useI18n();
  const t = locale === "fr" ? TXT.fr : TXT.en;
  const params = useSearchParams();
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const token = params.get("token");
    if (!code || !token) return setError(t.bad);
    void growthApi.partnerStats(code, token).then((r) =>
      r.error || !r.data ? setError(errorDetail(r.error) === "invalid_token" ? t.bad : errorDetail(r.error) ?? t.bad) : setStats(r.data),
    );
  }, [params, t.bad]);

  const eur = (c: number) => new Intl.NumberFormat(tag, { style: "currency", currency: "EUR" }).format(c / 100);

  if (error) return <p className="p-6 text-sm text-red-400">{error}</p>;
  if (!stats) return <Loader2 className="m-6 h-5 w-5 animate-spin" />;
  const tiles = [
    [t.signups, String(stats.signups)],
    [t.active, String(stats.active)],
    [t.earning, `${stats.earning} / ${stats.active}`],
    [t.mrr, eur(stats.mrr_cents)],
    [t.com, eur(stats.commission_cents)],
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">{t.title} · <span className="font-mono">{stats.code}</span></h1>
      <p className="text-sm text-muted-foreground">
        {t.terms(stats.first_pct, stats.recurring_pct, stats.months)}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map(([label, value]) => (
          <div key={label} className="card-weave border p-5">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
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
