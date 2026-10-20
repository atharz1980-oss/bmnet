import "server-only";

/**
 * بيت المصور — إيجار المعدات ودفعه
 * ---------------------------------
 * الإيجار = صف واحد يجمع الفترة والدفع والتوقيع (نمط حجوزات المساحات):
 *   1. المتصفح لا يقرر السعر ولا المدة ولا الحالة. يرسل المعدة والفترة
 *      والكمية وبيانات المستأجر والتوقيع، والمبلغ يُشتق هنا من سعر اليوم
 *      في القاعدة × الأيام × الكمية + رسوم التوصيل.
 *   2. «مؤكد» لا تُكتب إلا بعد تحقق الخادم من ميسر مباشرة. صفحة النجاح أو
 *      جسم الإشعار لا يؤكدان شيئًا.
 *   3. لا تسليم إلا بعد: دفع ناجح + تحقق هوية موثّق + اعتماد سند الضمان إن
 *      كانت المعدة تشترطه. الشروط تُفحص في `recordEquipmentInspection`.
 *   4. الكمية تُحجز بالمحاولة الحيّة أو بالدفع، وحارس القاعدة يمنع البيع
 *      المزدوج عند التزامن.
 *   5. لا ادعاء تكامل حكومي: الهوية تُسجَّل `pending` حتى يوثّق الموظف
 *      التحقق اليدوي من أصل الهوية عند التسليم.
 */

import { siteConfig } from "@/data/site";
import { loadCommerce } from "@/lib/payments/configuration";
import { paymentsMode } from "@/lib/payments/env";
import { MIN_CHARGE_HALALAS } from "@/lib/payments/money";
import { providerConfigured, providerFor, type VerifyOptions } from "@/lib/payments/purchase";
import { PaymentError } from "@/lib/payments/provider";
import { quoteCoursePrice, type Provider } from "@/lib/payments/settings";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Database, Json } from "@/types/database";

import { expireStaleEquipmentRentals, loadEquipmentAvailability, OPEN_RENTAL_PAYMENT_STATES } from "./availability";
import { EQUIPMENT_DELIVERY_FEE_HALALAS, RENTAL_CHECKOUT_TTL_MINUTES, validateRentalDates } from "./dates";
import { isRentalCustomerType, type RentalCustomerType } from "./customer-types";
import { identityCoversRental, isValidSaudiNationalId, signatureHash } from "./identity";

export { isRentalCustomerType, RENTAL_CUSTOMER_TYPES } from "./customer-types";
export type { RentalCustomerType } from "./customer-types";

export const EQUIPMENT_RENTAL_ERRORS = {
  unavailable: "الدفع الإلكتروني غير متاح حاليًا. تواصل معنا لتأكيد الإيجار.",
  notFound: "المعدة غير موجودة أو غير متاحة للإيجار حاليًا.",
  dates: "راجع تاريخ البداية والنهاية.",
  quantity: "الكمية المطلوبة غير صالحة.",
  soldOut: "الكمية المتاحة من هذه المعدة لا تكفي في هذه الفترة. اختر فترة أو كمية أخرى.",
  noAgreement: "عقد الإيجار غير متاح حاليًا. تواصل معنا.",
  identity: "رقم الهوية غير صالح — أدخل هوية وطنية أو إقامة سعودية صحيحة.",
  identityExpiry: "تاريخ انتهاء الهوية يجب أن يغطي آخر يوم من مدة الإيجار.",
  agreement: "يجب قراءة عقد الإيجار والموافقة عليه قبل الدفع.",
  signature: "الاسم في التوقيع يجب أن يطابق اسم المستأجر.",
  delivery: "أدخل عنوان التوصيل (خمسة أحرف على الأقل).",
  minimumCharge: "قيمة الإيجار أقل من الحد الأدنى للدفع الإلكتروني.",
  priceChanged: "تغيّرت قيمة الإيجار. حدّث الصفحة ثم أعد المحاولة.",
  inProgress: "لديك محاولة دفع جارية لهذه المعدة. أكملها أو انتظر قليلًا ثم أعد المحاولة.",
  invalidData: "راجع البيانات المدخلة: الاسم والجوال والبريد والنوع.",
  failed: "تعذر بدء عملية الدفع. حاول مرة أخرى.",
} as const;

export type EquipmentRentalOutcome =
  | "paid"
  | "pending"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded"
  | "unverified"
  | "unknown";

