import "server-only";

/**
 * دفع السلة: طلب واحد ← حجوزات مؤقتة ← فاتورة واحدة ← تفعيل ذرّي.
 *
 * القواعد:
 *   1. لا يُنشأ طلب ولا حجز قبل تحقق الخادم من كل عنصر (سعر، توفر، مدة).
 *   2. الطلب المفتوح واحد لكل سلة؛ لا فاتورتان لنفس الاختيارات.
 *   3. الحجز المؤقت (مساحة/مقعد) يُنشأ عند الدفع فقط، ومدته أطول من صفحة
 *      المزود بخمس دقائق حتى تصل دفعة في آخر لحظة قبل انتهائها.
 *   4. الإلغاء والانتهاء يحرران الحجوزات؛ والتفعيل لا يثق إلا بسؤال المزود.
 *   5. أي فشل بعد إنشاء الطلب يلغي الطلب ويحرر ما أُنشئ — لا حجز يتيم.
 */

import { siteConfig } from "@/data/site";
import { loadCommerce } from "@/lib/payments/configuration";
import { paymentsMode } from "@/lib/payments/env";
import { MIN_CHARGE_HALALAS } from "@/lib/payments/money";
import {
  providerConfigured,
  providerFor,
  recordRefundIfAny,
  seatErrorMessage,
  type VerifyOptions,
} from "@/lib/payments/purchase";
import { PaymentError } from "@/lib/payments/provider";
import type { Provider } from "@/lib/payments/settings";
import { normalizeDbTime } from "@/lib/spaces/schedule";
import { getServiceSupabase } from "@/lib/supabase/service";

import { priceCourseSelection, priceEquipmentSelection, priceSpaceSelection, type PricedCartItem } from "./catalog";
import { cartContactErrors, normalizeCartContact, ownsOrder } from "./store";
import type { CartContact, CartOrderItemView, CartOrderView } from "./types";

/** صفحة الدفع عند المزود تنتهي بعد ١٥ دقيقة (نفس التدفق القائم). */
const CHECKOUT_TTL_MINUTES = 15;
/** الحجز المؤقت يبقى ٢٠ دقيقة: هامش وصول التحقق بعد آخر لحظة دفع. */
const HOLD_TTL_MINUTES = 20;
const MAX_ITEMS = 20;
const OPEN_STATUSES = ["created", "pending", "authorized"] as const;

interface CartItemRow {
  id: string;
  cart_id: string;
  kind: string;
  course_id: string | null;
  session_id: string | null;
  space_id: string | null;
  booking_date: string | null;
  start_time: string | null;
  end_time: string | null;
  title_snapshot: string;
  subtitle_snapshot: string;
  href_snapshot: string;
  unit_gross_halalas: number;
  equipment_id: string | null;
  rental_start_date: string | null;
  rental_end_date: string | null;
  rental_quantity: number | null;
  rental_method: "pickup" | "delivery" | null;
  rental_delivery_address: string | null;
  agreement_version: number | null;
  agreement_accepted_at: string | null;
  signature_name: string | null;
  signature_data_url: string | null;
  signature_hash: string | null;
  national_id: string | null;
  national_id_expiry: string | null;
}

interface OrderRow {
  id: string;
  cart_id: string | null;
  user_id: string | null;
  provider: Provider;
  environment: "test" | "production";
  status: string;
  customer_type: string | null;
  customer_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  item_count: number;
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
  failed_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  refunded_amount: number;
  failure_code: string;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  cart_item_id: string | null;
  position: number;
  kind: string;
  course_id: string | null;
  session_id: string | null;
  space_id: string | null;
  booking_date: string | null;
  start_time: string | null;
  end_time: string | null;
  title_snapshot: string;
  subtitle_snapshot: string;
  href_snapshot: string;
  gross_amount: number;
  net_amount: number;
  tax_amount: number;
  tax_rate_bps: number;
  status: string;
  failure_code: string;
  enrollment_id: string | null;
  space_booking_id: string | null;
  seat_id: string | null;
  equipment_id: string | null;
  equipment_rental_id: string | null;
}

const CART_ITEM_COLUMNS =
  "id, cart_id, kind, course_id, session_id, space_id, booking_date, start_time, end_time, title_snapshot, subtitle_snapshot, href_snapshot, unit_gross_halalas, equipment_id, rental_start_date, rental_end_date, rental_quantity, rental_method, rental_delivery_address, agreement_version, agreement_accepted_at, signature_name, signature_data_url, signature_hash, national_id, national_id_expiry";

const ORDER_COLUMNS =
  "id, cart_id, user_id, provider, environment, status, customer_type, customer_name, company_name, email, phone, notes, item_count, net_amount, tax_amount, total_amount, tax_rate_bps, currency, idempotency_key, provider_payment_id, provider_checkout_url, checkout_expires_at, paid_at, failed_at, cancelled_at, refunded_at, refunded_amount, failure_code, created_at, hold_expires_at, hold_released_at";

const ORDER_ITEM_COLUMNS =
  "id, order_id, cart_item_id, position, kind, course_id, session_id, space_id, booking_date, start_time, end_time, title_snapshot, subtitle_snapshot, href_snapshot, gross_amount, net_amount, tax_amount, tax_rate_bps, status, failure_code, enrollment_id, space_booking_id, seat_id, equipment_id, equipment_rental_id";

export type CartOrderOutcome =
  | { outcome: "paid"; orderId: string; partial: boolean; afterCancel?: boolean }
  | { outcome: "pending" }
  | { outcome: "failed"; reason: string }
  | { outcome: "cancelled" }
  | { outcome: "expired" }
  | { outcome: "refunded" }
  | { outcome: "unverified" }
  | { outcome: "unknown" };

