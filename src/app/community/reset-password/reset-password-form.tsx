"use client";
/**
 * طلب رابط استعادة — نفس بنية نموذج الدخول وتصميمه.
 * الرد واحد دائمًا، فالنموذج لا يعرف بدوره إن كان البريد مسجلًا.
 */
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { requestPasswordResetAction } from "@/app/community/actions/password-reset";

export function ResetPasswordForm({ loginPath }: { loginPath: string }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return; // منع الإرسال المزدوج
    setBusy(true);
    try {
      const result = await requestPasswordResetAction(email, loginPath);
      if (result.ok) setSent(result.data.message);
      else toast({ title: "تعذر إرسال الرابط", description: result.error, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-6 text-center" role="status">
        <MailCheck className="mx-auto size-10 text-brand-600" aria-hidden="true" />
        <p className="font-medium">تحقق من بريدك الإلكتروني</p>
        <p className="text-sm text-muted-foreground">{sent}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="reset-email">البريد الإلكتروني</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="you@example.com"
          disabled={busy}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy || !email.trim()}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        إرسال رابط استعادة كلمة المرور
      </Button>
    </form>
  );
}