export interface EquipmentRentalRow {
  id: string;
  item_id: string;
  item_name_snapshot: string;
  quantity: number;
  start_date: string;
  end_date: string;
  method: "pickup" | "delivery";
  delivery_address: string | null;
  delivery_fee_halalas: number;
  customer_type: string;
  customer_name: string;
  company_name: string | null;
  email: string;
  phone: string;
  notes: string | null;
  national_id: string;
  national_id_expiry: string | null;
  identity_status: "unverified" | "pending" | "verified" | "failed";
  identity_check_method: string;
  identity_reference: string | null;
  identity_verified_at: string | null;
  agreement_version: number;
  agreement_accepted_at: string;
  signature_name: string;
  signature_hash: string;
  signature_ip: string | null;
  status: "pending" | "confirmed" | "out_on_rent" | "returned" | "closed" | "cancelled" | "expired";
  payment_status: string;
  provider: "moyasar";
  environment: "test" | "production";
  rental_days: number;
  rental_amount_halalas: number;
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
  refunded_at: string | null;
  refunded_amount: number;
  failure_code: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  admin_note: string | null;
  receipt_token: string;
  customer_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

const RENTAL_COLUMNS =
  "id, item_id, item_name_snapshot, quantity, start_date, end_date, method, delivery_address, delivery_fee_halalas, customer_type, customer_name, company_name, email, phone, notes, national_id, national_id_expiry, identity_status, identity_check_method, identity_reference, identity_verified_at, agreement_version, agreement_accepted_at, signature_name, signature_hash, signature_ip, status, payment_status, provider, environment, rental_days, rental_amount_halalas, net_amount, tax_amount, total_amount, tax_rate_bps, currency, idempotency_key, provider_payment_id, provider_checkout_url, checkout_expires_at, paid_at, failed_at, refunded_at, refunded_amount, failure_code, cancelled_at, cancelled_by, admin_note, receipt_token, customer_notified_at, created_at, updated_at";

interface ItemRow {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  price_per_day_halalas: number;
  replacement_value_halalas: number;
  requires_security_note: boolean;
  published: boolean;
  status: string;
}

function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}

