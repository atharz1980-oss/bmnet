import "server-only";

/**
 * تسعير عناصر السلة من القاعدة — لا من المتصفح.
 *
 * كل دالة تعيد **لقطة قابلة للحفظ** (عنوان/وصف/سعر/ضريبة) أو خطأ عربيًا
 * مفهومًا. لا تُنشئ حجزًا ولا مقعدًا: هذا يقع عند الدفع فقط، بعد إعادة
 * التحقق نفسها. الفصل مقصود: السلة اختيار، والدفع التزام.
 */

import { loadCommerce } from "@/lib/payments/configuration";
import { MIN_CHARGE_HALALAS, toHalalas, type VatBreakdown } from "@/lib/payments/money";
import { loadCourseCommerce, type CourseCommerce } from "@/lib/payments/purchase";
import { quoteCoursePrice } from "@/lib/payments/settings";
import { sessionLabel, sessionPlace, sessionRequirement, sessionTime, type SessionOption } from "@/lib/sessions/availability";
import { loadSpaceDayPlan } from "@/lib/spaces/availability";
import {
  addDays,
  durationMinutes,
  fitsInsideAny,
  formatTimeArabic,
  isDateIso,
  isValidTime,
  MAX_BOOKING_DAYS_AHEAD,
  MIN_BOOKING_MINUTES,
  SLOT_STEP_MINUTES,
  toMinutes,
  todayIso,
} from "@/lib/spaces/schedule";
import { formatDateWithWeekday } from "@/lib/format";
import { getServiceSupabase } from "@/lib/supabase/service";

export type CartQuote = VatBreakdown & { currency: "SAR" };

export interface PricedCourse {
  kind: "course";
  course: CourseCommerce;
  session: SessionOption | null;
  quote: CartQuote;
  title: string;
  subtitle: string;
  href: string;
}

export interface PricedSpace {
  kind: "space";
  space: { id: string; slug: string; name: string; pricePerHourHalalas: number };
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  quote: CartQuote;
  title: string;
  subtitle: string;
  href: string;
}

export type PricedCartItem = PricedCourse | PricedSpace;

type Priced<T> = { ok: true; item: T } | { ok: false; error: string };

