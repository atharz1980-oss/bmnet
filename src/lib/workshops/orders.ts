import "server-only";

/**
 * طلبات الورش الحضورية — دفع كامل أو عربون ثم سداد المتبقي.
 *
 * بنية موازية لـ guest-orders لا تعديل عليها: جدولا workshop_orders
 * (الطلب) وworkshop_payments (كل دفعة صف مستقل)، ومحوّل ميسّر نفسه
 * (`providerFor`)، وإعداد الضريبة نفسه.
 *
 * قواعد لا تُكسر:
 *   1. المتصفح لا يقرر المبلغ ولا الحالة: يرسل بيانات التواصل وخيار الدفع.
 *   2. «مدفوع» لا يُكتب إلا بعد سؤال ميسّر ومطابقة المرجع والمبلغ والعملة
 *      ومعرّف الدفعة والبيئة. العودة من المتصفح وجسم الإشعار لا يكفيان.
 *   3. كل انتقال حالة تحديث شرطي واحد: التكرار والتزامن بلا أثر ثانٍ.
 *   4. المدفوع في الطلب = مجموع دفعاته المؤكدة، يُعاد حسابه بعد كل تأكيد.
 */

import { createHash, randomBytes } from "node:crypto";

import { getServiceSupabase } from "@/lib/supabase/service";
import { siteConfig } from "@/data/site";
import type { GuestContact } from "@/lib/landing/guest-validation";
import type { Campaign } from "@/lib/payments/guest-orders";
import { loadCommerce } from "@/lib/payments/configuration";
import { paymentsMode } from "@/lib/payments/env";
import { toHalalas } from "@/lib/payments/money";
import { PaymentError } from "@/lib/payments/provider";
import { providerConfigured, providerFor } from "@/lib/payments/purchase";
import { quoteCoursePrice } from "@/lib/payments/settings";

import { workshopCatalog, type WorkshopDefinition } from "./catalog";

export const WORKSHOP_CHECKOUT_TTL_MINUTES = 15;

export type PaymentPlan = "full" | "deposit";
export type PaymentKind = "full" | "deposit" | "balance";
export type WorkshopOrderStatus =
  | "pending"
  | "deposit_paid"
  | "paid"
  | "cancelled_by_customer"
  | "cancelled_by_academy"
  | "expired";
export type WorkshopPaymentOutcome =
  | "paid"
  | "pending"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded"
  | "unknown";

const OPEN = ["created", "pending", "authorized"] as const;
const LIVE_ORDER = ["pending", "deposit_paid", "paid"] as const;

export const WORKSHOP_ERRORS = {
  unavailable: "الدفع الإلكتروني لهذه الورشة غير متاح حاليًا.",
  alreadyBooked: "يوجد حجز قائم بهذا البريد أو الجوال لهذه الورشة. تواصل معنا إن احتجت مساعدة.",
  inProgress: "لديك محاولة دفع جارية. أكملها أو انتظر بضع دقائق ثم أعد المحاولة.",
  failed: "تعذر بدء عملية الدفع. حاول مرة أخرى.",
  linkInvalid: "رابط السداد غير صالح أو انتهى استخدامه.",
  nothingDue: "لا يوجد مبلغ متبقٍ على هذا الحجز.",
} as const;

interface OrderRow {
  id: string;
  workshop_slug: string;
  workshop_title_snapshot: string;
  environment: "test" | "production";
  status: WorkshopOrderStatus;
  payment_plan: PaymentPlan;
  customer_name: string;
  email: string;
  phone: string;
  total_amount: number;
  deposit_amount: number;
  paid_amount: number;
  balance_token_hash: string | null;
  refund_status: "none" | "due" | "refunded";
  refund_due_amount: number;
  created_at: string;
}

interface PaymentRow {
  id: string;
  order_id: string;
  kind: PaymentKind;
  provider: "moyasar" | "tabby" | "tamara";
  environment: "test" | "production";
  status: string;
  amount: number;
  currency: string;
  idempotency_key: string;
  provider_payment_id: string | null;
  provider_checkout_url: string | null;
  checkout_expires_at: string | null;
  paid_at: string | null;
}