async function recordAudit(input: {
  rentalId: string | null;
  itemId: string | null;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  actorId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await getServiceSupabase().from("equipment_audit_events").insert({
    rental_id: input.rentalId,
    item_id: input.itemId,
    event_type: input.eventType,
    from_status: input.fromStatus ?? "",
    to_status: input.toStatus ?? "",
    actor_id: input.actorId ?? null,
    detail: (input.detail ?? {}) as Json,
  });
}

/** سند الضمان يُنشأ «غير مطلوب» فقط — لا يُدّعى طلب أو اعتماد لم يحدث. */
async function ensureSecurityNote(rental: EquipmentRentalRow, item: ItemRow): Promise<void> {
  if (!item.requires_security_note) return;
  const amount = Math.min(999_999_999, item.replacement_value_halalas * rental.quantity);
  await getServiceSupabase()
    .from("equipment_security_notes")
    .upsert(
      {
        rental_id: rental.id,
        provider: "nafith",
        amount_halalas: amount,
        status: "not_requested",
      },
      { onConflict: "rental_id", ignoreDuplicates: true },
    );
}

/* ─────────────────────────── بدء الإيجار ─────────────────────────── */

export interface EquipmentRentalInput {
  itemSlug: string;
  startDate: string;
  endDate: string;
  quantity: number;
  /** ما رآه المتصفح بالريال — حارس تغيّر السعر. */
  displayedTotalSar: number | null;
  method: "pickup" | "delivery";
  deliveryAddress: string | null;
  customerType: RentalCustomerType;
  customerName: string;
  companyName: string | null;
  email: string;
  phone: string;
  notes: string | null;
  nationalId: string;
  nationalIdExpiry: string;
  agreementAccepted: boolean;
  signatureName: string;
  signatureIp: string | null;
}

/** هل المحاولة المفتوحة ما زالت تصلح لنفس الطلب؟ */
function stillPayable(
  rental: EquipmentRentalRow,
  gross: number,
  mode: string,
  request: { startDate: string; endDate: string; quantity: number; method: string },
): boolean {
  return (
    rental.provider === "moyasar" &&
    rental.environment === mode &&
    rental.total_amount === gross &&
    rental.start_date === request.startDate &&
    rental.end_date === request.endDate &&
    rental.quantity === request.quantity &&
    rental.method === request.method &&
    rental.provider_checkout_url !== null &&
    rental.checkout_expires_at !== null &&
    new Date(rental.checkout_expires_at).getTime() > Date.now()
  );
}

export async function startEquipmentRental(
  input: EquipmentRentalInput,
  fetcher?: typeof fetch,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const svc = getServiceSupabase();
  if (!isRentalCustomerType(input.customerType)) {
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.invalidData };
  }

  /* 1. المعدة منشورة وقابلة للتأجير. */
  const { data: itemData } = await svc
    .from("equipment_items")
    .select(
      "id, name, slug, quantity, price_per_day_halalas, replacement_value_halalas, requires_security_note, published, status",
    )
    .eq("slug", input.itemSlug)
    .maybeSingle();
  const item = itemData as ItemRow | null;
  if (!item || !item.published || !["available", "rented"].includes(item.status)) {
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.notFound };
  }
  if (!providerConfigured("moyasar")) return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.unavailable };

  /* 2. الفترة والكمية. */
  const dates = validateRentalDates(input.startDate, input.endDate);
  if (!dates.ok) return { ok: false, error: dates.error ?? EQUIPMENT_RENTAL_ERRORS.dates };
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > item.quantity) {
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.quantity };
  }
  if (input.method !== "pickup" && input.method !== "delivery") {
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.invalidData };
  }
  const deliveryAddress = input.method === "delivery" ? (input.deliveryAddress ?? "").trim() : null;
  if (input.method === "delivery" && (!deliveryAddress || deliveryAddress.length < 5)) {
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.delivery };
  }

  /* 3. الهوية والتوقيع — قبل أي كتابة. */
  if (!isValidSaudiNationalId(input.nationalId)) {
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.identity };
  }
  if (!identityCoversRental(input.nationalIdExpiry, input.endDate)) {
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.identityExpiry };
  }
  if (!input.agreementAccepted) return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.agreement };
  const cleanName = input.customerName.replace(/\s+/g, " ").trim();
  const cleanSignature = input.signatureName.replace(/\s+/g, " ").trim();
  if (cleanSignature !== cleanName) return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.signature };

  const { data: agreementData } = await svc
    .from("equipment_agreements")
    .select("version")
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!agreementData) return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.noAgreement };
  const agreementVersion = agreementData.version;

  /* 4. الكمية المتاحة في الفترة — قبل إنشاء أي صف. */
  const availability = await loadEquipmentAvailability(item.id, input.startDate, input.endDate);
  if (!availability || availability.remaining < input.quantity) {
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.soldOut };
  }

  /* 5. التسعير من القاعدة والإعداد المعتمد. */
  const deliveryFee = input.method === "delivery" ? EQUIPMENT_DELIVERY_FEE_HALALAS : 0;
  const rentalAmount = item.price_per_day_halalas * dates.days * input.quantity;
  const gross = rentalAmount + deliveryFee;
  let quote;
  try {
    const { settings } = await loadCommerce();
    quote = quoteCoursePrice(gross, settings);
  } catch {
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.unavailable };
  }
  if (quote.gross < MIN_CHARGE_HALALAS) return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.minimumCharge };

  const expected =
    input.displayedTotalSar !== null && Number.isFinite(input.displayedTotalSar)
      ? Math.round(input.displayedTotalSar * 100)
      : Number.NaN;
  if (!Number.isFinite(expected) || quote.gross !== expected) {
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.priceChanged };
  }

  const mode = paymentsMode();
  const request = {
    startDate: input.startDate,
    endDate: input.endDate,
    quantity: input.quantity,
    method: input.method,
  };

  /* 6. محاولة مفتوحة لنفس البريد والمعدة: نعيد رابطها إن طابقت الطلب. */
  const { data: openRows } = await svc
    .from("equipment_rentals")
    .select(RENTAL_COLUMNS)
    .eq("item_id", item.id)
    .eq("email", input.email)
    .eq("status", "pending")
    .in("payment_status", [...OPEN_RENTAL_PAYMENT_STATES])
    .limit(1);
  const existing = ((openRows ?? [])[0] as EquipmentRentalRow | undefined) ?? null;
  if (existing) {
    if (stillPayable(existing, quote.gross, mode, request)) {
      return { ok: true, checkoutUrl: existing.provider_checkout_url as string };
    }
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.inProgress };
  }

  /* 7. صف جديد قبل نداء المزود: المعرّف يُرسل إلى ميسر مرجعًا. */
  const acceptedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + RENTAL_CHECKOUT_TTL_MINUTES * 60_000);
  const hash = signatureHash({
    agreementVersion,
    itemId: item.id,
    nationalId: input.nationalId,
    signatureName: cleanSignature,
    startDate: input.startDate,
    endDate: input.endDate,
    quantity: input.quantity,
    acceptedAt,
  });
  const { data: created, error: insertError } = await svc
    .from("equipment_rentals")
    .insert({
      item_id: item.id,
      item_name_snapshot: item.name.slice(0, 200),
      quantity: input.quantity,
      start_date: input.startDate,
      end_date: input.endDate,
      method: input.method,
      delivery_address: deliveryAddress,
      delivery_fee_halalas: deliveryFee,
      customer_type: input.customerType,
      customer_name: cleanName,
      company_name: input.companyName,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      national_id: input.nationalId,
      national_id_expiry: input.nationalIdExpiry,
      identity_status: "pending",
      identity_check_method: "manual",
      agreement_version: agreementVersion,
      agreement_accepted_at: acceptedAt,
      signature_name: cleanSignature,
      signature_hash: hash,
      signature_ip: input.signatureIp,
      status: "pending",
      payment_status: "created",
      provider: "moyasar",
      environment: mode,
      rental_days: dates.days,
      rental_amount_halalas: rentalAmount,
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
    if (String(insertError?.message ?? "").includes("equipment_quantity_exhausted")) {
      return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.soldOut };
    }
    const raced = await svc
      .from("equipment_rentals")
      .select(RENTAL_COLUMNS)
      .eq("item_id", item.id)
      .eq("email", input.email)
      .eq("status", "pending")
      .in("payment_status", [...OPEN_RENTAL_PAYMENT_STATES])
      .limit(1);
    const other = ((raced.data ?? [])[0] as EquipmentRentalRow | undefined) ?? null;
    if (other && stillPayable(other, quote.gross, mode, request)) {
      return { ok: true, checkoutUrl: other.provider_checkout_url as string };
    }
    return { ok: false, error: other ? EQUIPMENT_RENTAL_ERRORS.inProgress : EQUIPMENT_RENTAL_ERRORS.failed };
  }

  const rentalRow = {
    id: created.id,
    item_id: item.id,
    quantity: input.quantity,
  } as EquipmentRentalRow;
  await ensureSecurityNote(rentalRow, item);
  await recordAudit({
    rentalId: created.id,
    itemId: item.id,
    eventType: "rental_created",
    toStatus: "pending",
    detail: {
      total: quote.gross,
      days: dates.days,
      quantity: input.quantity,
      agreementVersion,
    },
  });

  /* 8. فاتورة ميسر المستضافة — المحوّل القائم نفسه. */
  try {
    const session = await providerFor("moyasar", fetcher).createCheckout({
      paymentId: created.id,
      idempotencyKey: created.idempotency_key,
      amount: quote.gross,
      currency: "SAR",
      description: `${item.name} — ${input.startDate} إلى ${input.endDate} — بيت المصور`.slice(0, 250),
      successUrl: absoluteUrl(`/rentals/success?r=${created.id}`),
      backUrl: absoluteUrl(`/rentals/${item.slug}`),
      callbackUrl: absoluteUrl("/api/payments/webhook/moyasar"),
      expiresAt,
      mode,
    });
    const { data: saved, error: updateError } = await svc
      .from("equipment_rentals")
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
    await svc
      .from("equipment_rentals")
      .update({
        payment_status: "failed",
        status: "expired",
        failed_at: new Date().toISOString(),
        failure_code: error instanceof PaymentError ? error.code.slice(0, 64) : "checkout_failed",
      })
      .eq("id", created.id)
      .eq("status", "pending");
    await recordAudit({
      rentalId: created.id,
      itemId: item.id,
      eventType: "checkout_failed",
      fromStatus: "pending",
      toStatus: "expired",
    });
    return { ok: false, error: EQUIPMENT_RENTAL_ERRORS.failed };
  }
}

