"use client";

/**
 * Password reset landing page. OURS — see BRAND.md.
 *
 * Opened from the emailed link (?token=). Setting the password signs the
 * person straight in: they have just proved they control the inbox, and
 * sending them back to a login form to retype what they chose a second ago
 * is where people give up.
 */
import { CircleX, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { AuthEnterpriseCTA } from "@/components/auth/AuthEnterpriseCTA";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { authApi, errorDetail, startSession } from "@/lib/ailunapro-api";

function ResetInner() {
  const params = useSearchParams();
  const { t, locale } = useI18n();
  const a = t.auth;
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [dead, setDead] = useState(!token);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(a.tooShort);
      return;
    }
    if (password !== confirm) {
      toast.error(a.mismatch);
      return;
    }
    setLoading(true);
    const res = await authApi.resetPassword(token as string, password, locale);
    setLoading(false);
    if (res.error || !res.data) {
      if (res.response?.status === 429) {
        toast.error(a.tooMany);
        return;
      }
      // A spent or expired link is the common case; say so and offer a new one
      // rather than leaving the person on a form that will never work.
      if (errorDetail(res.error) === "invalid_or_expired_link") {
        setDead(true);
        return;
      }
      toast.error(a.genericError);
      return;
    }
    await startSession(res.data);
    window.location.href = "/after-sign-in";
  };

  if (dead) {
    return (
      <div className="space-y-4 text-center">
        <span className="al-icon-tile al-icon-tile-lg">
          <CircleX className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{a.resetFailed}</h1>
        <Link
          href="/auth/forgot"
          className="inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          {a.resetAskNew}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{a.resetTitle}</h1>
        <p className="text-sm text-muted-foreground">{a.resetSub}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{a.newPassword}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={a.passwordMin}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{a.confirmPassword}</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            placeholder={a.confirmPlaceholder}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? a.resetSaving : a.resetCta}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
          {a.backToSignIn}
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell enterpriseSlot={<AuthEnterpriseCTA />}>
      <Suspense fallback={<Loader2 className="mx-auto h-5 w-5 animate-spin" />}>
        <ResetInner />
      </Suspense>
    </AuthShell>
  );
}