const ORDER_COLUMNS =
  "id, workshop_slug, workshop_title_snapshot, environment, status, payment_plan, customer_name, email, phone, total_amount, deposit_amount, paid_amount, balance_token_hash, refund_status, refund_due_amount, created_at";
const PAYMENT_COLUMNS =
  "id, order_id, kind, provider, environment, status, amount, currency, idempotency_key, provider_payment_id, provider_checkout_url, checkout_expires_at, paid_at";

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

/** تجزئة رمز رابط السداد — الرمز نفسه لا يُخزَّن. */
export function hashBalanceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function stillPayable(payment: PaymentRow, amount: number, mode: string): boolean {
  return (
    payment.provider === "moyasar" &&
    payment.environment === mode &&
    payment.amount === amount &&
    payment.provider_checkout_url !== null &&
    payment.checkout_expires_at !== null &&
    new Date(payment.checkout_expires_at).getTime() > Date.now()
  );
}

function amountFor(workshop: WorkshopDefinition, kind: PaymentKind, order?: Pick<OrderRow, "total_amount" | "paid_amount">): number {
  if (kind === "full") return toHalalas(workshop.priceSar);
  if (kind === "deposit") return toHalalas(workshop.depositSar);
  return Math.max(0, (order?.total_amount ?? 0) - (order?.paid_amount ?? 0));
}

/**
 * هل الدفع الإلكتروني جاهز لهذه الورشة؟ مفعّلة، وميسّر مضبوط، وإعداد الضريبة
 * معتمد وسعره «شامل الضريبة» يطابق السعر المعلن بالهللة.
 */
export async function workshopCheckoutReady(slug: string): Promise<boolean> {
  const workshop = workshopCatalog(slug);
  if (!workshop || !workshop.checkoutEnabled) return false;
  if (!providerConfigured("moyasar")) return false;
  try {
    const { settings } = await loadCommerce();
    return quoteCoursePrice(toHalalas(workshop.priceSar), settings).gross === toHalalas(workshop.priceSar);
  } catch {
    return false;
  }
}

/* ─────────────────────────── بدء الدفع ─────────────────────────── */

async function openPayment(orderId: string): Promise<PaymentRow | null> {
  const { data } = await getServiceSupabase()
    .from("workshop_payments")
    .select(PAYMENT_COLUMNS)
    .eq("order_id", orderId)
    .in("status", [...OPEN])
    .limit(1);
  return ((data ?? [])[0] as PaymentRow | undefined) ?? null;
}

/**
 * ينشئ دفعة جديدة للطلب ويعيد رابط صفحة ميسّر. الدفعة المفتوحة الصالحة لنفس
 * المبلغ يُعاد رابطها، والمفتوحة غير المنتهية بمبلغ مختلف تمنع إنشاء غيرها.
 */
