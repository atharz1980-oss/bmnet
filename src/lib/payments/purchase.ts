import "server-only";

/**
 * تدفّق الشراء — القرار كله هنا، على الخادم.
 *
 * المتصفح يرسل معرّف دورة واسم مزوّد. لا مبلغ ولا عملة ولا حالة. السعر
 * يُقرأ من القاعدة عند كل إنشاء، والضريبة تُستخرج منه، واللقطة تُحفظ في صف
 * الشراء فيبقى السجل صحيحًا مهما تغيّر السعر بعدها.
 *
 * ثلاث قواعد لا تُكسر:
 *   1. لا يفتح الوصولَ إلا `finalize_course_purchase` بعد تحقق خادمي من
 *      المزود. إعادة التوجيه من المتصفح لا تفعل شيئًا، وجسم الإشعار لا
 *      يفعل شيئًا — كلاهما يقول «انظر» فحسب.
 *   2. كل تحقق يقارن ما يقوله المزود بلقطتنا: المبلغ والعملة والبيئة
 *      والربط بصفّنا. أي اختلاف = فشل مغلق مع سبب مسجَّل، لا تفعيل.
 *   3. التكرار مكفول بالقاعدة لا بالشيفرة: فهارس فريدة جزئية للمحاولة
 *      المفتوحة وللمدفوعة، وقفل صف داخل المعاملة.
 */

import { getServiceSupabase } from "@/lib/supabase/service";
import { loadCourseContent } from "@/lib/learning/content";
import { siteConfig } from "@/data/site";

import { loadCommerce } from "./configuration";
import { moyasarEnvironment, paymentsMode, type PaymentMode } from "./env";
import { toHalalas } from "./money";
import { createMoyasarProvider } from "./providers/moyasar-provider";
import { PaymentError, type PaymentProvider, type Provider } from "./provider";
import { quoteCoursePrice } from "./settings";

/** مهلة صفحة الدفع. قصيرة عمدًا: رابط دفع معلّق ليس أصلًا يُحتفظ به. */
const CHECKOUT_TTL_MINUTES = 30;

export type CommercialMode = "free" | "paid" | "quote" | "unavailable";

export interface CourseCommerce {
  id: string;
  slug: string;
  name: string;
  category: string;
  published: boolean;
  price: string | number;
  isFree: boolean;
  requestQuote: boolean;
  mode: CommercialMode;
  providers: Provider[];
}

export type PurchaseOutcome =
  | { outcome: "paid"; enrollmentId: string }
  | { outcome: "pending" }
  | { outcome: "failed"; reason: string }
  | { outcome: "cancelled" }
  | { outcome: "expired" }
  | { outcome: "refunded" }
  | { outcome: "unknown" };

interface PaymentRow {
  id: string;
  user_id: string;
  course_id: string;
  provider: Provider;
  environment: PaymentMode;
  status: string;
  total_amount: number;
  currency: string;
  idempotency_key: string;
  provider_payment_id: string | null;
  provider_checkout_url: string | null;
  checkout_expires_at: string | null;
  enrollment_id: string | null;
}

/** المزود العامل الوحيد الآن. تابي وتمارا لهما مكان في العقد لا في الإنتاج. */
export function providerFor(provider: Provider, fetcher?: typeof fetch): PaymentProvider {
  if (provider !== "moyasar") {
    throw new PaymentError("وسيلة الدفع هذه غير مفعّلة بعد.", "provider_not_implemented");
  }
  return createMoyasarProvider(fetcher);
}

export function providerConfigured(provider: Provider): boolean {
  return provider === "moyasar" ? moyasarEnvironment() !== null : false;
}

/**
 * هل يستطيع الخادم تحصيل مبلغ الآن؟
 *
 * ليس المفتاح وحده: بلا إعداد ضريبة معتمد لا يُحسب مبلغ أصلًا. وزرّ دفع
 * يفشل عند الضغط أسوأ من غياب الزر — فالصفحة تسأل هذا قبل أن تعرض شيئًا.
 */
export async function checkoutReady(provider: Provider): Promise<boolean> {
  if (!providerConfigured(provider)) return false;
  try {
    const { settings } = await loadCommerce();
    quoteCoursePrice(10_000, settings);
    return true;
  } catch {
    return false;
  }
}

