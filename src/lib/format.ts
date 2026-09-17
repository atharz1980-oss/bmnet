/**
 * دوال التنسيق المشتركة (أرقام، أسعار، تواريخ بالعربية)
 * تعتمد على تنسيق يدوي ثابت لتجنّب اختلافات الـ Locale
 * بين الخادم والمتصفح (Hydration mismatch) وعدم الاعتماد على
 * تقويم الهجري الافتراضي في ar-SA.
 */

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const AR_WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** 4500 → "4,500" */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** 1000 → "1,000 ريال" — والصفر يعني "حسب الطلب" */
export function formatPrice(price: number): string {
  if (price <= 0) return "حسب الطلب";
  return `${formatNumber(price)} ريال`;
}

/**
 * عدد المقاعد بصيغته العربية الصحيحة.
 *
 * العربية تميّز المفرد والمثنى وجمع القلة وتمييز الأحد عشر فما فوق، و«12
 * مقاعد» خطأ يقرؤه كل زائر. الصيغة تُكتب مرة هنا وتُستعمل في كل موضع يعرض
 * ما تبقّى — البطاقة وصفحة الدورة واختيار الدفعة.
 */
export function formatSeats(count: number): string {
  if (count === 1) return "مقعد واحد";
  if (count === 2) return "مقعدان";
  if (count >= 3 && count <= 10) return `${formatNumber(count)} مقاعد`;
  return `${formatNumber(count)} مقعدًا`;
}

/** "2026-09-14" → "14 سبتمبر 2026" */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getDate()} ${AR_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "2026-09-14" → "الإثنين 14 سبتمبر" */
export function formatDateWithWeekday(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return `${AR_WEEKDAYS[date.getDay()]} ${date.getDate()} ${AR_MONTHS[date.getMonth()]}`;
}

/** "2026-09-14" → "14 سبتمبر" (بدون سنة) */
export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getDate()} ${AR_MONTHS[date.getMonth()]}`;
}

/** "2026-09-14" → "سبتمبر 2026" (للمدونة) */
export function formatMonthYear(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return `${AR_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** نسبة مئوية: 20 → "20%" */
export function formatPercent(value: number): string {
  return `${value}%`;
}

/** حساب السعر النهائي بعد الخصم */
export function applyDiscount(total: number, discountPercent: number): number {
  return Math.round(total * (1 - discountPercent / 100));
}

/** 1990000 → "1.9 MB" — لأحجام ملفات الوسائط */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = unitIndex === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

/** ISO datetime → "14 سبتمبر 2026، 10:30" (24h) — لعرض الطوابع الزمنية */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${AR_MONTHS[date.getMonth()]} ${date.getFullYear()}، ${hours}:${minutes}`;
}

/**
 * تطبيع رقم الهاتف للتخزين: يحذف المسافات والشرطات والأقواس
 * ويوحّد البادئة +966… — يحفظ أرقامًا قابلة للتطبيع (Checkpoint 5).
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s\-()]/g, "");
  if (trimmed.startsWith("00")) return `+${trimmed.slice(2)}`;
  return trimmed;
}

/** أرقام فقط بدون رموز — لبناء روابط wa.me وtel: */
export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * تاريخ اليوم المحلي بصيغة ISO "YYYY-MM-DD" — توقيت المتصفح لا UTC
 * (toISOString يعطي تاريخ الأمس بعد منتصف الليل بتوقيت السعودية).
 */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
