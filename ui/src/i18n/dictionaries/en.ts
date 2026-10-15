/**
 * English — the reference dictionary.
 *
 * Every other language is typed against this one (`Dict`), so a key added here
 * and forgotten elsewhere is a type error, not a blank label in production.
 */
export const en = {
  meta: {
    description: "AI voice agents — build, campaigns and telephony",
  },
  common: {
    support: "Support",
    language: "Language",
    theme: "Toggle light/dark theme",
    menu: "Open menu",
    collapse: "Collapse sidebar",
    settings: "Settings",
    accountSettings: "Account settings",
    signOut: "Sign out",
    actionRequired: "Action required",
    viewAll: "View all",
    product: "AiLunaPro Voice",
  },
  nav: {
    build: "Build",
    manage: "Manage",
    overview: "Overview",
    agents: "Voice agents",
    providers: "Providers",
    models: "Models",
    telephony: "Telephony",
    tools: "Tools",
    credentials: "Credentials",
    files: "Files",
    campaigns: "Campaigns",
    recordings: "Recordings",
    developers: "Developers",
    runs: "Agent runs",
    billing: "Billing",
    reports: "Reports",
    pricing: "Pricing",
    settings: "Settings",
  },
  version: {
    title: (ui: string, upstream: string) => `Voice AiLunaPro ${ui} · built on Dograh ${upstream}`,
    update: "Update",
    updateTip: (latest: string, current: string) =>
      `Dograh ${latest} is out (this build: ${current}) — see the release notes`,
    latest: "Latest",
    latestTip: "You're on the latest Dograh release",
  },
  topbar: {
    search: "Search screens and actions…",
    newAgent: "New agent",
    help: "Help",
  },
  palette: {
    title: "Command palette",
    placeholder: "Search a screen, an action…",
    screens: "Go to",
    actions: "Actions",
    empty: "No results",
    hint: "↑↓ navigate · ↵ open · esc close",
    newAgent: "Create a voice agent",
    newCampaign: "New campaign",
    toggleTheme: "Toggle theme",
    contactSupport: "Contact support",
  },
  overview: {
    welcome: "Welcome to Voice AiLunaPro",
    welcomeNamed: (name: string) => `Welcome back, ${name}`,
    subtitle: "Build, launch and run your AI voice agents.",
    statusOk: "All systems operational",
    statusDown: "Service unavailable",
    kpiCallsToday: "Calls today",
    kpiCallsTodayHint: "latest recorded day",
    kpiMinutes: "Minutes used",
    kpiCalls: "Calls handled",
    kpiPeak: "Daily peak",
    kpiPeakHint: "calls / day",
    overDays: (n: number) => `over ${n} days`,
    minutesUnit: "min",
    usageUnavailable: "Usage metrics are not available right now.",
    recent: "Recent activity",
    recentSub: (n: number) => `Calls over the last ${n} days`,
    barTitle: (calls: number, minutes: string) => `${calls} calls · ${minutes} min`,
    railLabel: "Calls today compared with this week's peak",
    agentsTitle: "Create & manage your voice agents",
    agentsDesc: "Design agents in the visual editor: script, voice, tools and handoffs to your team.",
    agentsCta: "Go to agents",
    servicesTitle: "Configure your services",
    servicesDesc: "Connect your LLM, TTS and STT providers, then pick the best model for each agent.",
    servicesCta: "Configure models",
    resources: "Resources",
    resourcesSub: "Everything to go further with Voice AiLunaPro.",
    resCampaigns: "Automated outbound calling",
    resTelephony: "Numbers and SIP trunks",
    resDevelopers: "API keys, webhooks and MCP",
    resPricing: "Plans and included minutes",
    question: "A question?",
  },
  auth: {
    tagline: "The AI voice agent platform.",
    highlights: ["Real-time voice-to-voice", "MCP-native", "Your keys, your models"],
    enterpriseTitle: "Need on-prem deployment or data residency?",
    enterpriseBody: "We deploy Voice AiLunaPro inside your environment for regulated and high-volume teams.",
    enterpriseCta: "Enterprise enquiry",
    email: "Email",
    password: "Password",
    signInTitle: "Sign in",
    signInSub: "Enter your email and password to continue",
    passwordPlaceholder: "Your password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    noAccount: "Don't have an account?",
    createAccountLink: "Create an account",
    loginFailed: "Sign-in failed",
    genericError: "Something went wrong. Please try again.",
    signUpTitle: "Create an account",
    signUpSub: "A few details and you're in",
    passwordMin: "At least 8 characters",
    confirmPassword: "Confirm password",
    confirmPlaceholder: "Confirm your password",
    createAccount: "Create my account",
    creating: "Creating…",
    haveAccount: "Already have an account?",
    signInLink: "Sign in",
    tooShort: "Password must be at least 8 characters",
    mismatch: "Passwords do not match",
    signupFailed: "Could not create the account",
  },
  billing: {
    planTitle: "Plans and minutes",
    planBody: "Your Voice AiLunaPro plan covers the calls your agents place. Pick a plan, or change it at any time.",
    planCta: "See plans",
  },
  footer: {
    privacy: "Privacy",
    terms: "Terms",
  },
};

/** Widen literal types so other languages can supply their own strings. */
type Widen<T> = T extends (...args: infer A) => string
  ? (...args: A) => string
  : T extends readonly string[]
    ? string[]
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : string;

export type Dict = Widen<typeof en>;
