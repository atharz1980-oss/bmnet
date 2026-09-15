"use client";

/**
 * نموذج تسجيل الدخول (CP-F) — مكوّن عميل داخل حدّ Suspense:
 * يقرأ ?next= عبر useSearchParams (يتطلب Suspense للـ prerender —
 * خطأ البناء الموثق: useSearchParams بلا Suspense يكسر التوليد الساكن).
 * الاستدعاء عبر Server Action (loginAction) — رسائل الخطأ عربية.
 */
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

import { acceptInvitationAction, loginAction } from "@/app/admin/actions/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { RECOVERY_REQUEST_PATH } from "@/lib/auth/recovery";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextParam = searchParams.get("next") ?? undefined;
  const [invitationReady, setInvitationReady] = useState(false);
  const isInvitation = searchParams.get("invite") === "1";

  useEffect(() => {
    if (!isInvitation) return;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    let cancelled = false;
    void (async () => {
      try {
        const client = getSupabaseBrowserClient();
        if (accessToken && refreshToken) {
          const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        }
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) throw new Error("Invalid invitation");
        if (!cancelled) { setEmail(user.email ?? ""); setInvitationReady(true); }
      } catch {
        if (!cancelled) setError("رابط الدعوة غير صالح أو انتهت صلاحيته — اطلب دعوة جديدة.");
      }
    })();
    return () => { cancelled = true; };
  }, [isInvitation]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = isInvitation
      ? await acceptInvitationAction(password)
      : await loginAction(email, password, nextParam);
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      toast({ title: "فشل تسجيل الدخول", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "مرحبًا بعودتك 👋", description: "تم تسجيل الدخول بنجاح." });
    router.replace(result.data.redirect);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">البريد الإلكتروني</Label>
        <Input
          id="login-email"
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@baytalmosawer.sa"
          className="bg-surface"
          disabled={submitting || isInvitation}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password">{isInvitation ? "اختر كلمة مرور لحسابك" : "كلمة المرور"}</Label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            dir="ltr"
            autoComplete={isInvitation ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••••"
            className="bg-surface pe-10"
            disabled={submitting}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute end-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-charcoal-400 transition-colors hover:text-charcoal-700 lg:end-2 lg:size-9"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Eye aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting || (isInvitation && !invitationReady)} className="w-full">
        {submitting ? (
          <Loader2 aria-hidden="true" className="me-2 h-4 w-4 animate-spin" />
        ) : (
          <LogIn aria-hidden="true" className="me-2 h-4 w-4" />
        )}
        {submitting ? "جارٍ التحقق…" : isInvitation ? "تفعيل الحساب" : "تسجيل الدخول"}
      </Button>

      {/* الدعوة تُفعَّل بكلمة مرور جديدة أصلًا، فلا معنى للاستعادة فيها. */}
      {isInvitation ? null : (
        <p className="text-center text-sm">
          <Link
            href={`${RECOVERY_REQUEST_PATH}?next=%2Fadmin%2Flogin`}
            className="text-charcoal-500 underline transition-colors hover:text-brand-600"
          >
            نسيت كلمة المرور؟
          </Link>
        </p>
      )}
    </form>
  );
}
