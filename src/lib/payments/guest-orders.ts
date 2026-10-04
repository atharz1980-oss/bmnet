import "server-only";

/**
 * Fast Guest Checkout — شراء الورشة بلا حساب.
 *
 * بنية موازية لـ`course_payments` لا تعديل عليها: جدول `guest_course_orders`
 * وحده، ومحوّل ميسّر نفسه (`providerFor`)، وحساب السعر نفسه
 * (`quoteCoursePrice`)، وحارس صفحة الهبوط نفسه (`resolveLandingCheckout`).
 *
 * قواعد لا تُكسر:
 *   1. المتصفح لا يقرر الدورة ولا المبلغ ولا المزود ولا الحالة. يرسل الاسم
 *      والجوال والبريد ومعاملات الحملة فقط.
 *   2. «مدفوع» لا يُكتب إلا بعد سؤال ميسّر مباشرة ومطابقة المرجع والمبلغ
 *      والعملة والمعرّف والبيئة. العودة من المتصفح وجسم الإشعار لا يكفيان.
 *   3. كل انتقال حالة تحديث شرطي واحد على الحالة السابقة: التكرار والتزامن
 *      بلا أثر ثانٍ.
 *   4. الطلب المدفوع حجز مؤكد. لا حساب ولا تسجيل في دورة في V1.
 */

import { getServiceSupabase } from "@/lib/supabase/service";
import { siteConfig } from "@/data/site";
import { landingCheckoutTarget } from "@/data/landing/mobile-content";
import { LANDING_PATH } from "@/components/landing/mobile-content/anchors";
import { resolveLandingCheckout } from "@/lib/landing/checkout-target";
import type { GuestContact } from "@/lib/landing/guest-validation";

import { loadCommerce } from "./configuration";
import { paymentsMode } from "./env";
import { toHalalas } from "./money";
import { PaymentError } from "./provider";
import { loadCourseCommerce, providerConfigured, providerFor } from "./purchase";
import { quoteCoursePrice } from "./settings";

/** مهلة صفحة الدفع — كمهلة الشراء القائم. */
export const GUEST_CHECKOUT_TTL_MINUTES = 15;

export const GUEST_SUCCESS_PATH = `${LANDING_PATH}/success`;

/** الحالات المفتوحة: محاولة لم تُحسم بعد. */
const OPEN = ["created", "pending", "authorized"] as const;

export type Campaign = Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term", string>>;

export const GUEST_ERRORS = {
  unavailable: "الدفع الإلكتروني لهذه الورشة غير متاح حاليًا.",
  alreadyPaid: "يوجد حجز مؤكد بهذا البريد أو الجوال. تواصل معنا إن احتجت مساعدة.",
  inProgress: "لديك محاولة دفع جارية. أكملها أو انتظر بضع دقائق ثم أعد المحاولة.",
  failed: "تعذر بدء عملية الدفع. حاول مرة أخرى.",
} as const;

export type GuestOutcome = "paid" | "pending" | "failed" | "expired" | "cancelled" | "refunded" | "unknown";

interface OrderRow {
  id: string;
  course_id: string;
  provider: "moyasar" | "tabby" | "tamara";
  environment: "test" | "production";
  status: string;
  email: string;
  phone: string;
  total_amount: number;
  currency: string;
  idempotency_key: string;
  provider_payment_id: string | null;
  provider_checkout_url: string | null;
  checkout_expires_at: string | null;
}

const ORDER_COLUMNS =
  "id, course_id, provider, environment, status, email, phone, total_amount, currency, idempotency_key, provider_payment_id, provider_checkout_url, checkout_expires_at";

function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}

function campaignColumns(campaign: Campaign) {
  return {
    utm_source: campaign.utm_source ?? null,
    utm_medium: campaign.utm_medium ?? null,
    utm_campaign: campaign.utm_campaign ?? null,
    utm_content: campaign.utm_content ?? null,
    utm_term: campaign.utm_term ?? null,
  };
}

function stillPayable(order: OrderRow, gross: number, mode: string): boolean {
  return (
    order.provider === "moyasar" &&
    order.environment === mode &&
    order.total_amount === gross &&
    order.provider_checkout_url !== null &&
    order.checkout_expires_at !== null &&
    new Date(order.checkout_expires_at).getTime() > Date.now()
  );
}

/* ─────────────────────────── بدء الدفع ─────────────────────────── */

/**
 * ينشئ (أو يعيد) محاولة دفع لضيف ويعيد رابط صفحة ميسّر المستضافة.
 * المبلغ يُحسب هنا من سعر القاعدة — لا يصل من المتصفح.
 */