/* ─────────────────────────── التحقق الموثوق ─────────────────────────── */

async function markRentalFailed(rentalId: string, code: string): Promise<void> {
  await getServiceSupabase()
    .from("equipment_rentals")
    .update({
      payment_status: "failed",
      status: "expired",
      failed_at: new Date().toISOString(),
      failure_code: code.slice(0, 64),
    })
    .eq("id", rentalId)
    .eq("status", "pending");
}

async function expireRental(rentalId: string): Promise<void> {
  await getServiceSupabase()
    .from("equipment_rentals")
    .update({ payment_status: "expired", status: "expired" })
    .eq("id", rentalId)
    .eq("status", "pending");
}

/**
 * يسأل ميسر عن الإيجار ويحسم حالته. يُنادى من الإشعار ومن صفحة النجاح،
 * وكلاهما يصل إلى النتيجة نفسها. آمن للتكرار والتزامن.
 */
export async function verifyEquipmentRental(
  rentalId: string,
  fetcher?: typeof fetch,
  options?: VerifyOptions,
): Promise<EquipmentRentalOutcome> {
  const svc = getServiceSupabase();
  const { data } = await svc.from("equipment_rentals").select(RENTAL_COLUMNS).eq("id", rentalId).maybeSingle();
  if (!data) return "unknown";
  const rental = data as EquipmentRentalRow;

  if (rental.payment_status === "refunded") return "refunded";
  if (rental.payment_status === "paid") return "paid";

  if (!rental.provider_payment_id) {
    if (rental.payment_status === "failed") return "failed";
    if (rental.payment_status === "cancelled" || rental.status === "cancelled") return "cancelled";
    if (rental.payment_status === "expired") return "expired";
    if (rental.checkout_expires_at && new Date(rental.checkout_expires_at).getTime() < Date.now()) {
      await expireRental(rental.id);
      return "expired";
    }
    return "pending";
  }

  if (rental.environment !== paymentsMode()) {
    await markRentalFailed(rental.id, "environment_mismatch");
    return "failed";
  }

  let state;
  try {
    state = await providerFor(rental.provider, fetcher).fetchState(rental.provider_payment_id);
  } catch {
    if (options?.reportUnverified) return "unverified";
    return "pending";
  }

  if (state.providerPaymentId !== rental.provider_payment_id) {
    await markRentalFailed(rental.id, "reference_mismatch");
    return "failed";
  }

  if (state.status === "paid") {
    if (state.amount !== rental.total_amount) {
      await markRentalFailed(rental.id, "amount_mismatch");
      return "failed";
    }
    if (state.currency !== rental.currency) {
      await markRentalFailed(rental.id, "currency_mismatch");
      return "failed";
    }
    if (state.metadataPaymentId !== rental.id) {
      await markRentalFailed(rental.id, "metadata_mismatch");
      return "failed";
    }
    if (state.metadataEnvironment !== rental.environment) {
      await markRentalFailed(rental.id, "environment_mismatch");
      return "failed";
    }
    if (state.refunded > 0) {
      const at = new Date().toISOString();
      await svc
        .from("equipment_rentals")
        .update({
          payment_status: "refunded",
          status: "cancelled",
          cancelled_at: at,
          refunded_at: at,
          refunded_amount: state.refunded,
        })
        .eq("id", rental.id)
        .neq("payment_status", "refunded");
      await recordAudit({
        rentalId: rental.id,
        itemId: rental.item_id,
        eventType: "payment_refunded",
        fromStatus: rental.status,
        toStatus: "cancelled",
        detail: { refunded: state.refunded },
      });
      return "refunded";
    }
    return markRentalPaid(rental);
  }

  if (state.status === "authorized") {
    await svc
      .from("equipment_rentals")
      .update({ payment_status: "authorized" })
      .eq("id", rental.id)
      .eq("status", "pending")
      .in("payment_status", [...OPEN_RENTAL_PAYMENT_STATES]);
    return "pending";
  }

  if (state.status === "failed" || state.status === "cancelled" || state.status === "expired") {
    await svc
      .from("equipment_rentals")
      .update({
        payment_status: state.status,
        status: "expired",
        ...(state.status === "failed"
          ? { failed_at: new Date().toISOString(), failure_code: "provider_failed" }
          : {}),
      })
      .eq("id", rental.id)
      .eq("status", "pending");
    return state.status;
  }

  return "pending";
}

