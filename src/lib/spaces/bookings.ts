import "server-only";

/**
 * بيت المصور — حجوزات المساحات ودفعها
 * -------------------------------------
 * الحجز = صف واحد يجمع الموعد والدفع (نمط guest_course_orders بلا حذف
 * عليه): لا يُكتب «مؤكد» إلا بعد تحقق الخادم من ميسر مباشرة، وجسم
 * الإشعار أو رجوع المتصفح لا يكفيان.
 *
 * قواعد لا تُكسر:
 *   1. المتصفح لا يقرر المساحة ولا المبلغ ولا المدة ولا الحالة. يرسل
 *      المساحة واليوم والوقت والبيانات فقط، والمبلغ يُشتق هنا من سعر
 *      القاعدة × المدة.
 *   2. الحجز يُسعّر لحظة الطلب (ساعة × ساعات الحجز)، ويُرفض إن خالف ما
 *      رآه المتصفح — لا دفع بسعر منتهٍ.
 *   3. «مؤكد» تُكتب من التحقق وحده، وكل انتقال شرطي واحد على الحالة
 *      السابقة: التكرار والتزامن بلا أثر ثانٍ.
 *   4. الموعد يُحجز بالمدفوع أو محاولة الدفع الحية؛ المهلة المنتهية
 *      تعيد الوقت إلى المتاح (حارس القاعدة يسدّ نافذة التزامن).
 */

import { siteConfig } from "@/data/site";
import { loadCommerce } from "@/lib/payments/configuration";
import { paymentsMode } from "@/lib/payments/env";
import { MIN_CHARGE_HALALAS, toHalalas } from "@/lib/payments/money";
import { providerConfigured, providerFor, type VerifyOptions } from "@/lib/payments/purchase";
import { PaymentError } from "@/lib/payments/provider";
import { quoteCoursePrice, type Provider } from "@/lib/payments/settings";
import { getServiceSupabase } from "@/lib/supabase/service";

import { expireStaleSpaceBookings, loadSpaceDayPlan, OPEN_PAYMENT_STATES } from "./availability";
import { isSpaceCustomerType, type SpaceCustomerType } from "./customer-types";
import {
  addDays,
  durationMinutes,
  fitsInsideAny,
  isDateIso,
  isValidTime,
  MAX_BOOKING_DAYS_AHEAD,
  MIN_BOOKING_MINUTES,
  normalizeDbTime,
  todayIso,
} from "./schedule";

/** مهلة صفحة الدفع — كمهلة الشراء القائم. */
export const SPACE_BOOKING_TTL_MINUTES = 15;

export const SPACE_SUCCESS_PATH = "/spaces/success";

export { isSpaceCustomerType, SPACE_CUSTOMER_TYPES } from "./customer-types";
export type { SpaceCustomerType } from "./customer-types";

export const SPACE_BOOKING_ERRORS = {
  unavailable: "الحجز بالدفع الإلكتروني غير متاح حاليًا. تواصل معنا لتأكيد الموعد.",
  notFound: "المساحة غير موجودة أو غير متاحة للحجز حاليًا.",
  closed: "المساحة لا تُستأجر في هذا اليوم أو في هذا الوقت. اختر وقتًا آخر.",
  slotTaken: "سبقك أحد إلى هذا الوقت واكتمل حجزه. اختر وقتًا آخر.",
  tooShort: `أقصر حجز هو ${MIN_BOOKING_MINUTES} دقيقة.`,
  invalidDate: "تاريخ الحجز غير صالح.",
  dateRange: "يمكن الحجز حتى " + MAX_BOOKING_DAYS_AHEAD + " يومًا أمامًا.",
  minimumCharge: "قيمة الحجز أقل من الحد الأدنى للدفع الإلكتروني. اختر مدة أطول.",
  priceChanged: "تغيّر سعر المساحة. حدّث الصفحة ثم أعد المحاولة.",
  inProgress: "لديك محاولة دفع جارية لهذه المساحة. أكملها أو انتظر بضع دقائق ثم أعد المحاولة.",
  invalidData: "راجع البيانات المدخلة: الاسم والجوال والبريد ونوع الحجز.",
  failed: "تعذر بدء عملية الدفع. حاول مرة أخرى.",
} as const;

export type SpaceBookingOutcome =
  | "paid"
  | "pending"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded"
  /* تعذّر التحقق من المزود — يعيد معالج الإشعار المحاولة (يُطلب بالخيار). */
  | "unverified"
  | "unknown";

