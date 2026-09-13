import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  RECOVERY_REQUEST_PATH,
  RECOVERY_UPDATE_PATH,
  resolveRecoveryOrigin,
  safeLoginReturn,
} from "@/lib/auth/recovery";

/**
 * مهبط رابط الاستعادة القادم من Supabase.
 *
 * يُكتب هنا لا في صفحة: كتابة الكوكيز متاحة في Route Handler، ومكتومة
 * بالتصميم داخل Server Component — فتبادل الرمز في صفحة ينجح ثم تضيع
 * الجلسة. وهذا هو الموضع الذي تُثبَّت فيه جلسة الاستعادة.
 *
 * يقبل الشكلين اللذين قد يصلان بحسب إعداد المشروع وقالب البريد:
 *  - `?code=…`        تدفق PKCE (الافتراضي في ‎@supabase/ssr).
 *  - `?token_hash=…`  قالب يستخدم TokenHash.
 * وإن لم يصل أيّهما فقد تكون الرموز في الجزء بعد `#`، وهو لا يبلغ الخادم
 * أصلًا — فيُمرَّر الأمر إلى صفحة التحديث لتقرأه في المتصفح.
 *
 * لا يُسجَّل رمز ولا بريد هنا بحال.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const loginPath = safeLoginReturn(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const errorCode = url.searchParams.get("error") ?? url.searchParams.get("error_code");

  /**
   * الوجهة تُبنى من نطاق الموقع المعتمد، لا من `url.origin` ولا من قيمة في
   * الرابط. خلف وسيط الاستضافة يحمل `request.url` الأصل الداخلي
   * (‎0.0.0.0:3000)، فالبناء عليه يرمي المستخدم إلى عنوان لا يُفتح — وقع
   * فعلًا على الإنتاج. وهو ليس قيمة يتحكم بها المستخدم، فلا تحويل مفتوح.
   */
  const to = (path: string, params?: Record<string, string>) => {
    const target = new URL(path, resolveRecoveryOrigin(url.origin));
    target.searchParams.set("next", loginPath);
    for (const [k, v] of Object.entries(params ?? {})) target.searchParams.set(k, v);
    return NextResponse.redirect(target);
  };

  if (errorCode) {
    /* Supabase رفض الرابط (منتهٍ أو مستخدم) — رسالة عربية لا رمز خام. */
    return to(RECOVERY_REQUEST_PATH, { expired: "1" });
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return to(RECOVERY_REQUEST_PATH, { expired: "1" });
      return to(RECOVERY_UPDATE_PATH);
    }

    if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type === "invite" ? "invite" : "recovery",
      });
      if (error) return to(RECOVERY_REQUEST_PATH, { expired: "1" });
      return to(RECOVERY_UPDATE_PATH);
    }
  } catch {
    return to(RECOVERY_REQUEST_PATH, { expired: "1" });
  }

  /* لا رمز في الاستعلام: الرموز على الأرجح خلف `#` — يقرؤها المتصفح. */
  return to(RECOVERY_UPDATE_PATH);
}
