"use client";

import { type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

/* ---------------------------------------------------------------------------
 * Data
 * ------------------------------------------------------------------------- */

type Plan = {
  name: string;
  base: number;
  incl: number;
  rate: number;
  url: string;
  featured?: boolean;
  feat: string[];
};

/* lo/hi return the provider's published cost for `m` minutes in USD — the
   currency all four of them list in. Everything is converted to EUR (the
   billing currency, and therefore this page's internal basis) before it is
   plotted or printed, so one bar scale covers every row.
   fixedAnnualUsd is a published annual USD floor rather than a usage figure. */
type Competitor = {
  name: string;
  model: string;
  trial: string;
  lo: (m: number) => number;
  hi: (m: number) => number;
  fixedAnnualUsd?: number;
};

type ThemeName = "dark" | "light";
type Currency = "EUR" | "USD" | "GBP";

/* Live Stripe payment links — copied verbatim, never rewritten. */
const PLANS: Plan[] = [
  {
    name: "Starter",
    base: 39,
    incl: 300,
    rate: 0.15,
    url: "https://buy.stripe.com/4gMdRb3DB8Vvfoz7DNa7C00",
    feat: [
      "2 concurrent calls",
      "1 voice agent",
      "Inbound & outbound",
      "Transcripts and call summaries",
      "Email support",
    ],
  },
  {
    name: "Pro",
    base: 149,
    incl: 1500,
    rate: 0.11,
    featured: true,
    url: "https://buy.stripe.com/fZudRb5LJ0oZb8jgaja7C01",
    feat: [
      "10 concurrent calls",
      "5 voice agents",
      "Webhooks and CRM sync",
      "Custom voice and knowledge base",
      "Call analytics dashboard",
    ],
  },
  {
    name: "Business",
    base: 449,
    incl: 5000,
    rate: 0.09,
    url: "https://buy.stripe.com/14AeVf1vt4Ff0tF2jta7C02",
    feat: [
      "30 concurrent calls",
      "Unlimited agents",
      "Bring your own LLM key",
      "Priority routing and support",
      "Shared team workspace",
    ],
  },
  {
    name: "Agency",
    base: 999,
    incl: 15000,
    rate: 0.06,
    url: "https://buy.stripe.com/5kQbJ33DB3Bb4JV0bla7C03",
    feat: [
      "100 concurrent calls",
      "Sub-accounts for each client",
      "White-label domain and branding",
      "Dedicated onboarding",
      "SLA on request",
    ],
  },
];

const COMP: Competitor[] = [
  { name: "Vapi", model: "Pay as you go, per minute", trial: "Starter credit", lo: (m) => m * 0.129, hi: (m) => m * 0.129 },
  { name: "Retell AI", model: "Per minute, infra + models", trial: "Starter credit", lo: (m) => m * 0.055, hi: (m) => m * 0.31 },
  { name: "Bland AI", model: "Per minute, bundled", trial: "Demo only", lo: (m) => m * 0.12, hi: (m) => m * 0.14 },
  { name: "Synthflow (enterprise)", model: "Annual contract", trial: "Sales call", lo: () => 2500, hi: () => 2500, fixedAnnualUsd: 30000 },
];

const WHY = [
  {
    icon: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
    t: "Keep the number customers know",
    d: "Point your existing DID at Voice AiLunaPro. Nothing changes on your printed material, your Google listing or your signatures.",
  },
  {
    icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    t: "Pay telecom at cost",
    d: "Carrier minutes stay on your own Twilio, Telnyx or Zadarma invoice at the rate you already negotiated. We add no markup because we never touch the call leg.",
  },
  {
    icon: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
    t: "Leave without a migration",
    d: "The number, the recordings and the carrier account are yours. Disconnecting the agent takes one setting.",
  },
];

const FAQ: Array<[string, string]> = [
  ["What does the 7-day trial include?", "Full access to the plan you pick, with a capped number of trial minutes so a runaway loop cannot bill your carrier. A card is required; nothing is charged until day 8 and you can cancel in one click before then."],
  ["What counts as a platform minute?", "Time the agent spends connected on a call, inbound or outbound, rounded to the second. Hold time and failed dials are not counted."],
  ["Can I use my own OpenAI or Gemini key?", "Yes, on Business and Agency. Connect your key and model inference leaves your bill with us and lands on your provider account instead."],
  ["Which carriers work?", "Anything that terminates SIP: Twilio, Telnyx, Vonage, Zadarma, OVH, a local PBX. If your provider gives you SIP credentials, the agent can answer on it."],
  ["Do you support French-language calls?", "French, English, Spanish, Portuguese and twenty more, with the same agent able to switch mid-call when the caller does."],
];

const THEMES: Record<ThemeName, Record<string, string>> = {
  dark: {
    "--bg": "#070B17",
    "--surface": "rgba(14,21,48,.6)",
    "--glass": "linear-gradient(160deg,rgba(124,58,237,.14),rgba(14,21,48,.75) 45%,rgba(34,211,238,.07))",
    "--well": "rgba(7,11,23,.45)",
    "--topbar": "rgba(7,11,23,.62)",
    "--border": "rgba(255,255,255,.08)",
    "--borderHi": "rgba(124,58,237,.3)",
    "--text": "#F8FAFC",
    "--soft": "#CBD5E1",
    "--muted": "#94A3B8",
    "--accent": "#22D3EE",
    "--ok": "#34D399",
    "--warn": "#FBBF24",
    "--track": "rgba(255,255,255,.07)",
    "--grid": "rgba(140,160,255,.06)",
    "--glow1": "rgba(124,58,237,.30)",
    "--glow2": "rgba(34,211,238,.18)",
    "--hover": "rgba(255,255,255,.05)",
    "--cardShadow": "0 40px 100px -40px rgba(124,58,237,.45),0 0 0 1px rgba(255,255,255,.03) inset",
  },
  light: {
    "--bg": "#F8FAFC",
    "--surface": "rgba(255,255,255,.78)",
    "--glass": "linear-gradient(160deg,rgba(124,58,237,.08),rgba(255,255,255,.88) 45%,rgba(34,211,238,.08))",
    "--well": "rgba(241,245,249,.9)",
    "--topbar": "rgba(248,250,252,.78)",
    "--border": "rgba(15,23,42,.09)",
    "--borderHi": "rgba(124,58,237,.25)",
    "--text": "#0F172A",
    "--soft": "#334155",
    "--muted": "#475569",
    "--accent": "#6D28D9",
    "--ok": "#047857",
    "--warn": "#B45309",
    "--track": "rgba(15,23,42,.08)",
    "--grid": "rgba(15,23,42,.05)",
    "--glow1": "rgba(124,58,237,.16)",
    "--glow2": "rgba(34,211,238,.16)",
    "--hover": "rgba(15,23,42,.05)",
    "--cardShadow": "0 40px 90px -45px rgba(124,58,237,.35),0 1px 2px rgba(15,23,42,.06)",
  },
};

const ICON = {
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z",
};

/* Plan prices are set in EUR in Stripe, so EUR is the source of truth and the
   only currency anything is ever charged in. These are indicative display
   rates for the switcher — the charge is always taken in EUR. */
const RATES: Record<Currency, number> = { EUR: 1, USD: 1.09, GBP: 0.85 };
const SYMBOL: Record<Currency, string> = { EUR: "€", USD: "$", GBP: "£" };
const CURRENCIES: Currency[] = ["EUR", "USD", "GBP"];
const DEFAULT_CURRENCY: Currency = "EUR";
const CURRENCY_KEY = "voice-pricing-currency";
const isCurrency = (v: unknown): v is Currency =>
  v === "EUR" || v === "USD" || v === "GBP";

/* The source component took these as editor props; the route has no props, so
   they are the design's declared defaults. */
const DEFAULT_MINUTES = 1000;
const DEFAULT_THEME: ThemeName | "system" = "system";
const SHOW_COMPARISON = true;

/* ---------------------------------------------------------------------------
 * Maths — ported 1:1 from the design logic
 * ------------------------------------------------------------------------- */

const MIN = 100;
const MAX = 20000;
const R = Math.log(MAX / MIN);

const toT = (m: number) => Math.log(m / MIN) / R;
const snap = (m: number) =>
  m < 1000 ? Math.round(m / 50) * 50 : m < 5000 ? Math.round(m / 100) * 100 : Math.round(m / 500) * 500;
const fromT = (t: number) =>
  Math.min(MAX, Math.max(MIN, snap(MIN * Math.exp(R * Math.min(1, Math.max(0, t))))));

const nf = new Intl.NumberFormat("en-US");

/* The two formatters every amount on the page goes through. Both take an
   amount in EUR and render it in the display currency: money() for whole
   amounts, money2() for per-minute rates. money2 keeps the source's own
   convention of 3 decimals under 1, which also keeps a converted rate precise
   enough for the "base + extra × rate" formula strings to add up. */
const money = (n: number, c: Currency) => SYMBOL[c] + nf.format(Math.round(n * RATES[c]));
const money2 = (n: number, c: Currency) => {
  const v = n * RATES[c];
  return SYMBOL[c] + v.toFixed(v < 1 ? 3 : 2);
};
const cost = (p: Plan, m: number) => p.base + Math.max(0, m - p.incl) * p.rate;
const bestPlan = (m: number) => {
  let b = PLANS[0];
  PLANS.forEach((p) => {
    if (cost(p, m) < cost(b, m)) b = p;
  });
  return b;
};
const pct = (v: number) => (v * 100).toFixed(2) + "%";

const INITIAL_M = Math.min(MAX, Math.max(MIN, DEFAULT_MINUTES));

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

/* The design keeps every declaration in an inline style attribute, including a
   few properties React's CSSProperties does not know yet (animation-timeline,
   text-wrap). One cast keeps the whole file free of per-site assertions. */
const css = (o: Record<string, string | number | undefined>) => o as unknown as CSSProperties;

const DISPLAY = 'var(--font-pricing-display),Sora,Inter,system-ui,sans-serif';

type ViewTransition = { ready: Promise<void>; finished: Promise<void> };
type DocumentWithVT = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition;
};