interface BookingRow {
  id: string;
  space_id: string;
  space_name_snapshot: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_type: string;
  customer_name: string;
  company_name: string | null;
  email: string;
  phone: string;
  notes: string | null;
  status: string;
  payment_status: string;
  provider: "moyasar";
  environment: "test" | "production";
  duration_minutes: number;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  tax_rate_bps: number;
  currency: string;
  idempotency_key: string;
  provider_payment_id: string | null;
  provider_checkout_url: string | null;
  checkout_expires_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  admin_note: string | null;
  created_at: string;
}

const BOOKING_COLUMNS =
  "id, space_id, space_name_snapshot, booking_date, start_time, end_time, customer_type, customer_name, company_name, email, phone, notes, status, payment_status, provider, environment, duration_minutes, net_amount, tax_amount, total_amount, tax_rate_bps, currency, idempotency_key, provider_payment_id, provider_checkout_url, checkout_expires_at, paid_at, cancelled_at, admin_note, created_at";

function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}

function stillPayable(
  booking: BookingRow,
  gross: number,
  mode: string,
  slot: { date: string; start: string; end: string },
): boolean {
  return (
    booking.provider === "moyasar" &&
    booking.environment === mode &&
    booking.total_amount === gross &&
    booking.provider_checkout_url !== null &&
    booking.checkout_expires_at !== null &&
    new Date(booking.checkout_expires_at).getTime() > Date.now() &&
    booking.booking_date === slot.date &&
    normalizeDbTime(booking.start_time) === slot.start &&
    normalizeDbTime(booking.end_time) === slot.end
  );
}

/* ─────────────────────────── بدء الحجز ─────────────────────────── */

export interface SpaceBookingInput {
  spaceSlug: string;
  /** YYYY-MM-DD كما اختاره الزائر. */
  date: string;
  /** HH:MM */
  start: string;
  end: string;
  /** ما رآه المتصفح بالريال — حارس تغيّر السعر. */
  displayedTotalSar: number | null;
  customerType: SpaceCustomerType;
  companyName: string | null;
  name: string;
  /** مخزن `9665XXXXXXXX` — المصادقة تسبق النداء. */
  email: string;
  phone: string;
  notes: string | null;
}

/**
 * ينشئ (أو يعيد) محاولة حجز بدفع إلكتروني ويعيد رابط صفحة ميسّر المستضافة.
 * يفحص التوافر أولًا: ساعات العمل ثم الحجوزات القائمة، فلا يُكتب حجز
 * متداخل أبدًا — والحارس في القاعدة يسدّ نافذة التزامن المتبقية.
 */
