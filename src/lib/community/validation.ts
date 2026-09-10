/**
 * مدققات مدخلات المجتمع (CP-H V1) — دوال نقية قابلة للاختبار (bun test)
 * المرآة الدقيقة لقيود المخطط في 20260910090000_community_schema.sql.
 * ترجع نص خطأ عربيًا أو null عند الصحة.
 */

export const MAX_POST_MEDIA = 6;
export const MAX_PORTFOLIO_MEDIA = 20;
export const MAX_SPECIALTIES = 8;
export const FEED_PAGE_SIZE = 12;
export const DISCOVERY_PAGE_SIZE = 24;

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "bmnet", "baytalmosawer", "community", "support",
  "help", "root", "owner", "moderator", "mod", "api", "null", "undefined",
  "login", "signup", "notifications", "photographers", "profile", "settings",
]);

/** username: حروف لاتينية صغيرة/أرقام/شرطة سفلية 3-24 — آمن للروابط ومطابق لقيد المخطط */
export function validateUsername(value: string): string | null {
  const v = value.trim();
  if (!v) return "اسم المستخدم مطلوب.";
  if (!/^[a-z0-9_]{3,24}$/.test(v))
    return "اسم المستخدم: حروف لاتينية صغيرة وأرقام وشرطة سفلية فقط (3-24 حرفًا).";
  if (RESERVED_USERNAMES.has(v)) return "اسم المستخدم محجوز — اختر اسمًا آخر.";
  return null;
}

export function validateDisplayName(value: string): string | null {
  const v = value.trim();
  if (!v) return "الاسم الظاهر مطلوب.";
  if (v.length > 80) return "الاسم الظاهر: 80 حرفًا كحد أقصى.";
  return null;
}

export function validateBio(value: string): string | null {
  if ((value ?? "").trim().length > 1000) return "النبذة: 1000 حرف كحد أقصى.";
  return null;
}

export function validateCaption(value: string): string | null {
  if ((value ?? "").trim().length > 2200) return "التعليق المصاحب: 2200 حرف كحد أقصى.";
  return null;
}

export function validateCommentBody(value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return "اكتب تعليقًا قبل الإرسال.";
  if (v.length > 1000) return "التعليق: 1000 حرف كحد أقصى.";
  return null;
}

export function validateSpecialties(values: string[]): string | null {
  const list = (values ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
  if (list.length > MAX_SPECIALTIES) return `التخصصات: ${MAX_SPECIALTIES} كحد أقصى.`;
  if (list.some((s) => s.length > 40)) return "كل تخصص: 40 حرفًا كحد أقصى.";
  return null;
}

export function validateShortText(value: string, label: string, max: number): string | null {
  if ((value ?? "").trim().length > max) return `${label}: ${max} حرفًا كحد أقصى.`;
  return null;
}

const HTTPS_URL = /^https:\/\/[^\s]{1,200}$/;
const INSTAGRAM_URL = /^https:\/\/(www\.)?instagram\.com\/[\w.\-/]{1,120}$/;
const YOUTUBE_URL = /^https:\/\/(www\.)?youtube\.com\/[\w.\-/=@]{1,150}$/;

export function validateWebsiteUrl(value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (!HTTPS_URL.test(v)) return "رابط الموقع: يجب أن يبدأ بـ https://";
  return null;
}

export function validateInstagramUrl(value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (!INSTAGRAM_URL.test(v)) return "رابط انستقرام غير صالح — مثال: https://instagram.com/username";
  return null;
}

export function validateYoutubeUrl(value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (!YOUTUBE_URL.test(v)) return "رابط يوتيوب غير صالح — مثال: https://youtube.com/@channel";
  return null;
}

export function validateExperienceLevel(value: string): string | null {
  if (!["beginner", "intermediate", "professional"].includes(value))
    return "مستوى الخبرة غير صالح.";
  return null;
}

export function validatePortfolioTitle(value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return "عنوان المشروع مطلوب.";
  if (v.length > 120) return "عنوان المشروع: 120 حرفًا كحد أقصى.";
  return null;
}

export function validateProjectDate(value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v.startsWith("0000") || Number.isNaN(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v)
    return "تاريخ المشروع غير صالح.";
  return null;
}

/** مسار وسائط مجتمع صالح مملوك للمستخدم نفسه (يمنع تمرير مسارات غيره) */
export function validateOwnedMediaPath(
  path: string,
  userId: string,
  max: number,
): string | null {
  if (!path || typeof path !== "string") return "مسار الوسائط مطلوب.";
  if ([".", ".."].includes(path.split("/").at(-1) ?? "")) return "مسار وسائط غير صالح.";
  if (path.split("/").length !== 3 || !path.startsWith(`community/${userId}/`))
    return "مسار وسائط غير صالح.";
  if (!/^community\/[\w-]{36}\/[\w.\-]{1,160}$/.test(path))
    return "مسار وسائط غير صالح.";
  if (max === 0) return "الحد الأقصى للوسائط لهذا العنصر صفر.";
  void max;
  return null;
}

export function validateMediaCount(count: number, max: number, label: string): string | null {
  if (!Number.isInteger(count) || count < 0) return `${label}: عدد وسائط غير صالح.`;
  if (count > max) return `${label}: ${max} صورة كحد أقصى.`;
  return null;
}

export function validateReportReason(value: string): string | null {
  if (
    !["spam", "inappropriate", "harassment", "copyright", "impersonation", "other"].includes(
      value,
    )
  )
    return "سبب البلاغ غير صالح.";
  return null;
}

export function validateReportDetails(value: string): string | null {
  if ((value ?? "").trim().length > 1000) return "تفاصيل البلاغ: 1000 حرف كحد أقصى.";
  return null;
}