export async function startGuestCheckout(
  contact: GuestContact,
  campaign: Campaign,
  fetcher?: typeof fetch,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  /* 1. الدورة صالحة للبيع بالسعر المعلن — وإلا إغلاق. */
  const decision = await resolveLandingCheckout(landingCheckoutTarget);
  if (decision.status !== "ready") return { ok: false, error: GUEST_ERRORS.unavailable };
  const course = await loadCourseCommerce(decision.courseId);
  if (!course || course.mode !== "paid" || !course.providers.includes("moyasar")) {
    return { ok: false, error: GUEST_ERRORS.unavailable };
  }
  if (!providerConfigured("moyasar")) return { ok: false, error: GUEST_ERRORS.unavailable };

  /* 2. السعر والضريبة من القاعدة والإعداد المعتمد. */
  let quote;
  try {
    const { settings } = await loadCommerce();
    quote = quoteCoursePrice(toHalalas(course.price), settings);
  } catch {
    return { ok: false, error: GUEST_ERRORS.unavailable };
  }
  if (quote.gross !== toHalalas(landingCheckoutTarget.expectedPriceSar)) {
    return { ok: false, error: GUEST_ERRORS.unavailable };
  }

  const svc = getServiceSupabase();
  const mode = paymentsMode();

  /* 3. حجز مؤكد سابق بنفس البريد أو الجوال: لا شراء ثانٍ بالخطأ. */
  for (const [column, value] of [
    ["email", contact.email],
    ["phone", contact.phone],
  ] as const) {
    const { data: paid } = await svc
      .from("guest_course_orders")
      .select("id")
      .eq("course_id", course.id)
      .eq("status", "paid")
      .eq(column, value)
      .limit(1);
    if ((paid ?? []).length > 0) return { ok: false, error: GUEST_ERRORS.alreadyPaid };
  }

  /* 4. محاولة مفتوحة لنفس البريد: نعيد رابطها، ولا نلغي فاتورة ما زالت قابلة للدفع. */
  const existing = await openOrder(course.id, contact.email);
  if (existing) {
    if (stillPayable(existing, quote.gross, mode)) {
      await svc
        .from("guest_course_orders")
        .update({ customer_name: contact.name, phone: contact.phone, ...campaignColumns(campaign) })
        .eq("id", existing.id)
        .in("status", [...OPEN]);
      return { ok: true, checkoutUrl: existing.provider_checkout_url as string };
    }
    const expired =
      existing.checkout_expires_at !== null && new Date(existing.checkout_expires_at).getTime() <= Date.now();
    if (!expired) return { ok: false, error: GUEST_ERRORS.inProgress };
    /* انتهت مهلتها عند المزود أيضًا: تُغلق ثم تُنشأ محاولة جديدة. */
    await svc
      .from("guest_course_orders")
      .update({ status: "expired" })
      .eq("id", existing.id)
      .in("status", [...OPEN]);
  }

  /* 5. صف جديد قبل نداء المزود: المعرّف يُرسل إلى ميسّر مرجعًا. */
  const expiresAt = new Date(Date.now() + GUEST_CHECKOUT_TTL_MINUTES * 60_000);
  const { data: created, error: insertError } = await svc
    .from("guest_course_orders")
    .insert({
      course_id: course.id,
      provider: "moyasar",
      environment: mode,
      status: "created",
      customer_name: contact.name,
      email: contact.email,
      phone: contact.phone,
      course_title_snapshot: course.name.slice(0, 200),
      net_amount: quote.net,
      tax_amount: quote.vat,
      total_amount: quote.gross,
      tax_rate_bps: quote.rateBps,
      currency: quote.currency,
      checkout_expires_at: expiresAt.toISOString(),
      ...campaignColumns(campaign),
    })
    .select("id, idempotency_key")
    .maybeSingle();
  if (insertError || !created) {
    /* 23505 = ضغطة متزامنة سبقتنا إلى القيد الفريد: نعيد رابطها إن جهز. */
    const raced = await openOrder(course.id, contact.email);
    if (raced && stillPayable(raced, quote.gross, mode)) {
      return { ok: true, checkoutUrl: raced.provider_checkout_url as string };
    }
    return { ok: false, error: raced ? GUEST_ERRORS.inProgress : GUEST_ERRORS.failed };
  }

  /* 6. فاتورة ميسّر المستضافة — المحوّل القائم نفسه. */
  try {
    const session = await providerFor("moyasar", fetcher).createCheckout({
      paymentId: created.id,
      idempotencyKey: created.idempotency_key,
      amount: quote.gross,
      currency: "SAR",
      description: `${course.name} — بيت المصور`.slice(0, 250),
      successUrl: absoluteUrl(`${GUEST_SUCCESS_PATH}?o=${created.id}`),
      backUrl: absoluteUrl(`${LANDING_PATH}#booking`),
      callbackUrl: absoluteUrl("/api/payments/webhook/moyasar"),
      expiresAt,
      mode,
    });
    const { data: saved, error: updateError } = await svc
      .from("guest_course_orders")
      .update({
        status: "pending",
        provider_payment_id: session.providerPaymentId,
        provider_checkout_url: session.checkoutUrl,
      })
      .eq("id", created.id)
      .eq("status", "created")
      .select("id");
    if (updateError || (saved ?? []).length !== 1) {
      throw new PaymentError("تعذر حفظ عملية الدفع.", "persist_failed");
    }
    return { ok: true, checkoutUrl: session.checkoutUrl };
  } catch (error) {
    await svc
      .from("guest_course_orders")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        failure_code: error instanceof PaymentError ? error.code.slice(0, 64) : "checkout_failed",
      })
      .eq("id", created.id)
      .in("status", ["created", "pending"]);
    return { ok: false, error: GUEST_ERRORS.failed };
  }
}

