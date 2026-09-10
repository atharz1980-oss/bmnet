import type { Metadata } from "next";
import { Suspense } from "react";

import { CommunitySignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "إنشاء حساب — المجتمع",
  robots: { index: false, follow: false },
};

export default function CommunitySignupPage() {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">انضم إلى مجتمع بيت المصور</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        أنشئ حسابك ثم أكمل ملفك الشخصي لتبدأ النشر والمتابعة.
      </p>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <CommunitySignupForm />
      </Suspense>
    </section>
  );
}
