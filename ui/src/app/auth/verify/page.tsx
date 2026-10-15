"use client";

/**
 * Email confirmation landing page. OURS — see BRAND.md.
 *
 * Opened from the link in the sign-up email: confirms the address, signs the
 * person in and sends them on. A spent or expired link offers a fresh one
 * from the sign-in page.
 */
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { AuthEnterpriseCTA } from "@/components/auth/AuthEnterpriseCTA";
import { AuthShell } from "@/components/auth/AuthShell";
import { useI18n } from "@/i18n";
import { authApi, startSession } from "@/lib/ailunapro-api";

function VerifyInner() {
  const params = useSearchParams();
  const { t } = useI18n();
  const a = t.auth;
  const [state, setState] = useState<"working" | "ok" | "failed">("working");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get("token");
    if (!token) {
      setState("failed");
      return;
    }
    (async () => {
      const res = await authApi.verifyEmail(token);
      if (res.error || !res.data) {
        setState("failed");
        return;
      }
      setState("ok");
      await startSession(res.data);
      window.location.href = "/after-sign-in";
    })();
  }, [params]);

  return (
    <div className="space-y-4 text-center">
      <span className="al-icon-tile al-icon-tile-lg">
        {state === "working" && <Loader2 className="h-6 w-6 animate-spin" />}
        {state === "ok" && <CircleCheck className="h-6 w-6" />}
        {state === "failed" && <CircleX className="h-6 w-6" />}
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">
        {state === "working" && a.verifying}
        {state === "ok" && a.verifiedRedirect}
        {state === "failed" && a.verifyFailed}
      </h1>
      {state === "failed" && (
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
            {a.backToSignIn}
          </Link>
        </p>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell enterpriseSlot={<AuthEnterpriseCTA />}>
      <Suspense fallback={null}>
        <VerifyInner />
      </Suspense>
    </AuthShell>
  );
}
