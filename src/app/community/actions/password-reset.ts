"use server";

/**
 * استعادة كلمة المرور — إجراءان فقط، كلاهما بعميل المستخدم لا الخدمة.
 *
 * لا service role هنا بحال: تغيير كلمة مرور عبر عميل الخدمة يعني القدرة
 * على تغييرها لأي أحد. `updateUser` تعمل على صاحب الجلسة وحده، وجلسة
 * الاستعادة هي الإثبات الوحيد المقبول.
 */
import { headers } from "next/headers";

import { fail, ok, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { checkRateLimit, requesterKey } from "@/lib/cms/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildRecoveryRedirectUrl,
  isValidRecoveryEmail,
  RECOVERY_GENERIC_MESSAGE,
  safeLoginReturn,
  validateNewPassword,
} from "@/lib/auth/recovery";

/* أقسى من حد النماذج العامة: كل طلب يرسل بريدًا فعليًا. */
const RESET_LIMIT = 3;
const RESET_WINDOW_MS = 15 * 60 * 1000;

/**
 * طلب رابط استعادة.
 *
 * يعيد الرسالة نفسها دائمًا — نجح الإرسال، أم لا حساب بهذا البريد، أم رفض
 * المزود. تمييز الحالات يحوّل النموذج إلى أداة تعداد حسابات: يكتب المهاجم
 * بريدًا ويعرف من الرد إن كان مسجلًا عندنا.
 */
export async function requestPasswordResetAction(
  email: string,
  loginPath?: string,
): Promise<ActionResult<{ message: string }>> {
  const clean = (email ?? "").trim().toLowerCase();
  /* شكل البريد وحده يُردّ عليه صراحة: لا يكشف وجود حساب. */
  if (!isValidRecoveryEmail(clean)) return fail("البريد الإلكتروني غير صالح.");

  const requestHeaders = await headers();
  const limit = checkRateLimit(requesterKey(requestHeaders, "password-reset"), RESET_LIMIT, RESET_WINDOW_MS);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return fail(`طلبت استعادة عدة مرات خلال وقت قصير. انتظر ${minutes} دقيقة ثم أعد المحاولة.`);
  }

  const redirectTo = buildRecoveryRedirectUrl(safeLoginReturn(loginPath), requestHeaders.get("origin"));
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo });
    if (error) {
      /* يُسجَّل السبب للخادم بلا بريد ولا رمز، ويُكتم عن المتصفح. */
      console.error("password reset request failed", { reason: error.message });
    }
  } catch (error) {
    console.error("password reset request threw", { reason: error instanceof Error ? error.message : "unknown" });
  }
  return ok({ message: RECOVERY_GENERIC_MESSAGE });
}

/**
 * تعيين كلمة مرور جديدة لصاحب جلسة الاستعادة.
 *
 * تُغلق الجلسة بعد النجاح عمدًا: جلسة الاستعادة وُلدت من رابط بريد، ولا
 * يصح أن تتحول إلى جلسة عادية مفتوحة. يدخل المستخدم بكلمته الجديدة.
 *
 * ملاحظة على التدفق: ‎@supabase/ssr يستخدم PKCE، فيُخزَّن مُتحقِّق الرمز في
 * كوكي المتصفح الذي طلب الاستعادة. أثره أن فتح الرابط في متصفح آخر يفشل
 * ويُعرض طلب رابط جديد. مسار الاستقبال يقبل `token_hash` أيضًا، فلو بدّل
 * المالك قالب البريد إلى TokenHash عمل الرابط عبر الأجهزة بلا تغيير كود.
 */
export async function updatePasswordAction(
  password: string,
  confirm: string,
): Promise<ActionResult<null>> {
  const invalid = validateNewPassword(password ?? "", confirm ?? "");
  if (invalid) return fail(invalid);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return fail("انتهت صلاحية رابط الاستعادة أو استُخدم من قبل. اطلب رابطًا جديدًا.");
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (/same.*password|different from the old/i.test(error.message)) {
        return fail("كلمة المرور الجديدة مطابقة للقديمة — اختر كلمة مختلفة.");
      }
      if (/weak|pwned|compromis/i.test(error.message)) {
        return fail("كلمة المرور ضعيفة أو مكشوفة في تسريبات معروفة — اختر كلمة أقوى.");
      }
      return fail(toArabicDbError(error, "تحديث كلمة المرور"));
    }
    await supabase.auth.signOut();
    return ok(null);
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث كلمة المرور"));
  }
}