export async function startSpaceBooking(
  input: SpaceBookingInput,
  fetcher?: typeof fetch,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  /* 1. المساحة منشورة والدفع قادر — وإلا إغلاق. */
  const svc = getServiceSupabase();
  if (!isSpaceCustomerType(input.customerType)) return { ok: false, error: SPACE_BOOKING_ERRORS.invalidData };
  const { data: space } = await svc
    .from("studio_spaces")
    .select("id, name, price_per_hour_halalas, publish_status")
    .eq("slug", input.spaceSlug)
    .maybeSingle();
  if (!space || space.publish_status !== "published") return { ok: false, error: SPACE_BOOKING_ERRORS.notFound };
  if (!providerConfigured("moyasar")) return { ok: false, error: SPACE_BOOKING_ERRORS.unavailable };

  /* 2. اليوم والوقت في حدود معقولة. */
  if (!isDateIso(input.date)) return { ok: false, error: SPACE_BOOKING_ERRORS.invalidDate };
  const today = todayIso();
  if (input.date < today) return { ok: false, error: SPACE_BOOKING_ERRORS.invalidDate };
  if (input.date > addDays(today, MAX_BOOKING_DAYS_AHEAD)) return { ok: false, error: SPACE_BOOKING_ERRORS.dateRange };
  if (!isValidTime(input.start) || !isValidTime(input.end)) return { ok: false, error: SPACE_BOOKING_ERRORS.closed };
  const duration = durationMinutes(input.start, input.end);
  if (duration === null || duration < MIN_BOOKING_MINUTES || duration > 24 * 60) {
    return { ok: false, error: SPACE_BOOKING_ERRORS.tooShort };
  }

  /* 3. التوافر: العمل المعلن لهذا اليوم ناقص الحجوزات القائمة. */
  const plan = await loadSpaceDayPlan(space.id, input.date);
  if (!plan || plan.closed || !fitsInsideAny(plan.free, { start: input.start, end: input.end })) {
    return { ok: false, error: SPACE_BOOKING_ERRORS.closed };
  }

  /* 4. السعر والضريبة من القاعدة والإعداد المعتمد — لا من المتصفح. */
  let quote;
  try {
    const { settings } = await loadCommerce();
    quote = quoteCoursePrice(Math.round((space.price_per_hour_halalas * duration) / 60), settings);
  } catch {
    return { ok: false, error: SPACE_BOOKING_ERRORS.unavailable };
  }
  if (quote.gross < MIN_CHARGE_HALALAS) return { ok: false, error: SPACE_BOOKING_ERRORS.minimumCharge };
  /* حارس العرض: ما رآه المتصفح يطابق إجمالي القاعدة الطازج — وإلا يتغيّر
     السعر بين العرض والدفع فيُغلق ويتحدث العنوان. */
  const expected =
    input.displayedTotalSar !== null && Number.isFinite(input.displayedTotalSar)
      ? Math.round(input.displayedTotalSar * 100)
      : Number.NaN;
  if (!Number.isFinite(expected) || quote.gross !== expected) {
    return { ok: false, error: SPACE_BOOKING_ERRORS.priceChanged };
  }

  const mode = paymentsMode();
  const slot = { date: input.date, start: input.start, end: input.end };

  /* 5. محاولة مفتوحة لنفس البريد في المساحة: نعيد رابطها إن كانت للوقت
        نفسه، ولا نلغي فاتورة ما زالت قابلة للدفع. */
  const { data: openRows } = await svc
    .from("studio_space_bookings")
    .select(BOOKING_COLUMNS)
    .eq("space_id", space.id)
    .eq("email", input.email)
    .is("shopping_order_id", null)
    .eq("status", "pending")
    .in("payment_status", [...OPEN_PAYMENT_STATES])
    .limit(1);
  const existing = ((openRows ?? [])[0] as BookingRow | undefined) ?? null;
  if (existing) {
    if (stillPayable(existing, quote.gross, mode, slot)) {
      await svc
        .from("studio_space_bookings")
        .update({
          customer_name: input.name,
          phone: input.phone,
          company_name: input.companyName,
          customer_type: input.customerType,
          notes: input.notes,
        })
        .eq("id", existing.id)
        .eq("status", "pending");
      return { ok: true, checkoutUrl: existing.provider_checkout_url as string };
    }
    return { ok: false, error: SPACE_BOOKING_ERRORS.inProgress };
  }

  /* 6. صف جديد قبل نداء المزود: المعرّف يُرسل إلى ميسّر مرجعًا. */
  const expiresAt = new Date(Date.now() + SPACE_BOOKING_TTL_MINUTES * 60_000);
  const { data: created, error: insertError } = await svc
    .from("studio_space_bookings")
    .insert({
      space_id: space.id,
      space_name_snapshot: space.name.slice(0, 200),
      booking_date: input.date,
      start_time: input.start,
      end_time: input.end,
      customer_type: input.customerType,
      customer_name: input.name,
      company_name: input.companyName,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      status: "pending",
      payment_status: "created",
      provider: "moyasar",
      environment: mode,
      duration_minutes: duration,
      net_amount: quote.net,
      tax_amount: quote.vat,
      total_amount: quote.gross,
      tax_rate_bps: quote.rateBps,
      currency: quote.currency,
      checkout_expires_at: expiresAt.toISOString(),
    })
    .select("id, idempotency_key")
    .maybeSingle();
  if (insertError || !created) {
    /* حارس التعارض رفض الازدواج، أو ضغطة متزامنة سبقتنا إلى القيد الفريد. */
    if (String(insertError?.message ?? "").includes("space_slot_taken")) {
      return { ok: false, error: SPACE_BOOKING_ERRORS.slotTaken };
    }
    const raced = await svc
      .from("studio_space_bookings")
      .select(BOOKING_COLUMNS)
      .eq("space_id", space.id)
      .eq("email", input.email)
      .is("shopping_order_id", null)
      .eq("status", "pending")
      .in("payment_status", [...OPEN_PAYMENT_STATES])
      .limit(1);
    const other = ((raced.data ?? [])[0] as BookingRow | undefined) ?? null;
    if (other && stillPayable(other, quote.gross, mode, slot)) {
      return { ok: true, checkoutUrl: other.provider_checkout_url as string };
    }
    return { ok: false, error: other ? SPACE_BOOKING_ERRORS.inProgress : SPACE_BOOKING_ERRORS.failed };
  }

  /* 7. فاتورة ميسّر المستضافة — المحوّل القائم نفسه. */
  try {
    const session = await providerFor("moyasar", fetcher).createCheckout({
      paymentId: created.id,
      idempotencyKey: created.idempotency_key,
      amount: quote.gross,
      currency: "SAR",
      description: `${space.name} — ${input.date} ${input.start}-${input.end} — بيت المصور`.slice(0, 250),
      successUrl: absoluteUrl(`${SPACE_SUCCESS_PATH}?b=${created.id}`),
      backUrl: absoluteUrl(`/spaces/${input.spaceSlug}`),
      callbackUrl: absoluteUrl("/api/payments/webhook/moyasar"),
      expiresAt,
      mode,
    });
    const { data: saved, error: updateError } = await svc
      .from("studio_space_bookings")
      .update({
        payment_status: "pending",
        provider_payment_id: session.providerPaymentId,
        provider_checkout_url: session.checkoutUrl,
      })
      .eq("id", created.id)
      .eq("payment_status", "created")
      .select("id");
    if (updateError || (saved ?? []).length !== 1) {
      throw new PaymentError("تعذر حفظ عملية الدفع.", "persist_failed");
    }
    return { ok: true, checkoutUrl: session.checkoutUrl };
  } catch (error) {
    /* الفشل يحرّر الوقت: الحجز يرجع «منتهٍ» لا «محجوز للأبد». */
    await svc
      .from("studio_space_bookings")
      .update({
        payment_status: "failed",
        status: "expired",
        failed_at: new Date().toISOString(),
        failure_code: error instanceof PaymentError ? error.code.slice(0, 64) : "checkout_failed",
      })
      .eq("id", created.id)
      .eq("status", "pending");
    return { ok: false, error: SPACE_BOOKING_ERRORS.failed };
  }
}

