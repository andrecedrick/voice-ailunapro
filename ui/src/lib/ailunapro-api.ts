/**
 * Voice AiLunaPro endpoints. OURS — see BRAND.md.
 *
 * Thin typed calls on the shared generated `client` (same base URL and auth
 * interceptor as every other request), written by hand so they survive a
 * `generate-client` run against an upstream spec that does not know them.
 * Like the generated SDK, they resolve to { data, error } and never throw on
 * an HTTP error.
 */
import { client } from "@/client/client.gen";

export type AuthUser = {
  id: number;
  email: string | null;
  name?: string | null;
  organization_id?: number | null;
  provider_id?: string | null;
};

export type AuthSession = { token: string; user: AuthUser };

export type SignupConfig = {
  signup_enabled: boolean;
  verification_required: boolean;
  turnstile_site_key: string | null;
  /** False when outgoing mail is off: the sign-in page then hides the link. */
  password_reset_enabled?: boolean;
};

export type SignupResult = {
  verification_required: boolean;
  email: string;
  token: string | null;
  user: AuthUser | null;
};

export type SignupPayload = {
  email: string;
  password: string;
  website?: string;
  started_at?: number;
  turnstile_token?: string | null;
  locale?: string;
};

export type Plan = {
  id: string;
  name: string;
  currency: string;
  monthly_amount: number;
  interval: string;
  included_minutes: number;
  overage_per_minute: string | null;
};

export type PlansResult = {
  billing_enabled: boolean;
  /** Currency the amounts are quoted in, and the ones Stripe can charge. */
  currency?: string;
  currencies?: string[];
  detected_country?: string | null;
  trial_days: number;
  trial_minutes_cap: number;
  plans: Plan[];
};