/**
 * المال وصل وطابق: «مؤكد» بشروط. لو سبقت دفعة متأخرة إلى فترة استُهلكت
 * فلا تُنتزع الكمية: يُسجّل الدفع مع الإلغاء وملاحظة تستدعي المراجعة.
 */
async function markRentalPaid(rental: EquipmentRentalRow): Promise<EquipmentRentalOutcome> {
  const svc = getServiceSupabase();
  const paidAt = new Date().toISOString();
  const { data: confirmed } = await svc
    .from("equipment_rentals")
    .update({ payment_status: "paid", status: "confirmed", paid_at: paidAt })
    .eq("id", rental.id)
    .eq("status", "pending")
    .select("id");
  if ((confirmed ?? []).length === 1) {
    const { data: item } = await svc
      .from("equipment_items")
      .select("id, name, slug, quantity, price_per_day_halalas, replacement_value_halalas, requires_security_note, published, status")
      .eq("id", rental.item_id)
      .maybeSingle();
    if (item) await ensureSecurityNote({ ...rental, payment_status: "paid", status: "confirmed" }, item as ItemRow);
    await recordAudit({
      rentalId: rental.id,
      itemId: rental.item_id,
      eventType: "payment_paid",
      fromStatus: "pending",
      toStatus: "confirmed",
      detail: { total: rental.total_amount },
    });
    return "paid";
  }

  await svc
    .from("equipment_rentals")
    .update({
      payment_status: "paid",
      status: "cancelled",
      paid_at: paidAt,
      cancelled_at: paidAt,
      admin_note: "دفعة مؤكدة بعد تعذّر تأكيد الفترة — تحتاج مراجعة واسترداد.",
    })
    .eq("id", rental.id)
    .in("payment_status", [...OPEN_RENTAL_PAYMENT_STATES, "failed", "expired"]);
  await recordAudit({
    rentalId: rental.id,
    itemId: rental.item_id,
    eventType: "payment_paid_unallocated",
    fromStatus: rental.status,
    toStatus: "cancelled",
    detail: { total: rental.total_amount },
  });
  return "paid";
}