/**
 * تصنيف الشركات — الاستثناء الوحيد من التسجيل الذاتي.
 *
 * العلَم `request_quote` هو التمثيل المعتمد، ويُضاف إليه تصنيف الدورة
 * `in-person-corporates` حارسًا ثانيًا: لو نسي محرر تعليم العلَم لبقي
 * برنامج شركات خارج الشراء الذاتي. الحارسان يمنعان ولا يمنحان، فاجتماعهما
 * أضيق لا أوسع.
 *
 * ولا يُعرَّف شيء هنا بمقارنة اسم معروض — الاسم نص يحرره البشر.
 */
export const CORPORATE_CATEGORY = "in-person-corporates";

export function isCorporateCourse(course: { category: string; request_quote: boolean }): boolean {
  return course.request_quote || course.category === CORPORATE_CATEGORY;
}

/**
 * الوضع التجاري للدورة — مشتق من أعمدة قائمة، بلا عمود جديد.
 *
 * نوع التسليم (أونلاين/حضوري/ورشة) **ليس** تعريفًا لقابلية الشراء: دورة
 * حضورية مدفوعة تُشترى كما تُشترى الأونلاين. الفارق الوحيد ما يحدث بعد
 * التسجيل، لا قبله.
 */
export function commercialMode(course: {
  publish_status: string;
  category: string;
  is_free: boolean;
  request_quote: boolean;
  price: string | number;
}): CommercialMode {
  if (course.publish_status !== "published") return "unavailable";
  if (isCorporateCourse(course)) return "quote";
  if (course.is_free) return "free";
  if (Number(course.price) > 0) return "paid";
  /* سعر صفر وليست مجانية: حالة ناقصة لا تُباع ولا تُمنح. */
  return "unavailable";
}

/** الدورة وحقائقها التجارية ووسائل دفعها المفعّلة. */
export async function loadCourseCommerce(courseId: string): Promise<CourseCommerce | null> {
  const svc = getServiceSupabase();
  const { data, error } = await svc
    .from("courses")
    .select("id, slug, name, category, publish_status, price, is_free, request_quote")
    .eq("id", courseId)
    .maybeSingle();
  if (error || !data) return null;

  const { data: methods } = await svc
    .from("course_payment_methods")
    .select("provider, enabled, sort_order")
    .eq("course_id", courseId)
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    category: data.category,
    published: data.publish_status === "published",
    price: data.price,
    isFree: data.is_free,
    requestQuote: data.request_quote,
    mode: commercialMode(data),
    providers: (methods ?? []).map((row) => row.provider as Provider),
  };
}

/**
 * إلى أين يذهب المتدرب بعد نجاح تسجيله.
 *
 * الدورة التي لها محتوى منشور تُفتح على أول درس. وما لا محتوى له — ورشة
 * حضورية مثلًا — يذهب إلى صفحة تأكيد التسجيل. لا يُفترض لكل دورة درسٌ
 * أول: اختراع مسار تعلّم لورشة في استوديو يرسل المتدرب إلى صفحة فارغة.
 */
export async function registrationDestination(
  courseId: string,
  slug: string,
): Promise<{ href: string; kind: "lesson" | "registered" }> {
  const { modules } = await loadCourseContent(courseId, { publishedOnly: true });
  const lesson = modules.flatMap((module) => module.lessons)[0];
  return lesson
    ? { href: `/learn/${slug}/${lesson.id}`, kind: "lesson" }
    : { href: `/courses/${slug}/registered`, kind: "registered" };
}

/** أول درس يستطيع الطالب فتحه، أو صفحة الدورة إن لم يوجد. */
export async function firstLessonHref(courseId: string, slug: string): Promise<string> {
  const { modules } = await loadCourseContent(courseId, { publishedOnly: true });
  const lesson = modules.flatMap((module) => module.lessons)[0];
  return lesson ? `/learn/${slug}/${lesson.id}` : `/courses/${slug}`;
}

/* ─────────────────────── التسجيل المجاني ─────────────────────── */

/**
 * تسجيل في دورة مجانية — بلا صف دفع بحال.
 *
 * الحراسة كلها هنا لا في الزر: منشورة، أونلاين، مجانية فعلًا. ومعرّف دورة
 * مدفوعة يصل هذا المسار يُرفض، فالزر ليس هو ما يقرر.
 */