/* ─────────────────────────── التحقق الموثوق ─────────────────────────── */

async function markFailed(bookingId: string, code: string): Promise<void> {
  await getServiceSupabase()
    .from("studio_space_bookings")
    .update({
      payment_status: "failed",
      status: "expired",
      failed_at: new Date().toISOString(),
      failure_code: code.slice(0, 64),
    })
    .eq("id", bookingId)
    .eq("status", "pending");
}

async function expireBooking(bookingId: string): Promise<void> {
  await getServiceSupabase()
    .from("studio_space_bookings")
    .update({ payment_status: "expired", status: "expired" })
    .eq("id", bookingId)
    .eq("status", "pending");
}

/**
 * يسأل ميسّر عن الحجز ويحسم حالته. يُنادى من الإشعار ومن صفحة النجاح
 * معًا، وكلاهما يصل إلى النتيجة نفسها. آمن للتكرار والتزامن.
 */
export async function verifySpaceBooking(
  bookingId: string,
  fetcher?: typeof fetch,
  options?: VerifyOptions,
): Promise<SpaceBookingOutcome> {
  const svc = getServiceSupabase();
  const { data } = await svc.from("studio_space_bookings").select(BOOKING_COLUMNS).eq("id", bookingId).maybeSingle();
  if (!data) return "unknown";
  const booking = data as BookingRow;

  /* الحسم بالحالة المخزّنة أولًا — ولا يُخطف سجل مدفوع بإلغاء لاحق. */
  if (booking.payment_status === "refunded") return "refunded";
  if (booking.payment_status === "paid") return "paid";

  if (!booking.provider_payment_id) {
    if (booking.payment_status === "failed") return "failed";
    if (booking.payment_status === "cancelled" || booking.status === "cancelled") return "cancelled";
    if (booking.payment_status === "expired") return "expired";
    if (booking.checkout_expires_at && new Date(booking.checkout_expires_at).getTime() < Date.now()) {
      await expireBooking(booking.id);
      return "expired";
    }
    return "pending";
  }

  /* صف اختبار لا يؤكَّد بمفتاح إنتاج، والعكس. */
  if (booking.environment !== paymentsMode()) {
    await markFailed(booking.id, "environment_mismatch");
    return "failed";
  }

  let state;
  try {
    state = await providerFor(booking.provider, fetcher).fetchState(booking.provider_payment_id);
  } catch {
    /* تعذر السؤال ≠ فشل الدفع. ومعالج الإشعار يميّزه بـ`unverified` ليعيد
       المحاولة بلا تعليم الحدث مكتملًا. */
    if (options?.reportUnverified) return "unverified";
    return "pending";
  }

  if (state.providerPaymentId !== booking.provider_payment_id) {
    await markFailed(booking.id, "reference_mismatch");
    return "failed";
  }

  if (state.status === "paid") {
    if (state.amount !== booking.total_amount) {
      await markFailed(booking.id, "amount_mismatch");
      return "failed";
    }
    if (state.currency !== booking.currency) {
      await markFailed(booking.id, "currency_mismatch");
      return "failed";
    }
    if (state.metadataPaymentId !== booking.id) {
      await markFailed(booking.id, "metadata_mismatch");
      return "failed";
    }
    if (state.metadataEnvironment !== booking.environment) {
      await markFailed(booking.id, "environment_mismatch");
      return "failed";
    }
    if (state.refunded > 0) {
      await svc
        .from("studio_space_bookings")
        .update({
          payment_status: "refunded",
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          refunded_at: new Date().toISOString(),
          refunded_amount: state.refunded,
        })
        .eq("id", booking.id)
        .neq("payment_status", "refunded");
      return "refunded";
    }
    return markPaid(booking);
  }

  if (state.status === "authorized") {
    await svc
      .from("studio_space_bookings")
      .update({ payment_status: "authorized" })
      .eq("id", booking.id)
      .eq("status", "pending")
      .in("payment_status", [...OPEN_PAYMENT_STATES]);
    return "pending";
  }

  if (state.status === "failed" || state.status === "cancelled" || state.status === "expired") {
    await svc
      .from("studio_space_bookings")
      .update({
        payment_status: state.status,
        status: "expired",
        ...(state.status === "failed"
          ? { failed_at: new Date().toISOString(), failure_code: "provider_failed" }
          : {}),
      })
      .eq("id", booking.id)
      .eq("status", "pending");
    return state.status;
  }

  return "pending";
}

