/**
 * /pricing copy — English reference. OURS (see BRAND.md).
 * Every other language is typed against this one.
 */
export const pricingEn = {
  nav: { calculator: "Calculator", plans: "Plans", compare: "Compare", faq: "FAQ" },
  pricingSections: "Pricing sections",
  displayCurrency: "Display currency",
  showPricesIn: (c: string) => `Show prices in ${c}`,
  switchDark: "Switch to dark theme",
  switchLight: "Switch to light theme",
  startTrial: "Start free trial",
  heroEyebrow: "Bring your own number",
  heroTitleA: "Voice AI agents on the phone number",
  heroTitleB: "you already own.",
  heroBody:
    "Voice AiLunaPro connects to your existing Twilio, Telnyx or SIP trunk. You keep your number, your carrier contract and your per-minute telecom rate. You pay us for the platform — agent building, live conversation, transcripts, CRM sync — and nothing else.",
  trialStrong: "7-day free trial",
  trialRest: "on every plan",
  noMarkup: "No carrier markup",
  cancelAnytime: "Cancel anytime",
  calcEyebrow: "Plan calculator",
  calcTitle: "How many agent minutes do you run each month?",
  calcSub: "Included minutes cover agent conversation time. Telephony stays on your own carrier invoice.",
  monthlyUsage: "Monthly usage",
  minShort: "min",
  quickPicks: "Quick picks",
  sliderLabel: "Agent minutes per month",
  sliderValue: (m: string, plan: string, price: string) =>
    `${m} minutes per month — best fit ${plan} at ${price} per month`,
  bestForYou: "Best fit for you",
  perMonth: "/ month",
  effectiveRate: "Effective rate",
  perMin: "/ min",
  includedUsed: "Included minutes used",
  vs: (name: string) => `vs ${name}`,
  less: (amount: string) => `${amount} less`,
  startTrialOn: (plan: string) => `Start free trial on ${plan}`,
  costPerPlan: "Monthly cost per plan",
  bestFitCaps: "BEST FIT",
  flat: (price: string) => `${price} flat`,
  baseTxt: (used: string, incl: string) => `${used} of ${incl} included min`,
  overTxt: (amount: string) => `+${amount} extra minutes`,
  spareTxt: (n: string) => `${n} min to spare`,
  legendSub: "Subscription",
  legendExtra: "Extra minutes",
  plansEyebrow: "Plans",
  plansTitle: "Platform minutes, billed monthly",
  plansSub: (m: string) => `Each meter shows how far ${m} minutes go on that plan.`,
  bestFit: "Best fit",
  minIncluded: (n: string) => `${n} min included`,
  perExtra: (rate: string) => `${rate} / extra`,
  includedUsedAria: (plan: string) => `${plan} included minutes used`,
  meterOver: (n: string, amount: string) => `${n} min over · +${amount}`,
  meterPct: (p: number) => `${p}% of included minutes`,
  plansFoot: (cur: string) =>
    `Prices shown in ${cur} at indicative rates and charged in EUR. Prices exclude VAT. Extra minutes are billed at the end of each cycle.`,
  compareEyebrow: "Comparison",
  compareTitle: (m: string) => `What ${m} minutes a month actually costs`,
  compareSub:
    "Voice AiLunaPro includes the platform and the AI models; your carrier bills telephony at cost (about €0.01/min). Competitor rows are their published all-in ranges. Move the slider to compare at your volume.",
  ourName: (plan: string) => `Voice AiLunaPro — ${plan}`,
  ourModel: (incl: string) => `Flat subscription, ${incl} min included`,
  ourNote: "Best plan at this volume",
  freeTrial: (t: string) => `Free trial · ${t}`,
  ourTrial: "7 days",
  cheaperThanTypical: (p: number) => `${p}% below their typical cost`,
  withinRange: "Within their range",
  rangeNote: "Range depends on model mix",
  winHeadline: (n: number, total: number) =>
    n === total
      ? "Cheaper than the typical cost of every alternative at this volume"
      : `Cheaper than the typical cost of ${n} of ${total} alternatives at this volume`,
  competitors: {
    vapi: { model: "Platform fee + models & voices passed through", trial: "Starter credit" },
    retell: { model: "Per minute, infra + models", trial: "Starter credit" },
    bland: { model: "Per minute, bundled", trial: "Limited free tier" },
    synthflow: { model: "Pay as you go · white-label from $2,000/mo", trial: "Starter credit" },
  },
  compFoot1: (cur: string) =>
    `All figures are shown in ${cur}, converted at indicative rates; billing always happens in EUR.`,
  compFoot2:
    "Competitor figures are published all-in ranges as of October 2026, quoted in USD at source; they move with model, voice and telephony choices.",
  whyEyebrow: "Why bring your own number",
  whyTitle: "Your carrier stays yours",
  why: [
    {
      t: "Keep the number customers know",
      d: "Point your existing DID at Voice AiLunaPro. Nothing changes on your printed material, your Google listing or your signatures.",
    },
    {
      t: "Pay telecom at cost",
      d: "Carrier minutes stay on your own Twilio, Telnyx or Zadarma invoice at the rate you already negotiated. We add no markup because we never touch the call leg.",
    },
    {
      t: "Leave without a migration",
      d: "The number, the recordings and the carrier account are yours. Disconnecting the agent takes one setting.",
    },
  ],
  faqEyebrow: "Questions",
  faqTitle: "Before you start the trial",
  faq: [
    [
      "What does the 7-day trial include?",
      "Full access to the plan you pick, with a capped number of trial minutes so a runaway loop cannot bill your carrier. A card is required; nothing is charged until day 8 and you can cancel in one click before then.",
    ],
    [
      "What counts as a platform minute?",
      "Time the agent spends connected on a call, inbound or outbound, counted per started minute. Failed dials are not counted.",
    ],
    [
      "Can I use my own OpenAI or Gemini key?",
      "Yes, on Business and Agency. Connect your key and model inference leaves your bill with us and lands on your provider account instead.",
    ],
    [
      "Which carriers work?",
      "Anything that terminates SIP: Twilio, Telnyx, Vonage, Zadarma, OVH, a local PBX. If your provider gives you SIP credentials, the agent can answer on it.",
    ],
    [
      "Which languages can the agent speak?",
      "French, English, Spanish, Portuguese and twenty more, with the same agent able to switch mid-call when the caller does. This page and the app are available in 8 languages.",
    ],
  ] as [string, string][],
  plans: {
    Starter: ["2 concurrent calls", "1 voice agent", "Inbound & outbound", "Transcripts and call summaries", "Email support"],
    Pro: ["10 concurrent calls", "5 voice agents", "Webhooks and CRM sync", "Custom voice and knowledge base", "Call analytics dashboard"],
    Business: ["30 concurrent calls", "Unlimited agents", "Bring your own LLM key", "Priority routing and support", "Shared team workspace"],
    Agency: ["100 concurrent calls", "Sub-accounts for each client", "White-label domain and branding", "Dedicated onboarding", "SLA on request"],
  } as Record<string, string[]>,
  footerSupport: "Support:",
};

type Widen<T> = T extends (...args: infer A) => string
  ? (...args: A) => string
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : string;

export type PricingDict = Widen<typeof pricingEn>;
