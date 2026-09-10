"use client";
/**
 * إنشاء حساب عضو مجتمع — Supabase Auth signUp عبر عميل الكوكيز الخادمي.
 * بعد النجاح: إما جلسة فورية (تأكيد البريد معطل) أو رسالة تحقق من البريد.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { communitySignupAction } from "@/app/community/actions/auth";

export function CommunitySignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await communitySignupAction(email, password);
      if (result.ok) {
        if (result.data.needsEmailConfirm) {
          setAwaitingConfirm(true);
        } else {
          router.replace(result.data.redirect);
          router.refresh();
        }
      } else {
        toast({ title: "تعذر إنشاء الحساب", description: result.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  if (awaitingConfirm) {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-6 text-center" role="status">
        <MailCheck className="mx-auto size-10 text-brand-600" aria-hidden="true" />
        <p className="font-medium">تحقق من بريدك الإلكتروني</p>
        <p className="text-sm text-muted-foreground">
          أرسلنا رسالة تأكيد إلى {email} — أكّد بريدك ثم سجّل الدخول.
        </p>
        <Button asChild variant="outline"><Link href="/community/login">الذهاب لتسجيل الدخول</Link></Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="signup-email">البريد الإلكتروني</Label>
        <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="email" required placeholder="you@example.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-password">كلمة المرور</Label>
        <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password" required minLength={8}
          aria-describedby="signup-password-hint" />
        <p id="signup-password-hint" className="text-xs text-muted-foreground">8 أحرف على الأقل.</p>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        إنشاء الحساب
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        لديك حساب؟{" "}
        <Link href="/community/login" className="font-medium text-brand-700 underline">سجّل الدخول</Link>
      </p>
    </form>
  );
}
