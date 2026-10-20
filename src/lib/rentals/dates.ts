/**
 * حسابات فترة تأجير المعدات — تواريخ شاملة (آخر يوم إيجار محسوب).
 * ----------------------------------------------------------------
 * لا Date محلي ولا مناطق زمنية هنا: التواريخ نص YYYY-MM-DD وتُقارن نصيًا
 * بعد التحقق، فنتيجة الخادم والمتصفح واحدة.
 */

import { addDays, isDateIso, todayIso } from "@/lib/spaces/schedule";

/** أطول فترة إيجار واحدة — تحرس من إدخال سنة بالخطأ. */
export const MAX_RENTAL_DAYS = 90;
/** أبعد بداية إيجار مقبولة. */
export const MAX_RENTAL_DAYS_AHEAD = 180;
/** مهلة صفحة الدفع. */
export const RENTAL_CHECKOUT_TTL_MINUTES = 20;
/** رقم ضمان نافذ يُنشأ بعد الدفع — ولا يُعدّ معتمدًا قبل اعتماد المزود. */
export const RENTAL_SUCCESS_PATH = "/rentals/success";

/**
 * رسوم توصيل ثابتة داخل جدة (50 ريالًا). التوصيل خارج جدة يُنسّق يدويًا
 * قبل التسليم، ولا يفتح الدفع إلا بالخيار المعلن هنا.
 */
export const EQUIPMENT_DELIVERY_FEE_HALALAS = 5_000;

/** عدد الأيام شاملًا يومي البداية والنهاية. */
export function rentalDays(startDate: string, endDate: string): number | null {
  if (!isDateIso(startDate) || !isDateIso(endDate) || endDate < startDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  const days = Math.round((end - start) / 86_400_000) + 1;
  return days >= 1 ? days : null;
}

export interface RentalDateCheck {
  ok: boolean;
  days: number;
  error: string | null;
}

/** تحقق الفترة كما يراه الخادم وكما يعرضه المتصفح. */
export function validateRentalDates(startDate: string, endDate: string, today = todayIso()): RentalDateCheck {
  if (!isDateIso(startDate) || !isDateIso(endDate)) {
    return { ok: false, days: 0, error: "تاريخ البداية أو النهاية غير صالح." };
  }
  if (startDate < today) {
    return { ok: false, days: 0, error: "لا يمكن أن يبدأ الإيجار في تاريخ ماضٍ." };
  }
  if (endDate < startDate) {
    return { ok: false, days: 0, error: "تاريخ النهاية يجب أن يكون في يوم البداية أو بعده." };
  }
  if (startDate > addDays(today, MAX_RENTAL_DAYS_AHEAD)) {
    return { ok: false, days: 0, error: `يمكن الحجز حتى ${MAX_RENTAL_DAYS_AHEAD} يومًا مقدمًا.` };
  }
  const days = rentalDays(startDate, endDate);
  if (days === null) {
    return { ok: false, days: 0, error: "فترة الإيجار غير صالحة." };
  }
  if (days > MAX_RENTAL_DAYS) {
    return { ok: false, days, error: `أقصى مدة إيجار واحدة ${MAX_RENTAL_DAYS} يومًا.` };
  }
  return { ok: true, days, error: null };
}

/** تقاطع فترتين شاملًا الطرفين — مطابق لشرط حارس القاعدة. */
export function rentalPeriodsOverlap(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  return a.start <= b.end && b.start <= a.end;
}
