import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCommunityContext } from "@/lib/community/member";

/**
 * بوابة صفحات الأعضاء (profile/notifications) — فحص خادمي حقيقي.
 * المجهول → /community/login?next=… (بحارس open-redirect القياسي).
 * الموقوف إداريًا → شاشة عربية صادقة.
 * العضو بلا ملف → /community/profile (لإكمال إنشاء الملف).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCommunityContext();
  if (!ctx) {
    redirect("/community/login?next=%2Fcommunity%2Fprofile");
  }
  if (ctx.suspended && !ctx.member) {
    return (
      <section className="mx-auto w-full max-w-md px-4 py-20 text-center space-y-3">
        <h1 className="text-xl font-bold">الحساب موقوف مؤقتًا</h1>
        <p className="text-sm text-muted-foreground">
          تم تعليق ظهورك في المجتمع من قبل فريق الإشراف — للاستفسار تواصل معنا.
        </p>
      </section>
    );
  }
  return <>{children}</>;
}
