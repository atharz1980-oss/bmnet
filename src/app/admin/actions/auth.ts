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
import { getServiceSupabase } from "@/lib/supabase/service";

export async function acceptInvitationAction(password: string): Promise<ActionResult<{ redirect: string }>> {
  if (typeof password !== "string" || password.length < 8) return fail("كلمة المرور: 8 أحرف على الأقل.");
  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return fail("رابط الدعوة غير صالح أو انتهت صلاحيته.");
    const svc = getServiceSupabase();
    const { data: profile, error } = await svc.from("profiles").select("status").eq("id", user.id).maybeSingle();
    if (error || profile?.status !== "invited") return fail("لا توجد دعوة معلقة لهذا الحساب.");
    const { error: passwordError } = await client.auth.updateUser({ password });
    if (passwordError) return fail(toArabicDbError(passwordError, "تعيين كلمة المرور"));
    const { error: activateError } = await svc.from("profiles").update({ status: "active" }).eq("id", user.id).eq("status", "invited");
    if (activateError) return fail(toArabicDbError(activateError, "تفعيل الحساب"));
    revalidatePath("/", "layout");
    return ok({ redirect: "/admin" });
  } catch (error) {
    return fail(toArabicDbError(error, "قبول الدعوة"));
  }
}

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

    /**
     * المصادقة وحدها لا تكفي: أي عضو مجتمع يملك حسابًا صالحًا على نفس
     * مشروع Supabase. بلا هذا الفحص كان دخوله ينجح ثم يرتد من layout
     * الإدارة إلى صفحة الدخول بلا رسالة — يبدو عطلًا، وقد بدّل جلسته
     * في الطريق. الفحص هنا يقول له الحقيقة ويترك جلسته كما كانت.
     */
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await getServiceSupabase()
      .from("profiles")
      .select("status")
      .eq("id", user?.id ?? "")
      .maybeSingle<{ status: string }>();

    if (!profile) {
      await supabase.auth.signOut();
      return fail("هذا الحساب ليس حساب إدارة. إن كنت عضوًا في المجتمع فسجّل الدخول من صفحة المجتمع.");
    }
    if (profile.status === "invited") {
      await supabase.auth.signOut();
      return fail("لم تُقبل دعوتك بعد — افتح رابط الدعوة في بريدك لتعيين كلمة المرور.");
    }
    if (profile.status !== "active") {
      await supabase.auth.signOut();
      return fail("هذا الحساب موقوف — راجع إدارة الموقع.");
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
