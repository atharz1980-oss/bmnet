/**
 * بيت المصور — نتيجة موحدة لإجراءات الخادم (CP-G)
 * ------------------------------------------------
 * كل Server Action يعيد ActionResult بدل رمي الاستثناءات:
 * الواجهة تعرض الخطأ العربي مباشرة، والنجاح يحمل البيانات.
 *
 * - ok / fail: المولّدان الوحيدان.
 * - toArabicDbError: تحويل أخطاء قاعدة البيانات إلى رسائل عربية مفهومة.
 * - sanitizeSlug / validators: تحقق مدخلات مشترك بين كل الإجراءات.
 */

import type { AdminModule, PermissionAction } from "@/data/admin/types";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: string): ActionResult<T> {
  return { ok: false, error };
}

/** فشل صلاحية — رسالة موحدة (لا نكشف وجود/غياب الوحدة عن غير المصرح) */
export function permissionDenied(): ActionResult<never> {
  return { ok: false, error: "ليست لديك صلاحية تنفيذ هذا الإجراء." };
}

/** غير مسجل الدخول */
export function notAuthenticated(): ActionResult<never> {
  return { ok: false, error: "انتهت الجلسة — يرجى تسجيل الدخول من جديد." };
}

/** استخراج الرسالة من أي شكل خطأ (Error / PostgrestError ككائن مجرد / نص) */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  /* PostgrestError يصل ككائن مجرد عبر fetch — String() تعطي [object Object] */
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return String(error);
}

/** تحويل خطأ Postgres/Supabase إلى رسالة عربية آمنة للعرض */
export function toArabicDbError(error: unknown, context: string): string {
  const message = extractErrorMessage(error);
  if (/duplicate key|unique constraint/i.test(message)) {
    return "قيمة مكررة — يوجد سجل بنفس المعرّف (slug أو اسم). غيّر القيمة وأعد المحاولة.";
  }
  if (/foreign key|violates/i.test(message)) {
    return "لا يمكن تنفيذ الإجراء: يوجد ارتباط بسجل آخر يستخدمه.";
  }
  if (/row-level security|permission denied|schema private/i.test(message)) {
    return "رفضت قاعدة البيانات الإجراء — تحقق من صلاحياتك.";
  }
  if (/connection|fetch failed|network/i.test(message)) {
    return "تعذر الاتصال بقاعدة البيانات — تحقق من الشبكة وأعد المحاولة.";
  }
  if (message.includes("Invalid login credentials")) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }
  if (message.includes("Email not confirmed")) {
    return "لم يتم تأكيد البريد الإلكتروني بعد.";
  }
  if (message.includes("User already registered")) {
    return "هذا البريد مسجّل مسبقًا.";
  }
  return `فشل ${context}: ${message.slice(0, 160)}`;
}

/** تطبيع slug: حروف لاتينية/أرقام/شرطات فقط — فارغ = غير صالح */
export function sanitizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 96;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** أرقام سعودية مرنة: 05xxxxxxxx أو +9665xxxxxxxx */
export function isValidSaudiPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return /^05\d{8}$/.test(digits) || /^9665\d{8}$/.test(digits);
}

/** رابط http(s) صالح أو فارغ (حقول اختيارية) */
export function isValidOptionalUrl(value: string | undefined | null): boolean {
  if (!value || value.trim() === "") return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** قطع نص طويل باحترام حدود الأعمدة */
export function clampText(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/** الوحدات والأفعال الصالحة — تحقق من مدخلات الإجراءات قبل لمس قاعدة البيانات */
export function isValidModuleAction(
  module: string,
  action: string,
): module is AdminModule {
  const MODULES: readonly AdminModule[] = [
    "dashboard", "courses", "sessions", "trainers", "paths", "homepage",
    "testimonials", "blog", "corporate-requests", "media", "legal",
    "settings", "payments", "users", "roles",
  ];
  const ACTIONS: readonly PermissionAction[] = [
    "view", "create", "edit", "delete", "publish", "manage",
  ];
  return (
    MODULES.includes(module as AdminModule) &&
    ACTIONS.includes(action as PermissionAction)
  );
}

/**
 * next آمن لإعادة التوجيه بعد الدخول (منع open-redirect):
 * مسار داخلي فقط — يبدأ بـ «/» وليس «//» أو «/\» وبلا محارف تحكم.
 */
export function safeInternalNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (/[\r\n]/.test(raw)) return null;
  return raw;
}
