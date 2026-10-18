/**
 * بيت المصور — حسابات مواعيد المساحات (دوال نقية بلا قاعدة ولا واجهة)
 * ---------------------------------------------------------------------
 * اليوم = نطاقات «من — إلى» متعددة، والحجز يجب أن يقع كاملاً داخل نطاق
 * حرّ لم يتبقّ منه شيء بعد طرح الحجوزات القائمة. كل هنا نص «HH:MM»
 * مرتّب رقميًا فالمقارنة بالنص صحيحة ولا تحتاج Date ولا تحويل منطقة زمنية.
 */

/** نطاق زمني بـ HH:MM (بداية مشمولة، نهاية منتهية). */
export interface TimeRange {
  start: string;
  end: string;
}

/** خطوة العرض والاختيار: نصف ساعة. */
export const SLOT_STEP_MINUTES = 30;
/** أقصر حجز مقبول. */
export const MIN_BOOKING_MINUTES = 30;
/** أبعد تاريخ حجز مقبول (للأمام). */
export const MAX_BOOKING_DAYS_AHEAD = 90;

/** تسميات أيام الأسبوع بترتيب extract(dow): 0=الأحد … 6=السبت. */
export const DAY_LABELS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

/** "HH:MM" ← دقائق من منتصف الليل، أو null عند قيمة غير صالحة. */
export function toMinutes(time: string): number | null {
  const match = TIME_RE.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** دقائق ← "HH:MM" (تُطبع دائمًا برقمين). */
export function fromMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** مدة بالدقائق بين بدايتين، أو null إذا كانت النهاية ليست بعد البداية. */
export function durationMinutes(start: string, end: string): number | null {
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (from === null || to === null || to <= from) return null;
  return to - from;
}

/** يتقاطعان زمنيًا (نهاية واحدة = بداية الأخرى لا يسمى تقاطعًا). */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/** هل يحتوي النطاق الخارجي الداخل كاملاً (بما فيه الحدود). */
export function rangeContains(outer: TimeRange, inner: TimeRange): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

/** فهرس اليوم: 0=الأحد … 6=السبت، أو null عند تاريخ غير صالح. */
export function weekdayOfDate(dateIso: string): number | null {
  const match = DATE_RE.exec(dateIso);
  if (!match) return null;
  const date = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  /* التحقق أن التاريخ موجود فعلًا (لا 2026-02-30). */
  if (date.toISOString().slice(0, 10) !== dateIso) return null;
  return date.getUTCDay();
}

/** تنسيق تاريخ ← YYYY-MM-DD (بتوقيت UTC). */
export function isoDateOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** تاريخ اليوم بتوقيت UTC. */
export function todayIso(now: Date = new Date()): string {
  return isoDateOf(now);
}

/** هل التاريخ نص YYYY-MM-DD صالح فعليًا. */
export function isDateIso(value: string): boolean {
  return weekdayOfDate(value) !== null;
}

/** إضافة أيام لتاريخ. */
export function addDays(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDateOf(date);
}

/** قيمة time من القاعدة قد تصل "09:00:00" — تُطبّع إلى "HH:MM". */
export function normalizeDbTime(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

/** ترتيب النطاقات تصاعديًا (نسخة جديدة). */
export function sortRanges(ranges: TimeRange[]): TimeRange[] {
  return [...ranges].sort((a, b) => (a.start === b.start ? a.end.localeCompare(b.end) : a.start.localeCompare(b.start)));
}

/**
 * دمج النطاقات المتداخلة أو المتلاصقة: 9—12 و12—15 تصبح 9—15،
 * فالحجز عبر حدّين متجاورين (انتهاء وبداية) صحيح إذا كانا نطاقين مفتوحين.
 */
export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const sorted = sortRanges(ranges.filter((range) => range.end > range.start));
  const merged: TimeRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      if (range.end > last.end) last.end = range.end;
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

/** طرح المشغول من المفتوح: الفرق = الأوقات المتاحة فعليًا. */
export function subtractRanges(open: TimeRange[], busy: TimeRange[]): TimeRange[] {
  const windows = mergeRanges(open);
  const blocks = mergeRanges(busy);
  const free: TimeRange[] = [];
  for (const window of windows) {
    let cursor = window.start;
    for (const block of blocks) {
      if (block.end <= cursor) continue;
      if (block.start >= window.end) break;
      if (block.start > cursor) {
        free.push({ start: cursor, end: block.start > window.end ? window.end : block.start });
      }
      if (block.end > cursor) cursor = block.end;
      if (cursor >= window.end) break;
    }
    if (cursor < window.end) free.push({ start: cursor, end: window.end });
  }
  return free.filter((range) => durationMinutes(range.start, range.end) !== null);
}

/** هل يقع الحجز داخل أحد النطاقات الحرّة كاملاً. */
export function fitsInsideAny(free: TimeRange[], candidate: TimeRange): boolean {
  return free.some((range) => rangeContains(range, candidate));
}

/** بدايات مقترحة للحجز داخل نطاق حرّ على خطوة محددة. */
export function slotStarts(range: TimeRange, stepMinutes: number = SLOT_STEP_MINUTES): string[] {
  const start = toMinutes(range.start);
  const end = toMinutes(range.end);
  if (start === null || end === null) return [];
  const starts: string[] = [];
  for (let cursor = start; cursor + MIN_BOOKING_MINUTES <= end; cursor += stepMinutes) {
    starts.push(fromMinutes(cursor));
  }
  return starts;
}

/** نهايات ممكنة لبداية مختارة داخل نفس النطاق الحرّ. */
export function slotEnds(range: TimeRange, start: string, stepMinutes: number = SLOT_STEP_MINUTES): string[] {
  const from = toMinutes(start);
  const end = toMinutes(range.end);
  if (from === null || end === null) return [];
  const ends: string[] = [];
  for (let cursor = from + MIN_BOOKING_MINUTES; cursor <= end; cursor += stepMinutes) {
    ends.push(fromMinutes(cursor));
  }
  return ends;
}

/** عرض الساعة بالعربية: "09:00" ← "9:00 ص". */
export function formatTimeArabic(time: string): string {
  const minutes = toMinutes(time);
  if (minutes === null) return time;
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours24 < 12 ? "ص" : "م";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

/** "09:00 — 12:00" للعرض. */
export function formatRangeArabic(range: TimeRange): string {
  return `${formatTimeArabic(range.start)} — ${formatTimeArabic(range.end)}`;
}

/** "ساعتان ونصف" / "ساعة واحدة" — للعرض بجانب السعر. */
export function formatDurationArabic(minutes: number): string {
  const hours = minutes / 60;
  if (minutes % 60 === 0) {
    if (hours === 1) return "ساعة واحدة";
    if (hours === 2) return "ساعتان";
    if (hours <= 10) return `${hours} ساعات`;
    return `${hours} ساعة`;
  }
  const wholeHours = Math.floor(hours);
  const rest = minutes % 60;
  const restLabel = rest === 30 ? "نصف" : `${rest} دقيقة`;
  if (wholeHours === 0) return `${rest} دقيقة`;
  if (wholeHours === 1) return `ساعة و${restLabel}`;
  if (wholeHours === 2) return `ساعتان و${restLabel}`;
  return `${wholeHours} ساعات و${restLabel}`;
}