/**
 * المال وصل وطابق: يُسجّل «مؤكد» بشروط — الحجز ما زال pending. ولو سبقته
 * دفعة متأخرة إلى موعد حجزه حجز آخر (نافذة مهلة انتهت) فلا يُنتزع الموعد:
 * يُسجّل الدفع مع إبقاء الإلغاء وملاحظة تدعو للمراجعة والاسترداد.
 */
async function markPaid(booking: BookingRow): Promise<SpaceBookingOutcome> {
  const svc = getServiceSupabase();
  const paidAt = new Date().toISOString();
  const { data: confirmed } = await svc
    .from("studio_space_bookings")
    .update({ payment_status: "paid", status: "confirmed", paid_at: paidAt })
    .eq("id", booking.id)
    .eq("status", "pending")
    .select("id");
  if ((confirmed ?? []).length === 1) return "paid";

  await svc
    .from("studio_space_bookings")
    .update({
      payment_status: "paid",
      status: "cancelled",
      paid_at: paidAt,
      cancelled_at: paidAt,
      admin_note: "دفعة مؤكدة بعد تعذّر تأكيد الموعد — تحتاج مراجعة واسترداد.",
    })
    .eq("id", booking.id)
    .in("payment_status", [...OPEN_PAYMENT_STATES, "failed", "expired"]);
  return "paid";
}

