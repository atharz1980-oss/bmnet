import type { Metadata } from "next";

import { UpdatePasswordForm } from "./update-password-form";
import { safeLoginReturn } from "@/lib/auth/recovery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "تعيين كلمة مرور جديدة",
  robots: { index: false, follow: false },
};

/** لا تُخزَّن: حالتها تعتمد على جلسة استعادة عمرها دقائق. */
export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const loginPath = safeLoginReturn(next);

  /**
   * هل ثبتت جلسة الاستعادة على الخادم؟ إن نعم عُرض النموذج فورًا وبلا JS.
   * وإن لا فقد تكون الرموز خلف `#` — لا تبلغ الخادم — فيتولى المتصفح
   * قراءتها. لذلك لا نرفض هنا، بل نترك النموذج يحسم بعد الإرطاب.
   */
  let hasServerSession = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    hasServerSession = Boolean(data?.user);
  } catch {
    hasServerSession = false;
  }

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">تعيين كلمة مرور جديدة</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        اختر كلمة مرور جديدة لحسابك، ثم سجّل الدخول بها.
      </p>
      <UpdatePasswordForm loginPath={loginPath} hasServerSession={hasServerSession} />
    </section>
  );
}
