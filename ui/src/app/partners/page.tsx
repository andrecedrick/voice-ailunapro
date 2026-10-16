"use client";

/**
 * Partner programme landing + sign-up. OURS.
 *
 * Readable in both themes: every surface that carries body copy uses the
 * --pp-* tokens below, which flip on `.dark`. Only the two showcase panels
 * (the code card and the sign-up panel, which holds the inverse wordmark) stay
 * dark in both themes, with their own light text.
 *
 * Terms come from the API (/ailunapro/partners/terms) so the page never shows
 * a rate the backend does not pay, and the code card is labelled as an example.
 */
import { BarChart3, Check, Copy, Link2, Loader2, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/i18n";
import { errorDetail, growthApi, type PartnerCreated, rememberPartner } from "@/lib/ailunapro-api";

type Terms = { percent_off: number; first_pct: number; recurring_pct: number; months: number };
const DEFAULT_TERMS: Terms = { percent_off: 20, first_pct: 40, recurring_pct: 15, months: 6 };
const PLANS: [string, number][] = [
  ["Starter", 39],
  ["Pro", 149],
  ["Business", 449],
  ["Agence", 999],
];
const CHANNELS = ["tiktok", "youtube", "instagram", "whop", "linkedin", "x", "newsletter"];

const T = {
  fr: {
    badge: "PROGRAMME PARTENAIRES",
    badgeSub: "Commission récurrente, chaque mois",
    h1a: "Une recommandation.",
    h1b: "Six mois de revenus.",
    lead: "Votre code LUNA en 30 secondes. Votre audience économise dès le premier mois, vous touchez 40 % du premier paiement puis 15 % pendant 6 mois. Sans plafond, sans exclusivité, sans minimum.",
    cta: "Obtenir mon code — gratuit",
    estimate: "Calculer mes gains",
    rate: "sur le 1er paiement",
    off: "de remise pour votre audience",
    lifetime: "6 mois",
    lifetimeSub: "de commissions par client",
    trust: [
      [ShieldCheck, "Paiements via Stripe"],
      [BarChart3, "Suivi en temps réel"],
      [Sparkles, "Sans exclusivité"],
      [Wallet, "Aucun plafond de gains"],
    ] as [typeof ShieldCheck, string][],
    example: "EXEMPLE",
    yourCode: "VOTRE CODE PARTENAIRE",
    active: "Actif",
    exampleNote: (first: number, rec: number, m: number) => `${first} % sur le 1er paiement, puis ${rec} % pendant ${m} mois.`,
    howTag: "01 — FONCTIONNEMENT",
    howTitle: "De l'inscription au paiement en trois étapes",
    howSub: "Aucune validation à attendre, aucun contrat à signer.",
    steps: [
      ["Recevez votre code", "Nom, e-mail, pseudo. Votre code LUNA et votre tableau de bord sont créés instantanément — gratuitement, sans validation manuelle."],
      ["Partagez-le partout", "Whop, YouTube, TikTok, Instagram, newsletter, DM. Votre audience obtient une vraie remise, pas une promesse : c'est votre meilleur argument."],
      ["Encaissez chaque mois", "40 % du premier paiement, puis 15 % pendant 6 mois. Chaque euro apparaît en temps réel dans votre tableau de bord."],
    ],
    earnTag: "02 — GAINS",
    earnTitle: "Combien ça rapporte, concrètement ?",
    earnSub: "Déplacez le curseur selon votre audience. Les montants sont calculés sur nos vrais tarifs.",
    subs: "Abonnés parrainés",
    plan: "Formule moyenne / mois",
    monthly: "Vos gains sur 6 mois",
    yearly: "Dont le 1er mois",
    rateLbl: "Par client",
    disclaimer: "Estimation indicative, hors remise appliquée au client. Les commissions sont versées chaque mois sur les abonnements actifs et payés, après le délai de remboursement de 30 jours.",
    tableTag: "Ce que vaut un client, formule par formule",
    tableCols: ["Formule", "Prix / mois", "1er paiement", "Mois 2 à 6", "Total par client"],
    toolTag: "03 — BOÎTE À OUTILS",
    toolTitle: "Tout ce qu'il faut pour vendre, déjà prêt",
    toolSub: "Pas de brief à écrire, pas de visuel à produire. Vos liens et vos textes sont générés avec votre code.",
    linkTitle: "Générateur de liens par canal",
    linkSub: "Un lien traçable par plateforme, pour savoir d'où viennent vos inscriptions.",
    kitTitle: "Kit de contenu prêt à publier",
    kitSub: "Trois formats, votre code déjà inséré. Copiez, adaptez, publiez.",
    kits: [
      ["Accroche courte — TikTok / Reels / Shorts", "J'ai arrêté de rater des appels clients.\nMon agent vocal IA répond 24/7, prend les rendez-vous et me renvoie le résumé.\nCode {code} = {off} % sur ton premier mois. Lien en bio."],
      ["Description vidéo / post long", "L'outil que j'utilise : Voice AiLunaPro — des agents vocaux IA qui répondent au téléphone, qualifient et prennent les rendez-vous à votre place.\n\nEssai gratuit 7 jours, puis {off} % de remise avec mon code {code}.\n👉 {link}"],
      ["E-mail à votre liste", "Objet : l'assistant qui répond au téléphone à votre place\n\nSi vous perdez des clients parce que personne ne décroche, regardez ça.\n\nVoice AiLunaPro installe un agent vocal IA sur votre numéro : il répond, qualifie, prend les rendez-vous et vous envoie le résumé de chaque appel.\n\n7 jours d'essai gratuit, puis {off} % de remise avec le code {code} :\n{link}"],
    ],
    dashTitle: "Tableau de bord en temps réel",
    dashSub: "Inscriptions, clients actifs, revenu généré et commission du mois — lus en direct depuis Stripe, pas déclarés à la main.",
    copyLink: "Copier le lien",
    copyText: "Copier le texte",
    copied: "Copié",
    claim: "Votre code LUNA vous attend",
    claimSub: "Gratuit, sans engagement, sans volume minimum. Prêt en 30 secondes.",
    perks: (t: Terms) => [
      `${t.first_pct} % du 1er paiement, puis ${t.recurring_pct} % pendant ${t.months} mois`,
      `−${t.percent_off} % offerts à votre audience`,
      "Suivi en temps réel, paiements via Stripe",
      "Aucun plafond, aucune exclusivité",
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
    sent: (e: string) => `Le lien de votre tableau de bord a été envoyé à ${e}. Chaque abonnement payé avec votre code est suivi automatiquement.`,
    dash: "Ouvrir mon tableau de bord",
    faqTitle: "Questions fréquentes",
    faqs: (t: Terms) => [
      ["Combien vais-je gagner ?", `${t.first_pct} % du premier paiement de chaque filleul, puis ${t.recurring_pct} % de ses paiements suivants pendant ${t.months} mois. Exemple : un client Pro à 149 € vous rapporte environ 171 € au total, un client Agence environ 1 149 €.`],
      ["Quand suis-je payé ?", "Chaque mois, pour les paiements encaissés depuis plus de 30 jours — le temps du délai de remboursement. Vous déclenchez la demande depuis votre tableau de bord, nous vérifions puis versons."],
      ["Comment mes filleuls sont-ils suivis ?", "Par votre lien ?ref=LUNA-… (mémorisé 30 jours) ou par votre code saisi au paiement. Les deux sont crédités automatiquement."],
      ["Puis-je cumuler avec l'Offre Fondateurs ?", "Votre audience obtient la meilleure des deux remises, et vous êtes crédité dans tous les cas."],
      ["Y a-t-il un minimum ou une exclusivité ?", "Aucun. Pas de volume minimum, pas de plafond, pas d'engagement, et vous restez libre de promouvoir ce que vous voulez."],
      ["Et si mon filleul change de formule ?", "La commission suit le montant réellement payé. S'il passe à une formule supérieure, vous gagnez davantage dès le paiement suivant."],
    ],
    errors: { code_taken: "Ce pseudo est déjà pris.", invalid_handle: "Pseudo invalide.", stripe_unavailable: "Service momentanément indisponible, réessayez dans quelques minutes." } as Record<string, string>,
  },
  en: {
    badge: "PARTNER PROGRAMME",
    badgeSub: "Recurring commission, every month",
    h1a: "One recommendation.",
    h1b: "Six months of income.",
    lead: "Get your LUNA code in 30 seconds. Your audience saves from month one, you earn 40% of the first payment then 15% for 6 months. No cap, no exclusivity, no minimum.",
    cta: "Get my code — free",
    estimate: "Calculate my earnings",
    rate: "on the first payment",
    off: "off for your audience",
    lifetime: "6 months",
    lifetimeSub: "of commission per customer",
    trust: [
      [ShieldCheck, "Payouts via Stripe"],
      [BarChart3, "Live tracking"],
      [Sparkles, "No exclusivity"],
      [Wallet, "No earnings cap"],
    ] as [typeof ShieldCheck, string][],
    example: "EXAMPLE",
    yourCode: "YOUR PARTNER CODE",
    active: "Active",
    exampleNote: (first: number, rec: number, m: number) => `${first}% on the first payment, then ${rec}% for ${m} months.`,
    howTag: "01 — HOW IT WORKS",
    howTitle: "From sign-up to payout in three steps",
    howSub: "No approval queue, no contract to sign.",
    steps: [
      ["Get your code", "Name, email, handle. Your LUNA code and dashboard are created instantly — free, with no manual approval."],
      ["Share it anywhere", "Whop, YouTube, TikTok, Instagram, newsletter, DMs. Your audience gets a real discount, not a vague promise — that is your strongest argument."],
      ["Get paid monthly", "40% of the first payment, then 15% for 6 months. Every euro shows up live in your dashboard."],
    ],
    earnTag: "02 — EARNINGS",
    earnTitle: "What does it actually pay?",
    earnSub: "Move the slider to match your audience. Figures use our real plan prices.",
    subs: "Referred subscribers",
    plan: "Average plan / month",
    monthly: "Your earnings over 6 months",
    yearly: "Of which month one",
    rateLbl: "Per customer",
    disclaimer: "Indicative estimate, before the discount applied to the customer. Commissions are paid monthly on active, paid subscriptions, after the 30-day refund window.",
    tableTag: "What one customer is worth, plan by plan",
    tableCols: ["Plan", "Price / month", "First payment", "Months 2–6", "Total per customer"],
    toolTag: "03 — TOOLKIT",
    toolTitle: "Everything you need to sell, already built",
    toolSub: "No brief to write, no asset to produce. Your links and your copy are generated with your code.",
    linkTitle: "Per-channel link builder",
    linkSub: "One trackable link per platform, so you know where your sign-ups come from.",
    kitTitle: "Ready-to-post content kit",
    kitSub: "Three formats, your code already in place. Copy, tweak, publish.",
    kits: [
      ["Short hook — TikTok / Reels / Shorts", "I stopped missing customer calls.\nMy AI voice agent answers 24/7, books the meeting and sends me the summary.\nCode {code} = {off}% off your first month. Link in bio."],
      ["Video description / long post", "The tool I use: Voice AiLunaPro — AI voice agents that answer the phone, qualify and book meetings for you.\n\n7-day free trial, then {off}% off with my code {code}.\n👉 {link}"],
      ["Email to your list", "Subject: the assistant that answers your phone for you\n\nIf you are losing customers because nobody picks up, look at this.\n\nVoice AiLunaPro puts an AI voice agent on your number: it answers, qualifies, books meetings and sends you a summary of every call.\n\n7-day free trial, then {off}% off with code {code}:\n{link}"],
    ],
    dashTitle: "Live partner dashboard",
    dashSub: "Sign-ups, active customers, revenue generated and this month's commission — read live from Stripe, not self-reported.",
    copyLink: "Copy link",
    copyText: "Copy text",
    copied: "Copied",
    claim: "Your LUNA code is waiting",
    claimSub: "Free, no commitment, no minimum volume. Ready in 30 seconds.",
    perks: (t: Terms) => [
      `${t.first_pct}% of the first payment, then ${t.recurring_pct}% for ${t.months} months`,
      `−${t.percent_off}% for your audience`,
      "Live tracking, payouts via Stripe",
      "No cap, no exclusivity",
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
    sent: (e: string) => `We've sent your dashboard link to ${e}. Every paid subscription with your code is tracked automatically.`,
    dash: "Open my dashboard",
    faqTitle: "Questions, answered",
    faqs: (t: Terms) => [
      ["How much will I earn?", `${t.first_pct}% of each referral's first payment, then ${t.recurring_pct}% of their next payments for ${t.months} months. A Pro customer at €149 is worth about €171 in total; an Agency customer about €1,149.`],
      ["When do I get paid?", "Monthly, for payments collected more than 30 days ago — the refund window. You request it from your dashboard, we check it and pay."],
      ["How are referrals tracked?", "Through your ?ref=LUNA-… link (remembered 30 days) or your code entered at checkout. Both are credited automatically."],
      ["Does it stack with the Founders offer?", "Your audience gets the better of the two discounts, and you are credited either way."],
      ["Is there a minimum or an exclusivity clause?", "Neither. No minimum volume, no cap, no commitment — and you stay free to promote anything else."],
      ["What if my referral upgrades?", "Commission follows what they actually pay. If they move to a bigger plan, you earn more from the next payment on."],
    ],
    errors: { code_taken: "This handle is already taken.", invalid_handle: "Invalid handle.", stripe_unavailable: "Service temporarily unavailable, please retry in a few minutes." } as Record<string, string>,
  },
};

const GRAD = "bg-[linear-gradient(135deg,#7C3AED,#22D3EE)]";
const TEXT_GRAD = "bg-[linear-gradient(120deg,#7C3AED,#0E8FA8)] dark:bg-[linear-gradient(135deg,#A855F7,#22D3EE)] bg-clip-text text-transparent";
const MONO = "font-mono text-[11px] tracking-[0.14em]";
// Theme-aware surfaces. Values live in the <style> block below.
const CARD = "rounded-[20px] border border-[color:var(--pp-line)] bg-[var(--pp-card)]";
// Showcase panels keep their dark surface in both themes, so they carry their
// own light text rather than the tokens.
const SHOWCASE = "rounded-[24px] border border-white/[0.12] bg-[#0E1530] text-[#F8FAFC]";

const TOKENS = `
.pp{
  --pp-fg:#0B1024; --pp-muted:#3B4560; --pp-dim:#5B6478;
  --pp-card:#FFFFFF; --pp-line:rgba(76,29,149,.14); --pp-soft:#F3F1FB;
  --pp-accent:#6D28D9; --pp-accent2:#0E7490;
  --pp-panel:linear-gradient(135deg,#F3EEFF,#ECFAFD);
  --pp-glow:0 24px 60px rgba(76,29,149,.10),0 2px 6px rgba(15,23,42,.04);
}
.dark .pp{
  --pp-fg:#F8FAFC; --pp-muted:#CBD5E1; --pp-dim:#94A3B8;
  --pp-card:#0E1530; --pp-line:rgba(255,255,255,.10); --pp-soft:rgba(255,255,255,.04);
  --pp-accent:#A855F7; --pp-accent2:#22D3EE;
  --pp-panel:linear-gradient(135deg,rgba(124,58,237,.15),rgba(34,211,238,.06));
  --pp-glow:0 24px 64px rgba(0,0,0,.5);
}
/* Theme toggle should read as a cross-fade, not a flash. */
.pp,.pp *{transition:background-color .35s cubic-bezier(.16,1,.3,1),border-color .35s cubic-bezier(.16,1,.3,1),color .35s cubic-bezier(.16,1,.3,1)}
@keyframes wave{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
@media (prefers-reduced-motion:reduce){.pp *{animation:none!important;transition:none!important}}
`;

function CopyButton({ value, idle, done, className = "" }: { value: string; idle: string; done: string; className?: string }) {
  const [hit, setHit] = useState(false);
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(value).then(() => { setHit(true); setTimeout(() => setHit(false), 1800); })}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition ${hit ? "bg-emerald-500 text-white" : `${GRAD} text-white hover:brightness-110`} ${className}`}
    >
      {hit ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {hit ? done : idle}
    </button>
  );
}

export default function PartnersPage() {
  const { locale } = useI18n();
  const t = locale === "fr" ? T.fr : T.en;
  const [terms, setTerms] = useState<Terms>(DEFAULT_TERMS);
  const [subs, setSubs] = useState(20);
  const [price, setPrice] = useState(149);
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [form, setForm] = useState({ name: "", email: "", handle: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; raw: string } | null>(null);
  const [res, setRes] = useState<PartnerCreated | null>(null);
  const [open, setOpen] = useState<number | null>(0);

  useEffect(() => {
    void growthApi.terms().then((r) => r.data && setTerms(r.data));
  }, []);

  const eur = (v: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
  // first_pct of the first payment, then recurring_pct for the rest of the window.
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
      // Visitors read a sentence, never an error code. The raw reason stays on
      // the element's title so a failure is still diagnosable from the page.
      setError({ text: t.errors[d] ?? t.errors.stripe_unavailable, raw: d });
      return;
    }
    setRes(r.data);
    // The dashboard link carries the token; keep it so the sidebar entry works.
    const token = new URL(r.data.dashboard_url).searchParams.get("token");
    if (token) rememberPartner(r.data.code, token);
  };

  const input =
    "w-full rounded-xl border border-white/[0.14] bg-[rgba(7,11,23,0.5)] px-4 py-3.5 text-[15px] text-white placeholder:text-white/35 outline-none focus:border-[#22D3EE] focus:shadow-[0_0_0_3px_rgba(34,211,238,0.18)]";

  // The code shown before sign-up is an example built from what was typed; after
  // sign-up it is the real one Stripe created.
  const code = res?.code ?? `LUNA-${(form.handle || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 20) || "ALEX"}`;
  const origin = typeof window === "undefined" ? "https://voice.ailunapro.com" : window.location.origin;
  const shareUrl = res?.share_url ?? `${origin}/auth/signup?ref=${code}`;
  const channelUrl = `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}utm_source=${channel}&utm_medium=partner&utm_campaign=${code.toLowerCase()}`;
  const fill = (s: string) => s.replaceAll("{code}", code).replaceAll("{link}", shareUrl).replaceAll("{off}", String(terms.percent_off));

  return (
    <div className="pp mx-auto max-w-[1200px] text-[color:var(--pp-fg)]">
      <style>{TOKENS}</style>

      {/* Hero — the aurora keeps the light theme from looking flat. */}
      <header className="relative grid items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:gap-16 lg:pb-16 lg:pt-12 [grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr))]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[460px] opacity-70 dark:opacity-60"
          style={{ background: "radial-gradient(60% 60% at 18% 30%, rgba(124,58,237,.22), transparent 70%), radial-gradient(55% 55% at 82% 20%, rgba(34,211,238,.18), transparent 70%)" }}
        />
        <div className="flex flex-col gap-6 lg:gap-7">
          <div className="inline-flex max-w-full flex-wrap items-center gap-2.5 self-start rounded-full border border-[rgba(124,58,237,0.32)] bg-[linear-gradient(90deg,rgba(124,58,237,0.14),rgba(34,211,238,0.07))] py-1.5 pl-1.5 pr-3.5">
            <span className={`${MONO} whitespace-nowrap rounded-full bg-[#0E1530] px-2.5 py-1 text-[10px] text-[#22D3EE] dark:bg-[#22D3EE] dark:text-[#070B17]`}>{t.badge}</span>
            <span className="text-[13px] text-[color:var(--pp-muted)]">{t.badgeSub}</span>
          </div>
          <h1 className="font-[family-name:var(--font-sora)] text-[clamp(40px,5.4vw,66px)] font-extrabold leading-[1.04] tracking-[-0.035em]">
            {t.h1a} <span className={TEXT_GRAD}>{t.h1b}</span>
          </h1>
          <p className="max-w-[540px] text-[17px] leading-relaxed text-[color:var(--pp-muted)] sm:text-lg">{t.lead}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href="#apply" className={`${GRAD} rounded-xl px-7 py-4 text-center text-[15px] font-semibold text-white shadow-[0_8px_30px_rgba(124,58,237,0.38)] transition-transform hover:-translate-y-0.5`}>{t.cta}</a>
            <a href="#earnings" className="rounded-xl border border-[color:var(--pp-line)] bg-[var(--pp-soft)] px-7 py-4 text-center text-[15px] font-semibold hover:border-[rgba(124,58,237,0.5)]">{t.estimate}</a>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-5 border-t border-[color:var(--pp-line)] pt-5">
            {[
              [`${terms.first_pct} %`, t.rate],
              [`−${terms.percent_off} %`, t.off],
              [t.lifetime, t.lifetimeSub],
            ].map(([v, l]) => (
              <div key={l} className="flex flex-col gap-1">
                <span className="font-[family-name:var(--font-sora)] text-[26px] font-bold sm:text-[28px]">{v}</span>
                <span className="text-[13px] text-[color:var(--pp-dim)]">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Example code card — showcase surface, labelled, no invented results. */}
        <div className={`${SHOWCASE} relative p-6 shadow-[var(--pp-glow)] sm:p-8`}>
          <div className="mb-6 flex items-center justify-between gap-3">
            <span className={`${MONO} text-[#C084FC]`}>{t.yourCode}</span>
            <span className={`${MONO} rounded-full border border-white/[0.14] px-2.5 py-1 text-[10px] text-[#94A3B8]`}>{res ? t.active : t.example}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-[rgba(192,132,252,0.5)] bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(34,211,238,0.1))] px-5 py-5">
            <span className="font-mono text-xl tracking-[0.06em] sm:text-2xl">{code}</span>
            <span className="rounded-full bg-[#10B981]/15 px-2.5 py-1 text-xs text-[#34D399]">{t.active}</span>
          </div>
          <div className="mt-6 flex h-12 items-end gap-1" aria-hidden>
            {Array.from({ length: 40 }).map((_, i) => (
              <span
                key={i}
                className="w-full rounded-full bg-[linear-gradient(180deg,#22D3EE,#7C3AED)]"
                style={{ height: `${30 + ((i * 37) % 70)}%`, animation: `wave ${0.9 + (i % 5) * 0.15}s ease-in-out ${i * 0.04}s infinite`, transformOrigin: "bottom" }}
              />
            ))}
          </div>
          <p className="mt-6 text-sm text-[#94A3B8]">{t.exampleNote(terms.first_pct, terms.recurring_pct, terms.months)}</p>
        </div>
      </header>

      {/* Trust bar */}
      <div className="grid gap-3 px-4 pb-12 sm:px-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
        {t.trust.map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-[color:var(--pp-line)] bg-[var(--pp-soft)] px-4 py-3.5">
            <Icon className="h-[18px] w-[18px] shrink-0 text-[color:var(--pp-accent2)]" />
            <span className="text-sm font-medium text-[color:var(--pp-muted)]">{label}</span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <section id="how" className="px-4 py-14 sm:px-6 lg:py-16">
        <div className="mb-10 flex flex-col items-center gap-3 text-center lg:mb-12">
          <span className={`${MONO} text-xs text-[color:var(--pp-accent)]`}>{t.howTag}</span>
          <h2 className="font-[family-name:var(--font-sora)] text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.025em]">{t.howTitle}</h2>
          <p className="max-w-[520px] text-[15px] text-[color:var(--pp-dim)]">{t.howSub}</p>
        </div>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr))]">
          {t.steps.map(([title, text], i) => (
            <div key={title} className={`${CARD} flex flex-col gap-4 p-6 shadow-[var(--pp-glow)] transition hover:-translate-y-0.5 hover:border-[rgba(124,58,237,0.45)] sm:p-7`}>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.12)] font-[family-name:var(--font-sora)] font-bold text-[color:var(--pp-accent)]">{i + 1}</div>
                <span className="font-mono text-[13px] text-[color:var(--pp-dim)]">0{i + 1}</span>
              </div>
              <span className="font-[family-name:var(--font-sora)] text-xl font-semibold">{title}</span>
              <span className="text-[15px] leading-relaxed text-[color:var(--pp-muted)]">{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Earnings */}
      <section id="earnings" className="px-4 py-14 sm:px-6 lg:py-16">
        <div className="grid items-center gap-10 overflow-hidden rounded-[28px] border border-[rgba(124,58,237,0.28)] bg-[image:var(--pp-panel)] p-[clamp(22px,5vw,64px)] lg:gap-14 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-3">
              <span className={`${MONO} text-xs text-[color:var(--pp-accent2)]`}>{t.earnTag}</span>
              <h2 className="font-[family-name:var(--font-sora)] text-[clamp(24px,3.6vw,40px)] font-bold tracking-[-0.025em]">{t.earnTitle}</h2>
              <p className="text-[color:var(--pp-muted)]">{t.earnSub}</p>
            </div>
            <label className="flex flex-col gap-3">
              <span className="flex justify-between text-sm"><span className="text-[color:var(--pp-muted)]">{t.subs}</span><b className="font-[family-name:var(--font-sora)]">{subs}</b></span>
              <input type="range" min={1} max={200} value={subs} onChange={(e) => setSubs(Number(e.target.value))} className="w-full accent-[#7C3AED]" />
            </label>
            <div className="flex flex-col gap-3">
              <span className="flex justify-between text-sm"><span className="text-[color:var(--pp-muted)]">{t.plan}</span><b className="font-[family-name:var(--font-sora)]">{eur(price)}</b></span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PLANS.map(([label, p]) => (
                  <button key={p} type="button" onClick={() => setPrice(p)}
                    className={`rounded-lg border py-2 text-sm font-medium transition ${price === p ? "border-[color:var(--pp-accent2)] bg-[color:var(--pp-accent2)]/10 text-[color:var(--pp-fg)]" : "border-[color:var(--pp-line)] text-[color:var(--pp-muted)] hover:border-[rgba(124,58,237,.4)]"}`}>
                    <span className="block text-[11px] text-[color:var(--pp-dim)]">{label}</span>
                    {eur(p)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={`${SHOWCASE} flex flex-col gap-6 rounded-[22px] p-6 shadow-[var(--pp-glow)] sm:p-9`}>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-[#94A3B8]">{t.monthly}</span>
              <span className="font-[family-name:var(--font-sora)] text-[clamp(38px,5vw,58px)] font-extrabold leading-none text-transparent [background:linear-gradient(135deg,#A855F7,#22D3EE)] bg-clip-text">{eur(total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-[14px] border border-white/[0.1] bg-white/[0.05] p-4"><span className="text-xs text-[#94A3B8]">{t.yearly}</span><span className="font-[family-name:var(--font-sora)] text-[20px] font-bold sm:text-[22px]">{eur(firstMonth)}</span></div>
              <div className="flex flex-col gap-1 rounded-[14px] border border-white/[0.1] bg-white/[0.05] p-4"><span className="text-xs text-[#94A3B8]">{t.rateLbl}</span><span className="font-[family-name:var(--font-sora)] text-[20px] font-bold text-[#22D3EE] sm:text-[22px]">{eur(perCustomer)}</span></div>
            </div>
            <span className="text-xs leading-normal text-[#94A3B8]">{t.disclaimer}</span>
          </div>
        </div>

        {/* Per-plan value — real prices, no assumptions. */}
        <div className={`${CARD} mt-5 overflow-hidden`}>
          <div className="border-b border-[color:var(--pp-line)] px-5 py-4 font-[family-name:var(--font-sora)] font-semibold sm:px-7">{t.tableTag}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[color:var(--pp-dim)]">
                  {t.tableCols.map((c) => <th key={c} className="px-5 py-3 font-medium sm:px-7">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {PLANS.map(([label, p]) => {
                  const first = (p * terms.first_pct) / 100;
                  const rest = (p * terms.recurring_pct * (terms.months - 1)) / 100;
                  return (
                    <tr key={p} className="border-t border-[color:var(--pp-line)]">
                      <td className="px-5 py-3.5 font-semibold sm:px-7">{label}</td>
                      <td className="px-5 py-3.5 text-[color:var(--pp-muted)] sm:px-7">{eur(p)}</td>
                      <td className="px-5 py-3.5 text-[color:var(--pp-muted)] sm:px-7">{eur(first)}</td>
                      <td className="px-5 py-3.5 text-[color:var(--pp-muted)] sm:px-7">{eur(rest)}</td>
                      <td className="px-5 py-3.5 font-[family-name:var(--font-sora)] font-bold text-[color:var(--pp-accent2)] sm:px-7">{eur(first + rest)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Toolkit — link builder, content kit, dashboard */}
      <section id="toolkit" className="px-4 py-14 sm:px-6 lg:py-16">
        <div className="mb-10 flex flex-col items-center gap-3 text-center lg:mb-12">
          <span className={`${MONO} text-xs text-[color:var(--pp-accent)]`}>{t.toolTag}</span>
          <h2 className="font-[family-name:var(--font-sora)] text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.025em]">{t.toolTitle}</h2>
          <p className="max-w-[560px] text-[15px] text-[color:var(--pp-dim)]">{t.toolSub}</p>
        </div>

        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
          {/* Link builder */}
          <div className={`${CARD} flex flex-col gap-4 p-6 shadow-[var(--pp-glow)] sm:p-7`}>
            <div className="flex items-center gap-2.5">
              <Link2 className="h-[18px] w-[18px] text-[color:var(--pp-accent2)]" />
              <span className="font-[family-name:var(--font-sora)] text-lg font-semibold">{t.linkTitle}</span>
            </div>
            <p className="text-[15px] leading-relaxed text-[color:var(--pp-muted)]">{t.linkSub}</p>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => (
                <button key={c} type="button" onClick={() => setChannel(c)}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] capitalize transition ${channel === c ? "border-[color:var(--pp-accent2)] bg-[color:var(--pp-accent2)]/10 font-semibold" : "border-[color:var(--pp-line)] text-[color:var(--pp-muted)] hover:border-[rgba(124,58,237,.4)]"}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--pp-line)] bg-[var(--pp-soft)] p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-xs text-[color:var(--pp-muted)]">{channelUrl}</code>
              <CopyButton value={channelUrl} idle={t.copyLink} done={t.copied} />
            </div>
          </div>

          {/* Live dashboard pitch */}
          <div className={`${CARD} flex flex-col gap-4 p-6 shadow-[var(--pp-glow)] sm:p-7`}>
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-[18px] w-[18px] text-[color:var(--pp-accent2)]" />
              <span className="font-[family-name:var(--font-sora)] text-lg font-semibold">{t.dashTitle}</span>
            </div>
            <p className="text-[15px] leading-relaxed text-[color:var(--pp-muted)]">{t.dashSub}</p>
            <div className="mt-1 grid grid-cols-2 gap-3">
              {[t.subs, t.rateLbl, t.monthly, t.yearly].map((label, i) => (
                <div key={label} className="rounded-[14px] border border-[color:var(--pp-line)] bg-[var(--pp-soft)] p-4">
                  <div className="text-[11px] text-[color:var(--pp-dim)]">{label}</div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[color:var(--pp-line)]">
                    <div className={`${GRAD} h-full rounded-full`} style={{ width: `${[72, 44, 88, 36][i]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content kit */}
        <div className={`${CARD} mt-5 p-6 shadow-[var(--pp-glow)] sm:p-7`}>
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-[18px] w-[18px] text-[color:var(--pp-accent2)]" />
            <span className="font-[family-name:var(--font-sora)] text-lg font-semibold">{t.kitTitle}</span>
          </div>
          <p className="mt-2 text-[15px] text-[color:var(--pp-muted)]">{t.kitSub}</p>
          <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr))]">
            {t.kits.map(([title, body]) => (
              <div key={title} className="flex flex-col gap-3 rounded-2xl border border-[color:var(--pp-line)] bg-[var(--pp-soft)] p-5">
                <span className={`${MONO} text-[10px] text-[color:var(--pp-accent)]`}>{title.toUpperCase()}</span>
                <pre className="whitespace-pre-wrap break-words font-sans text-[13.5px] leading-relaxed text-[color:var(--pp-muted)]">{fill(body)}</pre>
                <CopyButton value={fill(body)} idle={t.copyText} done={t.copied} className="self-start" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sign-up */}
      <section id="apply" className="px-4 py-14 sm:px-6 lg:py-16">
        <div className="grid overflow-hidden rounded-[28px] border border-[rgba(124,58,237,0.28)] bg-[#0E1530] text-[#F8FAFC] shadow-[var(--pp-glow)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr))]">
          <div className="flex flex-col justify-center gap-5 bg-[linear-gradient(160deg,rgba(124,58,237,0.38),rgba(34,211,238,0.1))] p-[clamp(24px,5vw,56px)]">
            {/* BRAND: wordmark, not the bare mark. See BRAND.md. */}
            <img src="/dograh-logo-inverse.png" alt="AiLunaPro" className="h-10 w-auto self-start object-contain" />
            <h2 className="font-[family-name:var(--font-sora)] text-[clamp(24px,3.6vw,40px)] font-bold tracking-[-0.025em]">{t.claim}</h2>
            <p className="text-[#CBD5E1]">{t.claimSub}</p>
            <div className="flex flex-col gap-2.5">
              {t.perks(terms).map((p) => (
                <div key={p} className="flex items-start gap-2.5 text-sm text-[#CBD5E1]"><Check className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#22D3EE]" /> {p}</div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center p-[clamp(24px,5vw,56px)]">
            {res ? (
              <div className="flex flex-col gap-4">
                <span className={`${MONO} text-[#34D399]`}>{t.done}</span>
                <span className="font-[family-name:var(--font-sora)] text-2xl font-bold">{t.welcome(form.name.split(" ")[0] || "")}</span>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-dashed border-[rgba(192,132,252,0.5)] bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(34,211,238,0.1))] px-5 py-4">
                  <span className="font-mono text-xl tracking-[0.06em] sm:text-2xl">{res.code}</span>
                  <CopyButton value={res.share_url} idle={t.copy} done={t.copied} />
                </div>
                <p className="break-all font-mono text-xs text-[#94A3B8]">{res.share_url}</p>
                <p className="text-sm text-[#94A3B8]">{t.sent(form.email)}</p>
                <div className="flex flex-wrap gap-3">
                  <a href={res.dashboard_url} className={`${GRAD} rounded-xl px-5 py-3 text-sm font-semibold text-white`}>{t.dash}</a>
                  <a href="#toolkit" className="rounded-xl border border-white/[0.16] px-5 py-3 text-sm font-semibold text-[#CBD5E1]">{t.kitTitle}</a>
                </div>
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
                {error && <div title={error.raw} className="rounded-[10px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.12)] px-3.5 py-2.5 text-sm text-[#FCA5A5]">{error.text}</div>}
                <button disabled={busy} className={`${GRAD} mt-1.5 inline-flex items-center justify-center gap-2 rounded-xl py-4 text-[15px] font-semibold text-white shadow-[0_0_28px_rgba(124,58,237,0.5)] active:scale-[0.97] disabled:opacity-60`}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.submit}
                </button>
                <span className="text-center text-xs text-[#94A3B8]">{t.payouts}</span>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-[840px] px-4 pb-24 pt-14 sm:px-6 lg:pb-28 lg:pt-16">
        <h2 className="mb-8 text-center font-[family-name:var(--font-sora)] text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.025em] lg:mb-10">{t.faqTitle}</h2>
        <div className="flex flex-col gap-3">
          {t.faqs(terms).map(([q, a], i) => (
            <div key={q} className={`${CARD} rounded-2xl ${open === i ? "border-[rgba(124,58,237,0.45)]" : ""}`}>
              <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-[family-name:var(--font-sora)] font-semibold sm:px-6">
                <span>{q}</span><span className={`shrink-0 text-xl transition ${open === i ? "rotate-45 text-[color:var(--pp-accent2)]" : "text-[color:var(--pp-dim)]"}`}>+</span>
              </button>
              {open === i && <p className="px-5 pb-5 text-[15px] leading-relaxed text-[color:var(--pp-muted)] sm:px-6">{a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