/** معرّف الحجز بمرجع المزود — لفرع الإشعار في المسار الموحّد. */
export async function spaceBookingIdByProviderReference(
  provider: string,
  providerPaymentId: string,
): Promise<string | null> {
  const { data } = await getServiceSupabase()
    .from("studio_space_bookings")
    .select("id")
    .eq("provider", provider as Provider)
    .eq("provider_payment_id", providerPaymentId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/* ─────────────────────── الإيصال وقوائم الإدارة ─────────────────────── */

export interface SpaceBookingReceipt {
  outcome: SpaceBookingOutcome;
  bookingId: string;
  spaceName: string;
  date: string;
  start: string;
  end: string;
  durationMinutes: number;
  /** بالهللات كما حُصِّل. */
  totalAmount: number;
  status: string;
  paymentStatus: string;
  customerName: string;
  email: string;
  paidAt: string | null;
  /** لاستئناف الدفع إن كانت المحاولة ما زالت حيّة. */
  checkoutUrl: string | null;
  expiresAt: string | null;
}

/** يحقن ويقرأ الإيصال — صفحة النجاح تمرّ هنا دائمًا. */
export async function loadSpaceBookingReceipt(
  bookingId: string,
  fetcher?: typeof fetch,
): Promise<SpaceBookingReceipt | null> {
  const outcome = await verifySpaceBooking(bookingId, fetcher);
  const { data } = await getServiceSupabase()
    .from("studio_space_bookings")
    .select(BOOKING_COLUMNS)
    .eq("id", bookingId)
    .maybeSingle();
  if (!data) return null;
  const booking = data as BookingRow;
  return {
    outcome,
    bookingId: booking.id,
    spaceName: booking.space_name_snapshot,
    date: booking.booking_date,
    start: normalizeDbTime(booking.start_time),
    end: normalizeDbTime(booking.end_time),
    durationMinutes: booking.duration_minutes,
    totalAmount: booking.total_amount,
    status: booking.status,
    paymentStatus: booking.payment_status,
    customerName: booking.customer_name,
    email: booking.email,
    paidAt: booking.paid_at,
    checkoutUrl: booking.payment_status === "pending" ? booking.provider_checkout_url : null,
    expiresAt: booking.checkout_expires_at,
  };
}

export interface SpaceBookingFilter {
  spaceId?: string;
  status?: string;
  /** يوم محدد YYYY-MM-DD */
  date?: string;
  /** نطاق أيام: من / إلى (شاملًا). */
  from?: string;
  to?: string;
  /** اسم أو بريد أو جوال — تصفية داخل النافذة المجلوبة. */
  search?: string;
  limit?: number;
}

export type SpaceBookingListItem = BookingRow;

/** قائمة الحجوزات للوحة الإدارة — تُقرأ حسب اليوم والوقت والمساحة والحالة. */
export async function listSpaceBookings(filter: SpaceBookingFilter = {}): Promise<SpaceBookingListItem[]> {
  await expireStaleSpaceBookings();

  let query = getServiceSupabase()
    .from("studio_space_bookings")
    .select(BOOKING_COLUMNS)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(Math.min(filter.limit ?? 400, 1000));

  if (filter.spaceId) query = query.eq("space_id", filter.spaceId);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.date) query = query.eq("booking_date", filter.date);
  if (filter.from) query = query.gte("booking_date", filter.from);
  if (filter.to) query = query.lte("booking_date", filter.to);

  const { data } = await query;
  const rows = (data ?? []) as SpaceBookingListItem[];
  const needle = (filter.search ?? "").trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    (row) =>
      row.customer_name.toLowerCase().includes(needle) ||
      row.email.toLowerCase().includes(needle) ||
      row.phone.includes(needle) ||
      (row.company_name ?? "").toLowerCase().includes(needle),
  );
}

export type SpaceAdminAction = { ok: true } | { ok: false; error: string };

/** إلغاء حجز: يحرّر الموعد فورًا (الحارس يعدّ غير الحاجز). الاسترداد يدوي. */
export async function cancelSpaceBooking(
  bookingId: string,
  actorId: string,
  note: string | null,
): Promise<SpaceAdminAction> {
  const svc = getServiceSupabase();
  const { data } = await svc
    .from("studio_space_bookings")
    .select("id, payment_status, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!data || (data.status !== "pending" && data.status !== "confirmed")) {
    return { ok: false, error: "الحجز غير موجود أو لم يعد قابلًا للإلغاء." };
  }
  const paid = data.payment_status === "paid";
  const { error } = await svc
    .from("studio_space_bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: actorId,
      admin_note: note,
      ...(paid ? {} : { payment_status: "cancelled" }),
    })
    .eq("id", bookingId)
    .in("status", ["pending", "confirmed"]);
  if (error) return { ok: false, error: "تعذر إلغاء الحجز. أعد المحاولة." };
  return { ok: true };
}

/** إنهاء حجز مؤكد بعد انتهاء الموعد. */
export async function completeSpaceBooking(bookingId: string): Promise<SpaceAdminAction> {
  const { error } = await getServiceSupabase()
    .from("studio_space_bookings")
    .update({ status: "completed" })
    .eq("id", bookingId)
    .eq("status", "confirmed");
  if (error) return { ok: false, error: "تعذر تحديث الحجز. أعد المحاولة." };
  return { ok: true };
}
