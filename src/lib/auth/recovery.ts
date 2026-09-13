/**
 * استعادة كلمة المرور — القواعد المشتركة بين الخادم والعميل.
 *
 * نقية وقابلة للاختبار: لا تلمس Supabase ولا الكوكيز. الغرض أن يكون قرار
 * «إلى أين نعيد المستخدم» و«ما كلمة المرور المقبولة» في مكان واحد يُحرَس
 * باختبار، لا مبعثرًا في النماذج.
 */
import { siteConfig } from "@/data/site";

/** صفحات الدخول المعتمدة — وحدها تصلح وجهةً بعد الاستعادة. */
export const LOGIN_PATHS = ["/community/login", "/admin/login"] as const;
export type LoginPath = (typeof LOGIN_PATHS)[number];

export const DEFAULT_LOGIN_PATH: LoginPath = "/community/login";

/** مسار الصفحة التي يهبط عليها رابط الاستعادة القادم من Supabase. */
export const RECOVERY_CALLBACK_PATH = "/community/reset-password/callback";
export const RECOVERY_UPDATE_PATH = "/community/reset-password/update";
export const RECOVERY_REQUEST_PATH = "/community/reset-password";

/**
 * وجهة العودة بعد نجاح التغيير.
 *
 * قائمة سماح لا حارس عام: القيمة تصل من رابط في بريد، فأي مسار داخلي
 * مقبول يوسّع سطح الهجوم بلا فائدة. الدخول صفحتان لا غير.
 */
export function safeLoginReturn(raw: string | string[] | null | undefined): LoginPath {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return LOGIN_PATHS.includes(value as LoginPath) ? (value as LoginPath) : DEFAULT_LOGIN_PATH;
}

/**
 * الأصل الذي يُبنى عليه رابط الاستعادة.
 *
 * في الإنتاج: نطاق الموقع المعتمد **حصرًا** — لا ترويسة Host ولا Origin من
 * الطلب. ترويسة الطلب يتحكم بها المرسِل، فبناء رابط بريد عليها يعني أن
 * طلبًا مزوَّرًا يوجّه رابط استعادة إلى نطاق يملكه غيرنا. ويضمن هذا أيضًا
 * ألا يخرج من الإنتاج رابط إلى localhost مهما كان مصدر الطلب.
 *
 * في التطوير وحده يُقبل أصل الطلب المحلي ليعمل الاختبار.
 */
export function resolveRecoveryOrigin(
  requestOrigin?: string | null,
  /* يُمرَّر صراحةً في الاختبار: NODE_ENV للقراءة فقط ولا يصح العبث به. */
  isProduction: boolean = process.env.NODE_ENV === "production",
): string {
  if (isProduction) return siteConfig.url;
  if (requestOrigin && /^https?:\/\/[^\s/]+$/.test(requestOrigin)) return requestOrigin;
  return siteConfig.url;
}

/** رابط `redirectTo` الكامل الذي يُسلَّم لـSupabase. */
export function buildRecoveryRedirectUrl(
  loginPath: LoginPath,
  requestOrigin?: string | null,
  isProduction?: boolean,
): string {
  const url = new URL(RECOVERY_CALLBACK_PATH, resolveRecoveryOrigin(requestOrigin, isProduction));
  url.searchParams.set("next", loginPath);
  return url.toString();
}

export const PASSWORD_MIN_LENGTH = 8;
/** حد bcrypt الذي تفرضه Supabase — الأطول يُرفض من الخادم بلا رسالة مفهومة. */
export const PASSWORD_MAX_LENGTH = 72;

/** سياسة كلمة المرور — نفس سياسة التسجيل الحالية، مع تطابق التأكيد. */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (!password) return "أدخل كلمة المرور الجديدة.";
  if (password.length < PASSWORD_MIN_LENGTH) return `كلمة المرور: ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `كلمة المرور طويلة جدًا — ${PASSWORD_MAX_LENGTH} حرفًا كحد أقصى.`;
  if (password !== confirm) return "كلمتا المرور غير متطابقتين.";
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isValidRecoveryEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim().toLowerCase());
}

/**
 * الرسالة الوحيدة التي يراها طالب الاستعادة — نجح الإرسال أم لم يوجد
 * الحساب. تمييز الحالتين يكشف من له حساب عندنا ومن لا.
 */
export const RECOVERY_GENERIC_MESSAGE =
  "إذا كان البريد مسجلًا لدينا، فسيصلك رابط استعادة كلمة المرور خلال دقائق. تحقق من صندوق الوارد ومجلد الرسائل غير المرغوبة.";
