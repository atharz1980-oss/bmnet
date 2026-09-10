"use server";
/**
 * أكشنات مصادقة المجتمع (CP-H V1) — Supabase Auth الحالي (لا نظام مستخدمين مكرر).
 * التسجيل/الدخول عبر عميل الكوكيز الخادمي — الجلسة نفسها المستخدمة في RLS.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { fail, ok, safeInternalNext, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateUsername } from "@/lib/community/validation";
import { getCommunityContext } from "@/lib/community/member";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function communityLoginAction(
  email: string,
  password: string,
  nextParam?: string,
): Promise<ActionResult<{ redirect: string }>> {
  const cleanEmail = (email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) return fail("البريد الإلكتروني غير صالح.");
  if (!password || password.length < 8) return fail("كلمة المرور: 8 أحرف على الأقل.");
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("invalid login credentials"))
        return fail("البريد أو كلمة المرور غير صحيحة.");
      if (msg.includes("email not confirmed"))
        return fail("لم يتم تأكيد البريد الإلكتروني بعد — تحقق من بريدك.");
      if (msg.includes("too many"))
        return fail("محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة.");
      return fail("تعذر تسجيل الدخول — أعد المحاولة.");
    }
    revalidatePath("/", "layout");
    const target = safeInternalNext(nextParam) ?? "/community";
    return ok({ redirect: target });
  } catch (error) {
    return fail(toArabicDbError(error, "تسجيل الدخول"));
  }
}

export async function communitySignupAction(
  email: string,
  password: string,
): Promise<ActionResult<{ redirect: string; needsEmailConfirm: boolean }>> {
  const cleanEmail = (email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) return fail("البريد الإلكتروني غير صالح.");
  if (!password || password.length < 8)
    return fail("كلمة المرور: 8 أحرف على الأقل.");
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("already registered") || msg.includes("already exists"))
        return fail("هذا البريد مسجل مسبقًا — سجّل الدخول.");
      if (msg.includes("password"))
        return fail("كلمة المرور ضعيفة — 8 أحرف على الأقل مع أحرف وأرقام.");
      return fail("تعذر إنشاء الحساب — أعد المحاولة.");
    }
    if (!data.session) {
      // تأكيد البريد مفعّل في المشروع — لا جلسة فورية
      return ok({ redirect: "/community/login", needsEmailConfirm: true });
    }
    revalidatePath("/", "layout");
    return ok({ redirect: "/community/profile", needsEmailConfirm: false });
  } catch (error) {
    return fail(toArabicDbError(error, "إنشاء الحساب"));
  }
}

export async function communityLogoutAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } finally {
    revalidatePath("/", "layout");
    redirect("/community");
  }
}

/** التحقق من توفر اسم المستخدم قبل الحفظ (يُستدعى من المحرر) */
export async function checkUsernameAvailableAction(
  username: string,
): Promise<ActionResult<{ available: boolean }>> {
  const invalid = validateUsername(username);
  if (invalid) return fail(invalid);
  const ctx = await getCommunityContext();
  try {
    const svc = (await import("@/lib/supabase/service")).getPublicAnonClient();
    let query = svc
      .from("community_profiles")
      .select("user_id")
      .eq("username", username.trim().toLowerCase())
      .limit(1);
    if (ctx?.member) query = query.neq("user_id", ctx.member.userId);
    const { data, error } = await query;
    if (error) return fail("تعذر التحقق من الاسم — أعد المحاولة.");
    return ok({ available: (data ?? []).length === 0 });
  } catch {
    return fail("تعذر التحقق من الاسم — أعد المحاولة.");
  }
}
