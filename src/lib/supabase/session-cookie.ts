/**
 * بيت المصور — كشف وجود جلسة Supabase من الكوكيز وحده
 * ------------------------------------------------------
 * `auth.getUser()` يرسل طلبًا شبكيًا إلى خادم المصادقة في كل مرة
 * يُستدعى فيها. في الـ proxy كان يُستدعى في كل طلب يمرّ على المسارات
 * المحمية (المجتمع/الحساب/الدروس)، فلزم الزائر غير المسجّل رحلة
 * إلى خادم Supabase كاملة بلا فائدة — لا جلسة عنده أصلًا.
 *
 * كوكي الجلسة في @supabase/ssr يسمّى `sb-<project-ref>-auth-token`،
 * وقد يُقسَّم إلى أجزاء: `sb-<project-ref>-auth-token.0`، `.1`…
 * (لأن الكوكيز محدودة الحجم). فنتحقق من النمط لا من اسم حرفي.
 *
 * الغرض: **تخطّي** الطلب الشبكي حين لا جلسة.
 * التحقق من الصلاحية نفسه يبقى في `auth.getUser()` داخل الخادم
 * (وهو مصدر الحقيقة)، أما هذا فيكتفي بوجود الكوكي.
 */

/** نمط كوكي جلسة Supabase مع دعم الأجزاء المقسَّمة */
const SESSION_COOKIE_PATTERN = /^sb-.+-auth-token(\.\d+)?$/;

/** هل يحمل الطلب كوكي جلسة Supabase؟ */
export function hasSupabaseSessionCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some((name) => SESSION_COOKIE_PATTERN.test(name));
}
