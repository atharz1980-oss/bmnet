import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "./reset-password-form";
import { safeLoginReturn } from "@/lib/auth/recovery";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور",
  robots: { index: false, follow: false },
};

/** وجهة الدخول تُقرأ على الخادم وتُمرَّر خاصيةً — كصفحتي الدخول والتسجيل. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; expired?: string }>;
}) {
  const { next, expired } = await searchParams;
  const loginPath = safeLoginReturn(next);

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">استعادة كلمة المرور</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        أدخل بريدك الإلكتروني وسنرسل إليك رابطًا لتعيين كلمة مرور جديدة.
      </p>
      {expired === "1" ? (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          رابط الاستعادة غير صالح أو انتهت صلاحيته. الروابط تُستخدم مرة واحدة — اطلب رابطًا جديدًا.
        </p>
      ) : null}
      <ResetPasswordForm loginPath={loginPath} />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        تذكرت كلمة المرور؟{" "}
        <Link href={loginPath} className="font-medium text-brand-700 underline">
          عُد إلى تسجيل الدخول
        </Link>
      </p>
    </section>
  );
}
