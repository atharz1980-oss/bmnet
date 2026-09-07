/**
 * CourseMeta — خيارات ودوال عرض مشتركة لقوائم ومحرر الدورات
 * دوال نقية (Server-safe) — تُستخدم في القائمة والمحرر معًا
 * لضمان مصدر واحد للمسميات وسلوك العرض.
 */
import type { AdminCourse, CourseStatus, SessionStatus } from "@/data/admin/types";
import { formatNumber } from "@/lib/format";

/* ─────────────────── خيارات القوائم المنسدلة ─────────────────── */

export const COURSE_TYPE_OPTIONS: Array<{ value: AdminCourse["type"]; label: string }> = [
  { value: "in-person-individuals", label: "حضوري أفراد" },
  { value: "in-person-corporates", label: "حضوري شركات" },
  { value: "online", label: "أونلاين" },
  { value: "private", label: "برايفت" },
];

export const COURSE_LEVEL_OPTIONS: Array<{ value: AdminCourse["level"]; label: string }> = [
  { value: "beginner", label: "مبتدئ" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced", label: "متقدم" },
  { value: "all-levels", label: "كل المستويات" },
];

export const COURSE_STATUS_OPTIONS: Array<{ value: CourseStatus; label: string }> = [
  { value: "draft", label: "مسودة" },
  { value: "published", label: "منشورة" },
  { value: "coming-soon", label: "قريبًا" },
  { value: "registration-open", label: "التسجيل مفتوح" },
  { value: "full", label: "مكتملة المقاعد" },
  { value: "completed", label: "منتهية" },
];

export const COURSE_LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "الإنجليزية" },
];

export const SESSION_STATUS_OPTIONS: Array<{ value: SessionStatus; label: string }> = [
  { value: "upcoming", label: "قادمة" },
  { value: "open", label: "التسجيل مفتوح" },
  { value: "full", label: "ممتلئة" },
  { value: "closed", label: "مغلقة" },
  { value: "completed", label: "منتهية" },
];

/* ─────────────────── دوال عرض نقية ─────────────────── */

function labelOf(options: Array<{ value: string; label: string }>, value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export const courseTypeLabel = (type: string): string => labelOf(COURSE_TYPE_OPTIONS, type);
export const courseLevelLabel = (level: string): string => labelOf(COURSE_LEVEL_OPTIONS, level);
export const courseStatusLabel = (status: string): string => labelOf(COURSE_STATUS_OPTIONS, status);

/**
 * ملخص مدة الدورة للعرض: "4 أيام — 12 ساعة" (مع ساعات يومية عند توفرها).
 */
export function courseDurationLabel(course: Pick<AdminCourse, "duration">): string {
  const { days, totalHours } = course.duration;
  const daysLabel = `${formatNumber(days)} ${days === 1 ? "يوم" : days === 2 ? "يومان" : "أيام"}`;
  if (!totalHours) return daysLabel;
  return `${daysLabel} — ${formatNumber(totalHours)} ساعة`;
}

/**
 * وسم سعر الدورة حسب قواعد التسعير الموحدة (تُعرض في القائمة والمحرر):
 * مجانية ← "مجانية" / طلب عرض سعر ← "اطلب عرض سعر" / إخفاء السعر ← "غير معروض"
 * وإلا السعر المنسق.
 */
export function coursePriceLabel(
  course: Pick<AdminCourse, "pricing">,
): { text: string; muted?: boolean } {
  const { pricing } = course;
  if (pricing.isFree) return { text: "مجانية" };
  if (pricing.requestQuote) return { text: "اطلب عرض سعر", muted: true };
  if (!pricing.showPrice) return { text: "غير معروضة", muted: true };
  if (pricing.price <= 0) return { text: "حسب الطلب", muted: true };
  return { text: `${formatNumber(pricing.price)} ريال` };
}

/** نمط slug المسموح — لاتيني صغير + أرقام + شرطات */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
