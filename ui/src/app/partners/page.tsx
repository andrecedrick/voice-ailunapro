"use client";

/** Influencer sign-up → LUNA-<HANDLE> code + private dashboard. OURS. */
import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/i18n";
import { errorDetail, growthApi, type PartnerCreated } from "@/lib/ailunapro-api";

const TXT = {
  fr: {
    title: "Programme partenaires Voice AiLunaPro",
    sub: "Recevez votre code LUNA-… : vos abonnés obtiennent une remise, vous touchez une commission chaque mois tant qu'ils restent clients.",
    name: "Nom",
    email: "E-mail",
    handle: "Pseudo (réseaux sociaux / Whop)",
    submit: "Obtenir mon code",
    done: "Votre code est prêt — le lien du tableau de bord vous a aussi été envoyé par e-mail.",
    code: "Code",
    share: "Lien à partager",
    dash: "Ouvrir mon tableau de bord",
    terms: (p: number, c: number) => `Vos abonnés : −${p} % le 1er mois. Vous : ${c} % du revenu mensuel récurrent généré.`,
    errors: { code_taken: "Ce pseudo est déjà pris.", invalid_handle: "Pseudo invalide." } as Record<string, string>,
  },
  en: {
    title: "Voice AiLunaPro partner programme",
    sub: "Get your LUNA-… code: your audience gets a discount, you earn a monthly commission for as long as they stay.",
    name: "Name",
    email: "Email",
    handle: "Handle (social / Whop)",
    submit: "Get my code",
    done: "Your code is ready — the dashboard link was also emailed to you.",
    code: "Code",
    share: "Link to share",
    dash: "Open my dashboard",
    terms: (p: number, c: number) => `Your audience: −${p}% on month one. You: ${c}% of the recurring revenue generated.`,
    errors: { code_taken: "This handle is already taken.", invalid_handle: "Invalid handle." } as Record<string, string>,
  },
};

export default function PartnersPage() {
  const { locale } = useI18n();
  const t = locale === "fr" ? TXT.fr : TXT.en;
  const [form, setForm] = useState({ name: "", email: "", handle: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<PartnerCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await growthApi.createPartner(form);
    setBusy(false);
    if (r.error || !r.data) {
      const d = errorDetail(r.error) ?? "error";
      setError(t.errors[d] ?? d);
      return;
    }
    setRes(r.data);
  };

  const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.sub}</p>
      </div>
      {res ? (
        <div className="card-weave space-y-3 border p-5 text-sm">
          <p className="flex items-center gap-2 text-emerald-400"><Check className="h-4 w-4" /> {t.done}</p>
          <p>{t.code} : <b className="font-mono">{res.code}</b></p>
          <p className="flex flex-wrap items-center gap-2">
            {t.share} : <span className="font-mono">{res.share_url}</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-cyan-300"
              onClick={() => void navigator.clipboard.writeText(res.share_url).then(() => setCopied(true))}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </p>
          <p className="text-muted-foreground">{t.terms(res.percent_off, res.commission_pct)}</p>
          <a href={res.dashboard_url} className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground">
            {t.dash}
          </a>
        </div>
      ) : (
        <form onSubmit={submit} className="card-weave space-y-3 border p-5">
          <input className={field} required placeholder={t.name} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={field} required type="email" placeholder={t.email} value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={field} required placeholder={t.handle} value={form.handle}
            onChange={(e) => setForm({ ...form, handle: e.target.value })} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.submit}
          </button>
        </form>
      )}
    </div>
  );
}
