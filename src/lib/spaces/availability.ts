import "server-only";

/**
 * بيت المصور — أوقات توفّر المساحات
 * -----------------------------------
 * تقرير «متى يمكن حجز المساحة في يوم معيّن» يجمع ساعات العمل المعلنة من
 * الـ backend مع الحجوزات القائمة: المتاح = المفتوح ناقص المحجوز.
 *
 * قاعدة الحجز لا يقرّرها المتصفح: هذا الملف هو المرجع، وهو ما يقارن به
 * `startSpaceBooking` الحجز قبل الكتابة، وحارس القاعدة يسدّ نافذة التزامن.
 */

import { checkoutReady } from "@/lib/payments/purchase";
import { getServiceSupabase } from "@/lib/supabase/service";

import {
  fitsInsideAny,
  mergeRanges,
  normalizeDbTime,
  subtractRanges,
  weekdayOfDate,
  type TimeRange,
} from "./schedule";

/** محاولات دفع لم تُحسم: تحجز الموعد ما دامت مهلتها قائمة. */
export const OPEN_PAYMENT_STATES = ["created", "pending", "authorized"] as const;

export interface SpaceDayPlan {
  date: string;
  /** 0=الأحد … 6=السبت */
  weekday: number;
  /** ساعات العمل المعلنة لهذا اليوم (مدمجة). */
  open: TimeRange[];
  /** أوقات يحجزها حجز قائم فعليًا. */
  busy: TimeRange[];
  /** المفتوح ناقص المحجوز — وحده يقبل حجزًا جديدًا. */
  free: TimeRange[];
  /** لا توجد ساعات عمل أصلًا في هذا اليوم. */
  closed: boolean;
}

/**
 * إغلاق المحاولات التي انتهت مهلتها: الوقت يعود متاحًا تلقائيًا، ولا
 * يبقى «بانتظار الدفع» إلى الأبد. أفضل جهد — فشلها لا يوقف القراءة.
 */
export async function expireStaleSpaceBookings(): Promise<void> {
  await getServiceSupabase()
    .from("studio_space_bookings")
    .update({ status: "expired", payment_status: "expired" })
    .eq("status", "pending")
    .in("payment_status", [...OPEN_PAYMENT_STATES])
    .lte("checkout_expires_at", new Date().toISOString());
}

function isBlocking(row: {
  status: string;
  payment_status: string;
  checkout_expires_at: string | null;
}): boolean {
  if (row.status === "confirmed") return true;
  return (
    row.status === "pending" &&
    (OPEN_PAYMENT_STATES as readonly string[]).includes(row.payment_status) &&
    row.checkout_expires_at !== null &&
    new Date(row.checkout_expires_at).getTime() > Date.now()
  );
}

/** تقرير اليوم: ساعات العمل والمحجوز والمتاح — أو null عند تاريخ غير صالح. */
export async function loadSpaceDayPlan(spaceId: string, dateIso: string): Promise<SpaceDayPlan | null> {
  const weekday = weekdayOfDate(dateIso);
  if (weekday === null) return null;

  await expireStaleSpaceBookings();

  const svc = getServiceSupabase();
  const [hours, bookings] = await Promise.all([
    svc
      .from("studio_space_hours")
      .select("day_of_week, start_time, end_time")
      .eq("space_id", spaceId)
      .eq("day_of_week", weekday),
    svc
      .from("studio_space_bookings")
      .select("start_time, end_time, status, payment_status, checkout_expires_at")
      .eq("space_id", spaceId)
      .eq("booking_date", dateIso),
  ]);

  const open = mergeRanges(
    (hours.data ?? []).map((row) => ({
      start: normalizeDbTime(row.start_time),
      end: normalizeDbTime(row.end_time),
    })),
  );
  const busy = (bookings.data ?? [])
    .filter(isBlocking)
    .map((row) => ({ start: normalizeDbTime(row.start_time), end: normalizeDbTime(row.end_time) }));

  return { date: dateIso, weekday, open, busy, free: subtractRanges(open, busy), closed: open.length === 0 };
}

/** هل يقع الحجز كاملاً داخل وقت حرّ الآن؟ */
export async function isSpaceSlotFree(spaceId: string, dateIso: string, start: string, end: string): Promise<boolean> {
  const plan = await loadSpaceDayPlan(spaceId, dateIso);
  if (!plan) return false;
  return fitsInsideAny(plan.free, { start, end });
}

export interface SpaceCheckoutReadiness {
  ready: boolean;
  /** سبب عدم الجاهزية للعرض المباشر — أو null عند الجاهزية. */
  reason: string | null;
}

/** هل يستطيع الخادم تحصيل مبلغ الآن؟ (المفتاح + إعداد ضريبة معتمد) */
export async function spaceCheckoutReadiness(): Promise<SpaceCheckoutReadiness> {
  if (await checkoutReady("moyasar")) return { ready: true, reason: null };
  return {
    ready: false,
    reason: "الحجز بالدفع الإلكتروني غير متاح حاليًا. تواصل معنا لتأكيد الموعد.",
  };
}
