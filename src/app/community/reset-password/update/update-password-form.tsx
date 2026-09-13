"use client";
/**
 * تعيين كلمة المرور الجديدة.
 *
 * الجلسة قد تكون ثبتت على الخادم (رمز في الاستعلام تبادله مسار الاستقبال)،
 * أو تكون رموزها خلف `#` — وهذا الجزء لا يبلغ الخادم إطلاقًا. فإن لم تصل
 * جلسة خادمية حاولنا تثبيتها هنا من الجزء نفسه، تمامًا كما يفعل مسار قبول
 * الدعوة الإداري القائم. ثم يُمسح الجزء من شريط العنوان فلا يبقى رمز في
 * السجل ولا في المشاركة.
 *
 * التحديث نفسه يقع في Server Action على صاحب الجلسة — لا عميل خدمة.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { updatePasswordAction } from "@/app/community/actions/password-reset";
import {
  PASSWORD_MIN_LENGTH,
  RECOVERY_REQUEST_PATH,
  validateNewPassword,
} from "@/lib/auth/recovery";

type Stage = "checking" | "ready" | "invalid" | "done";

export function UpdatePasswordForm({
  loginPath,
  hasServerSession,
}: {
  loginPath: string;
  hasServerSession: boolean;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(hasServerSession ? "ready" : "checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasServerSession) return;
    let active = true;
    void (async () => {
      try {
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");
        /* يُمسح الجزء قبل أي شيء: لا يبقى رمز في شريط العنوان ولا السجل. */
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        const client = getSupabaseBrowserClient();
        if (accessToken && refreshToken) {
          const { error: setError2 } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setError2) throw setError2;
        }
        const { data } = await client.auth.getUser();
        if (active) setStage(data?.user ? "ready" : "invalid");
      } catch {
        if (active) setStage("invalid");
      }
    })();
    return () => {
      active = false;
    };
  }, [hasServerSession]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return; // منع الإرسال المزدوج
    const invalid = validateNewPassword(password, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await updatePasswordAction(password, confirm);
      if (result.ok) {
        setPassword("");
        setConfirm("");
        setStage("done");
        /* الجلسة أُغلقت على الخادم؛ يُطهَّر مخزن المتصفح أيضًا. */
        try {
          await getSupabaseBrowserClient().auth.signOut();
        } catch {
          /* لا جلسة في المتصفح — لا شيء يُغلق. */
        }
        router.refresh();
        setTimeout(() => router.replace(loginPath), 2500);
      } else {
        setError(result.error);
      }
    } finally {
      setBusy(false);
    }
  }

  if (stage === "checking") {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground" role="status">
        <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />
        جارٍ التحقق من رابط الاستعادة…
      </div>
    );
  }

  if (stage === "invalid") {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-6 text-center" role="alert">
        <ShieldAlert className="mx-auto size-10 text-destructive" aria-hidden="true" />
        <p className="font-medium">رابط الاستعادة غير صالح أو انتهت صلاحيته</p>
        <p className="text-sm text-muted-foreground">
          روابط الاستعادة صالحة لمدة محدودة وتُستخدم مرة واحدة. اطلب رابطًا جديدًا.
        </p>
        <Button asChild variant="outline">
          <Link href={`${RECOVERY_REQUEST_PATH}?next=${encodeURIComponent(loginPath)}`}>
            طلب رابط جديد
          </Link>
        </Button>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-6 text-center" role="status">
        <CheckCircle2 className="mx-auto size-10 text-brand-600" aria-hidden="true" />
        <p className="font-medium">تم تحديث كلمة المرور</p>
        <p className="text-sm text-muted-foreground">
          سجّل الدخول بكلمة المرور الجديدة — سنحوّلك الآن.
        </p>
        <Button asChild>
          <Link href={loginPath}>الذهاب لتسجيل الدخول</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
        <Input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          disabled={busy}
          aria-describedby="new-password-hint"
        />
        <p id="new-password-hint" className="text-xs text-muted-foreground">
          {PASSWORD_MIN_LENGTH} أحرف على الأقل.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          disabled={busy}
        />
      </div>
      {error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={busy || !password || !confirm}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        تحديث كلمة المرور
      </Button>
    </form>
  );
}