export type SubscriptionStatus = {
  billing_enabled: boolean;
  subscribed: boolean;
  status: string | null;
  plan_name: string | null;
  included_minutes: number;
  trial_minutes_used: number;
  trial_minutes_cap: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

type Res<T> = Promise<{ data?: T; error?: unknown; response?: Response }>;

const json = { "Content-Type": "application/json" };

export const authApi = {
  signupConfig: (): Res<SignupConfig> =>
    client.get({ url: "/api/v1/auth/signup-config" }) as Res<SignupConfig>,
  signup: (body: SignupPayload): Res<SignupResult> =>
    client.post({ url: "/api/v1/auth/signup", body, headers: json }) as Res<SignupResult>,
  verifyEmail: (token: string, locale?: string): Res<AuthSession> =>
    client.post({ url: "/api/v1/auth/verify-email", body: { token, locale }, headers: json }) as Res<AuthSession>,
  forgotPassword: (email: string, locale?: string): Res<{ sent: boolean }> =>
    client.post({
      url: "/api/v1/auth/password/forgot",
      body: { email, locale },
      headers: json,
    }) as Res<{ sent: boolean }>,
  resetPassword: (token: string, password: string, locale?: string): Res<AuthSession> =>
    client.post({
      url: "/api/v1/auth/password/reset",
      body: { token, password, locale },
      headers: json,
    }) as Res<AuthSession>,
  resendVerification: (email: string, locale?: string): Res<{ sent: boolean }> =>
    client.post({
      url: "/api/v1/auth/resend-verification",
      body: { email, locale },
      headers: json,
    }) as Res<{ sent: boolean }>,
};

export const billingApi = {
  plans: (currency?: string): Res<PlansResult> =>
    client.get({
      url: "/api/v1/billing/stripe/plans",
      query: currency ? { currency } : undefined,
    }) as Res<PlansResult>,
  status: (): Res<SubscriptionStatus> =>
    client.get({ url: "/api/v1/billing/stripe/status" }) as Res<SubscriptionStatus>,
  checkout: (
    planId: string,
    locale?: string,
    partnerCode?: string | null,
    currency?: string,
  ): Res<{ url: string }> =>
    client.post({
      url: "/api/v1/billing/stripe/checkout-session",
      body: { plan_id: planId, locale, partner_code: partnerCode || undefined, currency },
      headers: json,
    }) as Res<{ url: string }>,
  portal: (locale?: string): Res<{ url: string }> =>
    client.post({
      url: "/api/v1/billing/stripe/portal",
      body: { locale },
      headers: json,
    }) as Res<{ url: string }>,
};

export type FoundersOffer = {
  seats_total: number;
  seats_taken: number;
  seats_left: number;
  ends_at: string;
  open: boolean;
  wave: number;
  wave_seats_left: number;
  percent_off: number;
  next_percent_off: number | null;
};

export type PartnerTerms = {
  percent_off: number;
  first_pct: number;
  recurring_pct: number;
  months: number;
};

export type PartnerCreated = {
  code: string;
  dashboard_url: string;
  share_url: string;
  percent_off: number;
  first_pct: number;
  recurring_pct: number;
  months: number;
};

export type PartnerStats = {
  code: string;
  name: string | null;
  percent_off: number;
  signups: number;
  active: number;
  earning: number;
  mrr_cents: number;
  commission_cents: number;
  first_pct: number;
  recurring_pct: number;
  months: number;
};

/** Founders offer + influencer programme. OURS — see api/services/billing/growth.py. */
export const growthApi = {
  founders: (): Res<FoundersOffer> =>
    client.get({ url: "/api/v1/ailunapro/founders" }) as Res<FoundersOffer>,
  terms: (): Res<PartnerTerms> =>
    client.get({ url: "/api/v1/ailunapro/partners/terms" }) as Res<PartnerTerms>,
  createPartner: (body: { name: string; email: string; handle: string; locale?: string }): Res<PartnerCreated> =>
    client.post({ url: "/api/v1/ailunapro/partners", body, headers: json }) as Res<PartnerCreated>,
  requestPayout: (code: string, token: string): Res<{ ok: boolean; amount_cents: number }> =>
    client.post({
      url: `/api/v1/ailunapro/partners/${encodeURIComponent(code)}/payout`,
      query: { token },
      headers: json,
    }) as Res<{ ok: boolean; amount_cents: number }>,
  partnerStats: (code: string, token: string): Res<PartnerStats> =>
    client.get({
      url: `/api/v1/ailunapro/partners/${encodeURIComponent(code)}/stats`,
      query: { token },
    }) as Res<PartnerStats>,
};

const REF_KEY = "al_partner_ref";
const ME_KEY = "al_partner_me";

/** Remember this browser's own partner credentials (from the signed link). */
export function rememberPartner(code: string, token: string) {
  try {
    localStorage.setItem(ME_KEY, JSON.stringify({ code, token }));
  } catch {}
}

export function storedPartner(): { code: string; token: string } | null {
  try {
    const raw = localStorage.getItem(ME_KEY);
    if (!raw) return null;
    const { code, token } = JSON.parse(raw);
    return code && token ? { code, token } : null;
  } catch {
    return null;
  }
}

/** Remember an influencer code from ?ref= for 30 days (per browser). */
export function rememberPartnerRef(code: string | null) {
  if (!code || !/^LUNA-[A-Z0-9]{2,20}$/i.test(code)) return;
  try {
    localStorage.setItem(REF_KEY, JSON.stringify({ code: code.toUpperCase(), at: Date.now() }));
  } catch {}
}

export function partnerRef(): string | null {
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw);
    return Date.now() - at < 30 * 86400_000 ? code : null;
  } catch {
    return null;
  }
}

export type LeadKind = "enterprise" | "hire_expert" | "onboarding";
export type LeadReply = { ok: boolean; show_calendar?: boolean; cal_link?: string | null };

/** Lead / onboarding forms → our backend, which emails the sales inbox. */
export const leadsApi = {
  submit: (kind: LeadKind, data: Record<string, unknown>): Res<LeadReply> =>
    client.post({ url: "/api/v1/ailunapro/leads", body: { kind, data }, headers: json }) as Res<LeadReply>,
};

/** Store the session the same way the login form does (httpOnly cookies via our route). */
export async function startSession(session: AuthSession): Promise<void> {
  await fetch("/api/auth/session", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ token: session.token, user: session.user }),
  });
}

/** FastAPI `detail` as a string, whatever shape it arrived in. */
export function errorDetail(error: unknown): string | undefined {
  const detail = (error as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return (detail[0] as { msg?: string } | undefined)?.msg;
  return undefined;
}
