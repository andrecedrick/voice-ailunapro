"use client";

/**
 * Partner programme landing + sign-up. OURS — design from AiLunaPro_Voice_Partners.html.
 * Terms come from the API (/ailunapro/partners/terms) so the page never shows a
 * rate the backend does not pay. The code card is labelled as an example.
 */
import { Check, Copy, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/i18n";
import { errorDetail, growthApi, type PartnerCreated } from "@/lib/ailunapro-api";

type Terms = { percent_off: number; first_pct: number; recurring_pct: number; months: number };
const DEFAULT_TERMS: Terms = { percent_off: 20, first_pct: 40, recurring_pct: 15, months: 6 };
const PLANS = [39, 149, 449, 999];

const T = {
  fr: {
    badge: "PROGRAMME PARTENAIRES",
    badgeSub: "Commission récurrente, chaque mois",
    h1a: "Un lien. Un code.",
    h1b: "Des revenus qui tombent chaque mois.",
    lead: "Recevez votre code LUNA en 30 secondes. Votre audience économise dès le premier mois, et vous encaissez 40 % du premier paiement, puis 15 % pendant 6 mois. Sans plafond, sans minimum.",
    cta: "Obtenir mon code — gratuit",
    estimate: "Estimer mes gains",
    rate: "sur le 1er paiement",
    off: "de remise pour votre audience",
    lifetime: "6 mois",
    lifetimeSub: "de commissions par client",
    example: "EXEMPLE",
    yourCode: "VOTRE CODE PARTENAIRE",
    active: "Actif",
    exampleNote: (first: number, rec: number, m: number) => `${first} % sur le 1er paiement, puis ${rec} % pendant ${m} mois.`,
    howTag: "01 — FONCTIONNEMENT",
    howTitle: "De l'inscription au paiement en trois étapes",
    steps: [
      ["Recevez votre code", "Nom, e-mail, pseudo. Votre code LUNA et votre tableau de bord sont créés instantanément — c'est gratuit."],
      ["Partagez-le partout", "Whop, YouTube, TikTok, Instagram, newsletter. Votre audience obtient une remise immédiate : un vrai argument, pas une promesse."],
      ["Encaissez chaque mois", "40 % du premier paiement, puis 15 % pendant 6 mois. Chaque euro est suivi en temps réel dans votre tableau de bord."],
    ],
    earnTag: "02 — GAINS",
    earnTitle: "Combien ça rapporte, concrètement ?",
    earnSub: "Ajustez selon votre audience. Les chiffres sont calculés sur nos vraies formules.",
    subs: "Abonnés parrainés",
    plan: "Formule moyenne / mois",
    monthly: "Vos gains sur 6 mois",
    yearly: "Dont le 1er mois",
    rateLbl: "Par client",
    disclaimer: "Estimation indicative, hors remise appliquée au client. Commissions versées chaque mois sur les abonnements actifs et payés, après le délai de remboursement de 30 jours.",
    claim: "Votre code LUNA vous attend",
    claimSub: "Gratuit, sans engagement, sans volume minimum. Prêt en 30 secondes.",
    perks: (t: Terms) => [
      `${t.first_pct} % du 1er paiement, puis ${t.recurring_pct} % pendant ${t.months} mois`,
      `−${t.percent_off} % offerts à votre audience`,
      "Suivi en temps réel, paiements via Stripe",
      "Aucun plafond de gains",
    ],
    name: "Nom",
    email: "E-mail",
    handle: "Pseudo",
    handleHint: "Réseau social ou Whop — sert à créer votre code",
    submit: "Obtenir mon code",
    payouts: "Paiements sécurisés via Stripe.",
    done: "CODE CRÉÉ",
    welcome: (n: string) => `Bienvenue, ${n}.`,
    copy: "Copier le lien",
    copied: "Copié",
    sent: (e: string) => `Le lien de votre tableau de bord a été envoyé à ${e}. Chaque abonnement payé avec votre code est suivi automatiquement.`,
    dash: "Ouvrir mon tableau de bord",
    faqTitle: "Questions fréquentes",
    faqs: (t: Terms) => [
      ["Combien vais-je gagner ?", `${t.first_pct} % du premier paiement de chaque filleul, puis ${t.recurring_pct} % de ses paiements suivants pendant ${t.months} mois. Exemple : un client Pro à 149 € vous rapporte environ 160 € au total.`],
      ["Quand suis-je payé ?", "Chaque mois, pour les paiements encaissés depuis plus de 30 jours — le temps du délai de remboursement."],
      ["Comment mes filleuls sont-ils suivis ?", "Par votre lien ?ref=LUNA-… (mémorisé 30 jours) ou par votre code saisi au paiement. Les deux sont crédités automatiquement."],
      ["Puis-je cumuler avec l'Offre Fondateurs ?", "Votre audience obtient la meilleure des deux remises, et vous êtes crédité dans tous les cas."],
      ["Y a-t-il un minimum ?", "Aucun. Pas de volume minimum, pas de plafond, pas d'engagement."],
      ["Et si mon filleul change de formule ?", "La commission suit le montant réellement payé. S'il passe à une formule supérieure, vous gagnez davantage."],
    ],
    errors: { code_taken: "Ce pseudo est déjà pris.", invalid_handle: "Pseudo invalide.", stripe_unavailable: "Service momentanément indisponible, réessayez dans quelques minutes." } as Record<string, string>,
  },
  en: {
    badge: "PARTNER PROGRAMME",
    badgeSub: "Recurring commission, every month",
    h1a: "One link. One code.",
    h1b: "Revenue that lands every month.",
    lead: "Get your LUNA code in 30 seconds. Your audience saves from month one, and you earn 40% of the first payment, then 15% for 6 months. No cap, no minimum.",
    cta: "Get my code — free",
    estimate: "Estimate earnings",
    rate: "on the first payment",
    off: "off for your audience",
    lifetime: "6 months",
    lifetimeSub: "of commission per customer",
    example: "EXAMPLE",
    yourCode: "YOUR PARTNER CODE",
    active: "Active",
    exampleNote: (first: number, rec: number, m: number) => `${first}% on the first payment, then ${rec}% for ${m} months.`,
    howTag: "01 — HOW IT WORKS",
    howTitle: "From sign-up to payout in three steps",
    steps: [
      ["Get your code", "Name, email, handle. Your LUNA code and dashboard are created instantly — free."],
      ["Share it anywhere", "Whop, YouTube, TikTok, Instagram, newsletter. Your audience gets a real discount, not a vague promise."],
      ["Get paid monthly", "40% of the first payment, then 15% for 6 months. Every euro tracked live in your dashboard."],
    ],
    earnTag: "02 — EARNINGS",
    earnTitle: "What does it actually pay?",
    earnSub: "Match it to your audience. Figures use our real plan prices.",
    subs: "Referred subscribers",
    plan: "Average plan / month",
    monthly: "Your earnings over 6 months",
    yearly: "Of which month one",
    rateLbl: "Per customer",
    disclaimer: "Indicative estimate, before the discount applied to the customer. Commissions are paid monthly on active, paid subscriptions, after the 30-day refund window.",
    claim: "Your LUNA code is waiting",
    claimSub: "Free, no commitment, no minimum volume. Ready in 30 seconds.",
    perks: (t: Terms) => [
      `${t.first_pct}% of the first payment, then ${t.recurring_pct}% for ${t.months} months`,
      `−${t.percent_off}% for your audience`,
      "Live tracking, payouts via Stripe",
      "No earnings cap",
    ],
    name: "Name",
    email: "Email",
    handle: "Handle",
    handleHint: "Social or Whop — used to build your code",
    submit: "Get my code",
    payouts: "Payouts handled securely via Stripe.",
    done: "CODE GENERATED",
    welcome: (n: string) => `Welcome aboard, ${n}.`,
    copy: "Copy link",
    copied: "Copied",
    sent: (e: string) => `We've sent your dashboard link to ${e}. Every paid subscription with your code is tracked automatically.`,
    dash: "Open my dashboard",
    faqTitle: "Questions, answered",
    faqs: (t: Terms) => [
      ["How much will I earn?", `${t.first_pct}% of each referral's first payment, then ${t.recurring_pct}% of their next payments for ${t.months} months. A Pro customer at €149 is worth roughly €160 in total.`],
      ["When do I get paid?", "Monthly, for payments collected more than 30 days ago — the refund window."],
      ["How are referrals tracked?", "Through your ?ref=LUNA-… link (remembered 30 days) or your code entered at checkout. Both are credited automatically."],
      ["Does it stack with the Founders offer?", "Your audience gets the better of the two discounts, and you are credited either way."],
      ["Is there a minimum?", "None. No minimum volume, no cap, no commitment."],
      ["What if my referral upgrades?", "Commission follows what they actually pay. If they move to a bigger plan, you earn more."],
    ],
    errors: { code_taken: "This handle is already taken.", invalid_handle: "Invalid handle.", stripe_unavailable: "Service temporarily unavailable, please retry in a few minutes." } as Record<string, string>,
  },
};

const GRAD = "bg-[linear-gradient(135deg,#7C3AED,#22D3EE)]";
const TEXT_GRAD = "bg-[linear-gradient(135deg,#A855F7,#22D3EE)] bg-clip-text text-transparent";
const MONO = "font-mono text-[11px] tracking-[0.14em]";
const CARD = "rounded-[20px] border border-white/[0.07] bg-[#0E1530]";

export default function PartnersPage() {
  const { locale } = useI18n();
  const t = locale === "fr" ? T.fr : T.en;
  const [terms, setTerms] = useState<Terms>(DEFAULT_TERMS);
  const [subs, setSubs] = useState(20);
  const [price, setPrice] = useState(149);
  const [form, setForm] = useState({ name: "", email: "", handle: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<PartnerCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<number | null>(0);

  useEffect(() => {
    void growthApi.terms().then((r) => r.data && setTerms(r.data));
  }, []);

  const eur = (v: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
  // 40 % of the first payment, then 15 % for the rest of the window.
  const perCustomer = useMemo(
    () => (price * terms.first_pct) / 100 + (price * terms.recurring_pct * (terms.months - 1)) / 100,
    [price, terms],
  );
  const firstMonth = (subs * price * terms.first_pct) / 100;
  const total = subs * perCustomer;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await growthApi.createPartner(form);
    setBusy(false);
    if (r.error || !r.data) {
      const d = errorDetail(r.error) ?? "stripe_unavailable";
      setError(t.errors[d] ?? d);
      return;
    }
    setRes(r.data);
  };

  const input =
    "w-full rounded-xl border border-white/[0.12] bg-[rgba(7,11,23,0.6)] px-4 py-3.5 text-[15px] outline-none focus:border-[#22D3EE] focus:shadow-[0_0_0_3px_rgba(34,211,238,0.18)]";
  const exampleCode = `LUNA-${(form.handle || "ALEX").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 20) || "ALEX"}`;

  return (
    <div className="mx-auto max-w-[1200px] text-[#F8FAFC]">
      {/* Hero */}
      <header className="grid items-center gap-16 px-6 pb-16 pt-12 [grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))]">
        <div className="flex flex-col gap-7">
          <div className="inline-flex items-center gap-2.5 self-start rounded-full border border-[rgba(124,58,237,0.3)] bg-[linear-gradient(90deg,rgba(124,58,237,0.16),rgba(34,211,238,0.07))] py-1.5 pl-1.5 pr-3.5">
            <span className={`${MONO} rounded-full bg-[#22D3EE] px-2.5 py-1 text-[10px] text-[#070B17]`}>{t.badge}</span>
            <span className="text-[13px] text-[#CBD5E1]">{t.badgeSub}</span>
          </div>
          <h1 className="font-[family-name:var(--font-sora)] text-[clamp(38px,5vw,62px)] font-extrabold leading-[1.04] tracking-[-0.035em]">
            {t.h1a} <span className={TEXT_GRAD}>{t.h1b}</span>
          </h1>
          <p className="max-w-[540px] text-lg leading-relaxed text-[#CBD5E1]">{t.lead}</p>
          <div className="flex flex-wrap gap-3">
            <a href="#apply" className={`${GRAD} rounded-xl px-7 py-4 text-[15px] font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-transform hover:-translate-y-0.5`}>{t.cta}</a>
            <a href="#earnings" className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-7 py-4 text-[15px] font-semibold hover:border-[rgba(124,58,237,0.5)]">{t.estimate}</a>
          </div>
          <div className="flex flex-wrap gap-10 border-t border-white/[0.07] pt-5">
            {[
              [`${terms.first_pct} %`, t.rate],
              [`−${terms.percent_off} %`, t.off],
              [t.lifetime, t.lifetimeSub],
            ].map(([v, l]) => (
              <div key={l} className="flex flex-col gap-1">
                <span className="font-[family-name:var(--font-sora)] text-[28px] font-bold">{v}</span>
                <span className="text-[13px] text-[#94A3B8]">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Example code card — clearly labelled, no invented results. */}
        <div className="relative rounded-[24px] border border-white/[0.12] bg-[rgba(14,21,48,0.72)] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <span className={`${MONO} text-[#C084FC]`}>{t.yourCode}</span>
            <span className={`${MONO} rounded-full border border-white/[0.12] px-2.5 py-1 text-[10px] text-[#94A3B8]`}>{t.example}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-dashed border-[rgba(192,132,252,0.5)] bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(34,211,238,0.08))] px-5 py-5">
            <span className="font-mono text-2xl tracking-[0.06em]">{exampleCode}</span>
            <span className="rounded-full bg-[#10B981]/15 px-2.5 py-1 text-xs text-[#10B981]">{t.active}</span>
          </div>
          <div className="mt-6 flex h-12 items-end gap-1">
            {Array.from({ length: 40 }).map((_, i) => (
              <span
                key={i}
                className="w-full rounded-full bg-[linear-gradient(180deg,#22D3EE,#7C3AED)]"
                style={{ height: `${30 + ((i * 37) % 70)}%`, animation: `wave ${0.9 + (i % 5) * 0.15}s ease-in-out ${i * 0.04}s infinite`, transformOrigin: "bottom" }}
              />
            ))}
          </div>
          <p className="mt-6 text-sm text-[#94A3B8]">
            {t.exampleNote(terms.first_pct, terms.recurring_pct, terms.months)}
          </p>
          <style>{`@keyframes wave{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}`}</style>
        </div>
      </header>

      {/* How it works */}
      <section id="how" className="px-6 py-16">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <span className={`${MONO} text-xs text-[#C084FC]`}>{t.howTag}</span>
          <h2 className="font-[family-name:var(--font-sora)] text-[clamp(30px,4vw,44px)] font-bold tracking-[-0.025em]">{t.howTitle}</h2>
        </div>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
          {t.steps.map(([title, text], i) => (
            <div key={title} className={`${CARD} flex flex-col gap-4 p-7 transition hover:-translate-y-0.5 hover:border-[rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.15)]`}>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.13)] font-[family-name:var(--font-sora)] font-bold text-[#A855F7]">{i + 1}</div>
                <span className="font-mono text-[13px] text-[#94A3B8]">0{i + 1}</span>
              </div>
              <span className="font-[family-name:var(--font-sora)] text-xl font-semibold">{title}</span>
              <span className="text-[15px] leading-relaxed text-[#94A3B8]">{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Earnings */}
      <section id="earnings" className="px-6 py-16">
        <div className="grid items-center gap-14 overflow-hidden rounded-[28px] border border-[rgba(124,58,237,0.28)] bg-[linear-gradient(135deg,rgba(124,58,237,0.15),rgba(34,211,238,0.06))] p-[clamp(28px,5vw,64px)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr))]">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3.5">
              <span className={`${MONO} text-xs text-[#22D3EE]`}>{t.earnTag}</span>
              <h2 className="font-[family-name:var(--font-sora)] text-[clamp(28px,3.6vw,40px)] font-bold tracking-[-0.025em]">{t.earnTitle}</h2>
              <p className="text-[#94A3B8]">{t.earnSub}</p>
            </div>
            <label className="flex flex-col gap-3">
              <span className="flex justify-between text-sm"><span className="text-[#CBD5E1]">{t.subs}</span><b className="font-[family-name:var(--font-sora)]">{subs}</b></span>
              <input type="range" min={1} max={200} value={subs} onChange={(e) => setSubs(Number(e.target.value))} className="w-full accent-[#7C3AED]" />
            </label>
            <div className="flex flex-col gap-3">
              <span className="flex justify-between text-sm"><span className="text-[#CBD5E1]">{t.plan}</span><b className="font-[family-name:var(--font-sora)]">{eur(price)}</b></span>
              <div className="grid grid-cols-4 gap-2">
                {PLANS.map((p) => (
                  <button key={p} type="button" onClick={() => setPrice(p)}
                    className={`rounded-lg border py-2 text-sm ${price === p ? "border-[#22D3EE] bg-[#22D3EE]/10" : "border-white/[0.12]"}`}>
                    {eur(p)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6 rounded-[22px] border border-white/[0.12] bg-[rgba(14,21,48,0.72)] p-9 shadow-[0_24px_64px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-[#94A3B8]">{t.monthly}</span>
              <span className={`font-[family-name:var(--font-sora)] text-[clamp(42px,5vw,58px)] font-extrabold ${TEXT_GRAD}`}>{eur(total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-[14px] border border-white/[0.07] bg-white/[0.04] p-4"><span className="text-xs text-[#94A3B8]">{t.yearly}</span><span className="font-[family-name:var(--font-sora)] text-[22px] font-bold">{eur(firstMonth)}</span></div>
              <div className="flex flex-col gap-1 rounded-[14px] border border-white/[0.07] bg-white/[0.04] p-4"><span className="text-xs text-[#94A3B8]">{t.rateLbl}</span><span className="font-[family-name:var(--font-sora)] text-[22px] font-bold text-[#22D3EE]">{eur(perCustomer)}</span></div>
            </div>
            <span className="text-xs leading-normal text-[#94A3B8]">{t.disclaimer}</span>
          </div>
        </div>
      </section>

      {/* Sign-up */}
      <section id="apply" className="px-6 py-16">
        <div className={`${CARD} grid overflow-hidden rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.5),0_0_0_1px_rgba(124,58,237,0.2)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]`}>
          <div className="flex flex-col justify-center gap-5 bg-[linear-gradient(160deg,rgba(124,58,237,0.32),rgba(34,211,238,0.08))] p-[clamp(32px,5vw,56px)]">
            {/* BRAND: wordmark, not the bare mark. See BRAND.md. */}
            <img src="/dograh-logo-inverse.png" alt="AiLunaPro" className="h-10 w-auto self-start object-contain" />
            <h2 className="font-[family-name:var(--font-sora)] text-[clamp(28px,3.6vw,40px)] font-bold tracking-[-0.025em]">{t.claim}</h2>
            <p className="text-[#CBD5E1]">{t.claimSub}</p>
            <div className="flex flex-col gap-2.5">
              {t.perks(terms).map((p) => (
                <div key={p} className="flex items-center gap-2.5 text-sm text-[#CBD5E1]"><Check className="h-[18px] w-[18px] text-[#22D3EE]" /> {p}</div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center p-[clamp(32px,5vw,56px)]">
            {res ? (
              <div className="flex flex-col gap-4">
                <span className={`${MONO} text-[#10B981]`}>{t.done}</span>
                <span className="font-[family-name:var(--font-sora)] text-2xl font-bold">{t.welcome(form.name.split(" ")[0] || "")}</span>
                <div className="flex items-center justify-between gap-3 rounded-[14px] border border-dashed border-[rgba(192,132,252,0.5)] bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(34,211,238,0.08))] px-5 py-4">
                  <span className="font-mono text-2xl tracking-[0.06em]">{res.code}</span>
                  <button type="button" onClick={() => void navigator.clipboard.writeText(res.share_url).then(() => setCopied(true))}
                    className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#7C3AED] px-3.5 py-2 text-[13px] font-semibold text-white">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? t.copied : t.copy}
                  </button>
                </div>
                <p className="break-all font-mono text-xs text-[#94A3B8]">{res.share_url}</p>
                <p className="text-sm text-[#94A3B8]">{t.sent(form.email)}</p>
                <a href={res.dashboard_url} className={`${GRAD} self-start rounded-xl px-5 py-3 text-sm font-semibold text-white`}>{t.dash}</a>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-sm text-[#CBD5E1]">{t.name}
                  <input className={input} required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Alex Morgan" />
                </label>
                <label className="flex flex-col gap-2 text-sm text-[#CBD5E1]">{t.email}
                  <input className={input} required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="alex@example.com" />
                </label>
                <label className="flex flex-col gap-2 text-sm text-[#CBD5E1]">{t.handle} <span className="text-xs text-[#94A3B8]">{t.handleHint}</span>
                  <input className={input} required minLength={2} value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="@alexmorgan" />
                </label>
                {error && <div className="rounded-[10px] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] px-3.5 py-2.5 text-sm text-[#EF4444]">{error}</div>}
                <button disabled={busy} className={`${GRAD} mt-1.5 inline-flex items-center justify-center gap-2 rounded-xl py-4 text-[15px] font-semibold text-white shadow-[0_0_28px_rgba(124,58,237,0.5)] active:scale-[0.97]`}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.submit}
                </button>
                <span className="text-center text-xs text-[#94A3B8]">{t.payouts}</span>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-[840px] px-6 pb-28 pt-16">
        <h2 className="mb-10 text-center font-[family-name:var(--font-sora)] text-[clamp(30px,4vw,42px)] font-bold tracking-[-0.025em]">{t.faqTitle}</h2>
        <div className="flex flex-col gap-3">
          {t.faqs(terms).map(([q, a], i) => (
            <div key={q} className={`${CARD} rounded-2xl ${open === i ? "border-[rgba(124,58,237,0.4)]" : ""}`}>
              <button type="button" onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-[family-name:var(--font-sora)] font-semibold">
                <span>{q}</span><span className={`text-xl transition ${open === i ? "rotate-45 text-[#22D3EE]" : ""}`}>+</span>
              </button>
              {open === i && <p className="px-6 pb-5 text-[15px] leading-relaxed text-[#94A3B8]">{a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