export async function enrollFree(
  userId: string,
  courseId: string,
): Promise<{ ok: true; href: string; kind: "lesson" | "registered" } | { ok: false; error: string }> {
  const course = await loadCourseCommerce(courseId);
  if (!course || !course.published) return { ok: false, error: "هذه الدورة غير متاحة." };
  /* الشركات وحدها خارج التسجيل الذاتي — لا نوع التسليم. */
  if (course.mode === "quote") {
    return { ok: false, error: "تدريب الشركات يتم بالتواصل المباشر مع الإدارة." };
  }
  if (course.mode !== "free") return { ok: false, error: "هذه الدورة ليست مجانية." };

  const svc = getServiceSupabase();
  const { data: existing } = await svc
    .from("course_enrollments")
    .select("id, status, source")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "active") {
      return { ok: true, ...(await registrationDestination(course.id, course.slug)) };
    }
    /* شراء سابق أُلغي أو استُرد لا يُعاد فتحه بضغطة «مجانًا» — قرار إدارة. */
    if (existing.source !== "manual") {
      return { ok: false, error: "تعذر فتح الدورة لحسابك. تواصل مع الإدارة." };
    }
    const { error } = await svc
      .from("course_enrollments")
      .update({ status: "active" })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "تعذر إتمام التسجيل. حاول مرة أخرى." };
    return { ok: true, ...(await registrationDestination(course.id, course.slug)) };
  }

  const { error } = await svc
    .from("course_enrollments")
    .insert({ user_id: userId, course_id: courseId, source: "manual", status: "active" });
  /* 23505 = سبقنا نداء متزامن إلى القيد الفريد؛ النتيجة المطلوبة تحققت. */
  if (error && error.code !== "23505") {
    return { ok: false, error: "تعذر إتمام التسجيل. حاول مرة أخرى." };
  }
  return { ok: true, ...(await registrationDestination(course.id, course.slug)) };
}

/* ───────────────────────── الشراء المدفوع ───────────────────────── */

function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}

/**
 * ينشئ محاولة شراء ويعيد رابط صفحة الدفع المستضافة.
 * المبلغ يُحسب هنا من سعر القاعدة — لا يصل من المتصفح ولا يُقبل منه.
 */
export async function startCheckout(
  userId: string,
  courseId: string,
  provider: Provider,
  fetcher?: typeof fetch,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const course = await loadCourseCommerce(courseId);
  if (!course || !course.published) return { ok: false, error: "هذه الدورة غير متاحة." };
  if (course.mode === "quote") {
    return { ok: false, error: "تدريب الشركات يتم بالتواصل المباشر مع الإدارة." };
  }
  if (course.mode !== "paid") return { ok: false, error: "هذه الدورة غير معروضة للشراء." };
  if (!course.providers.includes(provider)) return { ok: false, error: "وسيلة الدفع غير متاحة لهذه الدورة." };
  if (!providerConfigured(provider)) return { ok: false, error: "الدفع غير متاح حاليًا. تواصل معنا لإتمام التسجيل." };

  const svc = getServiceSupabase();

  /* تسجيل فعّال قائم: لا يُدفع مرتين. */
  const { data: enrollment } = await svc
    .from("course_enrollments")
    .select("status")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (enrollment?.status === "active") {
    return { ok: false, error: "أنت مسجّل في هذه الدورة بالفعل." };
  }

  let quote;
  try {
    const { settings } = await loadCommerce();
    quote = quoteCoursePrice(toHalalas(course.price), settings);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "تعذر تجهيز الدفع." };
  }

  const mode = paymentsMode();

  /* محاولة مفتوحة: نفس المزود ولم تنتهِ → نعيد الرابط نفسه بدل عملية ثانية. */
  const { data: openRows } = await svc
    .from("course_payments")
    .select("id, user_id, course_id, provider, environment, status, total_amount, currency, idempotency_key, provider_payment_id, provider_checkout_url, checkout_expires_at, enrollment_id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .in("status", ["created", "pending", "authorized"])
    .limit(1);
  const open = (openRows ?? [])[0] as PaymentRow | undefined;
  if (open) {
    const stillValid =
      open.provider === provider &&
      open.environment === mode &&
      open.total_amount === quote.gross &&
      open.provider_checkout_url !== null &&
      (open.checkout_expires_at === null || new Date(open.checkout_expires_at).getTime() > Date.now());
    if (stillValid && open.provider_checkout_url) {
      return { ok: true, checkoutUrl: open.provider_checkout_url };
    }
    await svc
      .from("course_payments")
      .update({ status: "cancelled", failure_code: "superseded" })
      .eq("id", open.id)
      .in("status", ["created", "pending", "authorized"]);
  }

  const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MINUTES * 60_000);
  const { data: created, error: insertError } = await svc
    .from("course_payments")
    .insert({
      user_id: userId,
      course_id: courseId,
      provider,
      environment: mode,
      status: "created",
      course_title_snapshot: course.name.slice(0, 200),
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
    /* 23505 هنا = محاولة متزامنة كسبت السباق؛ لا ننشئ ثانية. */
    return { ok: false, error: "هناك عملية دفع جارية لهذه الدورة. حدّث الصفحة." };
  }

  try {
    const session = await providerFor(provider, fetcher).createCheckout({
      paymentId: created.id,
      idempotencyKey: created.idempotency_key,
      amount: quote.gross,
      currency: "SAR",
      description: `${course.name} — بيت المصور`.slice(0, 250),
      successUrl: absoluteUrl(`/payment/return?p=${created.id}`),
      backUrl: absoluteUrl(`/courses/${course.slug}`),
      callbackUrl: absoluteUrl(`/api/payments/webhook/${provider}`),
      expiresAt,
      mode,
    });
    const { error: updateError } = await svc
      .from("course_payments")
      .update({
        status: "pending",
        provider_payment_id: session.providerPaymentId,
        provider_checkout_url: session.checkoutUrl,
      })
      .eq("id", created.id)
      .eq("status", "created");
    if (updateError) throw new PaymentError("تعذر حفظ عملية الدفع.", "persist_failed");
    return { ok: true, checkoutUrl: session.checkoutUrl };
  } catch (error) {
    await svc
      .from("course_payments")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        failure_code: error instanceof PaymentError ? error.code.slice(0, 64) : "checkout_failed",
      })
      .eq("id", created.id)
      .in("status", ["created", "pending"]);
    return {
      ok: false,
      error: error instanceof PaymentError ? error.message : "تعذر بدء عملية الدفع. حاول لاحقًا.",
    };
  }
}