/** معرّف الإيجار بمرجع المزود — لفرع الإشعار في المسار الموحّد. */
export async function equipmentRentalIdByProviderReference(
  provider: string,
  providerPaymentId: string,
): Promise<string | null> {
  const { data } = await getServiceSupabase()
    .from("equipment_rentals")
    .select("id")
    .eq("provider", provider as Provider)
    .eq("provider_payment_id", providerPaymentId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/* ─────────────────────── الإيصال وقوائم الإدارة ─────────────────────── */

export interface EquipmentRentalReceipt {
  outcome: EquipmentRentalOutcome;
  rentalId: string;
  receiptToken: string;
  itemName: string;
  startDate: string;
  endDate: string;
  days: number;
  quantity: number;
  method: string;
  deliveryFee: number;
  rentalAmount: number;
  totalAmount: number;
  taxAmount: number;
  status: string;
  paymentStatus: string;
  identityStatus: string;
  customerName: string;
  email: string;
  paidAt: string | null;
  securityNoteStatus: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
}

async function buildReceipt(
  rental: EquipmentRentalRow,
  outcome: EquipmentRentalOutcome,
): Promise<EquipmentRentalReceipt> {
  const { data: note } = await getServiceSupabase()
    .from("equipment_security_notes")
    .select("status")
    .eq("rental_id", rental.id)
    .maybeSingle();
  return {
    outcome,
    rentalId: rental.id,
    receiptToken: rental.receipt_token,
    itemName: rental.item_name_snapshot,
    startDate: rental.start_date,
    endDate: rental.end_date,
    days: rental.rental_days,
    quantity: rental.quantity,
    method: rental.method,
    deliveryFee: rental.delivery_fee_halalas,
    rentalAmount: rental.rental_amount_halalas,
    totalAmount: rental.total_amount,
    taxAmount: rental.tax_amount,
    status: rental.status,
    paymentStatus: rental.payment_status,
    identityStatus: rental.identity_status,
    customerName: rental.customer_name,
    email: rental.email,
    paidAt: rental.paid_at,
    securityNoteStatus: note?.status ?? null,
    checkoutUrl:
      rental.payment_status === "pending" ? rental.provider_checkout_url : null,
    expiresAt: rental.checkout_expires_at,
  };
}

/** صفحة النجاح: تحقّق ثم إيصال بالمعرّف (المعرّف نفسه غير قابل للتخمين). */
export async function loadEquipmentRentalReceipt(
  rentalId: string,
  fetcher?: typeof fetch,
): Promise<EquipmentRentalReceipt | null> {
  const outcome = await verifyEquipmentRental(rentalId, fetcher);
  const { data } = await getServiceSupabase()
    .from("equipment_rentals")
    .select(RENTAL_COLUMNS)
    .eq("id", rentalId)
    .maybeSingle();
  if (!data) return null;
  return buildReceipt(data as EquipmentRentalRow, outcome);
}

/** الإيصال العام: لا يُقرأ إلا بمفتاح `receipt_token` العشوائي. */
export async function loadEquipmentRentalReceiptByToken(
  token: string,
): Promise<EquipmentRentalReceipt | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;
  const { data } = await getServiceSupabase()
    .from("equipment_rentals")
    .select(RENTAL_COLUMNS)
    .eq("receipt_token", token)
    .maybeSingle();
  if (!data) return null;
  const rental = data as EquipmentRentalRow;
  const outcome: EquipmentRentalOutcome =
    rental.payment_status === "paid"
      ? "paid"
      : rental.payment_status === "refunded"
        ? "refunded"
        : rental.status === "cancelled"
          ? "cancelled"
          : rental.status === "expired" || rental.payment_status === "expired"
            ? "expired"
            : rental.payment_status === "failed"
              ? "failed"
              : "pending";
  return buildReceipt(rental, outcome);
}

/* ───────────────────── إجراءات اللوحة (تُحمى في actions) ───────────────────── */

async function loadRental(rentalId: string): Promise<EquipmentRentalRow | null> {
  const { data } = await getServiceSupabase()
    .from("equipment_rentals")
    .select(RENTAL_COLUMNS)
    .eq("id", rentalId)
    .maybeSingle();
  return (data as EquipmentRentalRow | null) ?? null;
}

export type EquipmentAdminResult = { ok: true } | { ok: false; error: string };

export async function verifyRentalIdentity(
  rentalId: string,
  actorId: string,
  input: { reference: string; note: string | null },
): Promise<EquipmentAdminResult> {
  const rental = await loadRental(rentalId);
  if (!rental) return { ok: false, error: "الإيجار غير موجود." };
  if (rental.identity_status === "verified") return { ok: true };
  const at = new Date().toISOString();
  const { error } = await getServiceSupabase()
    .from("equipment_rentals")
    .update({
      identity_status: "verified",
      identity_check_method: "manual",
      identity_reference: input.reference.slice(0, 200),
      identity_verified_at: at,
      admin_note: input.note,
    })
    .eq("id", rentalId);
  if (error) return { ok: false, error: "تعذر توثيق التحقق من الهوية." };
  await recordAudit({
    rentalId,
    itemId: rental.item_id,
    eventType: "identity_verified",
    actorId,
    detail: { method: "manual", reference: input.reference.slice(0, 80) },
  });
  return { ok: true };
}

export async function failRentalIdentity(
  rentalId: string,
  actorId: string,
  note: string,
): Promise<EquipmentAdminResult> {
  const rental = await loadRental(rentalId);
  if (!rental) return { ok: false, error: "الإيجار غير موجود." };
  const { error } = await getServiceSupabase()
    .from("equipment_rentals")
    .update({ identity_status: "failed", admin_note: note.slice(0, 1000) })
    .eq("id", rentalId);
  if (error) return { ok: false, error: "تعذر تسجيل تعذّر التحقق." };
  await recordAudit({
    rentalId,
    itemId: rental.item_id,
    eventType: "identity_failed",
    actorId,
    detail: { note: note.slice(0, 200) },
  });
  return { ok: true };
}

export interface SecurityNoteInput {
  status: "requested" | "approved" | "rejected" | "expired" | "released";
  providerReference: string;
  providerStatusText: string;
  note: string | null;
}

export async function updateSecurityNote(
  rentalId: string,
  actorId: string,
  input: SecurityNoteInput,
): Promise<EquipmentAdminResult> {
  const rental = await loadRental(rentalId);
  if (!rental) return { ok: false, error: "الإيجار غير موجود." };
  if (!input.providerReference.trim()) {
    return { ok: false, error: "أدخل مرجع عملية نافذ — لا يُسجَّل السند بلا مرجع." };
  }
  const { data: note } = await getServiceSupabase()
    .from("equipment_security_notes")
    .select("id, status")
    .eq("rental_id", rentalId)
    .maybeSingle();
  if (!note) return { ok: false, error: "لا يوجد سجل سند ضمان لهذا الإيجار." };

  const at = new Date().toISOString();
  const patch: Database["public"]["Tables"]["equipment_security_notes"]["Update"] = {
    status: input.status,
    provider_reference: input.providerReference.trim().slice(0, 200),
    provider_status_text: input.providerStatusText.trim().slice(0, 300),
    note: input.note,
  };
  if (input.status === "requested") patch.requested_at = at;
  if (input.status === "approved") patch.approved_at = at;
  if (input.status === "rejected") patch.rejected_at = at;
  if (input.status === "expired") patch.expired_at = at;
  if (input.status === "released") patch.released_at = at;

  const { error } = await getServiceSupabase()
    .from("equipment_security_notes")
    .update(patch)
    .eq("id", note.id);
  if (error) return { ok: false, error: "تعذر تحديث سند الضمان." };
  await recordAudit({
    rentalId,
    itemId: rental.item_id,
    eventType: "security_note_changed",
    fromStatus: note.status,
    toStatus: input.status,
    actorId,
    detail: { reference: input.providerReference.slice(0, 80) },
  });
  return { ok: true };
}

export interface EquipmentInspectionInput {
  serialNumber: string;
  checklist: { label: string; ok: boolean; note: string }[];
  accessories: string;
  media: { path: string; kind: "image" | "video" }[];
  acknowledgedByName: string;
  acknowledgedById: string;
  damageNote: string | null;
}

async function saveInspection(
  rental: EquipmentRentalRow,
  actorId: string,
  kind: "handover" | "return",
  input: EquipmentInspectionInput,
): Promise<EquipmentAdminResult> {
  if (!isValidSaudiNationalId(input.acknowledgedById)) {
    return { ok: false, error: "رقم هوية المستلم غير صالح." };
  }
  const { error } = await getServiceSupabase().from("equipment_rental_inspections").insert({
    rental_id: rental.id,
    kind,
    serial_number: input.serialNumber.slice(0, 120),
    checklist: input.checklist.slice(0, 60),
    accessories: input.accessories.slice(0, 2000),
    media: input.media.slice(0, 30),
    acknowledged_by_name: input.acknowledgedByName.slice(0, 120),
    acknowledged_by_id: input.acknowledgedById,
    damage_note: input.damageNote,
    actor_id: actorId,
  });
  if (error) {
    if (String(error.message).includes("duplicate key")) {
      return { ok: false, error: "محضر هذا النوع مسجّل مسبقًا لهذا الإيجار." };
    }
    return { ok: false, error: "تعذر حفظ المحضر." };
  }
  return { ok: true };
}

/** محضر التسليم: بوابات الدفع والهوية وسند الضمان ثم الحالة. */
export async function recordEquipmentHandover(
  rentalId: string,
  actorId: string,
  input: EquipmentInspectionInput,
): Promise<EquipmentAdminResult> {
  const rental = await loadRental(rentalId);
  if (!rental) return { ok: false, error: "الإيجار غير موجود." };
  if (rental.status !== "confirmed" || rental.payment_status !== "paid") {
    return { ok: false, error: "لا تسليم قبل تأكيد الدفع." };
  }
  if (rental.identity_status !== "verified") {
    return { ok: false, error: "لا تسليم قبل توثيق التحقق من الهوية." };
  }
  const { data: item } = await getServiceSupabase()
    .from("equipment_items")
    .select("requires_security_note")
    .eq("id", rental.item_id)
    .maybeSingle();
  if (item?.requires_security_note) {
    const { data: note } = await getServiceSupabase()
      .from("equipment_security_notes")
      .select("status")
      .eq("rental_id", rentalId)
      .maybeSingle();
    if (note?.status !== "approved") {
      return { ok: false, error: "لا تسليم قبل اعتماد سند الضمان من نافذ." };
    }
  }

  const saved = await saveInspection(rental, actorId, "handover", input);
  if (!saved.ok) return saved;

  const { error } = await getServiceSupabase()
    .from("equipment_rentals")
    .update({ status: "out_on_rent" })
    .eq("id", rentalId)
    .eq("status", "confirmed");
  if (error) return { ok: false, error: "حُفظ المحضر لكن تعذّر تحديث حالة الإيجار." };
  await getServiceSupabase().from("equipment_items").update({ status: "rented" }).eq("id", rental.item_id);
  await recordAudit({
    rentalId,
    itemId: rental.item_id,
    eventType: "handover_recorded",
    fromStatus: "confirmed",
    toStatus: "out_on_rent",
    actorId,
    detail: { serial: input.serialNumber.slice(0, 80) },
  });
  return { ok: true };
}

/** محضر الاسترجاع: لا يُسجّل إلا والإيجار لدى العميل. */
export async function recordEquipmentReturn(
  rentalId: string,
  actorId: string,
  input: EquipmentInspectionInput,
): Promise<EquipmentAdminResult> {
  const rental = await loadRental(rentalId);
  if (!rental) return { ok: false, error: "الإيجار غير موجود." };
  if (rental.status !== "out_on_rent") {
    return { ok: false, error: "لا استرجاع قبل تسليم المعدة للعميل." };
  }

  const saved = await saveInspection(rental, actorId, "return", input);
  if (!saved.ok) return saved;

  const { error } = await getServiceSupabase()
    .from("equipment_rentals")
    .update({ status: "returned" })
    .eq("id", rentalId)
    .eq("status", "out_on_rent");
  if (error) return { ok: false, error: "حُفظ المحضر لكن تعذّر تحديث حالة الإيجار." };
  await getServiceSupabase().from("equipment_items").update({ status: "available" }).eq("id", rental.item_id);
  await recordAudit({
    rentalId,
    itemId: rental.item_id,
    eventType: "return_recorded",
    fromStatus: "out_on_rent",
    toStatus: "returned",
    actorId,
    detail: { damage: input.damageNote ?? "" },
  });
  return { ok: true };
}

export async function closeEquipmentRental(
  rentalId: string,
  actorId: string,
): Promise<EquipmentAdminResult> {
  const rental = await loadRental(rentalId);
  if (!rental) return { ok: false, error: "الإيجار غير موجود." };
  if (rental.status !== "returned") return { ok: false, error: "لا يُغلق الإيجار قبل تسجيل الاسترجاع." };
  const { error } = await getServiceSupabase()
    .from("equipment_rentals")
    .update({ status: "closed" })
    .eq("id", rentalId)
    .eq("status", "returned");
  if (error) return { ok: false, error: "تعذر إغلاق الإيجار." };
  await recordAudit({
    rentalId,
    itemId: rental.item_id,
    eventType: "rental_closed",
    fromStatus: "returned",
    toStatus: "closed",
    actorId,
  });
  return { ok: true };
}

export async function cancelEquipmentRental(
  rentalId: string,
  actorId: string,
  note: string | null,
): Promise<EquipmentAdminResult> {
  const rental = await loadRental(rentalId);
  if (!rental) return { ok: false, error: "الإيجار غير موجود." };
  if (!["pending", "confirmed"].includes(rental.status)) {
    return { ok: false, error: "الإيجار غير قابل للإلغاء في حالته الحالية." };
  }
  const at = new Date().toISOString();
  const paid = rental.payment_status === "paid";
  const { error } = await getServiceSupabase()
    .from("equipment_rentals")
    .update({
      status: "cancelled",
      cancelled_at: at,
      cancelled_by: actorId,
      admin_note: note,
      ...(paid ? {} : { payment_status: "cancelled" }),
    })
    .eq("id", rentalId)
    .in("status", ["pending", "confirmed"]);
  if (error) return { ok: false, error: "تعذر إلغاء الإيجار." };
  await recordAudit({
    rentalId,
    itemId: rental.item_id,
    eventType: "rental_cancelled",
    fromStatus: rental.status,
    toStatus: "cancelled",
    actorId,
    detail: { note: note ?? "", paid },
  });
  return { ok: true };
}

/** تسجيل أن تفاصيل الإيجار أُرسلت للعميل (الإرسال نفسه خارج النظام حاليًا). */
export async function markRentalCustomerNotified(
  rentalId: string,
  actorId: string,
): Promise<EquipmentAdminResult> {
  const rental = await loadRental(rentalId);
  if (!rental) return { ok: false, error: "الإيجار غير موجود." };
  const { error } = await getServiceSupabase()
    .from("equipment_rentals")
    .update({ customer_notified_at: new Date().toISOString() })
    .eq("id", rentalId);
  if (error) return { ok: false, error: "تعذر تسجيل الإشعار." };
  await recordAudit({
    rentalId,
    itemId: rental.item_id,
    eventType: "customer_notified",
    actorId,
  });
  return { ok: true };
}

/* ───────────────────── قوائم وقراءات اللوحة ───────────────────── */

export interface EquipmentRentalListFilter {
  itemId?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}

export async function listEquipmentRentals(
  filter: EquipmentRentalListFilter = {},
): Promise<EquipmentRentalRow[]> {
  await expireStaleEquipmentRentals();

  let query = getServiceSupabase()
    .from("equipment_rentals")
    .select(RENTAL_COLUMNS)
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(Math.min(filter.limit ?? 400, 1000));

  if (filter.itemId) query = query.eq("item_id", filter.itemId);
  if (filter.status) {
    query = query.eq("status", filter.status as Database["public"]["Enums"]["equipment_rental_status"]);
  }
  if (filter.from) query = query.gte("end_date", filter.from);
  if (filter.to) query = query.lte("start_date", filter.to);

  const { data } = await query;
  const rows = (data ?? []) as EquipmentRentalRow[];
  const needle = (filter.search ?? "").trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    (row) =>
      row.customer_name.toLowerCase().includes(needle) ||
      row.email.toLowerCase().includes(needle) ||
      row.phone.includes(needle) ||
      row.item_name_snapshot.toLowerCase().includes(needle) ||
      (row.company_name ?? "").toLowerCase().includes(needle),
  );
}

