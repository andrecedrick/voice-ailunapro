"use client";

// BRAND: Voice AiLunaPro — ask for a password reset link. See BRAND.md.
// The answer is identical whether or not the address has an account, so this
// page can never be used to find out who is a customer.

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AuthEnterpriseCTA } from "@/components/auth/AuthEnterpriseCTA";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { authApi } from "@/lib/ailunapro-api";

export default function ForgotPasswordPage() {
  const { t, locale } = useI18n();
  const a = t.auth;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await authApi.forgotPassword(email, locale);
    setLoading(false);
    if (res.response?.status === 429) {
      toast.error(a.tooMany);
      return;
    }
    // Any other outcome is reported as success on purpose.
    setSentTo(email);
  };

  if (sentTo) {
    return (
      <AuthShell enterpriseSlot={<AuthEnterpriseCTA />}>
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto h-9 w-9 text-[color:var(--al-accent)]" />
          <h1 className="text-2xl font-semibold tracking-tight">{a.checkInboxTitle}</h1>
          <p className="text-sm text-muted-foreground">{a.forgotSent(sentTo)}</p>
          <Link
            href="/auth/login"
            className="inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            {a.backToSignIn}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell enterpriseSlot={<AuthEnterpriseCTA />}>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{a.forgotTitle}</h1>
        <p className="text-sm text-muted-foreground">{a.forgotSub}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? a.forgotSending : a.forgotSend}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
          {a.backToSignIn}
        </Link>
      </p>
    </AuthShell>
  );
}
