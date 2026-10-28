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
import { loadActiveEquipmentAgreement } from "@/lib/rentals/agreements";
import { loadEquipmentAvailability } from "@/lib/rentals/availability";
import { EQUIPMENT_DELIVERY_FEE_HALALAS, validateRentalDates } from "@/lib/rentals/dates";
import { identityCoversRental, isValidSaudiNationalId, signatureHash } from "@/lib/rentals/identity";
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

export interface PricedEquipment {
  kind: "equipment";
  item: {
    id: string;
    slug: string;
    name: string;
    pricePerDayHalalas: number;
    replacementValueHalalas: number;
    requiresSecurityNote: boolean;
    quantity: number;
  };
  startDate: string;
  endDate: string;
  days: number;
  quantity: number;
  method: "pickup" | "delivery";
  deliveryAddress: string | null;
  deliveryFeeHalalas: number;
  nationalId: string;
  nationalIdExpiry: string;
  agreementAccepted: boolean;
  agreementVersion: number;
  signatureName: string;
  signatureDataUrl: string;
  signatureHash: string;
  quote: CartQuote;
  title: string;
  subtitle: string;
  href: string;
}

export type PricedCartItem = PricedCourse | PricedSpace | PricedEquipment;

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

export interface PriceEquipmentSelectionInput {
  equipmentId: string;
  startDate: string;
  endDate: string;
  quantity: number;
  method: "pickup" | "delivery";
  deliveryAddress?: string | null;
  nationalId: string;
  nationalIdExpiry: string;
  agreementAccepted: boolean;
  signatureName: string;
  signatureDataUrl?: string | null;
  customerName?: string | null;
}

/** معدة منشورة + فترة + كمية وتوقيع معتمد + تسعيرها. */
export async function priceEquipmentSelection(
  input: PriceEquipmentSelectionInput,
): Promise<Priced<PricedEquipment>> {
  const dates = validateRentalDates(input.startDate, input.endDate);
  if (!dates.ok) {
    return { ok: false, error: dates.error ?? "راجع تاريخ البداية والنهاية." };
  }

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { ok: false, error: "الكمية المطلوبة غير صالحة." };
  }

  if (input.method !== "pickup" && input.method !== "delivery") {
    return { ok: false, error: "اختر طريقة استلام صالحة." };
  }
  const deliveryAddress = input.method === "delivery" ? (input.deliveryAddress ?? "").trim() : null;
  if (input.method === "delivery" && (!deliveryAddress || deliveryAddress.length < 5)) {
    return { ok: false, error: "أدخل عنوان التوصيل (خمسة أحرف على الأقل)." };
  }

  const nationalId = String(input.nationalId ?? "").replace(/[\s-]/g, "");
  if (!isValidSaudiNationalId(nationalId)) {
    return { ok: false, error: "رقم الهوية غير صالح — أدخل هوية وطنية أو إقامة سعودية صحيحة." };
  }

  const expiry = String(input.nationalIdExpiry ?? "").trim();
  if (!identityCoversRental(expiry, input.endDate)) {
    return { ok: false, error: "تاريخ انتهاء الهوية يجب أن يغطي آخر يوم من مدة الإيجار." };
  }

  if (!input.agreementAccepted) {
    return { ok: false, error: "يجب قراءة عقد الإيجار والموافقة عليه قبل الإضافة للسلة أو الدفع." };
  }

  const cleanSig = String(input.signatureName ?? "").replace(/\s+/g, " ").trim();
  if (cleanSig.length < 2) {
    return { ok: false, error: "اكتب اسمك الكامل في خانة التوقيع." };
  }
  if (input.customerName) {
    const cleanCust = String(input.customerName).replace(/\s+/g, " ").trim();
    if (cleanCust && cleanSig !== cleanCust) {
      return { ok: false, error: "الاسم في التوقيع يجب أن يطابق اسم المستأجر." };
    }
  }

  const sigDataUrl = String(input.signatureDataUrl ?? "").trim();
  if (!sigDataUrl || !sigDataUrl.startsWith("data:image/")) {
    return { ok: false, error: "يرجى رسم التوقيع بالماوس أو الإصبع في خانة التوقيع." };
  }

  const { data: itemData } = await getServiceSupabase()
    .from("equipment_items")
    .select("id, name, slug, quantity, price_per_day_halalas, replacement_value_halalas, requires_security_note, published, status")
    .eq("id", input.equipmentId)
    .maybeSingle();

  if (!itemData || !itemData.published) {
    return { ok: false, error: "المعدة غير موجودة أو غير متاحة للإيجار حاليًا." };
  }
  if (input.quantity > itemData.quantity) {
    return { ok: false, error: "الكمية المطلوبة غير صالحة." };
  }

  const agreement = await loadActiveEquipmentAgreement();
  if (!agreement) {
    return { ok: false, error: "عقد الإيجار غير متاح حاليًا. تواصل معنا." };
  }

  const availability = await loadEquipmentAvailability(itemData.id, input.startDate, input.endDate);
  if (!availability || availability.remaining < input.quantity) {
    return { ok: false, error: "الكمية المتاحة من هذه المعدة لا تكفي في هذه الفترة. اختر فترة أو كمية أخرى." };
  }

  const acceptedAt = new Date().toISOString();
  const hash = signatureHash({
    agreementVersion: agreement.version,
    itemId: itemData.id,
    nationalId,
    signatureName: cleanSig,
    startDate: input.startDate,
    endDate: input.endDate,
    quantity: input.quantity,
    acceptedAt,
  });

  const deliveryFee = input.method === "delivery" ? EQUIPMENT_DELIVERY_FEE_HALALAS : 0;
  const rentalAmount = itemData.price_per_day_halalas * dates.days * input.quantity;
  const gross = rentalAmount + deliveryFee;

  let quote: CartQuote;
  try {
    const { settings } = await loadCommerce();
    quote = quoteCoursePrice(gross, settings);
  } catch {
    return { ok: false, error: "الدفع غير متاح حاليًا. تواصل معنا لتأكيد الإيجار." };
  }
  if (quote.gross < MIN_CHARGE_HALALAS) {
    return { ok: false, error: "قيمة الإيجار أقل من الحد الأدنى للدفع الإلكتروني." };
  }

  const subtitle = limit(
    `من ${input.startDate} إلى ${input.endDate} (${dates.days} ${dates.days === 1 ? "يوم" : "أيام"}) · الكمية: ${input.quantity} · ${input.method === "delivery" ? "توصيل" : "استلام من المركز"}`,
    300,
  );

  return {
    ok: true,
    item: {
      kind: "equipment",
      item: {
        id: itemData.id,
        slug: itemData.slug,
        name: itemData.name,
        pricePerDayHalalas: itemData.price_per_day_halalas,
        replacementValueHalalas: itemData.replacement_value_halalas,
        requiresSecurityNote: itemData.requires_security_note,
        quantity: itemData.quantity,
      },
      startDate: input.startDate,
      endDate: input.endDate,
      days: dates.days,
      quantity: input.quantity,
      method: input.method,
      deliveryAddress,
      deliveryFeeHalalas: deliveryFee,
      nationalId,
      nationalIdExpiry: expiry,
      agreementAccepted: true,
      agreementVersion: agreement.version,
      signatureName: cleanSig,
      signatureDataUrl: sigDataUrl,
      signatureHash: hash,
      quote,
      title: itemData.name,
      subtitle,
      href: `/rentals/${itemData.slug}`,
    },
  };
}
