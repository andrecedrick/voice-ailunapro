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
  verifyEmail: (token: string): Res<AuthSession> =>
    client.post({ url: "/api/v1/auth/verify-email", body: { token }, headers: json }) as Res<AuthSession>,
  resendVerification: (email: string, locale?: string): Res<{ sent: boolean }> =>
    client.post({
      url: "/api/v1/auth/resend-verification",
      body: { email, locale },
      headers: json,
    }) as Res<{ sent: boolean }>,
};

export const billingApi = {
  plans: (): Res<PlansResult> => client.get({ url: "/api/v1/billing/stripe/plans" }) as Res<PlansResult>,
  status: (): Res<SubscriptionStatus> =>
    client.get({ url: "/api/v1/billing/stripe/status" }) as Res<SubscriptionStatus>,
  checkout: (planId: string): Res<{ url: string }> =>
    client.post({
      url: "/api/v1/billing/stripe/checkout-session",
      body: { plan_id: planId },
      headers: json,
    }) as Res<{ url: string }>,
  portal: (): Res<{ url: string }> =>
    client.post({ url: "/api/v1/billing/stripe/portal", headers: json }) as Res<{ url: string }>,
};

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