async function markFailure(paymentId: string, code: string): Promise<void> {
  await getServiceSupabase()
    .from("course_payments")
    .update({ status: "failed", failed_at: new Date().toISOString(), failure_code: code.slice(0, 64) })
    .eq("id", paymentId)
    .in("status", ["created", "pending", "authorized"]);
}

/**
 * التحقق الموثوق ثم التفعيل.
 *
 * يُنادى من صفحة العودة ومن معالج الإشعار معًا — وكلاهما يصل إلى النتيجة
 * نفسها. آمن للتكرار: عملية مدفوعة تُعيد تسجيلها ولا تكرر شيئًا.
 */
export async function verifyAndFinalize(
  paymentId: string,
  fetcher?: typeof fetch,
): Promise<PurchaseOutcome> {
  const svc = getServiceSupabase();
  const { data, error } = await svc
    .from("course_payments")
    .select("id, user_id, course_id, provider, environment, status, total_amount, currency, idempotency_key, provider_payment_id, provider_checkout_url, checkout_expires_at, enrollment_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (error || !data) return { outcome: "unknown" };
  const payment = data as PaymentRow;

  if (payment.status === "paid") {
    return payment.enrollment_id
      ? { outcome: "paid", enrollmentId: payment.enrollment_id }
      : { outcome: "unknown" };
  }
  if (payment.status === "refunded") return { outcome: "refunded" };
  if (payment.status === "cancelled") return { outcome: "cancelled" };
  if (payment.status === "expired") return { outcome: "expired" };
  if (payment.status === "failed") return { outcome: "failed", reason: "payment_failed" };

  if (!payment.provider_payment_id) {
    if (payment.checkout_expires_at && new Date(payment.checkout_expires_at).getTime() < Date.now()) {
      await svc.from("course_payments").update({ status: "expired" }).eq("id", payment.id).eq("status", "created");
      return { outcome: "expired" };
    }
    return { outcome: "pending" };
  }

  /* بيئة الخادم الآن يجب أن تطابق بيئة الصف: صف اختبار لا يُفعَّل بمفتاح إنتاج. */
  if (payment.environment !== paymentsMode()) {
    await markFailure(payment.id, "environment_mismatch");
    return { outcome: "failed", reason: "environment_mismatch" };
  }

  let state;
  try {
    state = await providerFor(payment.provider, fetcher).fetchState(payment.provider_payment_id);
  } catch {
    /* تعذر السؤال ≠ فشل الدفع. نبقيه معلّقًا ليُعاد السؤال. */
    return { outcome: "pending" };
  }

  /* المطابقة الكاملة قبل أي تفعيل. أي اختلاف = لا وصول، وسبب مسجَّل. */
  if (state.providerPaymentId !== payment.provider_payment_id) {
    await markFailure(payment.id, "reference_mismatch");
    return { outcome: "failed", reason: "reference_mismatch" };
  }

  if (state.status === "paid") {
    if (state.amount !== payment.total_amount) {
      await markFailure(payment.id, "amount_mismatch");
      return { outcome: "failed", reason: "amount_mismatch" };
    }
    if (state.currency !== payment.currency) {
      await markFailure(payment.id, "currency_mismatch");
      return { outcome: "failed", reason: "currency_mismatch" };
    }
    if (state.metadataPaymentId !== payment.id) {
      await markFailure(payment.id, "metadata_mismatch");
      return { outcome: "failed", reason: "metadata_mismatch" };
    }
    if (state.metadataEnvironment !== payment.environment) {
      await markFailure(payment.id, "environment_mismatch");
      return { outcome: "failed", reason: "environment_mismatch" };
    }
    if (state.refunded > 0) {
      await svc
        .from("course_payments")
        .update({ status: "refunded", refunded_at: new Date().toISOString(), refunded_amount: state.refunded })
        .eq("id", payment.id)
        .in("status", ["created", "pending", "authorized"]);
      return { outcome: "refunded" };
    }

    const { data: enrollmentId, error: rpcError } = await svc.rpc("finalize_course_purchase", {
      p_payment_id: payment.id,
      p_provider_payment_id: payment.provider_payment_id,
      p_environment: payment.environment,
    });
    if (rpcError || typeof enrollmentId !== "string") return { outcome: "unknown" };
    return { outcome: "paid", enrollmentId };
  }

  if (state.status === "authorized") {
    await svc
      .from("course_payments")
      .update({ status: "authorized", authorized_at: new Date().toISOString() })
      .eq("id", payment.id)
      .in("status", ["created", "pending"]);
    return { outcome: "pending" };
  }

  if (state.status === "failed" || state.status === "cancelled" || state.status === "expired") {
    await svc
      .from("course_payments")
      .update({
        status: state.status,
        ...(state.status === "failed"
          ? { failed_at: new Date().toISOString(), failure_code: "provider_failed" }
          : {}),
      })
      .eq("id", payment.id)
      .in("status", ["created", "pending", "authorized"]);
    return state.status === "failed"
      ? { outcome: "failed", reason: "provider_failed" }
      : state.status === "cancelled"
        ? { outcome: "cancelled" }
        : { outcome: "expired" };
  }

  if (state.status === "refunded") {
    await svc
      .from("course_payments")
      .update({ status: "refunded", refunded_at: new Date().toISOString(), refunded_amount: state.refunded })
      .eq("id", payment.id)
      .in("status", ["created", "pending", "authorized"]);
    return { outcome: "refunded" };
  }

  return { outcome: "pending" };
}

/**
 * يسجّل إشعارًا واردًا ويعيد ما إذا كان جديدًا.
 * التكرار يُبتلع بقيد فريد في القاعدة، لا بمنطق هنا.
 */
export async function recordWebhookEvent(input: {
  provider: Provider;
  eventId: string;
  eventType: string;
  providerPaymentId: string | null;
  paymentId: string | null;
  signatureValid: boolean;
}): Promise<{ firstTime: boolean }> {
  const { error } = await getServiceSupabase().from("payment_webhook_events").insert({
    provider: input.provider,
    event_id: input.eventId.slice(0, 200),
    event_type: input.eventType.slice(0, 64),
    provider_payment_id: input.providerPaymentId?.slice(0, 128) ?? null,
    payment_id: input.paymentId,
    signature_valid: input.signatureValid,
    processed: false,
  });
  return { firstTime: !error };
}

/** صفّ الشراء المطابق لمرجع المزود — للربط عند وصول إشعار. */
export async function paymentIdByProviderReference(
  provider: Provider,
  providerPaymentId: string,
): Promise<string | null> {
  const { data } = await getServiceSupabase()
    .from("course_payments")
    .select("id")
    .eq("provider", provider)
    .eq("provider_payment_id", providerPaymentId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function markWebhookProcessed(provider: Provider, eventId: string): Promise<void> {
  await getServiceSupabase()
    .from("payment_webhook_events")
    .update({ processed: true })
    .eq("provider", provider)
    .eq("event_id", eventId.slice(0, 200));
}
