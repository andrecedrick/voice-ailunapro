"use client";

/**
 * Billing-page notice. OURS — see BRAND.md.
 *
 * Upstream's OSS billing page tells the customer to "sign up and purchase
 * credits at app.dograh.com": a link that sends OUR paying customers to buy
 * from Dograh. This replaces it with our own plans.
 */
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { useI18n } from "@/i18n";

export function PlanNotice() {
  const { t } = useI18n();
  const b = t.billing;

  return (
    <div className="card-weave flex flex-col gap-4 border p-5 sm:flex-row sm:items-center">
      <span className="al-icon-tile">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{b.planTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{b.planBody}</p>
      </div>
      <Link href="/pricing" className="al-cta shrink-0">
        {b.planCta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