async function checkoutForOrder(
  order: OrderRow,
  workshop: WorkshopDefinition,
  kind: PaymentKind,
  fetcher?: typeof fetch,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const svc = getServiceSupabase();
  const mode = paymentsMode();
  const amount = amountFor(workshop, kind, order);
  if (amount < 100) return { ok: false, error: WORKSHOP_ERRORS.nothingDue };

  const existing = await openPayment(order.id);
  if (existing) {
    if (existing.kind === kind && stillPayable(existing, amount, mode)) {
      return { ok: true, checkoutUrl: existing.provider_checkout_url as string };
    }
    const expired =
      existing.checkout_expires_at !== null && new Date(existing.checkout_expires_at).getTime() <= Date.now();
    if (!expired) return { ok: false, error: WORKSHOP_ERRORS.inProgress };
    await svc.from("workshop_payments").update({ status: "expired" }).eq("id", existing.id).in("status", [...OPEN]);
  }

  const expiresAt = new Date(Date.now() + WORKSHOP_CHECKOUT_TTL_MINUTES * 60_000);
  const { data: created, error: insertError } = await svc
    .from("workshop_payments")
    .insert({
      order_id: order.id,
      kind,
      provider: "moyasar",
      environment: mode,
      status: "created",
      amount,
      currency: "SAR",
      checkout_expires_at: expiresAt.toISOString(),
    })
    .select("id, idempotency_key")
    .maybeSingle();
  if (insertError || !created) {
    /* ضغطة متزامنة سبقتنا إلى قيد «دفعة مفتوحة واحدة»: نعيد رابطها إن جهز. */
    const raced = await openPayment(order.id);
    if (raced && raced.kind === kind && stillPayable(raced, amount, mode)) {
      return { ok: true, checkoutUrl: raced.provider_checkout_url as string };
    }
    return { ok: false, error: raced ? WORKSHOP_ERRORS.inProgress : WORKSHOP_ERRORS.failed };
  }

  const label = kind === "deposit" ? "عربون" : kind === "balance" ? "المبلغ المتبقي" : "الدفع الكامل";
  try {
    const session = await providerFor("moyasar", fetcher).createCheckout({
      paymentId: created.id,
      idempotencyKey: created.idempotency_key,
      amount,
      currency: "SAR",
      description: `${workshop.title} — ${label} — بيت المصور`.slice(0, 250),
      successUrl: absoluteUrl(`${workshop.path}/success?o=${created.id}`),
      backUrl: absoluteUrl(`${workshop.path}#booking`),
      callbackUrl: absoluteUrl("/api/payments/webhook/moyasar"),
      expiresAt,
      mode,
    });
    const { data: saved, error: updateError } = await svc
      .from("workshop_payments")
      .update({ status: "pending", provider_payment_id: session.providerPaymentId, provider_checkout_url: session.checkoutUrl })
      .eq("id", created.id)
      .eq("status", "created")
      .select("id");
    if (updateError || (saved ?? []).length !== 1) throw new PaymentError("تعذر حفظ عملية الدفع.", "persist_failed");
    return { ok: true, checkoutUrl: session.checkoutUrl };
  } catch (error) {
    await svc
      .from("workshop_payments")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        failure_code: error instanceof PaymentError ? error.code.slice(0, 64) : "checkout_failed",
      })
      .eq("id", created.id)
      .in("status", ["created", "pending"]);
    return { ok: false, error: WORKSHOP_ERRORS.failed };
  }
}

/**
 * حجز جديد بدفع كامل أو عربون. المبلغ يُحسب هنا من إعداد الورشة — لا يصل من
 * المتصفح. الحجز القائم (عربون أو مدفوع) بنفس البريد أو الجوال يُرفض.
 */
export async function startWorkshopCheckout(
  slug: string,
  contact: GuestContact,
  plan: PaymentPlan,
  campaign: Campaign,
  fetcher?: typeof fetch,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const workshop = workshopCatalog(slug);
  if (!workshop || !(await workshopCheckoutReady(slug))) return { ok: false, error: WORKSHOP_ERRORS.unavailable };
  if (plan !== "full" && plan !== "deposit") return { ok: false, error: WORKSHOP_ERRORS.failed };

  const svc = getServiceSupabase();
  const mode = paymentsMode();

  for (const [column, value] of [
    ["email", contact.email],
    ["phone", contact.phone],
  ] as const) {
    const { data } = await svc
      .from("workshop_orders")
      .select("id")
      .eq("workshop_slug", slug)
      .in("status", ["deposit_paid", "paid"])
      .eq(column, value)
      .limit(1);
    if ((data ?? []).length > 0) return { ok: false, error: WORKSHOP_ERRORS.alreadyBooked };
  }

  const total = toHalalas(workshop.priceSar);
  const deposit = plan === "deposit" ? toHalalas(workshop.depositSar) : 0;
  const { data: pendingRows } = await svc
    .from("workshop_orders")
    .select(ORDER_COLUMNS)
    .eq("workshop_slug", slug)
    .eq("email", contact.email)
    .eq("status", "pending")
    .limit(1);
  let order = ((pendingRows ?? [])[0] as OrderRow | undefined) ?? null;

  if (order) {
    /* طلب لم يُدفع منه شيء بعد: يُحدَّث خياره وبياناته ويُعاد استخدامه. */
    const { data: updated } = await svc
      .from("workshop_orders")
      .update({
        customer_name: contact.name,
        phone: contact.phone,
        payment_plan: plan,
        deposit_amount: deposit,
        total_amount: total,
        environment: mode,
        ...campaignColumns(campaign),
      })
      .eq("id", order.id)
      .eq("status", "pending")
      .eq("paid_amount", 0)
      .select(ORDER_COLUMNS);
    order = ((updated ?? [])[0] as OrderRow | undefined) ?? null;
    if (!order) return { ok: false, error: WORKSHOP_ERRORS.inProgress };
  } else {
    const { data: created, error } = await svc
      .from("workshop_orders")
      .insert({
        workshop_slug: slug,
        workshop_title_snapshot: workshop.title.slice(0, 200),
        environment: mode,
        status: "pending",
        payment_plan: plan,
        customer_name: contact.name,
        email: contact.email,
        phone: contact.phone,
        currency: "SAR",
        total_amount: total,
        deposit_amount: deposit,
        ...campaignColumns(campaign),
      })
      .select(ORDER_COLUMNS)
      .maybeSingle();
    if (error || !created) return { ok: false, error: WORKSHOP_ERRORS.inProgress };
    order = created as OrderRow;
  }

  return checkoutForOrder(order, workshop, plan, fetcher);
}

