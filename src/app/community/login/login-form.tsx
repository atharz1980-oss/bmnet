"use client";
/**
 * نموذج دخول أعضاء المجتمع — نفس جلسة Supabase (لا نظام دخول مكرر).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { communityLoginAction } from "@/app/community/actions/auth";
import { communitySignupHref } from "@/lib/community/auth-links";

export function CommunityLoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await communityLoginAction(email, password, next ?? undefined);
      if (result.ok) {
        router.replace(next ?? result.data.redirect);
        router.refresh();
      } else {
        toast({ title: "تعذر تسجيل الدخول", description: result.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="login-email">البريد الإلكتروني</Label>
        <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="email" required placeholder="you@example.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">كلمة المرور</Label>
        <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password" required minLength={8} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        تسجيل الدخول
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        لا تملك حسابًا؟{" "}
        <Link href={communitySignupHref(next)} className="font-medium text-brand-700 underline">أنشئ حسابًا</Link>
      </p>
    </form>
  );
}
