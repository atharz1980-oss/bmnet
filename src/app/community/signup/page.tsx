import type { Metadata } from "next";

import { CommunitySignupForm } from "./signup-form";
import { returnPath } from "@/lib/community/auth-links";

export const metadata: Metadata = {
  title: "إنشاء حساب — المجتمع",
  robots: { index: false, follow: false },
};

/** وجهة العودة تُقرأ على الخادم — انظر ملاحظة صفحة الدخول. */
export default async function CommunitySignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const target = returnPath(Array.isArray(next) ? next[0] : next);

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">انضم إلى مجتمع بيت المصور</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        أنشئ حسابك ثم أكمل ملفك الشخصي لتبدأ النشر والمتابعة.
      </p>
      <CommunitySignupForm next={target} />
    </section>
  );
}