export interface EquipmentRentalDetail {
  rental: EquipmentRentalRow;
  item: {
    id: string;
    name: string;
    slug: string;
    requires_security_note: boolean;
    replacement_value_halalas: number;
  } | null;
  note: {
    id: string;
    status: string;
    amount_halalas: number;
    provider: string;
    provider_reference: string | null;
    provider_status_text: string;
    note: string | null;
    requested_at: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    expired_at: string | null;
    released_at: string | null;
  } | null;
  inspections: Array<{
    id: string;
    kind: string;
    serial_number: string;
    checklist: unknown;
    accessories: string;
    media: unknown;
    acknowledged_by_name: string;
    acknowledged_by_id: string;
    damage_note: string | null;
    created_at: string;
  }>;
  audit: Array<{
    id: string;
    event_type: string;
    from_status: string;
    to_status: string;
    created_at: string;
    detail: unknown;
  }>;
}

export async function loadEquipmentRentalDetail(rentalId: string): Promise<EquipmentRentalDetail | null> {
  const rental = await loadRental(rentalId);
  if (!rental) return null;
  const svc = getServiceSupabase();
  const [item, note, inspections, audit] = await Promise.all([
    svc
      .from("equipment_items")
      .select("id, name, slug, requires_security_note, replacement_value_halalas")
      .eq("id", rental.item_id)
      .maybeSingle(),
    svc
      .from("equipment_security_notes")
      .select(
        "id, status, amount_halalas, provider, provider_reference, provider_status_text, note, requested_at, approved_at, rejected_at, expired_at, released_at",
      )
      .eq("rental_id", rentalId)
      .maybeSingle(),
    svc
      .from("equipment_rental_inspections")
      .select(
        "id, kind, serial_number, checklist, accessories, media, acknowledged_by_name, acknowledged_by_id, damage_note, created_at",
      )
      .eq("rental_id", rentalId)
      .order("created_at", { ascending: true }),
    svc
      .from("equipment_audit_events")
      .select("id, event_type, from_status, to_status, created_at, detail")
      .eq("rental_id", rentalId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    rental,
    item: item.data ?? null,
    note: note.data ?? null,
    inspections: (inspections.data ?? []) as EquipmentRentalDetail["inspections"],
    audit: (audit.data ?? []) as EquipmentRentalDetail["audit"],
  };
}