/* ─────────────────────────── سداد المتبقي ─────────────────────────── */

export interface BalanceSummary {
  workshopTitle: string;
  firstName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  path: string;
}

async function orderByToken(token: string): Promise<OrderRow | null> {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return null;
  const { data } = await getServiceSupabase()
    .from("workshop_orders")
    .select(ORDER_COLUMNS)
    .eq("balance_token_hash", hashBalanceToken(token))
    .limit(1);
  return ((data ?? [])[0] as OrderRow | undefined) ?? null;
}

/** ملخص صفحة سداد المتبقي — null لرمز غير صالح أو طلب لا متبقي عليه. */
export async function loadBalanceSummary(token: string): Promise<BalanceSummary | null> {
  const order = await orderByToken(token);
  if (!order || order.status !== "deposit_paid") return null;
  const workshop = workshopCatalog(order.workshop_slug);
  if (!workshop) return null;
  const remaining = order.total_amount - order.paid_amount;
  if (remaining < 100) return null;
  return {
    workshopTitle: order.workshop_title_snapshot || workshop.title,
    firstName: order.customer_name.split(/\s+/)[0] ?? "",
    totalAmount: order.total_amount,
    paidAmount: order.paid_amount,
    remainingAmount: remaining,
    path: workshop.path,
  };
}

/** يبدأ دفعة المتبقي برابط آمن — المبلغ = الإجمالي ناقص المدفوع المؤكد. */
export async function startBalancePayment(
  token: string,
  fetcher?: typeof fetch,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const order = await orderByToken(token);
  if (!order || order.status !== "deposit_paid") return { ok: false, error: WORKSHOP_ERRORS.linkInvalid };
  if (order.environment !== paymentsMode()) return { ok: false, error: WORKSHOP_ERRORS.linkInvalid };
  const workshop = workshopCatalog(order.workshop_slug);
  if (!workshop || !(await workshopCheckoutReady(order.workshop_slug))) {
    return { ok: false, error: WORKSHOP_ERRORS.unavailable };
  }
  return checkoutForOrder(order, workshop, "balance", fetcher);
}

/* ─────────────────────────── التحقق الموثوق ─────────────────────────── */

async function markPaymentFailed(paymentId: string, code: string): Promise<void> {
  await getServiceSupabase()
    .from("workshop_payments")
    .update({ status: "failed", failed_at: new Date().toISOString(), failure_code: code.slice(0, 64) })
    .eq("id", paymentId)
    .in("status", [...OPEN]);
}

/**
 * يعيد حساب المدفوع من الدفعات المؤكدة ويحدّث حالة الطلب. آمن للتكرار:
 * النتيجة نفسها مهما تكرر. الطلب الملغى يحتفظ بحالته (دفع متأخر للمراجعة).
 */