async function openOrder(courseId: string, email: string): Promise<OrderRow | null> {
  const { data } = await getServiceSupabase()
    .from("guest_course_orders")
    .select(ORDER_COLUMNS)
    .eq("course_id", courseId)
    .eq("email", email)
    .in("status", [...OPEN])
    .limit(1);
  return ((data ?? [])[0] as OrderRow | undefined) ?? null;
}

/* ─────────────────────────── التحقق الموثوق ─────────────────────────── */

async function markFailed(orderId: string, code: string): Promise<void> {
  await getServiceSupabase()
    .from("guest_course_orders")
    .update({ status: "failed", failed_at: new Date().toISOString(), failure_code: code.slice(0, 64) })
    .eq("id", orderId)
    .in("status", [...OPEN]);
}

/**
 * يسأل ميسّر عن الطلب ويحسم حالته. يُنادى من الإشعار ومن صفحة النجاح معًا،
 * وكلاهما يصل إلى النتيجة نفسها. آمن للتكرار والتزامن.
 */
export async function verifyGuestOrder(orderId: string, fetcher?: typeof fetch): Promise<GuestOutcome> {
  const svc = getServiceSupabase();
  const { data } = await svc.from("guest_course_orders").select(ORDER_COLUMNS).eq("id", orderId).maybeSingle();
  if (!data) return "unknown";
  const order = data as OrderRow;

  if (order.status === "paid") return "paid";
  if (order.status === "refunded") return "refunded";

  if (!order.provider_payment_id) {
    if (order.status === "failed" || order.status === "cancelled" || order.status === "expired") {
      return order.status;
    }
    if (order.checkout_expires_at && new Date(order.checkout_expires_at).getTime() < Date.now()) {
      await svc.from("guest_course_orders").update({ status: "expired" }).eq("id", order.id).eq("status", "created");
      return "expired";
    }
    return "pending";
  }

  /* صف اختبار لا يؤكَّد بمفتاح إنتاج، والعكس. */
  if (order.environment !== paymentsMode()) {
    await markFailed(order.id, "environment_mismatch");
    return "failed";
  }

  let state;
  try {
    state = await providerFor(order.provider, fetcher).fetchState(order.provider_payment_id);
  } catch {
    /* تعذر السؤال ≠ فشل الدفع. */
    return OPEN.includes(order.status as (typeof OPEN)[number]) ? "pending" : (order.status as GuestOutcome);
  }

  if (state.providerPaymentId !== order.provider_payment_id) {
    await markFailed(order.id, "reference_mismatch");
    return "failed";
  }

  if (state.status === "paid") {
    if (state.amount !== order.total_amount) {
      await markFailed(order.id, "amount_mismatch");
      return "failed";
    }
    if (state.currency !== order.currency) {
      await markFailed(order.id, "currency_mismatch");
      return "failed";
    }
    if (state.metadataPaymentId !== order.id) {
      await markFailed(order.id, "metadata_mismatch");
      return "failed";
    }
    if (state.metadataEnvironment !== order.environment) {
      await markFailed(order.id, "environment_mismatch");
      return "failed";
    }
    if (state.refunded > 0) {
      await svc
        .from("guest_course_orders")
        .update({ status: "refunded", refunded_at: new Date().toISOString(), refunded_amount: state.refunded })
        .eq("id", order.id)
        .neq("status", "paid");
      return "refunded";
    }
    return markPaid(order);
  }

  if (state.status === "authorized") {
    await svc
      .from("guest_course_orders")
      .update({ status: "authorized" })
      .eq("id", order.id)
      .in("status", ["created", "pending"]);
    return "pending";
  }

  if (state.status === "failed" || state.status === "cancelled" || state.status === "expired") {
    await svc
      .from("guest_course_orders")
      .update({
        status: state.status,
        ...(state.status === "failed"
          ? { failed_at: new Date().toISOString(), failure_code: "provider_failed" }
          : {}),
      })
      .eq("id", order.id)
      .in("status", [...OPEN]);
    return state.status;
  }

  if (state.status === "refunded") {
    await svc
      .from("guest_course_orders")
      .update({ status: "refunded", refunded_at: new Date().toISOString(), refunded_amount: state.refunded })
      .eq("id", order.id)
      .in("status", [...OPEN]);
    return "refunded";
  }

  return "pending";
}