export type CartCheckoutResult =
  | { ok: true; orderId: string; checkoutUrl: string }
  | {
      ok: false;
      error: string;
      code?: "account_required" | "open_order" | "price_changed" | "unavailable";
      loginHref?: string;
      orderId?: string;
      checkoutUrl?: string | null;
    };

function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}

function isSpaceItem(item: PricedCartItem): item is Extract<PricedCartItem, { kind: "space" }> {
  return item.kind === "space";
}

function isEquipmentItem(item: PricedCartItem): item is Extract<PricedCartItem, { kind: "equipment" }> {
  return item.kind === "equipment";
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function snapshotFields(item: PricedCartItem) {
  if (item.kind === "equipment") {
    return {
      kind: item.kind,
      course_id: null,
      session_id: null,
      space_id: null,
      booking_date: null,
      start_time: null,
      end_time: null,
      title_snapshot: item.title,
      subtitle_snapshot: item.subtitle,
      href_snapshot: item.href,
      equipment_id: item.item.id,
    };
  }
  return {
    kind: item.kind,
    course_id: item.kind === "course" ? item.course.id : null,
    session_id: item.kind === "course" ? (item.session?.id ?? null) : null,
    space_id: item.kind === "space" ? item.space.id : null,
    booking_date: item.kind === "space" ? item.bookingDate : null,
    start_time: item.kind === "space" ? item.startTime : null,
    end_time: item.kind === "space" ? item.endTime : null,
    title_snapshot: item.title,
    subtitle_snapshot: item.subtitle,
    href_snapshot: item.href,
  };
}

async function loadOrder(orderId: string): Promise<OrderRow | null> {
  const { data } = await getServiceSupabase()
    .from("shopping_orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .maybeSingle();
  return (data as OrderRow | null) ?? null;
}

async function loadOrderItems(orderId: string): Promise<OrderItemRow[]> {
  const { data } = await getServiceSupabase()
    .from("shopping_order_items")
    .select(ORDER_ITEM_COLUMNS)
    .eq("order_id", orderId)
    .order("position", { ascending: true });
  return (data ?? []) as OrderItemRow[];
}

function orderItemView(row: OrderItemRow): CartOrderItemView {
  const kind = row.kind === "space" ? "space" : row.kind === "equipment" ? "equipment" : "course";
  return {
    id: row.id,
    kind,
    title: row.title_snapshot,
    subtitle: row.subtitle_snapshot,
    href: row.href_snapshot,
    grossAmount: row.gross_amount,
    status:
      row.status === "fulfilled" || row.status === "failed" || row.status === "cancelled"
        ? row.status
        : "pending",
    failureCode: row.failure_code,
    courseId: row.course_id,
    sessionId: row.session_id,
    spaceId: row.space_id,
    bookingDate: row.booking_date,
    startTime: row.start_time ? normalizeDbTime(row.start_time) : null,
    endTime: row.end_time ? normalizeDbTime(row.end_time) : null,
    enrollmentId: row.enrollment_id,
    spaceBookingId: row.space_booking_id,
    equipmentId: row.equipment_id,
    equipmentRentalId: row.equipment_rental_id,
  };
}

/** طلب كامل للعرض — بعد التحقق من الملكية عند المستدعي. */
export async function loadCartOrderView(orderId: string): Promise<CartOrderView | null> {
  const order = await loadOrder(orderId);
  if (!order) return null;
  const items = await loadOrderItems(orderId);
  return {
    id: order.id,
    status: order.status,
    customerName: order.customer_name,
    email: order.email,
    phone: order.phone,
    companyName: order.company_name,
    customerType: order.customer_type,
    notes: order.notes,
    itemCount: order.item_count,
    netAmount: order.net_amount,
    taxAmount: order.tax_amount,
    totalAmount: order.total_amount,
    taxRateBps: order.tax_rate_bps,
    currency: order.currency,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    failedAt: order.failed_at,
    cancelledAt: order.cancelled_at,
    expiresAt: order.checkout_expires_at,
    checkoutUrl: order.provider_checkout_url,
    failureCode: order.failure_code,
    items: items.map(orderItemView),
  };
}

/** صاحب الطلب لمقارنة الملكية في صفحة الحالة. */
export async function loadCartOrderOwner(
  orderId: string,
): Promise<{ cartId: string | null; userId: string | null } | null> {
  const { data } = await getServiceSupabase()
    .from("shopping_orders")
    .select("cart_id, user_id")
    .eq("id", orderId)
    .maybeSingle();
  return data ? { cartId: data.cart_id, userId: data.user_id } : null;
}

/* ─────────────────────── تحرير الحجوزات المؤقتة ─────────────────────── */

async function releaseHolds(orderId: string, mode: "cancelled" | "expired"): Promise<void> {
  const svc = getServiceSupabase();
  const items = await loadOrderItems(orderId);
  const stamp = new Date().toISOString();
  const reason = mode === "cancelled" ? "order_cancelled" : "order_expired";

  for (const item of items) {
    if (item.status !== "pending") continue;

    if (item.kind === "space" && item.space_booking_id) {
      await svc
        .from("studio_space_bookings")
        .update({
          status: mode === "cancelled" ? "cancelled" : "expired",
          payment_status: mode === "cancelled" ? "cancelled" : "expired",
          cancelled_at: mode === "cancelled" ? stamp : null,
          failure_code: reason,
        })
        .eq("id", item.space_booking_id)
        .eq("status", "pending")
        .in("payment_status", [...OPEN_STATUSES]);
    }

    if (item.kind === "course" && item.seat_id) {
      /* شرطي: لا نلمس مقعدًا صار مؤكدًا أو ارتبط بدفعة أخرى. */
      await svc
        .from("course_session_seats")
        .update({
          status: "released",
          released_at: stamp,
          hold_expires_at: null,
          release_reason: reason,
        })
        .eq("id", item.seat_id)
        .eq("status", "held")
        .is("payment_id", null)
        .is("enrollment_id", null);
    }

    await svc
      .from("shopping_order_items")
      .update({ status: mode === "cancelled" ? "cancelled" : "failed", failure_code: reason })
      .eq("id", item.id)
      .eq("status", "pending");
  }

  /* حجوزات رُبطت بالطلب ولم يُكتب معرّفها في عنصر (فشل تحديث نادر). */
  await svc
    .from("studio_space_bookings")
    .update({
      status: mode === "cancelled" ? "cancelled" : "expired",
      payment_status: mode === "cancelled" ? "cancelled" : "expired",
      cancelled_at: mode === "cancelled" ? stamp : null,
      failure_code: reason,
    })
    .eq("shopping_order_id", orderId)
    .eq("status", "pending")
    .in("payment_status", [...OPEN_STATUSES]);
}

/**
 * يغلق طلبًا لم يُدفع (أو انتهت مهلته). التحديث الشرطي هو الحكم: إن سبقه
 * تفعيل أو إلغاء فلا يحرر شيئًا. عناصر السلة تبقى للعودة.
 */
async function closeOrder(
  orderId: string,
  next: "cancelled" | "expired" | "failed",
  failureCode: string,
): Promise<boolean> {
  const svc = getServiceSupabase();
  const stamp = new Date().toISOString();
  const { data: closed } = await svc
    .from("shopping_orders")
    .update({
      status: next,
      ...(next === "cancelled" ? { cancelled_at: stamp } : {}),
      ...(next === "failed" ? { failed_at: stamp } : {}),
      failure_code: failureCode,
    })
    .eq("id", orderId)
    .in("status", [...OPEN_STATUSES])
    .select("id");
  if ((closed ?? []).length !== 1) return false;
  await releaseHolds(orderId, next === "expired" ? "expired" : "cancelled");
  return true;
}

/** إلغاء داخلي بعد فشل الإنشاء — لا يترك حجزًا ولا مقعدًا. */
async function abortOrder(orderId: string, code: string): Promise<void> {
  await closeOrder(orderId, "cancelled", code);
}

/** ينتهي الطلب تلقائيًا إذا مرّت مهلته. يُنادى عند القراءة والدفع. */
export async function expireCartOrder(orderId: string): Promise<boolean> {
  const order = await loadOrder(orderId);
  if (!order || !OPEN_STATUSES.includes(order.status as (typeof OPEN_STATUSES)[number])) return false;
  const expires = order.checkout_expires_at ? new Date(order.checkout_expires_at).getTime() : null;
  if (expires === null || expires > Date.now()) return false;
  return closeOrder(orderId, "expired", "checkout_expired");
}

/* ───────────────────────────── بدء الدفع ───────────────────────────── */

export interface StartCartCheckoutInput {
  cartId: string;
  userId: string | null;
  itemId?: string | null;
  contact: CartContact;
  fetcher?: typeof fetch;
}

/**
 * ينشئ الطلب والحجوزات ثم فاتورة المزود، ويعيد رابط الدفع.
 * لا يمسح عناصر السلة: تبقى حتى ينجح الدفع فيحذفها التفعيل.
 */
export async function startCartCheckout(
  input: StartCartCheckoutInput,
): Promise<CartCheckoutResult> {
  const contact: CartContact = normalizeCartContact({
    customerType: input.contact.customerType,
    customerName: input.contact.customerName,
    companyName: input.contact.companyName,
    email: input.contact.email,
    phone: input.contact.phone,
    notes: input.contact.notes,
  });
  const contactError = cartContactErrors(contact);
  if (contactError) return { ok: false, error: contactError };

  if (!providerConfigured("moyasar")) {
    return {
      ok: false,
      code: "unavailable",
      error: "الدفع الإلكتروني غير متاح حاليًا. تواصل معنا لإتمام الطلب.",
    };
  }
  const environment = paymentsMode();
  const svc = getServiceSupabase();

  /* 1. عناصر السلة — العنصر المطلوب وحده عند الدفع المنفرد. */
  let query = svc.from("shopping_cart_items").select(CART_ITEM_COLUMNS).eq("cart_id", input.cartId);
  if (input.itemId) query = query.eq("id", input.itemId);
  const { data: rows, error: itemsError } = await query.order("created_at", { ascending: true });
  if (itemsError) return { ok: false, error: "تعذر قراءة السلة. حاول مرة أخرى." };
  const cartItems = (rows ?? []) as CartItemRow[];
  if (cartItems.length === 0) {
    return { ok: false, error: input.itemId ? "العنصر لم يعد في سلتك." : "سلتك فارغة." };
  }
  if (cartItems.length > MAX_ITEMS) {
    return { ok: false, error: `لا يمكن دفع أكثر من ${MAX_ITEMS} عنصرًا في طلب واحد.` };
  }
  if (input.itemId && cartItems.length !== 1) {
    return { ok: false, error: "العنصر المحدد غير موجود في سلتك." };
  }

  if (!input.userId && cartItems.some((item) => item.kind === "course")) {
    return {
      ok: false,
      code: "account_required",
      error: "يلزم تسجيل الدخول لإتمام شراء الدورة — يمكنك دفع حجوزات المساحة كضيف.",
      loginHref: "/community/login?next=%2Fcart",
    };
  }

  /* 2. إعادة التسعير والتحقق من كل عنصر — لا نثق بلقطة السلة. */
  const priced: PricedCartItem[] = [];
  let priceChanged = false;
  for (const row of cartItems) {
    if (row.kind === "course") {
      const result = await priceCourseSelection(row.course_id ?? "", row.session_id, input.userId);
      if (!result.ok) return { ok: false, error: result.error };
      priced.push(result.item);
      if (result.item.quote.gross !== row.unit_gross_halalas) {
        priceChanged = true;
        await svc
          .from("shopping_cart_items")
          .update({
            ...snapshotFields(result.item),
            unit_gross_halalas: result.item.quote.gross,
          })
          .eq("id", row.id);
      }
    } else if (row.kind === "space") {
      const date = row.booking_date ?? "";
      const start = row.start_time ? normalizeDbTime(row.start_time) : "";
      const end = row.end_time ? normalizeDbTime(row.end_time) : "";
      const result = await priceSpaceSelection(row.space_id ?? "", date, start, end);
      if (!result.ok) return { ok: false, error: result.error };
      priced.push(result.item);
      if (result.item.quote.gross !== row.unit_gross_halalas) {
        priceChanged = true;
        await svc
          .from("shopping_cart_items")
          .update({
            ...snapshotFields(result.item),
            unit_gross_halalas: result.item.quote.gross,
          })
          .eq("id", row.id);
      }
    } else if (row.kind === "equipment") {
      if (!row.equipment_id || !row.rental_start_date || !row.rental_end_date || !row.rental_quantity || !row.rental_method || !row.national_id || !row.national_id_expiry || !row.signature_name || !row.signature_data_url) {
        return { ok: false, error: "بيانات إيجار المعدة غير مكتملة في السلة." };
      }
      const result = await priceEquipmentSelection({
        equipmentId: row.equipment_id,
        startDate: row.rental_start_date,
        endDate: row.rental_end_date,
        quantity: row.rental_quantity,
        method: row.rental_method,
        deliveryAddress: row.rental_delivery_address,
        nationalId: row.national_id,
        nationalIdExpiry: row.national_id_expiry,
        agreementAccepted: true,
        signatureName: row.signature_name,
        signatureDataUrl: row.signature_data_url,
        customerName: contact.customerName,
      });
      if (!result.ok) return { ok: false, error: result.error };
      priced.push(result.item);
      if (result.item.quote.gross !== row.unit_gross_halalas) {
        priceChanged = true;
        await svc
          .from("shopping_cart_items")
          .update({
            ...snapshotFields(result.item),
            unit_gross_halalas: result.item.quote.gross,
          })
          .eq("id", row.id);
      }
    } else {
      return { ok: false, error: "عنصر غير معروف في السلة." };
    }
  }

  if (priceChanged) {
    return {
      ok: false,
      code: "price_changed",
      error: "تغيّرت أسعار بعض العناصر. راجع السلة ثم أعد المحاولة.",
    };
  }

  /* 3. تعارض المواعيد داخل الاختيار نفسه (قبل أي كتابة). */
  const spaces = priced.filter(isSpaceItem);
  for (let i = 0; i < spaces.length; i += 1) {
    for (let j = i + 1; j < spaces.length; j += 1) {
      const a = spaces[i];
      const b = spaces[j];
      if (a.space.id === b.space.id && a.bookingDate === b.bookingDate) {
        const aStart = minutesOf(a.startTime);
        const aEnd = minutesOf(a.endTime);
        const bStart = minutesOf(b.startTime);
        const bEnd = minutesOf(b.endTime);
        if (aStart < bEnd && aEnd > bStart) {
          return { ok: false, error: "اخترت موعدين متعارضين لنفس المساحة. عدّل أحدهما." };
        }
      }
    }
  }

  /* 4. الإجماليات من لقطات التسعير الطازجة. */
  const net = priced.reduce((sum, item) => sum + item.quote.net, 0);
  const tax = priced.reduce((sum, item) => sum + item.quote.vat, 0);
  const gross = priced.reduce((sum, item) => sum + item.quote.gross, 0);
  if (gross < MIN_CHARGE_HALALAS) {
    return { ok: false, error: "إجمالي الطلب أقل من الحد الأدنى للدفع الإلكتروني." };
  }

  /* 5. طلب مفتوح قائم: نعيده إن كان ما زال صالحًا، وننتهي من المنتهي. */
  const { data: openRows } = await svc
    .from("shopping_orders")
    .select("id, status, checkout_expires_at, provider_checkout_url")
    .eq("cart_id", input.cartId)
    .in("status", [...OPEN_STATUSES])
    .order("created_at", { ascending: false });
  for (const open of openRows ?? []) {
    const expires = open.checkout_expires_at ? new Date(open.checkout_expires_at).getTime() : null;
    if (expires !== null && expires <= Date.now()) {
      await closeOrder(open.id, "expired", "checkout_expired");
      continue;
    }
    return {
      ok: false,
      code: "open_order",
      orderId: open.id,
      checkoutUrl: open.provider_checkout_url,
      error: "لديك طلب دفع معلق. أكمله أو ألغِه أولًا.",
    };
  }

  /* 6. الطلب — الحجز يبدأ الآن. */
  const holdExpires = new Date(Date.now() + HOLD_TTL_MINUTES * 60_000);
  const { data: order, error: orderError } = await svc
    .from("shopping_orders")
    .insert({
      cart_id: input.cartId,
      user_id: input.userId,
      provider: "moyasar",
      environment,
      status: "created",
      customer_type: contact.customerType ?? "individual",
      customer_name: contact.customerName,
      company_name: contact.companyName || null,
      email: contact.email,
      phone: contact.phone,
      notes: contact.notes || null,
      item_count: priced.length,
      net_amount: net,
      tax_amount: tax,
      total_amount: gross,
      tax_rate_bps: priced[0]?.quote.rateBps ?? 0,
      currency: "SAR",
      checkout_expires_at: holdExpires.toISOString(),
      hold_expires_at: holdExpires.toISOString(),
    })
    .select("id, idempotency_key")
    .maybeSingle();

  if (orderError || !order) {
    /* سباق الضغط المزدوج: القيد الفريد لطلب مفتوح واحد. */
    if (orderError?.code === "23505") {
      const { data: existing } = await svc
        .from("shopping_orders")
        .select("id, provider_checkout_url")
        .eq("cart_id", input.cartId)
        .in("status", [...OPEN_STATUSES])
        .limit(1)
        .maybeSingle();
      return {
        ok: false,
        code: "open_order",
        orderId: existing?.id,
        checkoutUrl: existing?.provider_checkout_url ?? null,
        error: "لديك طلب دفع معلق. أكمله أو ألغِه أولًا.",
      };
    }
    return { ok: false, error: "تعذر إنشاء الطلب. حاول مرة أخرى." };
  }

  const orderId = order.id;

  /* 7. عناصر الطلب — لقطة كاملة، ثم حجوزات مؤقتة مربوطة بها. */
  const { data: inserted, error: itemsInsertError } = await svc
    .from("shopping_order_items")
    .insert(
      priced.map((item, index) => ({
        order_id: orderId,
        cart_item_id: cartItems[index]?.id ?? null,
        position: index,
        ...snapshotFields(item),
        gross_amount: item.quote.gross,
        net_amount: item.quote.net,
        tax_amount: item.quote.vat,
        tax_rate_bps: item.quote.rateBps,
      })),
    )
    .select("id, position");

  if (itemsInsertError || !inserted) {
    await abortOrder(orderId, "items_create_failed");
    return { ok: false, error: "تعذر تجهيز الطلب. حاول مرة أخرى." };
  }
  const byPosition = new Map(inserted.map((row) => [row.position, row.id]));

  for (let index = 0; index < priced.length; index += 1) {
    const item = priced[index];
    const orderItemId = byPosition.get(index);
    if (!orderItemId) {
      await abortOrder(orderId, "items_create_failed");
      return { ok: false, error: "تعذر تجهيز الطلب. حاول مرة أخرى." };
    }

    if (item.kind === "equipment") {
      const cartRow = cartItems[index];
      if (!cartRow?.equipment_id || !cartRow.rental_start_date || !cartRow.rental_end_date || !cartRow.rental_quantity || !cartRow.rental_method) {
        await abortOrder(orderId, "rental_invalid");
        return { ok: false, error: "بيانات إيجار المعدة غير مكتملة." };
      }
      const { data: rental, error: rentalError } = await svc
        .from("equipment_rentals")
        .insert({
          item_id: cartRow.equipment_id,
          slug_snapshot: item.item.slug,
          name_snapshot: item.item.name,
          price_per_day_halalas: item.item.pricePerDayHalalas,
          replacement_value_halalas: item.item.replacementValueHalalas,
          requires_security_note: item.item.requiresSecurityNote,
          start_date: cartRow.rental_start_date,
          end_date: cartRow.rental_end_date,
          days: item.days,
          quantity: cartRow.rental_quantity,
          method: cartRow.rental_method,
          delivery_address: cartRow.rental_delivery_address,
          customer_type: contact.customerType ?? "individual",
          customer_name: contact.customerName,
          company_name: contact.companyName || null,
          email: contact.email,
          phone: contact.phone,
          notes: contact.notes || null,
          national_id: cartRow.national_id!,
          national_id_expiry: cartRow.national_id_expiry!,
          agreement_version: cartRow.agreement_version!,
          agreement_accepted_at: cartRow.agreement_accepted_at!,
          signature_name: cartRow.signature_name!,
          signature_data_url: cartRow.signature_data_url!,
          signature_hash: cartRow.signature_hash!,
          status: "pending",
          payment_status: "created",
          provider: "moyasar",
          environment,
          rental_amount_halalas: item.item.pricePerDayHalalas * item.days * item.quantity,
          delivery_fee_halalas: item.deliveryFeeHalalas,
          total_amount_halalas: item.quote.gross,
          tax_rate_bps: item.quote.rateBps,
          currency: item.quote.currency,
          checkout_expires_at: holdExpires.toISOString(),
          shopping_order_id: orderId,
        } as any)
        .select("id")
        .maybeSingle();
      if (rentalError || !rental) {
        await abortOrder(orderId, "rental_create_failed");
        return { ok: false, error: "تعذر تثبيت حجز المعدة. حاول مرة أخرى." };
      }
      await svc.from("shopping_order_items").update({ equipment_id: cartRow.equipment_id, equipment_rental_id: rental.id }).eq("id", orderItemId);
      continue;
    }

    if (item.kind === "space") {
      const { data: booking, error: bookingError } = await svc
        .from("studio_space_bookings")
        .insert({
          space_id: item.space.id,
          space_name_snapshot: item.space.name.slice(0, 200),
          booking_date: item.bookingDate,
          start_time: item.startTime,
          end_time: item.endTime,
          customer_type: contact.customerType ?? "individual",
          customer_name: contact.customerName,
          company_name: contact.companyName || null,
          email: contact.email,
          phone: contact.phone,
          notes: contact.notes || null,
          status: "pending",
          payment_status: "created",
          provider: "moyasar",
          environment,
          duration_minutes: item.durationMinutes,
          net_amount: item.quote.net,
          tax_amount: item.quote.vat,
          total_amount: item.quote.gross,
          tax_rate_bps: item.quote.rateBps,
          currency: item.quote.currency,
          checkout_expires_at: holdExpires.toISOString(),
          shopping_order_id: orderId,
        })
        .select("id")
        .maybeSingle();

      if (bookingError || !booking) {
        await abortOrder(orderId, "booking_create_failed");
        return {
          ok: false,
          error: String(bookingError?.message ?? "").includes("space_slot_taken")
            ? "هذا الوقت لم يعد متاحًا. اختر وقتًا آخر."
            : "تعذر تثبيت موعد المساحة. حاول مرة أخرى.",
        };
      }

      const { error: linkError } = await svc
        .from("shopping_order_items")
        .update({ space_booking_id: booking.id })
        .eq("id", orderItemId);
      if (linkError) {
        await abortOrder(orderId, "items_create_failed");
        return { ok: false, error: "تعذر تجهيز الطلب. حاول مرة أخرى." };
      }
    } else if (item.kind === "course" && item.session) {
      if (!input.userId) {
        await abortOrder(orderId, "account_required");
        return { ok: false, error: "يلزم تسجيل الدخول لشراء الدورة." };
      }
      const { data: seatId, error: seatError } = await svc.rpc("claim_session_seat", {
        p_user_id: input.userId,
        p_course_id: item.course.id,
        p_session_id: item.session.id,
        p_mode: "purchase",
        p_hold_minutes: HOLD_TTL_MINUTES,
      });

      if (seatError || !seatId) {
        await abortOrder(orderId, "seat_claim_failed");
        return { ok: false, error: seatErrorMessage(seatError) };
      }

      const { data: seat } = await svc
        .from("course_session_seats")
        .select("id, status, payment_id, enrollment_id, user_id, course_id, session_id")
        .eq("id", seatId)
        .maybeSingle();

      if (
        !seat ||
        seat.user_id !== input.userId ||
        seat.course_id !== item.course.id ||
        seat.session_id !== item.session.id
      ) {
        await abortOrder(orderId, "seat_mismatch");
        return { ok: false, error: "تعذر تثبيت المقعد. حاول مرة أخرى." };
      }
      if (seat.status === "released" || seat.enrollment_id !== null) {
        await abortOrder(orderId, "seat_unavailable");
        return { ok: false, error: "هذا الموعد لم يعد متاحًا. اختر موعدًا آخر." };
      }
      if (seat.payment_id !== null) {
        await abortOrder(orderId, "seat_in_other_payment");
        return {
          ok: false,
          error: "لديك محاولة دفع جارية لهذه الدورة. أكملها أو انتظر انتهاء المهلة.",
        };
      }

      /* مقعد محجوز لطلب آخر (متصفح ثانٍ) — لا نشاركه. */
      const { data: rival } = await svc
        .from("shopping_order_items")
        .select("id")
        .eq("seat_id", seat.id)
        .eq("status", "pending")
        .neq("order_id", orderId)
        .limit(1)
        .maybeSingle();
      if (rival) {
        await abortOrder(orderId, "seat_in_other_order");
        return {
          ok: false,
          error: "لديك محاولة دفع جارية لهذه الدورة في جلسة أخرى. أكملها أولًا.",
        };
      }

      const { error: linkError } = await svc
        .from("shopping_order_items")
        .update({ seat_id: seat.id })
        .eq("id", orderItemId);
      if (linkError) {
        await svc
          .from("course_session_seats")
          .update({
            status: "released",
            released_at: new Date().toISOString(),
            hold_expires_at: null,
            release_reason: "order_cancelled",
          })
          .eq("id", seat.id)
          .eq("status", "held")
          .is("payment_id", null)
          .is("enrollment_id", null);
        await abortOrder(orderId, "items_create_failed");
        return { ok: false, error: "تعذر تجهيز الطلب. حاول مرة أخرى." };
      }
    }
  }

  /* 8. فاتورة واحدة للمبلغ كله. */
  let checkoutUrl: string;
  let providerPaymentId: string;
  try {
    const session = await providerFor("moyasar", input.fetcher).createCheckout({
      paymentId: orderId,
      idempotencyKey: order.idempotency_key,
      amount: gross,
      currency: "SAR",
      description: `سلة بيت المصور — ${priced.length} ${priced.length === 1 ? "عنصر" : "عناصر"}`,
      successUrl: absoluteUrl(`/order/${orderId}?return=1`),
      backUrl: absoluteUrl("/cart"),
      callbackUrl: absoluteUrl("/api/payments/webhook/moyasar"),
      expiresAt: new Date(Date.now() + CHECKOUT_TTL_MINUTES * 60_000),
      mode: environment,
    });
    checkoutUrl = session.checkoutUrl;
    providerPaymentId = session.providerPaymentId;
  } catch (error) {
    await abortOrder(orderId, "provider_checkout_failed");
    return {
      ok: false,
      code: "unavailable",
      error:
        error instanceof PaymentError
          ? error.message
          : "تعذر بدء الدفع الإلكتروني. حاول مرة أخرى.",
    };
  }

  const { error: saveError } = await svc
    .from("shopping_orders")
    .update({
      status: "pending",
      provider_payment_id: providerPaymentId,
      provider_checkout_url: checkoutUrl,
    })
    .eq("id", orderId)
    .eq("status", "created");

  if (saveError) {
    /* الفاتورة أُنشئت؛ لا نلغي الطلب حتى لا يدفع رابطًا لا نعرف عنه شيئًا.
       الإشعار يستطيع الوصول إليه عبر البيانات الوصفية، وصفحة الطلب تعرضه. */
    return { ok: false, error: "تعذر حفظ رابط الدفع. أعد المحاولة." };
  }

  /* بيانات التواصل تُحفظ على السلة للطلب القادم. */
  await svc
    .from("shopping_carts")
    .update({
      customer_type: contact.customerType,
      customer_name: contact.customerName || null,
      company_name: contact.companyName || null,
      email: contact.email || null,
      phone: contact.phone || null,
      notes: contact.notes || null,
    })
    .eq("id", input.cartId);

  return { ok: true, orderId, checkoutUrl };
}

/* ─────────────────────────── الإلغاء ─────────────────────────── */

/**
 * إلغاء بطلب المستخدم. إن كان للمزود رأي (دفعة بدأت) نسأله أولًا — لا
 * نلغي طلبًا مدفوعًا. الطلب المدفوع يُفعَّل ويعود `paid`.
 */
export async function cancelCartOrder(
  orderId: string,
  fetcher?: typeof fetch,
): Promise<{ ok: true; paid?: boolean } | { ok: false; error: string }> {
  const order = await loadOrder(orderId);
  if (!order) return { ok: false, error: "الطلب غير موجود." };

  if (order.status === "paid") return { ok: true, paid: true };
  if (!OPEN_STATUSES.includes(order.status as (typeof OPEN_STATUSES)[number])) {
    return { ok: false, error: "لم يعد هذا الطلب قابلًا للإلغاء." };
  }

  if (order.provider_payment_id) {
    let state;
    try {
      state = await providerFor(order.provider, fetcher).fetchState(order.provider_payment_id);
    } catch {
      return {
        ok: false,
        error: "تعذر التحقق من حالة الدفع الآن. أعد المحاولة بعد قليل.",
      };
    }
    if (state.status === "paid") {
      const result = await finalizeCartOrder(orderId, fetcher);
      if (result.outcome === "paid") return { ok: true, paid: true };
      return { ok: false, error: "وصلت الدفعة — تعذر تحديث الطلب الآن. تواصل معنا." };
    }
  }

  const closed = await closeOrder(orderId, "cancelled", "cancelled_by_customer");
  if (!closed) {
    const fresh = await loadOrder(orderId);
    if (fresh?.status === "paid") return { ok: true, paid: true };
    return { ok: false, error: "تغيّرت حالة الطلب. حدّث الصفحة." };
  }
  return { ok: true };
}

/* ────────────────────────── التحقق والتفعيل ────────────────────────── */

function normalizeStatus(status: string): CartOrderOutcome {
  switch (status) {
    case "failed":
      return { outcome: "failed", reason: "provider_failed" };
    case "cancelled":
      return { outcome: "cancelled" };
    case "expired":
      return { outcome: "expired" };
    case "refunded":
      return { outcome: "refunded" };
    default:
      return { outcome: "pending" };
  }
}

/**
 * يسأل المزود ويحسم الطلب. المصدر الوحيد الذي يكتب «مدفوع».
 * آمن للتكرار: الطلب المدفوع يعيد `paid` بلا أثر، والتفعيل نفسه ذرّي.
 */
export async function finalizeCartOrder(
  orderId: string,
  fetcher?: typeof fetch,
  options?: VerifyOptions,
): Promise<CartOrderOutcome> {
  let order = await loadOrder(orderId);
  if (!order) return { outcome: "unknown" };

  if (order.status === "paid") {
    if (options?.recheckRefund && order.provider_payment_id) {
      const saved = await recordRefundIfAny(
        "shopping_orders",
        order.id,
        order.provider,
        order.provider_payment_id,
        order.total_amount,
        fetcher,
      );
      if (!saved) return { outcome: options.reportUnverified ? "unverified" : "pending" };
    }
    return {
      outcome: "paid",
      orderId: order.id,
      partial: order.failure_code === "partial_fulfillment",
      afterCancel: order.failure_code.startsWith("paid_after_"),
    };
  }
  if (order.status === "refunded") return { outcome: "refunded" };
  if (order.status === "failed" && !order.provider_payment_id) {
    return { outcome: "failed", reason: order.failure_code || "failed" };
  }

  if (!order.provider_payment_id) {
    if (order.status === "created" && order.checkout_expires_at) {
      if (new Date(order.checkout_expires_at).getTime() <= Date.now()) {
        await closeOrder(order.id, "expired", "checkout_expired");
        return { outcome: "expired" };
      }
    }
    if (order.status === "cancelled") return { outcome: "cancelled" };
    if (order.status === "expired") return { outcome: "expired" };
    return { outcome: "pending" };
  }

  /* صف اختبار لا يُفعَّل بمفتاح إنتاج، والعكس — كالتدفق القائم. */
  if (order.environment !== paymentsMode()) {
    await closeOrder(order.id, "failed", "environment_mismatch");
    return { outcome: "failed", reason: "environment_mismatch" };
  }

  let state;
  try {
    state = await providerFor(order.provider, fetcher).fetchState(order.provider_payment_id);
  } catch {
    return { outcome: options?.reportUnverified ? "unverified" : "pending" };
  }

  /* المرجع والبيانات الوصفية: كلها يجب أن تشير إلى هذا الطلب. */
  if (state.providerPaymentId !== order.provider_payment_id) {
    await closeOrder(order.id, "failed", "reference_mismatch");
    return { outcome: "failed", reason: "reference_mismatch" };
  }
  if (state.metadataPaymentId !== order.id) {
    await closeOrder(order.id, "failed", "metadata_mismatch");
    return { outcome: "failed", reason: "metadata_mismatch" };
  }
  if (state.metadataEnvironment !== order.environment) {
    await closeOrder(order.id, "failed", "environment_mismatch");
    return { outcome: "failed", reason: "environment_mismatch" };
  }

  /* إلغاء/انتهاء/فشل سابق مع وصول المال: نسجّل المال ولا نفتح وصولًا. */
  if (order.status === "cancelled" || order.status === "failed" || order.status === "expired") {
    if (state.status === "paid") {
      const after =
        order.status === "cancelled"
          ? "paid_after_cancel"
          : order.status === "failed"
            ? "paid_after_failure"
            : "paid_after_expiry";
      await getServiceSupabase()
        .from("shopping_orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          provider_payment_id: order.provider_payment_id,
          failure_code: after,
        })
        .eq("id", order.id)
        .in("status", ["cancelled", "failed", "expired"]);
      return { outcome: "paid", orderId: order.id, partial: true, afterCancel: true };
    }
    if (order.status === "cancelled") return { outcome: "cancelled" };
    if (order.status === "expired") return { outcome: "expired" };
    return { outcome: "failed", reason: order.failure_code || "failed" };
  }

  if (state.status === "authorized") {
    await getServiceSupabase()
      .from("shopping_orders")
      .update({ status: "authorized" })
      .eq("id", order.id)
      .in("status", ["created", "pending"]);
    return { outcome: "pending" };
  }

  if (state.status !== "paid") {
    const normalized = normalizeStatus(state.status);
    const closed =
      normalized.outcome === "failed"
        ? await closeOrder(order.id, "failed", "provider_failed")
        : normalized.outcome === "cancelled"
          ? await closeOrder(order.id, "cancelled", "provider_cancelled")
          : normalized.outcome === "expired"
            ? await closeOrder(order.id, "expired", "provider_expired")
            : false;

    if (!closed) {
      /* سبقتنا دفعة أو إلغاء: نقرأ الحالة النهائية. */
      const fresh = await loadOrder(order.id);
      if (fresh?.status === "paid") {
        return {
          outcome: "paid",
          orderId: fresh.id,
          partial: fresh.failure_code === "partial_fulfillment",
          afterCancel: fresh.failure_code.startsWith("paid_after_"),
        };
      }
    }

    if (normalized.outcome === "refunded") {
      await getServiceSupabase()
        .from("shopping_orders")
        .update({ status: "refunded", refunded_at: new Date().toISOString() })
        .eq("id", order.id)
        .in("status", [...OPEN_STATUSES]);
    }
    return normalized;
  }

  /* الحارس الأخير قبل كتابة «مدفوع»: المبلغ والعملة. */
  if (state.amount !== order.total_amount || state.currency !== order.currency) {
    await closeOrder(
      order.id,
      "failed",
      state.amount !== order.total_amount ? "amount_mismatch" : "currency_mismatch",
    );
    return {
      outcome: "failed",
      reason: state.amount !== order.total_amount ? "amount_mismatch" : "currency_mismatch",
    };
  }

  if (state.refunded > 0) {
    await getServiceSupabase()
      .from("shopping_orders")
      .update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
        refunded_amount: Math.min(state.refunded, order.total_amount),
        provider_payment_id: order.provider_payment_id,
      })
      .eq("id", order.id)
      .in("status", [...OPEN_STATUSES]);
    await releaseHolds(order.id, "cancelled");
    return { outcome: "refunded" };
  }

  const { error: rpcError } = await getServiceSupabase().rpc("finalize_shopping_order", {
    p_order_id: order.id,
    p_provider_payment_id: order.provider_payment_id,
    p_environment: order.environment,
  });

  if (rpcError) {
    /* سباق إلغاء/تفعيل: نقرأ الحالة النهائية بدل تخمينها. */
    order = await loadOrder(order.id);
    if (order?.status === "paid") {
      return {
        outcome: "paid",
        orderId: order.id,
        partial: order.failure_code === "partial_fulfillment",
        afterCancel: order.failure_code.startsWith("paid_after_"),
      };
    }
    if (order?.status === "cancelled" || order?.status === "expired" || order?.status === "failed") {
      /* المال وصل لكن سبقنا إغلاق: نسجّله بلا وصول. */
      if (state.status === "paid") {
        const after = order.status === "cancelled" ? "paid_after_cancel" : "paid_after_expiry";
        await getServiceSupabase()
          .from("shopping_orders")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            provider_payment_id: order.provider_payment_id,
            failure_code: after,
          })
          .eq("id", order.id)
          .in("status", ["cancelled", "expired", "failed"]);
        return { outcome: "paid", orderId: order.id, partial: true, afterCancel: true };
      }
      return order.status === "expired" ? { outcome: "expired" } : { outcome: "cancelled" };
    }
    return { outcome: options?.reportUnverified ? "unverified" : "pending" };
  }

  const fresh = await loadOrder(order.id);
  return {
    outcome: "paid",
    orderId: order.id,
    partial: fresh?.failure_code === "partial_fulfillment",
    afterCancel: false,
  };
}