async function refreshOrderTotals(orderId: string): Promise<void> {
  const svc = getServiceSupabase();
  const { data: order } = await svc.from("workshop_orders").select(ORDER_COLUMNS).eq("id", orderId).maybeSingle();
  if (!order) return;
  const { data: paid } = await svc.from("workshop_payments").select("amount").eq("order_id", orderId).eq("status", "paid");
  const paidAmount = (paid ?? []).reduce((sum, row) => sum + Number((row as { amount: number }).amount), 0);
  const current = order as OrderRow;
  const live = (LIVE_ORDER as readonly string[]).includes(current.status);
  const status: WorkshopOrderStatus = !live
    ? current.status
    : paidAmount >= current.total_amount
      ? "paid"
      : paidAmount > 0
        ? "deposit_paid"
        : "pending";
  /* لا يُعاد الرابط بعد الاكتمال: رمز السداد يُبطَل حين لا يبقى ما يُسدَّد. */
  await svc
    .from("workshop_orders")
    .update({
      paid_amount: paidAmount,
      status,
      ...(status === "paid" ? { balance_token_hash: null } : {}),
    })
    .eq("id", orderId)
    .eq("status", current.status);
}

/**
 * يسأل ميسّر عن الدفعة ويحسم حالتها. يُنادى من الإشعار ومن صفحة النجاح معًا،
 * وكلاهما يصل إلى النتيجة نفسها. آمن للتكرار والتزامن.
 */
