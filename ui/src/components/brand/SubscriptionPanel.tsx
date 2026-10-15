"use client";

/**
 * Subscription & plans on the billing page. OURS — see BRAND.md.
 *
 * Reads the plan catalog and the workspace's subscription from our Stripe
 * endpoints. Choosing a plan opens Stripe Checkout (7-day trial on a first
 * subscription); "Manage billing" opens the Stripe customer portal, where plan
 * changes, card updates, invoices and cancellation live. No card data ever
 * touches this app.
 *
 * Falls back to <PlanNotice /> (a link to /pricing) when billing is not
 * configured on this deployment.
 */
import { Check, CreditCard, ExternalLink, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import {
  billingApi,
  errorDetail,
  type Plan,
  type PlansResult,
  type SubscriptionStatus,
} from "@/lib/ailunapro-api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

import { Rail, StatusPill, type StatusTone } from "./index";
import { PlanNotice } from "./PlanNotice";

const LIVE = new Set(["trialing", "active", "past_due"]);

export function SubscriptionPanel() {
  const { t, tag, locale } = useI18n();
  const b = t.billing;
  const { user, loading: authLoading } = useAuth();
  const params = useSearchParams();

  const [catalog, setCatalog] = useState<PlansResult | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const fetched = useRef(false);

  const load = useCallback(async () => {
    const [plans, sub] = await Promise.all([billingApi.plans(), billingApi.status()]);
    if (plans.error || sub.error) {
      setFailed(true);
      return null;
    }
    setCatalog(plans.data ?? null);
    setStatus(sub.data ?? null);
    return sub.data ?? null;
  }, []);

  useEffect(() => {
    if (authLoading || !user || fetched.current) return;
    fetched.current = true;

    const outcome = params.get("checkout");
    void (async () => {
      const first = await load();
      if (outcome === "cancelled") toast.message(b.checkoutCancelled);
      if (outcome === "success") {
        toast.success(b.checkoutSuccess);
        // Stripe's webhook can land a few seconds after the redirect.
        let current = first;
        for (let i = 0; i < 6 && !(current && LIVE.has(current.status ?? "")); i++) {
          await new Promise((r) => setTimeout(r, 2500));
          current = await load();
        }
      }
      if (outcome) window.history.replaceState(null, "", "/billing");
    })();
  }, [authLoading, user, load, params, b]);

  const money = (minor: number | string, currency: string, digits?: number) =>
    new Intl.NumberFormat(tag, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: digits ?? (Number(minor) % 100 === 0 ? 0 : 2),
    }).format(Number(minor) / 100);

  const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(tag, { day: "numeric", month: "long", year: "numeric" }) : "";

  const choose = async (plan: Plan) => {
    setBusy(plan.id);
    const res = await billingApi.checkout(plan.id, locale);
    if (res.error || !res.data) {
      setBusy(null);
      const detail = errorDetail(res.error);
      if (detail === "already_subscribed") return void manage();
      toast.error(detail || b.unavailable);
      return;
    }
    window.location.href = res.data.url;
  };

  const manage = async () => {
    setBusy("portal");
    const res = await billingApi.portal(locale);
    if (res.error || !res.data) {
      setBusy(null);
      toast.error(errorDetail(res.error) || b.unavailable);
      return;
    }
    window.location.href = res.data.url;
  };

  if (failed) return <PlanNotice />;
  if (!catalog || !status) {
    return (
      <div className="card-weave flex items-center gap-3 border p-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {b.subTitle}
      </div>
    );
  }
  if (!catalog.billing_enabled) return <PlanNotice />;

  const live = LIVE.has(status.status ?? "");
  const tone: StatusTone =
    status.status === "active" ? "active"
      : status.status === "trialing" ? "running"
        : status.status === "past_due" ? "paused"
          : "draft";
  const statusLabel =
    status.status === "active" ? b.stActive
      : status.status === "trialing" ? b.stTrialing
        : status.status === "past_due" ? b.stPastDue
          : status.status === "canceled" ? b.stCanceled
            : b.stOther;
  const canTrial = !status.subscribed;
  // The plan chosen on /pricing before sign-up wins the highlight.
  let intended: string | null = null;
  try {
    intended = localStorage.getItem("al_intended_plan");
  } catch {
    intended = null;
  }
  const intendedIndex = intended
    ? catalog.plans.findIndex((p) => p.name.toLowerCase() === intended)
    : -1;
  const popularIndex = intendedIndex >= 0 ? intendedIndex : catalog.plans.length >= 3 ? 1 : -1;

  return (
    <div className="space-y-5">
      {/* Current subscription */}
      <div className="card-weave flex flex-col gap-5 border p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="al-icon-tile">
          <CreditCard className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">
              {live && status.plan_name ? status.plan_name : b.noPlan}
            </h2>
            {status.status && <StatusPill tone={tone}>{statusLabel}</StatusPill>}
          </div>

          {!live && (
            <p className="text-sm text-muted-foreground">
              {b.noPlanBody(catalog.trial_days, catalog.trial_minutes_cap)}
            </p>
          )}

          {status.status === "trialing" && (
            <div className="max-w-md space-y-1.5">
              <Rail
                value={(status.trial_minutes_used / Math.max(status.trial_minutes_cap, 1)) * 100}
                label={b.trialUsage(status.trial_minutes_used.toFixed(0), status.trial_minutes_cap)}
              />
              <p className="text-xs text-muted-foreground">
                {b.trialUsage(status.trial_minutes_used.toFixed(0), status.trial_minutes_cap)}
                {status.trial_ends_at && ` · ${b.trialEnds(date(status.trial_ends_at))}`}
              </p>
            </div>
          )}

          {status.status !== "trialing" && live && (
            <p className="text-sm text-muted-foreground">
              {status.included_minutes > 0 && b.included(status.included_minutes.toLocaleString(tag))}
              {status.current_period_end && ` · ${b.renews(date(status.current_period_end))}`}
            </p>
          )}
        </div>

        {status.subscribed && (
          <button type="button" onClick={manage} disabled={busy !== null} className="al-chip-btn inline-flex shrink-0 px-4 font-semibold">
            {busy === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            {busy === "portal" ? b.opening : b.manage}
          </button>
        )}
      </div>

      {/* Plans */}
      {catalog.plans.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {catalog.plans.map((plan, i) => {
            const isCurrent = live && status.plan_name === plan.name;
            const popular = i === popularIndex;
            return (
              <div
                key={plan.id}
                className={cn(
                  "card-weave al-plan relative flex flex-col gap-4 border p-5",
                  popular && "al-plan-popular",
                  isCurrent && "al-plan-current",
                )}
              >
                {popular && (
                  <span className="al-plan-badge">
                    <Sparkles className="h-3 w-3" /> {b.popular}
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">{plan.name}</p>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="al-kpi-value">{money(plan.monthly_amount, plan.currency)}</span>
                    <span className="text-sm text-muted-foreground">{b.perMonth}</span>
                  </p>
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {plan.included_minutes > 0 && (
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--al-accent)]" />
                      {b.included(plan.included_minutes.toLocaleString(tag))}
                    </li>
                  )}
                  {plan.overage_per_minute && (
                    <li className="flex gap-2 text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
                      {b.overage(money(plan.overage_per_minute, plan.currency, 3))}
                    </li>
                  )}
                </ul>
                {isCurrent ? (
                  <span className="al-chip-btn inline-flex w-full cursor-default font-semibold">
                    <Check className="h-4 w-4" /> {b.current}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => (live ? manage() : choose(plan))}
                    className={cn("w-full", popular || !live ? "al-cta" : "al-chip-btn inline-flex font-semibold")}
                  >
                    {busy === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {canTrial ? b.chooseTrial : b.choosePaid}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> {b.secure}
      </p>
    </div>
  );
}