function limit(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

async function activeEnrollment(userId: string, courseId: string): Promise<boolean> {
  const { data } = await getServiceSupabase()
    .from("course_enrollments")
    .select("status")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  return data?.status === "active";
}

/**
 * دورة + موعدها (إن كانت مجدولة) + سعرها المعتمد.
 * الموعد المختار يجب أن يكون ضمن دفعات الدورة وقابلًا للاختيار الآن.
 */
export async function priceCourseSelection(
  courseId: string,
  sessionId: string | null,
  userId: string | null,
): Promise<Priced<PricedCourse>> {
  const course = await loadCourseCommerce(courseId);
  if (!course || !course.published) return { ok: false, error: "هذه الدورة غير متاحة." };
  if (course.mode === "quote") {
    return { ok: false, error: "تدريب الشركات يتم بالتواصل المباشر مع الإدارة." };
  }
  if (course.mode !== "paid") return { ok: false, error: "هذه الدورة غير معروضة للشراء." };
  if (!course.providers.includes("moyasar")) {
    return { ok: false, error: "الدفع الإلكتروني لهذه الدورة غير متاح حاليًا." };
  }
  if (userId && (await activeEnrollment(userId, course.id))) {
    return { ok: false, error: "أنت مسجّل في هذه الدورة بالفعل." };
  }

  const requirement = await sessionRequirement(course.id);
  let session: SessionOption | null = null;
  if (requirement.hasSessions) {
    if (!sessionId) return { ok: false, error: "اختر موعد الدورة أولًا." };
    session = requirement.all.find((item) => item.id === sessionId) ?? null;
    if (!session) return { ok: false, error: "الموعد المختار غير موجود." };
    if (!session.selectable) {
      return { ok: false, error: "هذا الموعد مكتمل أو لم يعد متاحًا. اختر موعدًا آخر." };
    }
  } else if (sessionId) {
    return { ok: false, error: "هذه الدورة لا تحتاج اختيار موعد." };
  }

  let quote: CartQuote;
  try {
    const { settings } = await loadCommerce();
    quote = quoteCoursePrice(toHalalas(course.price), settings);
  } catch {
    return { ok: false, error: "الدفع غير متاح حاليًا. تواصل معنا لإتمام التسجيل." };
  }
  if (quote.gross < MIN_CHARGE_HALALAS) {
    return { ok: false, error: "قيمة الدورة أقل من الحد الأدنى للدفع الإلكتروني." };
  }

  const subtitle = session
    ? limit(
        [sessionLabel(session), sessionTime(session.startTime, session.endTime), sessionPlace(session)]
          .filter((part) => part.trim() !== "")
          .join(" · "),
        300,
      )
    : "دورة أونلاين — وصول فوري بعد الدفع";

  return {
    ok: true,
    item: {
      kind: "course",
      course,
      session,
      quote,
      title: course.name,
      subtitle,
      href: `/courses/${course.slug}`,
    },
  };
}

/** مساحة منشورة + موعد داخل نطاق معلن + سعرها المعتمد. */
export async function priceSpaceSelection(
  spaceId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
): Promise<Priced<PricedSpace>> {
  if (!isDateIso(bookingDate)) return { ok: false, error: "تاريخ الحجز غير صالح." };
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return { ok: false, error: "وقت الحجز غير صالح." };
  }

  const today = todayIso();
  if (bookingDate < today) return { ok: false, error: "لا يمكن الحجز في تاريخ ماضٍ." };
  if (bookingDate > addDays(today, MAX_BOOKING_DAYS_AHEAD)) {
    return { ok: false, error: `يمكن الحجز حتى ${MAX_BOOKING_DAYS_AHEAD} يومًا أمامًا.` };
  }

  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  const duration = durationMinutes(startTime, endTime);
  if (
    startMinutes === null ||
    endMinutes === null ||
    duration === null ||
    duration < MIN_BOOKING_MINUTES ||
    startMinutes % SLOT_STEP_MINUTES !== 0 ||
    endMinutes % SLOT_STEP_MINUTES !== 0
  ) {
    return { ok: false, error: `اختر مدة لا تقل عن ${MIN_BOOKING_MINUTES} دقيقة بفواصل ${SLOT_STEP_MINUTES} دقيقة.` };
  }

  const { data: space } = await getServiceSupabase()
    .from("studio_spaces")
    .select("id, slug, name, price_per_hour_halalas, publish_status")
    .eq("id", spaceId)
    .maybeSingle();
  if (!space || space.publish_status !== "published") {
    return { ok: false, error: "المساحة غير موجودة أو غير متاحة للحجز حاليًا." };
  }

  const plan = await loadSpaceDayPlan(space.id, bookingDate);
  if (!plan || plan.closed || !fitsInsideAny(plan.free, { start: startTime, end: endTime })) {
    return { ok: false, error: "هذا الوقت لم يعد متاحًا. اختر وقتًا آخر." };
  }

  let quote: CartQuote;
  try {
    const { settings } = await loadCommerce();
    quote = quoteCoursePrice(
      Math.round((space.price_per_hour_halalas * duration) / 60),
      settings,
    );
  } catch {
    return { ok: false, error: "الدفع غير متاح حاليًا. تواصل معنا لتأكيد الموعد." };
  }
  if (quote.gross < MIN_CHARGE_HALALAS) {
    return { ok: false, error: "قيمة الحجز أقل من الحد الأدنى للدفع الإلكتروني. اختر مدة أطول." };
  }

  return {
    ok: true,
    item: {
      kind: "space",
      space: {
        id: space.id,
        slug: space.slug,
        name: space.name,
        pricePerHourHalalas: space.price_per_hour_halalas,
      },
      bookingDate,
      startTime,
      endTime,
      durationMinutes: duration,
      quote,
      title: space.name,
      subtitle: limit(
        `${formatDateWithWeekday(bookingDate)} · ${formatTimeArabic(startTime)} — ${formatTimeArabic(endTime)}`,
        300,
      ),
      href: `/spaces/${space.slug}`,
    },
  };
}
