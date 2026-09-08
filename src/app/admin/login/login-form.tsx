"use client";

/**
 * نموذج تسجيل الدخول (CP-F) — مكوّن عميل داخل حدّ Suspense:
 * يقرأ ?next= عبر useSearchParams (يتطلب Suspense للـ prerender —
 * خطأ البناء الموثق: useSearchParams بلا Suspense يكسر التوليد الساكن).
 * الاستدعاء عبر Server Action (loginAction) — رسائل الخطأ عربية.
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

import { loginAction } from "@/app/admin/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await loginAction(email, password, nextParam);
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
          disabled={submitting}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password">كلمة المرور</Label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            dir="ltr"
            autoComplete="current-password"
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
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-charcoal-400 transition-colors hover:text-charcoal-700"
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

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <Loader2 aria-hidden="true" className="me-2 h-4 w-4 animate-spin" />
        ) : (
          <LogIn aria-hidden="true" className="me-2 h-4 w-4" />
        )}
        {submitting ? "جارٍ التحقق…" : "تسجيل الدخول"}
      </Button>
    </form>
  );
}
