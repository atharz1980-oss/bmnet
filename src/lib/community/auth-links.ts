/**
 * روابط الدخول والتسجيل التي تعود بالزائر إلى ما كان يفعله.
 *
 * الموقع عام أولًا: الزائر يتصفح بلا حساب، ولا يُطلب الدخول إلا عند فعل
 * يحتاجه فعلًا. وحين يُطلب، يجب أن يعود إلى نفس المكان — وإلا صار الطلب
 * عقوبة على المحاولة.
 *
 * نقطة بناء واحدة حتى لا ينسى مستدعٍ تمرير وجهة العودة، وحتى يمر كل
 * رابط بحارس open-redirect نفسه.
 */
import { safeInternalNext } from "@/lib/cms/result";

/** مسار داخلي للعودة إليه، أو null إن كان غير صالح. */
export function returnPath(raw: string | null | undefined): string | null {
  return safeInternalNext(raw);
}

/**
 * رابط صفحة دخول المجتمع مع وجهة العودة.
 * `next` غير الصالح يُسقط بصمت: الدخول يبقى ممكنًا، وتضيع العودة وحدها.
 */
export function communityLoginHref(next?: string | null): string {
  const safe = returnPath(next);
  return safe ? `/community/login?next=${encodeURIComponent(safe)}` : "/community/login";
}

/** رابط إنشاء حساب المجتمع مع وجهة العودة. */
export function communitySignupHref(next?: string | null): string {
  const safe = returnPath(next);
  return safe ? `/community/signup?next=${encodeURIComponent(safe)}` : "/community/signup";
}

/*
 * لا تضف هنا مساعدًا يقرأ المسار من المتصفح.
 * usePathname/useSearchParams داخل مكوّن عميل يؤجّلان حدّ Suspense المحيط
 * به، فتبقى خلاصة المجتمع على هيكل التحميل ولا تظهر للزائر أبدًا — عطل
 * وقع فعلًا وأثبته بناء حي. الخادم يعرف مساره: مرّر الوجهة خاصيةً.
 */