/* ───────────────────── مرجع المزود ← الطلب ───────────────────── */

/**
 * معرّف الطلب بمرجع المزود. إن لم يُحفظ المرجع (فشل تحديث نادر) نسأل
 * المزود ونقرأ معرّف الطلب من البيانات الوصفية التي وضعناها نحن.
 */
export async function shoppingOrderIdByProviderReference(
  provider: Provider,
  providerPaymentId: string,
  fetcher?: typeof fetch,
): Promise<string | null> {
  const svc = getServiceSupabase();
  const { data } = await svc
    .from("shopping_orders")
    .select("id")
    .eq("provider", provider)
    .eq("provider_payment_id", providerPaymentId)
    .limit(1)
    .maybeSingle();
  if (data) return data.id;

  let state;
  try {
    state = await providerFor(provider, fetcher).fetchState(providerPaymentId);
  } catch {
    return null;
  }
  if (!state.metadataPaymentId) return null;
  const { data: byMetadata } = await svc
    .from("shopping_orders")
    .select("id, provider_payment_id")
    .eq("id", state.metadataPaymentId)
    .maybeSingle();
  if (!byMetadata) return null;
  if (byMetadata.provider_payment_id && byMetadata.provider_payment_id !== providerPaymentId) {
    return null;
  }
  /* حفظ المرجع الذي فشل حفظه سابقًا — وإلا بقي الطلب بلا مرجع. */
  const { error } = await svc
    .from("shopping_orders")
    .update({ provider_payment_id: providerPaymentId })
    .eq("id", byMetadata.id)
    .is("provider_payment_id", null);
  if (error) {
    const { data: fresh } = await svc
      .from("shopping_orders")
      .select("id, provider_payment_id")
      .eq("id", byMetadata.id)
      .maybeSingle();
    if (fresh?.provider_payment_id !== providerPaymentId) return null;
  }
  return byMetadata.id;
}

/** هل يملك هذا المستخدم/الجهاز الطلب؟ */
export async function ownsShoppingOrder(
  orderId: string,
  userId: string | null,
): Promise<boolean> {
  const owner = await loadCartOrderOwner(orderId);
  return owner ? ownsOrder({ cart_id: owner.cartId, user_id: owner.userId }, userId) : false;
}
