"use client";

// BRAND: Voice AiLunaPro sign-up — confirmation email + bot protection.
// Honeypot field, form-fill timer and (when configured) Cloudflare Turnstile go
// up with the form; the backend layers in a disposable-domain block and a
// per-IP limit. When the server asks for email confirmation, the form gives
// way to a "check your inbox" panel with a resend button. See BRAND.md.

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AuthEnterpriseCTA } from "@/components/auth/AuthEnterpriseCTA";
import { AuthShell } from "@/components/auth/AuthShell";
import { Turnstile } from "@/components/brand/Turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { authApi, errorDetail, type SignupConfig, startSession } from "@/lib/ailunapro-api";

export default function SignupPage() {
  const { t, locale } = useI18n();
  const a = t.auth;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SignupConfig | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
    // Plan picked on /pricing: remembered so Billing can put it first.
    try {
      const plan = new URLSearchParams(window.location.search).get("plan");
      if (plan) localStorage.setItem("al_intended_plan", plan.toLowerCase());
    } catch {
      // Storage blocked: the plans are all on the Billing page anyway.
    }
    authApi.signupConfig().then(({ data }) => data && setConfig(data));
  }, []);

  const needsCaptcha = Boolean(config?.turnstile_site_key);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error(a.tooShort);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(a.mismatch);
      return;
    }
    if (needsCaptcha && !captcha) {
      toast.error(a.securityCheck);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.signup({
        email,
        password,
        website,
        started_at: startedAt.current,
        turnstile_token: captcha,
        locale,
      });

      if (res.error || !res.data) {
        const status = res.response?.status;
        const detail = errorDetail(res.error);
        if (status === 429) toast.error(a.tooMany);
        else if (detail?.includes("permanent email")) toast.error(a.disposable);
        else if (detail?.includes("security check")) toast.error(a.securityCheck);
        else toast.error(detail || a.signupFailed);
        return;
      }

      if (res.data.verification_required) {
        setSentTo(res.data.email);
        return;
      }

      if (res.data.token && res.data.user) {
        await startSession({ token: res.data.token, user: res.data.user });
        window.location.href = "/after-sign-in";
      }
    } catch {
      toast.error(a.genericError);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!sentTo) return;
    setResending(true);
    const res = await authApi.resendVerification(sentTo, locale);
    setResending(false);
    if (res.response?.status === 429) toast.error(a.tooMany);
    else toast.success(a.resent);
  };

  if (sentTo) {
    return (
      <AuthShell enterpriseSlot={<AuthEnterpriseCTA />}>
        <div className="space-y-4 text-center">
          <span className="al-icon-tile al-icon-tile-lg mx-auto">
            <MailCheck className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{a.checkInboxTitle}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{a.checkInboxBody(sentTo)}</p>
        </div>
        <Button variant="outline" className="w-full" onClick={resend} disabled={resending}>
          {a.resend}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
            {a.backToSignIn}
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell enterpriseSlot={<AuthEnterpriseCTA />}>
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{a.signUpTitle}</h1>
        <p className="text-sm text-muted-foreground">{a.signUpSub}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
        {/* Honeypot: off-screen, unfocusable, unannounced. People never fill
            it; form-filling bots do. */}
        <div aria-hidden className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{a.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{a.password}</Label>
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
          <Label htmlFor="confirmPassword">{a.confirmPassword}</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder={a.confirmPlaceholder}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <Turnstile siteKey={config?.turnstile_site_key} onToken={setCaptcha} language={locale} />

        <Button type="submit" className="w-full" disabled={loading || (needsCaptcha && !captcha)}>
          {loading ? a.creating : a.createAccount}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {a.haveAccount}{" "}
        <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
          {a.signInLink}
        </Link>
      </p>
    </AuthShell>
  );
}