/**
 * المال وصل وطابق: يُسجَّل «مدفوع» حتى لو أُغلقت المحاولة محليًا قبله
 * (دفع متأخر)، ويُعلَّم الحجز المكرر لنفس البريد/الجوال للمراجعة والاسترداد.
 */
async function markPaid(order: OrderRow): Promise<GuestOutcome> {
  const svc = getServiceSupabase();
  let duplicateOf: string | null = null;
  for (const [column, value] of [
    ["email", order.email],
    ["phone", order.phone],
  ] as const) {
    if (duplicateOf) break;
    const { data: earlier } = await svc
      .from("guest_course_orders")
      .select("id")
      .eq("course_id", order.course_id)
      .eq("status", "paid")
      .eq(column, value)
      .neq("id", order.id)
      .limit(1);
    duplicateOf = (earlier ?? [])[0]?.id ?? null;
  }
  const late = !OPEN.includes(order.status as (typeof OPEN)[number]);

  const { data: updated } = await svc
    .from("guest_course_orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      duplicate_of: duplicateOf,
      ...(late ? { failure_code: "late_payment" } : {}),
    })
    .eq("id", order.id)
    .eq("provider_payment_id", order.provider_payment_id as string)
    .in("status", ["created", "pending", "authorized", "expired", "cancelled", "failed"])
    .select("id");
  if ((updated ?? []).length === 1) return "paid";

  /* لم يتغير صف: نداء متزامن سبقنا — نقرأ الحقيقة. */
  const { data: now } = await svc.from("guest_course_orders").select("status").eq("id", order.id).maybeSingle();
  return now?.status === "paid" ? "paid" : "unknown";
}

/* ─────────────────────────── للإشعار ولصفحة النجاح ─────────────────────────── */

/** طلب الضيف المطابق لمرجع المزود — للإشعار حين لا يطابق شراءً قائمًا. */
export async function guestOrderIdByProviderReference(
  provider: "moyasar" | "tabby" | "tamara",
  providerPaymentId: string,
): Promise<string | null> {
  const { data } = await getServiceSupabase()
    .from("guest_course_orders")
    .select("id")
    .eq("provider", provider)
    .eq("provider_payment_id", providerPaymentId)
    .maybeSingle();
  return data?.id ?? null;
}

export interface GuestReceipt {
  outcome: GuestOutcome;
  courseTitle: string;
  totalAmount: number;
  email: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** حالة الطلب لصفحة النجاح — بعد التحقق من المزود إن لم تُحسم بعد. */
export async function loadGuestReceipt(orderId: string, fetcher?: typeof fetch): Promise<GuestReceipt | null> {
  if (!UUID.test(orderId)) return null;
  const outcome = await verifyGuestOrder(orderId, fetcher);
  if (outcome === "unknown") return null;
  const { data } = await getServiceSupabase()
    .from("guest_course_orders")
    .select("course_title_snapshot, total_amount, email")
    .eq("id", orderId)
    .maybeSingle();
  if (!data) return null;
  return {
    outcome,
    courseTitle: data.course_title_snapshot,
    totalAmount: data.total_amount,
    email: data.email,
  };
}

/* ─────────────────────────── للإدارة (قراءة فقط) ─────────────────────────── */

export interface GuestOrderListItem {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  status: string;
  totalAmount: number;
  paidAt: string | null;
  createdAt: string;
  utmSource: string | null;
  utmCampaign: string | null;
  failureCode: string;
  duplicateOf: string | null;
}

export const GUEST_ORDER_STATUSES = ["paid", "pending", "failed", "expired", "cancelled", "refunded", "all"] as const;
export type GuestOrderFilter = (typeof GUEST_ORDER_STATUSES)[number];

export async function listGuestOrders(filter: GuestOrderFilter, limit = 1000): Promise<GuestOrderListItem[]> {
  let query = getServiceSupabase()
    .from("guest_course_orders")
    .select(
      "id, customer_name, phone, email, status, total_amount, paid_at, created_at, utm_source, utm_campaign, failure_code, duplicate_of",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filter === "pending") query = query.in("status", [...OPEN]);
  else if (filter !== "all") query = query.eq("status", filter);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    totalAmount: row.total_amount,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    utmSource: row.utm_source,
    utmCampaign: row.utm_campaign,
    failureCode: row.failure_code,
    duplicateOf: row.duplicate_of,
  }));
}