export async function verifyWorkshopPayment(paymentId: string, fetcher?: typeof fetch): Promise<WorkshopPaymentOutcome> {
  const svc = getServiceSupabase();
  const { data } = await svc.from("workshop_payments").select(PAYMENT_COLUMNS).eq("id", paymentId).maybeSingle();
  if (!data) return "unknown";
  const payment = data as PaymentRow;

  if (payment.status === "paid") {
    await refreshOrderTotals(payment.order_id);
    return "paid";
  }
  if (payment.status === "refunded") return "refunded";
  if (!payment.provider_payment_id) {
    if (["failed", "cancelled", "expired"].includes(payment.status)) return payment.status as WorkshopPaymentOutcome;
    if (payment.checkout_expires_at && new Date(payment.checkout_expires_at).getTime() < Date.now()) {
      await svc.from("workshop_payments").update({ status: "expired" }).eq("id", payment.id).eq("status", "created");
      return "expired";
    }
    return "pending";
  }

  if (payment.environment !== paymentsMode()) {
    await markPaymentFailed(payment.id, "environment_mismatch");
    return "failed";
  }

  let state;
  try {
    state = await providerFor(payment.provider, fetcher).fetchState(payment.provider_payment_id);
  } catch {
    /* تعذر السؤال ≠ فشل الدفع. */
    return (OPEN as readonly string[]).includes(payment.status) ? "pending" : (payment.status as WorkshopPaymentOutcome);
  }

  if (state.providerPaymentId !== payment.provider_payment_id) {
    await markPaymentFailed(payment.id, "reference_mismatch");
    return "failed";
  }

  if (state.status === "paid") {
    if (state.amount !== payment.amount) {
      await markPaymentFailed(payment.id, "amount_mismatch");
      return "failed";
    }
    if (state.currency !== payment.currency) {
      await markPaymentFailed(payment.id, "currency_mismatch");
      return "failed";
    }
    if (state.metadataPaymentId !== payment.id) {
      await markPaymentFailed(payment.id, "metadata_mismatch");
      return "failed";
    }
    if (state.metadataEnvironment !== payment.environment) {
      await markPaymentFailed(payment.id, "environment_mismatch");
      return "failed";
    }
    if (state.refunded > 0) {
      await svc
        .from("workshop_payments")
        .update({ status: "refunded", refunded_at: new Date().toISOString(), refunded_amount: state.refunded })
        .eq("id", payment.id)
        .neq("status", "paid");
      return "refunded";
    }
    /* المال وصل وطابق: «مدفوع» حتى لو أُغلقت المحاولة محليًا قبله (دفع متأخر). */
    const { data: updated } = await svc
      .from("workshop_payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("provider_payment_id", payment.provider_payment_id)
      .in("status", ["created", "pending", "authorized", "expired", "cancelled", "failed"])
      .select("id");
    if ((updated ?? []).length !== 1) {
      const { data: now } = await svc.from("workshop_payments").select("status").eq("id", payment.id).maybeSingle();
      if (now?.status !== "paid") return "unknown";
    }
    await refreshOrderTotals(payment.order_id);
    return "paid";
  }

  if (state.status === "authorized") {
    await svc.from("workshop_payments").update({ status: "authorized" }).eq("id", payment.id).in("status", ["created", "pending"]);
    return "pending";
  }

  if (state.status === "failed" || state.status === "cancelled" || state.status === "expired") {
    await svc
      .from("workshop_payments")
      .update({
        status: state.status,
        ...(state.status === "failed" ? { failed_at: new Date().toISOString(), failure_code: "provider_failed" } : {}),
      })
      .eq("id", payment.id)
      .in("status", [...OPEN]);
    return state.status;
  }

  if (state.status === "refunded") {
    await svc
      .from("workshop_payments")
      .update({ status: "refunded", refunded_at: new Date().toISOString(), refunded_amount: state.refunded })
      .eq("id", payment.id)
      .in("status", [...OPEN]);
    return "refunded";
  }

  return "pending";
}

/** دفعة الورشة المطابقة لمرجع المزود — للإشعار حين لا يطابق شراءً آخر. */
export async function workshopPaymentIdByProviderReference(
  provider: "moyasar" | "tabby" | "tamara",
  providerPaymentId: string,
): Promise<string | null> {
  const { data } = await getServiceSupabase()
    .from("workshop_payments")
    .select("id")
    .eq("provider", provider)
    .eq("provider_payment_id", providerPaymentId)
    .maybeSingle();
  return data?.id ?? null;
}

/* ─────────────────────────── صفحة النجاح ─────────────────────────── */

export interface WorkshopReceipt {
  outcome: WorkshopPaymentOutcome;
  kind: PaymentKind;
  paymentAmount: number;
  paidAt: string | null;
  workshopTitle: string;
  orderStatus: WorkshopOrderStatus;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  email: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** حالة الدفعة لصفحة النجاح — بعد التحقق من المزود إن لم تُحسم بعد. */
export async function loadWorkshopReceipt(slug: string, paymentId: string, fetcher?: typeof fetch): Promise<WorkshopReceipt | null> {
  if (!UUID.test(paymentId)) return null;
  const outcome = await verifyWorkshopPayment(paymentId, fetcher);
  if (outcome === "unknown") return null;
  const svc = getServiceSupabase();
  const { data: payment } = await svc.from("workshop_payments").select(PAYMENT_COLUMNS).eq("id", paymentId).maybeSingle();
  if (!payment) return null;
  const { data: order } = await svc
    .from("workshop_orders")
    .select(ORDER_COLUMNS)
    .eq("id", (payment as PaymentRow).order_id)
    .maybeSingle();
  if (!order || (order as OrderRow).workshop_slug !== slug) return null;
  const p = payment as PaymentRow;
  const o = order as OrderRow;
  return {
    outcome,
    kind: p.kind,
    paymentAmount: p.amount,
    paidAt: p.paid_at,
    workshopTitle: o.workshop_title_snapshot,
    orderStatus: o.status,
    totalAmount: o.total_amount,
    paidAmount: o.paid_amount,
    remainingAmount: Math.max(0, o.total_amount - o.paid_amount),
    email: o.email,
  };
}

/* ─────────────────────────── الإدارة ─────────────────────────── */

export interface WorkshopOrderListItem {
  id: string;
  workshopSlug: string;
  workshopTitle: string;
  customerName: string;
  phone: string;
  email: string;
  status: WorkshopOrderStatus;
  paymentPlan: PaymentPlan;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  overpaid: boolean;
  hasBalanceLink: boolean;
  refundStatus: "none" | "due" | "refunded";
  refundDueAmount: number;
  createdAt: string;
}

export async function listWorkshopOrders(limit = 1000): Promise<WorkshopOrderListItem[]> {
  const { data, error } = await getServiceSupabase()
    .from("workshop_orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((row) => {
    const o = row as OrderRow;
    return {
      id: o.id,
      workshopSlug: o.workshop_slug,
      workshopTitle: o.workshop_title_snapshot,
      customerName: o.customer_name,
      phone: o.phone,
      email: o.email,
      status: o.status,
      paymentPlan: o.payment_plan,
      totalAmount: o.total_amount,
      paidAmount: o.paid_amount,
      remainingAmount: Math.max(0, o.total_amount - o.paid_amount),
      overpaid: o.paid_amount > o.total_amount,
      hasBalanceLink: o.balance_token_hash !== null,
      refundStatus: o.refund_status,
      refundDueAmount: o.refund_due_amount,
      createdAt: o.created_at,
    };
  });
}

/**
 * ينشئ رابط سداد المتبقي (ويُبطل السابق). الرمز يُعاد مرة واحدة ليُرسَل
 * يدويًا، ولا يُحفظ إلا تجزئته. لطلب بعربون مدفوع ومتبقٍّ قائم فقط.
 */
export async function createBalanceLink(orderId: string): Promise<{ ok: true; url: string; phone: string; remaining: number; title: string } | { ok: false; error: string }> {
  const svc = getServiceSupabase();
  const { data } = await svc.from("workshop_orders").select(ORDER_COLUMNS).eq("id", orderId).maybeSingle();
  const order = data as OrderRow | null;
  if (!order || order.status !== "deposit_paid") return { ok: false, error: "الرابط متاح لحجز بعربون مدفوع فقط." };
  if (order.environment !== paymentsMode()) return { ok: false, error: "بيئة الطلب لا تطابق بيئة الدفع الحالية." };
  const remaining = order.total_amount - order.paid_amount;
  if (remaining < 100) return { ok: false, error: WORKSHOP_ERRORS.nothingDue };
  const workshop = workshopCatalog(order.workshop_slug);
  if (!workshop) return { ok: false, error: "الورشة غير معروفة." };

  const token = randomBytes(32).toString("base64url");
  const { data: saved } = await svc
    .from("workshop_orders")
    .update({ balance_token_hash: hashBalanceToken(token), balance_link_created_at: new Date().toISOString() })
    .eq("id", order.id)
    .eq("status", "deposit_paid")
    .select("id");
  if ((saved ?? []).length !== 1) return { ok: false, error: "تعذر إنشاء الرابط. حدّث الصفحة وأعد المحاولة." };
  return {
    ok: true,
    url: absoluteUrl(`${workshop.path}/pay/${token}`),
    phone: order.phone,
    remaining,
    title: order.workshop_title_snapshot || workshop.title,
  };
}

/** إلغاء من الأكاديمية: «استرداد مستحق» بكامل المدفوع — بلا أي استرداد تلقائي. */
export async function cancelOrderByAcademy(orderId: string, actor: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const svc = getServiceSupabase();
  const { data } = await svc.from("workshop_orders").select(ORDER_COLUMNS).eq("id", orderId).maybeSingle();
  const order = data as OrderRow | null;
  if (!order || !(LIVE_ORDER as readonly string[]).includes(order.status)) return { ok: false, error: "لا يمكن إلغاء هذا الطلب." };
  const { data: updated } = await svc
    .from("workshop_orders")
    .update({
      status: "cancelled_by_academy",
      cancelled_at: new Date().toISOString(),
      cancelled_by: actor,
      refund_status: order.paid_amount > 0 ? "due" : "none",
      refund_due_amount: order.paid_amount,
      balance_token_hash: null,
    })
    .eq("id", order.id)
    .eq("status", order.status)
    .eq("paid_amount", order.paid_amount)
    .select("id");
  return (updated ?? []).length === 1 ? { ok: true } : { ok: false, error: "تغيّر الطلب أثناء العملية. حدّث الصفحة وأعد المحاولة." };
}

/** تسجيل أن الاسترداد المستحق نُفّذ يدويًا (من لوحة ميسّر) — لا يستدعي ميسّر. */
export async function markRefundCompleted(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await getServiceSupabase()
    .from("workshop_orders")
    .update({ refund_status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "cancelled_by_academy")
    .eq("refund_status", "due")
    .select("id");
  return (data ?? []).length === 1 ? { ok: true } : { ok: false, error: "لا يوجد استرداد مستحق على هذا الطلب." };
}
