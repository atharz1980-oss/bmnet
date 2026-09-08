"use server";

/**
 * بيت المصور — إجراءات المصادقة (CP-F)
 * -------------------------------------
 * تسجيل الدخول/الخروج عبر @supabase/ssr (كوكيز جلسة الخادم):
 *  - loginAction: تحقق + إنشاء جلسة + إعادة next داخلي آمن.
 *  - logoutAction: إلغاء الجلسة وتنظيف الكوكيز.
 * رسائل الخطأ عربية موحدة عبر toArabicDbError.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, ok, safeInternalNext, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function loginAction(
  email: string,
  password: string,
  nextParam?: string,
): Promise<ActionResult<{ redirect: string }>> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    return fail("أدخل البريد الإلكتروني وكلمة المرور.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        return fail("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      }
      if (error.message.includes("Email not confirmed")) {
        return fail("لم يتم تأكيد البريد الإلكتروني بعد.");
      }
      return fail(toArabicDbError(error, "تسجيل الدخول"));
    }

    revalidatePath("/", "layout");
    const target = safeInternalNext(nextParam ?? null) ?? "/admin";
    return ok({ redirect: target });
  } catch (error) {
    return fail(toArabicDbError(error, "تسجيل الدخول"));
  }
}

export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } finally {
    revalidatePath("/", "layout");
    redirect("/admin/login");
  }
}
