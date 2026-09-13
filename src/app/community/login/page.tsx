import type { Metadata } from "next";

import { CommunityLoginForm } from "./login-form";
import { returnPath } from "@/lib/community/auth-links";

export const metadata: Metadata = {
  title: "تسجيل الدخول — المجتمع",
  robots: { index: false, follow: false },
};

/**
 * وجهة العودة تُقرأ هنا على الخادم وتُمرَّر خاصيةً.
 * كانت تُقرأ بـuseSearchParams داخل النموذج، فكان النموذج كله يخرج إلى
 * تصيير العميل ولا تصل الصفحة إلا هيكل تحميل — نموذج دخول لا يظهر إلا
 * بعد JS. القراءة على الخادم تعيده إلى HTML.
 */
export default async function CommunityLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const target = returnPath(Array.isArray(next) ? next[0] : next);

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">تسجيل الدخول إلى المجتمع</h1>
      <CommunityLoginForm next={target} />
    </section>
  );
}