const NAV = [
  { label: "Calculator", href: "#calculator" },
  { label: "Plans", href: "#plans" },
  { label: "Compare", href: "#compare" },
  { label: "FAQ", href: "#faq" },
];

const PRESETS = [500, 1000, 3000, 8000, 15000];

/* ---------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

export default function PricingPage() {
  const [m, setM] = useState(INITIAL_M);
  const [theme, setTheme] = useState<ThemeName>("dark");
  /* Always the default on first render; the stored choice is read on mount
     only, so the server and client markup agree. */
  const [cur, setCur] = useState<Currency>(DEFAULT_CURRENCY);
  const [drag, setDrag] = useState(false);
  const [faq, setFaq] = useState(0);
  /* Matches the source's initial state: wide until the media query is read on
     mount, which keeps the server and first client render identical. */
  const [wide, setWide] = useState(true);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const totalRef = useRef<HTMLSpanElement | null>(null);
  const shownRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const reducedRef = useRef(false);
  const prevMRef = useRef(INITIAL_M);
  /* The count-up tween writes into the DOM outside of render, so it needs the
     live currency rather than the one captured when the tween started. */
  const curRef = useRef<Currency>(DEFAULT_CURRENCY);

  const applyTheme = useCallback((next: ThemeName) => {
    const vars = THEMES[next];
    const st = document.documentElement.style;
    Object.keys(vars).forEach((k) => st.setProperty(k, vars[k]));
    st.setProperty("color-scheme", next);
  }, []);

  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resolved: ThemeName =
      DEFAULT_THEME === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : DEFAULT_THEME;

    const mq = window.matchMedia("(min-width: 860px)");
    const onMq = () => setWide(mq.matches);
    mq.addEventListener("change", onMq);

    try {
      const saved = window.localStorage.getItem(CURRENCY_KEY);
      if (isCurrency(saved)) setCur(saved);
    } catch {
      /* private mode, blocked storage: keep the default */
    }

    setWide(mq.matches);
    setTheme(resolved);
    applyTheme(resolved);

    shownRef.current = cost(bestPlan(INITIAL_M), INITIAL_M);

    return () => {
      mq.removeEventListener("change", onMq);
      cancelAnimationFrame(rafRef.current);
      /* The theme variables are set on <html>, and three of them (--border,
         --accent, --muted) share names with the app's own design tokens.
         Clearing them on unmount keeps the rest of the app untouched after a
         client-side navigation away from this route. */
      const st = document.documentElement.style;
      Object.keys(THEMES.dark).forEach((k) => st.removeProperty(k));
      st.removeProperty("color-scheme");
    };
  }, [applyTheme]);

  useEffect(() => {
    curRef.current = cur;
  }, [cur]);

  const pickCurrency = useCallback((next: Currency) => {
    setCur(next);
    try {
      window.localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      /* non-fatal: the switcher still works for this visit */
    }
  }, []);

  /* Count-up tween on the "best fit" total. Writes straight into the text node
     the way the source does, so the number animates without re-rendering. */
  useEffect(() => {
    if (prevMRef.current === m) return;
    prevMRef.current = m;

    const el = totalRef.current;
    const target = cost(bestPlan(m), m);
    if (!el || reducedRef.current) {
      shownRef.current = target;
      return;
    }

    const from = shownRef.current ?? target;
    const t0 = performance.now();
    const dur = 500;
    cancelAnimationFrame(rafRef.current);

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      shownRef.current = from + (target - from) * e;
      if (el.firstChild) el.firstChild.nodeValue = money(shownRef.current, curRef.current);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [m]);

  const setFromX = useCallback((x: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const next = fromT((x - r.left) / r.width);
    setM((cur) => (next === cur ? cur : next));
  }, []);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => setFromX(e.clientX);
    const onUp = () => setDrag(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, setFromX]);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    trackRef.current?.focus({ preventScroll: true });
    setDrag(true);
    setFromX(e.clientX);
  };

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const t = toT(m);
    const step = e.shiftKey ? 0.1 : 0.025;
    const map: Record<string, number> = {
      ArrowRight: t + step,
      ArrowUp: t + step,
      ArrowLeft: t - step,
      ArrowDown: t - step,
      PageUp: t + 0.1,
      PageDown: t - 0.1,
      Home: 0,
      End: 1,
    };
    const want = map[e.key];
    if (want == null) return;
    e.preventDefault();
    let next = fromT(want);
    if (next === m) next = Math.min(MAX, Math.max(MIN, m + (want > t ? 50 : -50)));
    setM(next);
  };

  const commitTheme = useCallback(
    (next: ThemeName) => {
      /* flushSync so the DOM is already repainted in the new theme by the time
         startViewTransition captures the "new" snapshot. */
      flushSync(() => setTheme(next));
      applyTheme(next);
    },
    [applyTheme],
  );

  const toggleTheme = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const next: ThemeName = theme === "light" ? "dark" : "light";
    const doc = document as DocumentWithVT;
    if (!doc.startViewTransition || reducedRef.current) {
      commitTheme(next);
      return;
    }
    const x = e.clientX || window.innerWidth - 40;
    const y = e.clientY || 30;
    try {
      const tr = doc.startViewTransition(() => commitTheme(next));
      tr.ready
        .then(() => {
          const rad = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y),
          );
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${rad}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 650,
              easing: "cubic-bezier(.16,1,.3,1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        })
        .catch(() => {});
      tr.finished.catch(() => {});
    } catch {
      commitTheme(next);
    }
  };

  const scrollToPlans = () => {
    const el = document.getElementById("plans");
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 80,
      behavior: reducedRef.current ? "auto" : "smooth",
    });
  };

  /* ---- derived values (the design's renderVals) ---- */

  const light = theme === "light";
  const totals = PLANS.map((p) => cost(p, m));
  const bi = totals.indexOf(Math.min(...totals));
  const order = totals.map((_, i) => i).sort((a, b) => totals[a] - totals[b]);
  const ri = order[1];
  const maxT = Math.max(...totals);
  const bp = PLANS[bi];
  const pos = pct(toT(m));
  /* Competitors publish in USD; divide out the USD rate so compVals, totals
     and therefore `scale` are all in EUR and share one basis. */
  const compVals = COMP.map((c) => ({
    lo: c.lo(m) / RATES.USD,
    hi: c.hi(m) / RATES.USD,
  }));
  const scale =
    Math.max(
      totals[bi],
      ...compVals.filter((_, i) => !COMP[i].fixedAnnualUsd).map((v) => v.hi),
    ) * 1.08;
  const accentInk = light ? "#6D28D9" : "#22D3EE";

  const mLabel = nf.format(m);
  const mText = `${nf.format(m)} minutes per month — best fit ${PLANS[bi].name} at ${money(
    totals[bi],
    cur,
  )} per month`;
  const themeIcon = light ? ICON.moon : ICON.sun;
  const themeLabel = light ? "Switch to dark theme" : "Switch to light theme";

  const thumbScale = drag ? 1.15 : 1;
  const trackTr = drag ? "none" : "width .45s cubic-bezier(.16,1,.3,1)";
  const thumbTr = drag
    ? "transform .2s cubic-bezier(.16,1,.3,1)"
    : "left .45s cubic-bezier(.16,1,.3,1),transform .25s cubic-bezier(.16,1,.3,1)";

  const ticks = PLANS.map((p) => {
    const on = m >= p.incl;
    return {
      name: p.name,
      left: pct(toT(p.incl)),
      label: p.name + " · " + nf.format(p.incl),
      c: on ? "rgba(34,211,238,.85)" : "var(--border,rgba(255,255,255,.15))",
      fg: on ? "var(--text,#F8FAFC)" : "var(--muted,#94A3B8)",
    };
  });

  const presets = PRESETS.map((v) => {
    const sel = v === m;
    return {
      value: v,
      label: nf.format(v),
      sel,
      bd: sel ? "rgba(34,211,238,.55)" : "var(--border,rgba(255,255,255,.1))",
      bg: sel
        ? "linear-gradient(120deg,rgba(124,58,237,.3),rgba(34,211,238,.22))"
        : "var(--surface,rgba(14,21,48,.6))",
      fg: sel ? "var(--text,#F8FAFC)" : "var(--muted,#94A3B8)",
    };
  });

  const best = {
    name: bp.name,
    total: money(shownRef.current ?? totals[bi], cur),
    eff: money2(totals[bi] / m, cur),
    usedPct: Math.round(Math.min(m / bp.incl, 1) * 100) + "%",
    url: bp.url,
  };

  const hasSave = ri != null && totals[ri] - totals[bi] >= 1;
  const runner = { name: PLANS[ri].name, save: money(totals[ri] - totals[bi], cur) };

  const rows = PLANS.map((p, i) => {
    const b = i === bi;
    const over = Math.max(0, m - p.incl);
    const oc = over * p.rate;
    return {
      name: p.name,
      best: b,
      total: money(totals[i], cur),
      formula: over
        ? `${money(p.base, cur)} + ${nf.format(over)} × ${money2(p.rate, cur)}`
        : `${money(p.base, cur)} flat`,
      baseW: pct(p.base / maxT),
      overW: pct(oc / maxT),
      baseTxt: `${nf.format(Math.min(m, p.incl))} of ${nf.format(p.incl)} included min`,
      overTxt: over ? `+${money(oc, cur)} extra minutes` : `${nf.format(p.incl - m)} min to spare`,
      overC: over ? "var(--warn,#FBBF24)" : "var(--ok,#34D399)",
      bd: b ? "rgba(34,211,238,.5)" : "var(--border,rgba(255,255,255,.08))",
      bg: b
        ? "linear-gradient(110deg,rgba(34,211,238,.10),rgba(124,58,237,.12))"
        : "var(--well,rgba(7,11,23,.45))",
      sh: b ? "0 0 30px -6px rgba(34,211,238,.35)" : "none",
    };
  });

  const cards = PLANS.map((p, i) => {
    const ratio = m / p.incl;
    const over = m > p.incl;
    const b = i === bi;
    return {
      name: p.name,
      /* `featured` still drives the visual emphasis, but never a badge: the
         only badge on a card is "Best fit" on the cheapest plan, so two cards
         can no longer claim to be the recommendation at once. */
      featured: !!p.featured,
      best: b,
      price: money(p.base, cur),
      incl: nf.format(p.incl),
      rate: money2(p.rate, cur),
      feat: p.feat,
      url: p.url,
      fill: pct(Math.min(ratio, 1)),
      pctN: Math.round(Math.min(ratio, 1) * 100),
      fillBg: over
        ? "linear-gradient(90deg,#C084FC,#F59E0B)"
        : "linear-gradient(90deg,#7C3AED,#22D3EE)",
      glow: over ? "rgba(245,158,11,.45)" : "rgba(34,211,238,.45)",
      meterTxt: over
        ? `${nf.format(m - p.incl)} min over · +${money((m - p.incl) * p.rate, cur)}`
        : `${Math.round(ratio * 100)}% of included minutes`,
      meterC: over ? "var(--warn,#FBBF24)" : "var(--muted,#94A3B8)",
      tagC: b || p.featured ? accentInk : "var(--muted,#94A3B8)",
      bd: b
        ? "rgba(34,211,238,.55)"
        : p.featured
          ? "rgba(124,58,237,.5)"
          : "var(--border,rgba(255,255,255,.08))",
      bg: b
        ? "linear-gradient(165deg,rgba(34,211,238,.10),rgba(124,58,237,.12) 55%,var(--surface,rgba(14,21,48,.6)))"
        : "var(--surface,rgba(14,21,48,.6))",
      sh: b
        ? "0 30px 80px -34px rgba(34,211,238,.5)"
        : p.featured
          ? "0 30px 80px -40px rgba(124,58,237,.5)"
          : "none",
      btnBg: b || p.featured ? "linear-gradient(120deg,#7C3AED,#A855F7 45%,#22D3EE)" : "transparent",
      btnFg: b || p.featured ? "#fff" : "var(--text,#F8FAFC)",
      btnBd: b || p.featured ? "transparent" : "var(--border,rgba(255,255,255,.14))",
    };
  });

  const comp = [
    {
      name: "Voice AiLunaPro — " + bp.name,
      model: "Flat subscription, " + nf.format(bp.incl) + " min included",
      trial: "7 days",
      cost: money(totals[bi], cur) + " (" + money2(totals[bi] / m, cur) + " / min)",
      note: "Best plan at this volume",
      loW: pct(totals[bi] / scale),
      hiW: pct(totals[bi] / scale),
      bar: "linear-gradient(90deg,#7C3AED,#22D3EE)",
      rangeBg: "transparent",
      glow: "0 0 16px rgba(34,211,238,.55)",
      nameC: accentInk,
    },
    ...COMP.map((c, i) => {
      const v = compVals[i];
      const range = v.hi - v.lo > 1;
      const off = v.lo > scale;
      return {
        name: c.name,
        model: c.model,
        trial: c.trial,
        cost: c.fixedAnnualUsd
          ? `from ${money(c.fixedAnnualUsd / RATES.USD, cur)} / year`
          : range
            ? `${money(v.lo, cur)} – ${money(v.hi, cur)}`
            : `≈ ${money(v.lo, cur)}`,
        note: off ? "Off the chart at this volume →" : range ? "Range depends on model mix" : "",
        loW: pct(Math.min(1, v.lo / scale)),
        hiW: pct(Math.min(1, v.hi / scale)),
        bar: off
          ? "linear-gradient(90deg,var(--track,rgba(255,255,255,.1)),#94A3B8)"
          : "#94A3B8",
        rangeBg: "rgba(148,163,184,.3)",
        glow: "none",
        nameC: "var(--text,#F8FAFC)",
      };
    }),
  ];

  const faqs = FAQ.map(([q, a], i) => {
    const open = faq === i;
    return {
      q,
      a,
      open,
      rot: open ? "45deg" : "0deg",
      bd: open ? "rgba(124,58,237,.45)" : "var(--border,rgba(255,255,255,.08))",
      index: i,
    };
  });

  /* ---- shared style fragments ---- */

  const pillChip = css({
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid var(--border,rgba(255,255,255,.08))",
    background: "var(--surface,rgba(14,21,48,.6))",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    fontSize: 13,
  });

  const eyebrow = css({
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: ".18em",
    textTransform: "uppercase",
    color: "var(--accent,#22D3EE)",
  });

  /* ---- render ---- */

  return (
    <div
      id="pricing-top"
      style={css({ position: "relative", minHeight: "100vh", color: "var(--text,#F8FAFC)" })}
    >
      {/* ambient background */}
      <div
        aria-hidden="true"
        style={css({ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" })}
      >
        <div
          style={css({
            position: "absolute",
            width: "60vmax",
            height: "60vmax",
            left: "-18vmax",
            top: "-24vmax",
            borderRadius: "50%",
            background: "radial-gradient(circle,var(--glow1,rgba(124,58,237,.30)),transparent 62%)",
            animation: "pr-drift 28s cubic-bezier(.45,0,.55,1) infinite alternate",
          })}
        />
        <div
          style={css({
            position: "absolute",
            width: "55vmax",
            height: "55vmax",
            right: "-20vmax",
            top: "24vh",
            borderRadius: "50%",
            background: "radial-gradient(circle,var(--glow2,rgba(34,211,238,.18)),transparent 62%)",
            animation: "pr-drift 34s cubic-bezier(.45,0,.55,1) -9s infinite alternate-reverse",
          })}
        />
        <div
          style={css({
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(var(--grid,rgba(140,160,255,.06)) 1px,transparent 1px),linear-gradient(90deg,var(--grid,rgba(140,160,255,.06)) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 20%,#000 30%,transparent 80%)",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 20%,#000 30%,transparent 80%)",
          })}
        />
      </div>

      {/* header */}
      <header
        style={css({
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--topbar,rgba(7,11,23,.62))",
          backdropFilter: "blur(18px) saturate(150%)",
          WebkitBackdropFilter: "blur(18px) saturate(150%)",
          borderBottom: "1px solid var(--border,rgba(255,255,255,.08))",
        })}
      >
        <div
          style={css({
            maxWidth: 1160,
            margin: "0 auto",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            /* The source header is a single non-wrapping row; the logo plus the
               44px toggle plus the nowrap CTA do not fit inside 400px, so the
               row is allowed to wrap on narrow screens. Unchanged at >=860px,
               where it never reaches the wrap point. */
            flexWrap: "wrap",
            gap: "12px 20px",
          })}
        >
          <a
            href="#pricing-top"
            aria-label="Voice AiLunaPro"
            style={css({ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 })}
          >
            <span
              style={css({
                display: "flex",
                alignItems: "center",
                background: "#F3F5FB",
                borderRadius: 999,
                padding: "7px 14px",
                boxShadow:
                  "0 0 0 1px var(--border,rgba(255,255,255,.08)),0 0 22px rgba(34,211,238,.2)",
              })}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dograh-logo.png"
                alt="AiLunaPro"
                style={css({ height: 20, width: "auto", display: "block" })}
              />
            </span>
            <span
              style={css({
                fontFamily: DISPLAY,
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: ".06em",
                color: "var(--accent,#22D3EE)",
              })}
            >
              VOICE
            </span>
          </a>

          {wide ? (
            <nav aria-label="Pricing sections" style={css({ display: "flex", gap: 4 })}>
              {NAV.map((n) => (
                <a
                  key={n.href}
                  className="pr-nav"
                  href={n.href}
                  style={css({
                    padding: "8px 14px",
                    borderRadius: 999,
                    color: "var(--muted,#94A3B8)",
                    fontSize: 14,
                    fontWeight: 500,
                    transition: "color .2s,background .2s",
                  })}
                >
                  {n.label}
                </a>
              ))}
            </nav>
          ) : null}

          <div
            style={css({ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 })}
          >
            <div
              role="group"
              aria-label="Display currency"
              style={css({
                display: "flex",
                alignItems: "center",
                gap: 2,
                height: 44,
                padding: 4,
                borderRadius: 12,
                border: "1px solid var(--border,rgba(255,255,255,.08))",
                background: "var(--surface,rgba(14,21,48,.6))",
              })}
            >
              {CURRENCIES.map((c) => {
                const sel = c === cur;
                return (
                  <button
                    key={c}
                    type="button"
                    className="pr-ccy"
                    onClick={() => pickCurrency(c)}
                    aria-pressed={sel}
                    title={`Show prices in ${c}`}
                    style={css({
                      height: "100%",
                      padding: "0 8px",
                      borderRadius: 9,
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: ".06em",
                      border: `1px solid ${sel ? "rgba(34,211,238,.55)" : "transparent"}`,
                      background: sel
                        ? "linear-gradient(120deg,rgba(124,58,237,.3),rgba(34,211,238,.22))"
                        : "transparent",
                      color: sel ? "var(--text,#F8FAFC)" : "var(--muted,#94A3B8)",
                      transition: "all .3s cubic-bezier(.16,1,.3,1)",
                    })}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="pr-toggle"
              onClick={toggleTheme}
              aria-label={themeLabel}
              aria-pressed={light}
              title={themeLabel}
              style={css({
                width: 44,
                height: 44,
                display: "grid",
                placeItems: "center",
                borderRadius: 12,
                border: "1px solid var(--border,rgba(255,255,255,.08))",
                background: "var(--surface,rgba(14,21,48,.6))",
                cursor: "pointer",
                transition: "border-color .2s,box-shadow .3s",
              })}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={themeIcon} />
              </svg>
            </button>
            <a
              className="pr-cta"
              href="https://buy.stripe.com/fZudRb5LJ0oZb8jgaja7C01"
              style={css({
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 18px",
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 14,
                color: "#fff",
                background: "linear-gradient(120deg,#7C3AED,#A855F7 40%,#22D3EE)",
                backgroundSize: "240% 100%",
                animation: "pr-shift 8s cubic-bezier(.45,0,.55,1) infinite alternate",
                boxShadow: "0 0 20px rgba(124,58,237,.45)",
                whiteSpace: "nowrap",
                transition: "box-shadow .3s",
              })}
            >
              Start free trial
            </a>
          </div>
        </div>
      </header>

      <main style={css({ position: "relative", zIndex: 1 })}>
        {/* hero */}
        <section
          aria-labelledby="hero-title"
          style={css({
            maxWidth: 1160,
            margin: "0 auto",
            padding: "clamp(48px,8vw,96px) 16px clamp(24px,4vw,40px)",
            display: "grid",
            gap: 22,
            justifyItems: "center",
            textAlign: "center",
          })}
        >
          <span
            style={css({
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 14px 7px 10px",
              borderRadius: 999,
              border: "1px solid rgba(34,211,238,.3)",
              background: "rgba(34,211,238,.07)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: ".04em",
              color: "var(--accent,#22D3EE)",
              animation: "pr-intro .8s cubic-bezier(.16,1,.3,1) both",
            })}
          >
            <span
              style={css({
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#34D399",
                color: "rgba(52,211,153,.6)",
                animation: "pr-pulse 2.2s ease-out infinite",
              })}
            />
            Bring your own number
          </span>

          <h1
            id="hero-title"
            style={css({
              margin: 0,
              maxWidth: 880,
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: "clamp(38px,6vw,72px)",
              lineHeight: 1.03,
              letterSpacing: "-.035em",
              textWrap: "balance",
              animation: "pr-intro .9s cubic-bezier(.16,1,.3,1) .06s both",
            })}
          >
            Voice AI agents on the phone number{" "}
            <span
              style={css({
                background:
                  "linear-gradient(100deg,#7C3AED,#C084FC 40%,#22D3EE 75%,#7C3AED)",
                backgroundSize: "250% 100%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                animation: "pr-shift 10s cubic-bezier(.45,0,.55,1) infinite alternate",
              })}
            >
              you already own.
            </span>
          </h1>

          <p
            style={css({
              margin: 0,
              maxWidth: 680,
              fontSize: "clamp(16px,1.5vw,19px)",
              lineHeight: 1.65,
              color: "var(--muted,#94A3B8)",
              textWrap: "pretty",
              animation: "pr-intro .9s cubic-bezier(.16,1,.3,1) .12s both",
            })}
          >
            Voice AiLunaPro connects to your existing Twilio, Telnyx or SIP trunk. You keep your
            number, your carrier contract and your per-minute telecom rate. You pay us for the
            platform — agent building, live conversation, transcripts, CRM sync — and nothing else.
          </p>

          <div
            style={css({
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 10,
              animation: "pr-intro .9s cubic-bezier(.16,1,.3,1) .18s both",
            })}
          >
            <span
              style={css({
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid var(--border,rgba(255,255,255,.08))",
                background: "var(--surface,rgba(14,21,48,.6))",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                fontSize: 13,
              })}
            >
              <strong style={css({ color: "var(--ok,#34D399)", fontWeight: 600 })}>
                7-day free trial
              </strong>
              on every plan
            </span>
            <span style={pillChip}>No carrier markup</span>
            <span style={pillChip}>Cancel anytime</span>
          </div>
        </section>

        {/* calculator */}
        <section
          id="calculator"
          aria-labelledby="calc-title"
          style={css({
            maxWidth: 1160,
            margin: "0 auto",
            padding: "clamp(24px,4vw,40px) 16px clamp(56px,8vw,96px)",
          })}
        >
          <div
            style={css({
              position: "relative",
              borderRadius: 28,
              border: "1px solid var(--borderHi,rgba(124,58,237,.28))",
              background:
                "var(--glass,linear-gradient(160deg,rgba(124,58,237,.12),rgba(14,21,48,.72) 45%,rgba(34,211,238,.06)))",
              backdropFilter: "blur(22px)",
              WebkitBackdropFilter: "blur(22px)",
              boxShadow:
                "var(--cardShadow,0 40px 100px -40px rgba(124,58,237,.45),0 0 0 1px rgba(255,255,255,.03) inset)",
              padding: "clamp(20px,4vw,44px)",
              display: "grid",
              gap: "clamp(24px,3.5vw,36px)",
              animation: "pr-intro 1s cubic-bezier(.16,1,.3,1) .22s both",
            })}
          >
            <div
              style={css({
                display: "flex",
                flexWrap: "wrap",
                gap: 24,
                alignItems: "flex-end",
                justifyContent: "space-between",
              })}
            >
              <div style={css({ display: "grid", gap: 10, flex: "1 1 360px", minWidth: 0 })}>
                <span style={eyebrow}>Plan calculator</span>
                <h2
                  id="calc-title"
                  style={css({
                    margin: 0,
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: "clamp(26px,3.4vw,40px)",
                    lineHeight: 1.1,
                    letterSpacing: "-.025em",
                    textWrap: "balance",
                  })}
                >
                  How many agent minutes do you run each month?
                </h2>
                <p
                  style={css({
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: "var(--muted,#94A3B8)",
                    maxWidth: 560,
                  })}
                >
                  Included minutes cover agent conversation time. Telephony stays on your own
                  carrier invoice.
                </p>
              </div>
              <div
                style={css({
                  display: "grid",
                  gap: 4,
                  justifyItems: "end",
                  textAlign: "right",
                  flex: "0 1 auto",
                })}
              >
                <span style={css({ fontSize: 13, color: "var(--muted,#94A3B8)" })}>
                  Monthly usage
                </span>
                <div style={css({ display: "flex", alignItems: "baseline", gap: 8 })}>
                  <strong
                    style={css({
                      fontFamily: DISPLAY,
                      fontWeight: 800,
                      fontSize: "clamp(40px,5vw,60px)",
                      letterSpacing: "-.04em",
                      lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                      background:
                        "linear-gradient(100deg,var(--text,#F8FAFC),var(--accent,#22D3EE))",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    })}
                  >
                    {mLabel}
                  </strong>
                  <span
                    style={css({ fontSize: 16, fontWeight: 600, color: "var(--muted,#94A3B8)" })}
                  >
                    min
                  </span>
                </div>
              </div>
            </div>

            {/* slider */}
            <div style={css({ display: "grid", gap: 14 })}>
              <div
                ref={trackRef}
                role="slider"
                tabIndex={0}
                aria-label="Agent minutes per month"
                aria-valuemin={MIN}
                aria-valuemax={MAX}
                aria-valuenow={m}
                aria-valuetext={mText}
                onPointerDown={onDown}
                onKeyDown={onKey}
                style={css({
                  position: "relative",
                  height: 56,
                  cursor: "pointer",
                  touchAction: "none",
                  outlineOffset: 6,
                  borderRadius: 999,
                })}
              >
                <div
                  style={css({
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 20,
                    height: 10,
                    borderRadius: 999,
                    background: "var(--track,rgba(255,255,255,.07))",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,.3)",
                  })}
                />
                <div
                  style={css({
                    position: "absolute",
                    left: 0,
                    top: 20,
                    height: 10,
                    width: pos,
                    borderRadius: 999,
                    background: "linear-gradient(90deg,#7C3AED,#C084FC,#22D3EE)",
                    boxShadow: "0 0 18px rgba(124,58,237,.55)",
                    transition: trackTr,
                  })}
                />
                {ticks.map((k) => (
                  <div
                    key={k.name}
                    aria-hidden="true"
                    style={css({
                      position: "absolute",
                      top: 14,
                      left: k.left,
                      transform: "translateX(-50%)",
                      display: "grid",
                      justifyItems: "center",
                      gap: 10,
                      pointerEvents: "none",
                    })}
                  >
                    <span
                      style={css({ width: 2, height: 22, borderRadius: 2, background: k.c })}
                    />
                    <span
                      style={css({
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: ".04em",
                        whiteSpace: "nowrap",
                        color: k.fg,
                      })}
                    >
                      {k.label}
                    </span>
                  </div>
                ))}
                <div
                  aria-hidden="true"
                  style={css({
                    position: "absolute",
                    top: 25,
                    left: pos,
                    width: 30,
                    height: 30,
                    margin: "-15px 0 0 -15px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 35% 30%,#fff,#E9E2FF 55%,#C4B5FD)",
                    boxShadow:
                      "0 0 0 6px rgba(124,58,237,.22),0 0 28px rgba(34,211,238,.6),0 6px 16px rgba(0,0,0,.35)",
                    transform: `scale(${thumbScale})`,
                    transition: thumbTr,
                  })}
                />
              </div>

              <div
                style={css({ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" })}
              >
                <span
                  style={css({ fontSize: 13, color: "var(--muted,#94A3B8)", marginRight: 4 })}
                >
                  Quick picks
                </span>
                {presets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className="pr-chip"
                    onClick={() => setM(p.value)}
                    aria-pressed={p.sel}
                    style={css({
                      padding: "8px 14px",
                      borderRadius: 999,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      border: `1px solid ${p.bd}`,
                      background: p.bg,
                      color: p.fg,
                      transition: "all .3s cubic-bezier(.16,1,.3,1)",
                    })}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* best fit + per-plan bars */}
            <div
              style={css({ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "stretch" })}
            >
              <div
                style={css({
                  flex: "1 1 300px",
                  minWidth: 0,
                  padding: 24,
                  borderRadius: 20,
                  border: "1px solid rgba(34,211,238,.35)",
                  background: "linear-gradient(150deg,rgba(34,211,238,.12),rgba(124,58,237,.14))",
                  display: "grid",
                  gap: 14,
                  alignContent: "start",
                  position: "relative",
                  overflow: "hidden",
                })}
              >
                <div
                  aria-hidden="true"
                  style={css({
                    position: "absolute",
                    right: -50,
                    top: -60,
                    width: 200,
                    height: 200,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle,rgba(34,211,238,.35),transparent 65%)",
                  })}
                />
                <span
                  style={css({
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "var(--accent,#22D3EE)",
                  })}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3l1.9 5.8L20 10.7l-5.1 3.3L16.2 20 12 16.6 7.8 20l1.3-6L4 10.7l6.1-1.9z" />
                  </svg>
                  Best fit for you
                </span>
                <strong
                  style={css({
                    position: "relative",
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 30,
                    letterSpacing: "-.02em",
                  })}
                >
                  {best.name}
                </strong>
                <div
                  style={css({
                    position: "relative",
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                  })}
                >
                  <span
                    ref={totalRef}
                    style={css({
                      fontFamily: DISPLAY,
                      fontWeight: 800,
                      fontSize: "clamp(44px,5vw,56px)",
                      letterSpacing: "-.04em",
                      lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                    })}
                  >
                    {best.total}
                  </span>
                  <span style={css({ fontSize: 15, color: "var(--muted,#94A3B8)" })}>
                    / month
                  </span>
                </div>
                <div
                  style={css({ position: "relative", display: "grid", gap: 8, fontSize: 14 })}
                >
                  <span
                    style={css({ display: "flex", justifyContent: "space-between", gap: 12 })}
                  >
                    <span style={css({ color: "var(--muted,#94A3B8)" })}>Effective rate</span>
                    <strong style={css({ fontVariantNumeric: "tabular-nums" })}>
                      {best.eff} / min
                    </strong>
                  </span>
                  <span
                    style={css({ display: "flex", justifyContent: "space-between", gap: 12 })}
                  >
                    <span style={css({ color: "var(--muted,#94A3B8)" })}>
                      Included minutes used
                    </span>
                    <strong style={css({ fontVariantNumeric: "tabular-nums" })}>
                      {best.usedPct}
                    </strong>
                  </span>
                  {hasSave ? (
                    <span
                      style={css({ display: "flex", justifyContent: "space-between", gap: 12 })}
                    >
                      <span style={css({ color: "var(--muted,#94A3B8)" })}>
                        vs {runner.name}
                      </span>
                      <strong
                        style={css({
                          color: "var(--ok,#34D399)",
                          fontVariantNumeric: "tabular-nums",
                        })}
                      >
                        {runner.save} less
                      </strong>
                    </span>
                  ) : null}
                </div>
                <a
                  className="pr-cta-best"
                  href={best.url}
                  style={css({
                    position: "relative",
                    overflow: "hidden",
                    marginTop: 6,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    padding: 14,
                    borderRadius: 14,
                    fontWeight: 600,
                    fontSize: 15,
                    color: "#fff",
                    background: "linear-gradient(120deg,#7C3AED,#A855F7 45%,#22D3EE)",
                    boxShadow: "0 0 24px rgba(124,58,237,.5)",
                    transition: "box-shadow .3s",
                  })}
                >
                  <span
                    aria-hidden="true"
                    style={css({
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: "28%",
                      background:
                        "linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent)",
                      animation: "pr-sheen 3.8s cubic-bezier(.45,0,.55,1) 1.2s infinite",
                    })}
                  />
                  <span style={css({ position: "relative" })}>
                    Start free trial on {best.name}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={css({ position: "relative" })}
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </a>
              </div>

              <div
                style={css({
                  flex: "999 1 480px",
                  minWidth: 0,
                  display: "grid",
                  gap: 10,
                  alignContent: "start",
                })}
              >
                {/* A real list wrapper. The source put role="listitem" on the
                    buttons, which replaced their button role and left them
                    announced as plain list items. */}
                <ul
                  aria-label="Monthly cost per plan"
                  style={css({
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "grid",
                    gap: 10,
                  })}
                >
                  {rows.map((r) => (
                    <li key={r.name}>
                      <button
                        type="button"
                        className="pr-row"
                        onClick={scrollToPlans}
                        style={css({
                          width: "100%",
                          display: "grid",
                          gap: 10,
                          padding: "16px 18px",
                          borderRadius: 16,
                          cursor: "pointer",
                          textAlign: "left",
                          border: `1px solid ${r.bd}`,
                          background: r.bg,
                          boxShadow: r.sh,
                          transition: "border-color .4s,background .4s,box-shadow .4s",
                        })}
                      >
                        <span
                          style={css({
                            display: "flex",
                            alignItems: "baseline",
                            gap: 10,
                            flexWrap: "wrap",
                          })}
                        >
                          <strong
                            style={css({ fontFamily: DISPLAY, fontWeight: 600, fontSize: 16 })}
                          >
                            {r.name}
                          </strong>
                          {r.best ? (
                            <span
                              style={css({
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: ".06em",
                                padding: "3px 8px",
                                borderRadius: 999,
                                color: "#05131A",
                                background: "linear-gradient(120deg,#22D3EE,#C084FC)",
                              })}
                            >
                              BEST FIT
                            </span>
                          ) : null}
                          <span style={css({ fontSize: 12, color: "var(--muted,#94A3B8)" })}>
                            {r.formula}
                          </span>
                          <strong
                            style={css({
                              marginLeft: "auto",
                              fontFamily: DISPLAY,
                              fontWeight: 700,
                              fontSize: 18,
                              fontVariantNumeric: "tabular-nums",
                            })}
                          >
                            {r.total}
                          </strong>
                        </span>
                        <span
                          aria-hidden="true"
                          style={css({
                            position: "relative",
                            display: "flex",
                            height: 12,
                            borderRadius: 999,
                            background: "var(--track,rgba(255,255,255,.07))",
                            overflow: "hidden",
                          })}
                        >
                          <span
                            style={css({
                              height: "100%",
                              width: r.baseW,
                              background: "linear-gradient(90deg,#7C3AED,#22D3EE)",
                              boxShadow: "0 0 12px rgba(34,211,238,.45)",
                              transition: "width .6s cubic-bezier(.16,1,.3,1)",
                            })}
                          />
                          <span
                            style={css({
                              height: "100%",
                              width: r.overW,
                              backgroundColor: "rgba(192,132,252,.85)",
                              backgroundImage:
                                "repeating-linear-gradient(45deg,rgba(255,255,255,.28) 0 7px,transparent 7px 14px)",
                              backgroundSize: "28px 12px",
                              animation: "pr-stripes 1.4s linear infinite",
                              transition: "width .6s cubic-bezier(.16,1,.3,1)",
                            })}
                          />
                        </span>
                        <span
                          style={css({
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                            fontSize: 12,
                            color: "var(--muted,#94A3B8)",
                          })}
                        >
                          <span>{r.baseTxt}</span>
                          <span style={css({ color: r.overC })}>{r.overTxt}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div
                  style={css({
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                    fontSize: 12,
                    color: "var(--muted,#94A3B8)",
                    padding: "2px 4px",
                  })}
                >
                  <span
                    style={css({ display: "inline-flex", alignItems: "center", gap: 8 })}
                  >
                    <span
                      style={css({
                        width: 14,
                        height: 8,
                        borderRadius: 999,
                        background: "linear-gradient(90deg,#7C3AED,#22D3EE)",
                      })}
                    />
                    Subscription
                  </span>
                  <span
                    style={css({ display: "inline-flex", alignItems: "center", gap: 8 })}
                  >
                    <span
                      style={css({
                        width: 14,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "rgba(192,132,252,.85)",
                        backgroundImage:
                          "repeating-linear-gradient(45deg,rgba(255,255,255,.3) 0 3px,transparent 3px 6px)",
                      })}
                    />
                    Extra minutes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* plans */}
        <section
          id="plans"
          aria-labelledby="plans-title"
          style={css({
            maxWidth: 1160,
            margin: "0 auto",
            padding: "clamp(56px,8vw,96px) 16px",
          })}
        >
          <div
            className="pr-reveal-28"
            style={css({ display: "grid", gap: 12, maxWidth: 720, marginBottom: 36 })}
          >
            <span style={eyebrow}>Plans</span>
            <h2
              id="plans-title"
              style={css({
                margin: 0,
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: "clamp(30px,4vw,48px)",
                lineHeight: 1.08,
                letterSpacing: "-.025em",
                textWrap: "balance",
              })}
            >
              Platform minutes, billed monthly
            </h2>
            <p
              style={css({
                margin: 0,
                fontSize: 17,
                lineHeight: 1.6,
                color: "var(--muted,#94A3B8)",
              })}
            >
              Each meter shows how far {mLabel} minutes go on that plan.
            </p>
          </div>

          <div
            className="pr-reveal-25"
            style={css({
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,250px),1fr))",
              gap: 16,
              alignItems: "stretch",
            })}
          >
            {cards.map((p) => (
              <article
                key={p.name}
                className="pr-plan"
                style={css({
                  position: "relative",
                  padding: "26px 22px",
                  borderRadius: 22,
                  border: `1px solid ${p.bd}`,
                  background: p.bg,
                  boxShadow: p.sh,
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                  minWidth: 0,
                  transition:
                    "transform .4s cubic-bezier(.16,1,.3,1),box-shadow .4s,border-color .4s",
                })}
              >
                <div
                  style={css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    minHeight: 26,
                  })}
                >
                  <span
                    style={css({
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: ".16em",
                      textTransform: "uppercase",
                      color: p.tagC,
                    })}
                  >
                    {p.name}
                  </span>
                  {p.best ? (
                    <span
                      style={css({
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: ".04em",
                        padding: "5px 10px",
                        borderRadius: 999,
                        color: "#fff",
                        background: "linear-gradient(120deg,#7C3AED,#22D3EE)",
                        boxShadow: "0 0 16px rgba(124,58,237,.5)",
                      })}
                    >
                      Best fit
                    </span>
                  ) : null}
                </div>

                <div style={css({ display: "flex", alignItems: "baseline", gap: 6 })}>
                  <span
                    style={css({
                      fontFamily: DISPLAY,
                      fontWeight: 800,
                      fontSize: 44,
                      letterSpacing: "-.04em",
                      lineHeight: 1,
                    })}
                  >
                    {p.price}
                  </span>
                  <span style={css({ fontSize: 14, color: "var(--muted,#94A3B8)" })}>
                    / month
                  </span>
                </div>

                <div
                  style={css({
                    display: "grid",
                    gap: 10,
                    padding: 14,
                    borderRadius: 14,
                    background: "var(--well,rgba(7,11,23,.45))",
                    border: "1px solid var(--border,rgba(255,255,255,.08))",
                  })}
                >
                  <div
                    style={css({
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      fontSize: 13,
                    })}
                  >
                    <span style={css({ fontWeight: 600, fontVariantNumeric: "tabular-nums" })}>
                      {p.incl} min included
                    </span>
                    <span
                      style={css({
                        color: "var(--muted,#94A3B8)",
                        fontVariantNumeric: "tabular-nums",
                      })}
                    >
                      {p.rate} / extra
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${p.name} included minutes used`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={p.pctN}
                    style={css({
                      position: "relative",
                      height: 8,
                      borderRadius: 999,
                      background: "var(--track,rgba(255,255,255,.07))",
                      overflow: "hidden",
                    })}
                  >
                    <div
                      style={css({
                        height: "100%",
                        width: p.fill,
                        borderRadius: 999,
                        background: p.fillBg,
                        boxShadow: `0 0 12px ${p.glow}`,
                        transition: "width .7s cubic-bezier(.16,1,.3,1),background .4s",
                      })}
                    />
                  </div>
                  <span style={css({ fontSize: 12, fontWeight: 500, color: p.meterC })}>
                    {p.meterTxt}
                  </span>
                </div>

                <ul
                  style={css({
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "grid",
                    gap: 11,
                    flex: 1,
                  })}
                >
                  {p.feat.map((f) => (
                    <li
                      key={f}
                      style={css({
                        display: "flex",
                        gap: 10,
                        fontSize: 14,
                        lineHeight: 1.45,
                        color: "var(--soft,#CBD5E1)",
                      })}
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--accent,#22D3EE)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={css({ flexShrink: 0, marginTop: 1 })}
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  className="pr-plan-cta"
                  href={p.url}
                  style={css({
                    textAlign: "center",
                    padding: 13,
                    borderRadius: 12,
                    fontWeight: 600,
                    fontSize: 15,
                    border: `1px solid ${p.btnBd}`,
                    background: p.btnBg,
                    color: p.btnFg,
                    transition: "box-shadow .3s,border-color .3s",
                  })}
                >
                  Start free trial
                </a>
              </article>
            ))}
          </div>

          <p
            style={css({
              margin: "20px 0 0",
              textAlign: "center",
              fontSize: 13,
              color: "var(--muted,#94A3B8)",
            })}
          >
            Prices shown in {cur} at indicative rates and charged in EUR. Prices exclude VAT.
            Extra minutes are billed at the end of each cycle.
          </p>
        </section>

        {/* comparison */}
        {SHOW_COMPARISON ? (
          <section
            id="compare"
            aria-labelledby="cmp-title"
            style={css({
              maxWidth: 1160,
              margin: "0 auto",
              padding: "clamp(56px,8vw,96px) 16px",
            })}
          >
            <div
              className="pr-reveal-28"
              style={css({ display: "grid", gap: 12, maxWidth: 760, marginBottom: 32 })}
            >
              <span style={eyebrow}>Comparison</span>
              <h2
                id="cmp-title"
                style={css({
                  margin: 0,
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: "clamp(30px,4vw,48px)",
                  lineHeight: 1.08,
                  letterSpacing: "-.025em",
                  textWrap: "balance",
                })}
              >
                What {mLabel} minutes a month actually costs
              </h2>
              <p
                style={css({
                  margin: 0,
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: "var(--muted,#94A3B8)",
                  textWrap: "pretty",
                })}
              >
                Platform fee only. Every provider below asks you to connect your own carrier, so
                telecom is on top in each row. Move the calculator slider to update.
              </p>
            </div>

            <div
              className="pr-reveal-28"
              style={css({
                borderRadius: 24,
                border: "1px solid var(--border,rgba(255,255,255,.08))",
                background: "var(--surface,rgba(14,21,48,.6))",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                padding: "clamp(18px,3vw,32px)",
                display: "grid",
                gap: 22,
              })}
            >
              {comp.map((c, i) => (
                <div key={i} style={css({ display: "grid", gap: 10 })}>
                  <div
                    style={css({
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      flexWrap: "wrap",
                    })}
                  >
                    <strong
                      style={css({
                        fontFamily: DISPLAY,
                        fontWeight: 600,
                        fontSize: 16,
                        color: c.nameC,
                      })}
                    >
                      {c.name}
                    </strong>
                    <span style={css({ fontSize: 13, color: "var(--muted,#94A3B8)" })}>
                      {c.model}
                    </span>
                    <span
                      style={css({
                        marginLeft: "auto",
                        fontFamily: DISPLAY,
                        fontWeight: 700,
                        fontSize: 16,
                        fontVariantNumeric: "tabular-nums",
                        color: c.nameC,
                      })}
                    >
                      {c.cost}
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    style={css({
                      position: "relative",
                      height: 14,
                      borderRadius: 999,
                      background: "var(--track,rgba(255,255,255,.07))",
                      overflow: "hidden",
                    })}
                  >
                    <div
                      style={css({
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: c.hiW,
                        borderRadius: 999,
                        background: c.rangeBg,
                        transition: "width .7s cubic-bezier(.16,1,.3,1)",
                      })}
                    />
                    <div
                      style={css({
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: c.loW,
                        borderRadius: 999,
                        background: c.bar,
                        boxShadow: c.glow,
                        transition: "width .7s cubic-bezier(.16,1,.3,1)",
                      })}
                    />
                  </div>
                  <div
                    style={css({
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      fontSize: 12,
                      color: "var(--muted,#94A3B8)",
                    })}
                  >
                    <span>Free trial · {c.trial}</span>
                    <span>{c.note}</span>
                  </div>
                </div>
              ))}
            </div>

            <p
              style={css({
                margin: "16px 0 0",
                fontSize: 13,
                color: "var(--muted,#94A3B8)",
              })}
            >
              All figures above are shown in {cur}, converted at indicative rates; billing always
              happens in EUR.
            </p>
            <p
              style={css({
                margin: "6px 0 0",
                fontSize: 13,
                color: "var(--muted,#94A3B8)",
              })}
            >
              Competitor figures are published list prices as of October 2026, quoted in USD at
              source, and move with usage mix.
            </p>
          </section>
        ) : null}

        {/* why bring your own number */}
        <section
          aria-labelledby="byon-title"
          style={css({
            maxWidth: 1160,
            margin: "0 auto",
            padding: "clamp(56px,8vw,96px) 16px",
          })}
        >
          <div
            className="pr-reveal-28"
            style={css({ display: "grid", gap: 12, maxWidth: 720, marginBottom: 32 })}
          >
            <span style={eyebrow}>Why bring your own number</span>
            <h2
              id="byon-title"
              style={css({
                margin: 0,
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: "clamp(30px,4vw,48px)",
                lineHeight: 1.08,
                letterSpacing: "-.025em",
              })}
            >
              Your carrier stays yours
            </h2>
          </div>

          <div
            className="pr-reveal-25"
            style={css({
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))",
              gap: 16,
            })}
          >
            {WHY.map((w) => (
              <article
                key={w.t}
                className="pr-why"
                style={css({
                  padding: 26,
                  borderRadius: 20,
                  border: "1px solid var(--border,rgba(255,255,255,.08))",
                  background: "var(--surface,rgba(14,21,48,.6))",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  display: "grid",
                  gap: 14,
                  alignContent: "start",
                  transition:
                    "transform .4s cubic-bezier(.16,1,.3,1),border-color .4s,box-shadow .4s",
                })}
              >
                <span
                  style={css({
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background:
                      "radial-gradient(circle at 30% 30%,rgba(34,211,238,.25),rgba(124,58,237,.22))",
                    border: "1px solid rgba(124,58,237,.35)",
                    boxShadow: "0 0 22px rgba(124,58,237,.25)",
                  })}
                >
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent,#22D3EE)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={w.icon} />
                  </svg>
                </span>
                <h3
                  style={css({
                    margin: 0,
                    fontFamily: DISPLAY,
                    fontWeight: 600,
                    fontSize: 18,
                    letterSpacing: "-.01em",
                  })}
                >
                  {w.t}
                </h3>
                <p
                  style={css({
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: "var(--muted,#94A3B8)",
                    textWrap: "pretty",
                  })}
                >
                  {w.d}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* faq */}
        <section
          id="faq"
          aria-labelledby="faq-title"
          style={css({
            maxWidth: 860,
            margin: "0 auto",
            padding: "clamp(56px,8vw,96px) 16px",
          })}
        >
          <div
            className="pr-reveal-28"
            style={css({
              display: "grid",
              gap: 12,
              justifyItems: "center",
              textAlign: "center",
              marginBottom: 32,
            })}
          >
            <span style={eyebrow}>Questions</span>
            <h2
              id="faq-title"
              style={css({
                margin: 0,
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: "clamp(30px,4vw,44px)",
                lineHeight: 1.08,
                letterSpacing: "-.025em",
              })}
            >
              Before you start the trial
            </h2>
          </div>

          <div style={css({ display: "grid", gap: 10 })}>
            {faqs.map((q) => (
              <div
                key={q.q}
                style={css({
                  borderRadius: 18,
                  border: `1px solid ${q.bd}`,
                  background: "var(--surface,rgba(14,21,48,.6))",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  transition: "border-color .3s",
                })}
              >
                <h3 style={css({ margin: 0 })}>
                  <button
                    type="button"
                    id={`faq-q-${q.index}`}
                    aria-expanded={q.open}
                    aria-controls={`faq-a-${q.index}`}
                    onClick={() => setFaq(q.open ? -1 : q.index)}
                    style={css({
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      textAlign: "left",
                      padding: "20px 22px",
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      fontFamily: DISPLAY,
                      fontWeight: 600,
                      fontSize: 17,
                      borderRadius: 18,
                    })}
                  >
                    {q.q}
                    <span
                      aria-hidden="true"
                      style={css({
                        flexShrink: 0,
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid var(--border,rgba(255,255,255,.12))",
                        transform: `rotate(${q.rot})`,
                        transition: "transform .35s cubic-bezier(.16,1,.3,1)",
                      })}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--accent,#22D3EE)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                </h3>
                {/* Always rendered, toggled with `hidden`, so the id that
                    aria-controls points at always resolves. */}
                <div
                  id={`faq-a-${q.index}`}
                  role="region"
                  aria-labelledby={`faq-q-${q.index}`}
                  hidden={!q.open}
                  style={css({
                    padding: "0 22px 22px",
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "var(--muted,#94A3B8)",
                    animation: q.open ? "pr-intro .4s cubic-bezier(.16,1,.3,1) both" : "none",
                    textWrap: "pretty",
                  })}
                >
                  {q.a}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer
        style={css({
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid var(--border,rgba(255,255,255,.08))",
          background: "var(--topbar,rgba(7,11,23,.62))",
        })}
      >
        <div
          style={css({
            maxWidth: 1160,
            margin: "0 auto",
            padding: "32px 16px",
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          })}
        >
          <a
            href="#pricing-top"
            aria-label="Voice AiLunaPro"
            style={css({ display: "inline-flex", alignItems: "center", gap: 10 })}
          >
            <span
              style={css({
                display: "flex",
                background: "#F3F5FB",
                borderRadius: 999,
                padding: "6px 12px",
              })}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dograh-logo.png"
                alt="AiLunaPro"
                style={css({ height: 18, width: "auto", display: "block" })}
              />
            </span>
            <span
              style={css({
                fontFamily: DISPLAY,
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: ".06em",
                color: "var(--accent,#22D3EE)",
              })}
            >
              VOICE
            </span>
          </a>
          <span style={css({ fontSize: 14, color: "var(--muted,#94A3B8)" })}>
            voice.ailunapro.com · Support:{" "}
            <a href="mailto:service@ailunapro.com">service@ailunapro.com</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
