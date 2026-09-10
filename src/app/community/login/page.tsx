import type { Metadata } from "next";
import { Suspense } from "react";

import { CommunityLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول — المجتمع",
  robots: { index: false, follow: false },
};

export default function CommunityLoginPage() {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">تسجيل الدخول إلى المجتمع</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <CommunityLoginForm />
      </Suspense>
    </section>
  );
}
