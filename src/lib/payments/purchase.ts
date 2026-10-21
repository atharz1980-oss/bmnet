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
import { sessionLabel, sessionPlace, sessionRequirement, type SessionOption } from "@/lib/sessions/availability";
import { siteConfig } from "@/data/site";

import { loadCommerce } from "./configuration";
import { moyasarEnvironment, paymentsMode, type PaymentMode } from "./env";
import { toHalalas } from "./money";
import { createMoyasarProvider } from "./providers/moyasar-provider";
import { PaymentError, type PaymentProvider, type Provider } from "./provider";
import { quoteCoursePrice } from "./settings";

/**
 * مهلة صفحة الدفع، ومهلة حجز المقعد.
 *
 * الترتيب هو المقصود: صفحة الدفع تموت **قبل** الحجز بخمس دقائق، فالدفع
 * المتأخر بعد ضياع المقعد يصير مستحيلًا عند المزود لا مكشوفًا عندنا. وهذه
 * الدقائق الخمس هامش يكفي لوصول تأكيد الدفع بينما المقعد ما زال لصاحبه.
 */
const CHECKOUT_TTL_MINUTES = 15;
const SEAT_HOLD_MINUTES = 20;

/** رسالة تغيّر السعر — تُقارن قبل إنشاء أي صف دفع فلا يُنشأ شيء. */
export const PRICE_CHANGED_ERROR = "تغيّر سعر الدورة. حدّث الصفحة ثم أعد المحاولة.";

/** أخطاء دالة المقاعد بالعربية — رمزنا نحن لا نص Postgres. */
const SEAT_ERRORS: Record<string, string> = {
  session_not_found: "هذا الموعد غير متاح.",
  session_course_mismatch: "هذا الموعد لا يخص هذه الدورة.",
  course_not_published: "هذه الدورة غير متاحة.",
  corporate_course: "تدريب الشركات يتم بالتواصل المباشر مع الإدارة.",
  commercial_mode_mismatch: "طريقة التسجيل لا تطابق نوع الدورة.",
  session_not_open: "التسجيل في هذا الموعد مغلق.",
  session_in_past: "انتهى هذا الموعد.",
  session_capacity_unset: "لم تُضبط مقاعد هذا الموعد بعد. تواصل معنا لإتمام التسجيل.",
  session_full: "اكتملت مقاعد هذا الموعد.",
  seat_in_other_session: "لديك تسجيل في موعد آخر لهذه الدورة. تواصل معنا لتغييره.",
  invalid_mode: "طلب غير صالح.",
  invalid_hold: "طلب غير صالح.",
};

export function seatErrorMessage(error: unknown): string {
  /* خطأ supabase-js كائن `{ message, code }` لا `Error`: قراءته كنص تعطي
     "[object Object]" فيضيع الرمز ويصل المستخدم سببًا عامًا. */
  const raw =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  for (const [code, message] of Object.entries(SEAT_ERRORS)) {
    if (raw.includes(code)) return message;
  }
  return "تعذر حجز المقعد. حاول مرة أخرى.";
}

export type CommercialMode = "free" | "paid" | "quote" | "unavailable";

export interface CourseCommerce {
  id: string;
  slug: string;
  name: string;
  category: string;
  published: boolean;
  price: string | number;
  originalPrice: string | number | null;
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
  /* تعذّر التحقق من المزود (شبكة/رد غير مفهوم). ليس «انتظار دفع» ولا
     «فشل دفع»: يعيد معالج الإشعار المحاولة، ولا يُعلَّم الحدث مكتملًا. */
  | { outcome: "unverified" }
  | { outcome: "unknown" };

/**
 * خيارات اختيارية لمساري التحقق. تُمرَّر من معالج الإشعار وحده؛ صفحات
 * العودة والنجاح تستدعي بلا خيارات فيبقى سلوكها كما هو.
 */
export interface VerifyOptions {
  /* يسأل المزود عن استرداد وقع **بعد** أن صار الصف مدفوعًا، ويسجّله فقط
     (بلا تغيير الحالة أو الوصول أو المقاعد). للتسجيل والمراجعة، لا للتفعيل. */
  recheckRefund?: boolean;
  /* يميّز فشل التحقق عن انتظار دفع حقيقي بقيمة `unverified` بدل `pending`. */
  reportUnverified?: boolean;
}

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
  /* الاستعلامان مستقلان — parallelism بدل رحلة إضافية */
  const [courseResult, methodsResult] = await Promise.all([
    svc
      .from("courses")
      .select("id, slug, name, category, publish_status, price, original_price, is_free, request_quote")
      .eq("id", courseId)
      .maybeSingle(),
    svc
      .from("course_payment_methods")
      .select("provider, enabled, sort_order")
      .eq("course_id", courseId)
      .eq("enabled", true)
      .order("sort_order", { ascending: true }),
  ]);

  const { data, error } = courseResult;
  if (error || !data) return null;
  const { data: methods } = methodsResult;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    category: data.category,
    published: data.publish_status === "published",
    price: data.price,
    originalPrice: data.original_price ?? null,
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
  sessionId?: string,
): Promise<{ ok: true; href: string; kind: "lesson" | "registered" } | { ok: false; error: string }> {
  const course = await loadCourseCommerce(courseId);
  if (!course || !course.published) return { ok: false, error: "هذه الدورة غير متاحة." };
  /* الشركات وحدها خارج التسجيل الذاتي — لا نوع التسليم. */
  if (course.mode === "quote") {
    return { ok: false, error: "تدريب الشركات يتم بالتواصل المباشر مع الإدارة." };
  }
  if (course.mode !== "free") return { ok: false, error: "هذه الدورة ليست مجانية." };

  const svc = getServiceSupabase();
  const requirement = await sessionRequirement(courseId);

  /* دورة لها دفعات مجدولة: المقعد جزء من التسجيل لا إضافة عليه. */
  if (requirement.hasSessions) {
    /* بلا اختيار: نفرّق بين «اختر موعدًا» و«لا مواعيد أصلًا».
       ومع اختيار: القاعدة وحدها تجيب — القراءة قد تسبق امتلاء المقعد بلحظة،
       فلا نردّ «لا مواعيد» على من اختار موعدًا امتلأ للتو. */
    if (!sessionId) {
      return {
        ok: false,
        error:
          requirement.selectable.length === 0
            ? "لا توجد مواعيد متاحة حاليًا. تواصل معنا لمعرفة الدفعة القادمة."
            : "اختر الموعد المناسب أولًا.",
      };
    }
    const { error } = await svc.rpc("claim_session_seat", {
      p_user_id: userId,
      p_course_id: courseId,
      p_session_id: sessionId,
      p_mode: "free",
      p_hold_minutes: SEAT_HOLD_MINUTES,
    });
    if (error) return { ok: false, error: seatErrorMessage(error) };
    /* الدالة أكّدت المقعد وفعّلت التسجيل في معاملة واحدة. */
    return { ok: true, ...(await registrationDestination(course.id, course.slug)) };
  }

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
 *
 * `displayedPriceSar` **إلزامي** في الشراء المدفوع: هو السعر الذي رآه العميل
 * عند فتح الصفحة. يُقارن فقط بإجمالي القاعدة الطازج، ولا يدخل في المبلغ
 * المحصَّل بحال. غيابه أو عدم صلاحيته أو اختلافه يعني أن العرض لا يطابق ما
 * سيُحصَّل، فيُغلق الدفع ويُطلب تحديث الصفحة قبل إنشاء أي صف.
 */
export async function startCheckout(
  userId: string,
  courseId: string,
  provider: Provider,
  sessionId: string | undefined,
  displayedPriceSar: number | null,
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

  /* حارس تغيّر السعر: نطابق ما رآه العميل (السعر المعروض عند فتح الصفحة)
     بإجمالي القاعدة الطازج **قبل** إنشاء أي صف. أي اختلاف — أو غياب سعر
     معروض صالح — يُغلق الدفع ويطلب تحديث الصفحة. وحتى مع التطابق يبقى المبلغ
     المحصَّل `quote.gross` المشتق من القاعدة لا من قيمة المتصفح. */
  const expectedHalalas = Number.isFinite(displayedPriceSar)
    ? Math.round((displayedPriceSar as number) * 100)
    : Number.NaN;
  if (!Number.isFinite(expectedHalalas) || quote.gross !== expectedHalalas) {
    return { ok: false, error: PRICE_CHANGED_ERROR };
  }

  const mode = paymentsMode();

  /* دورة لها دفعات: لا عملية دفع قبل أن يُحجز مقعد فعلًا. */
  const requirement = await sessionRequirement(courseId);
  let seatId: string | null = null;
  let seat: SessionOption | undefined;
  if (requirement.hasSessions) {
    if (!sessionId) {
      return {
        ok: false,
        error:
          requirement.selectable.length === 0
            ? "لا توجد مواعيد متاحة حاليًا. تواصل معنا لمعرفة الدفعة القادمة."
            : "اختر الموعد المناسب أولًا.",
      };
    }
    seat = requirement.all.find((option) => option.id === sessionId);
    if (!seat) return { ok: false, error: "هذا الموعد لا يخص هذه الدورة." };
  }

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
    /* محاولة قديمة تُلغى ومعها مقعدها، وإلا بقي محجوزًا بلا دفع. */
    const { data: staleSeat } = await svc
      .from("course_session_seats")
      .select("id")
      .eq("payment_id", open.id)
      .maybeSingle();
    if (staleSeat) await svc.rpc("release_session_seat", { p_seat_id: staleSeat.id, p_reason: "superseded" });
    await svc
      .from("course_payments")
      .update({ status: "cancelled", failure_code: "superseded" })
      .eq("id", open.id)
      .in("status", ["created", "pending", "authorized"]);
  }

  /* الحجز قبل إنشاء أي صف دفع: لا نأخذ مالًا لمقعد لا نملكه. */
  if (seat) {
    const { data: claimed, error: claimError } = await svc.rpc("claim_session_seat", {
      p_user_id: userId,
      p_course_id: courseId,
      p_session_id: seat.id,
      p_mode: "purchase",
      p_hold_minutes: SEAT_HOLD_MINUTES,
    });
    if (claimError || typeof claimed !== "string") {
      return { ok: false, error: seatErrorMessage(claimError) };
    }
    seatId = claimed;
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
      /* لقطة الدفعة: تبقى صحيحة ولو عُدّل الموعد أو حُذف لاحقًا. */
      session_id: seat?.id ?? null,
      session_label: seat ? sessionLabel(seat) : "",
      session_start_date: seat?.startDate ?? null,
      session_start_time: seat?.startTime ?? null,
      session_location: seat ? sessionPlace(seat) : "",
    })
    .select("id, idempotency_key")
    .maybeSingle();
  if (insertError || !created) {
    /* 23505 هنا = محاولة متزامنة كسبت السباق؛ لا ننشئ ثانية، ونحرّر ما حجزناه. */
    if (seatId) await svc.rpc("release_session_seat", { p_seat_id: seatId, p_reason: "checkout_failed" });
    return { ok: false, error: "هناك عملية دفع جارية لهذه الدورة. حدّث الصفحة." };
  }

  /* ربط المقعد بالعملية: به وحده يعرف التفعيل أي مقعد يؤكّد. */
  if (seatId) {
    const { error: linkError } = await svc
      .from("course_session_seats")
      .update({ payment_id: created.id })
      .eq("id", seatId);
    if (linkError) {
      await svc.rpc("release_session_seat", { p_seat_id: seatId, p_reason: "checkout_failed" });
      await svc
        .from("course_payments")
        .update({ status: "failed", failed_at: new Date().toISOString(), failure_code: "seat_link_failed" })
        .eq("id", created.id);
      return { ok: false, error: "تعذر تثبيت المقعد. حاول مرة أخرى." };
    }
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
    /* فشل إنشاء صفحة الدفع: المقعد يُحرَّر فورًا ولا ينتظر انتهاء مهلته. */
    if (seatId) await svc.rpc("release_session_seat", { p_seat_id: seatId, p_reason: "checkout_failed" });
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
 * يسجّل استردادًا وقع بعد الدفع: المبلغ والتاريخ فقط — بلا تغيير الحالة أو
 * الوصول أو المقاعد. التحديث شرطي ذرّي تصاعدي (`.lt`) فلا يُنقص قيمة سبقت،
 * حتى تحت التزامن أو وصول إشعار أقدم. والتاريخ يُثبَّت مرة واحدة فلا
 * يُستبدل عند زيادة لاحقة. يُعيد false إذا تعذّر الحفظ (فيعيد المسار المحاولة).
 */
export async function recordRefundIfAny(
  table: "course_payments" | "guest_course_orders" | "shopping_orders",
  id: string,
  provider: Provider,
  providerPaymentId: string,
  totalAmount: number,
  fetcher?: typeof fetch,
): Promise<boolean> {
  let state;
  try {
    state = await providerFor(provider, fetcher).fetchState(providerPaymentId);
  } catch {
    return false; /* تعذّر السؤال — لا يُسجَّل شيء ولا يُعلَّم الحدث. */
  }
  if (state.refunded <= 0) return true;

  const amount = Math.min(state.refunded, totalAmount);
  const svc = getServiceSupabase();
  const { error: amountError } = await svc
    .from(table)
    .update({ refunded_amount: amount })
    .eq("id", id)
    .lt("refunded_amount", amount);
  if (amountError) return false;

  const { error: dateError } = await svc
    .from(table)
    .update({ refunded_at: new Date().toISOString() })
    .eq("id", id)
    .is("refunded_at", null);
  return !dateError;
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
  options?: VerifyOptions,
): Promise<PurchaseOutcome> {
  const svc = getServiceSupabase();
  const { data, error } = await svc
    .from("course_payments")
    .select("id, user_id, course_id, provider, environment, status, total_amount, currency, idempotency_key, provider_payment_id, provider_checkout_url, checkout_expires_at, enrollment_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (error || !data) return { outcome: "unknown" };
  const payment = data as PaymentRow;

  /* استرداد بعد الدفع: يُسجَّل فقط، ولا يمسّ الحالة أو الوصول أو المقاعد. */
  if (options?.recheckRefund && payment.status === "paid" && payment.provider_payment_id) {
    const saved = await recordRefundIfAny(
      "course_payments",
      payment.id,
      payment.provider,
      payment.provider_payment_id,
      payment.total_amount,
      fetcher,
    );
    if (!saved) return { outcome: options.reportUnverified ? "unverified" : "pending" };
  }

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
    /* تعذر السؤال ≠ فشل الدفع. نبقيه معلّقًا ليُعاد السؤال؛ ومعالج الإشعار
       يميّزه بـ`unverified` ليعيد المحاولة بلا تعليم الحدث مكتملًا. */
    return { outcome: options?.reportUnverified ? "unverified" : "pending" };
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
  const eventId = input.eventId.slice(0, 200);
  const { error } = await getServiceSupabase().from("payment_webhook_events").insert({
    provider: input.provider,
    event_id: eventId,
    event_type: input.eventType.slice(0, 64),
    provider_payment_id: input.providerPaymentId?.slice(0, 128) ?? null,
    payment_id: input.paymentId,
    signature_valid: input.signatureValid,
    processed: false,
  });
  if (!error) return { firstTime: true };
  /* القيد الفريد 23505 وحده يعني «حدث مكرر». أي خطأ آخر عارض لا يُبتلع
     كتكرار — وإلا ردّ المسار 200 بلا معالجة فأسقط المزود الحدث. نرمي
     استثناءً برسالة عامة (بلا بيانات حساسة) فيخرج رد غير 2xx ويعيد
     المزود المحاولة. */
  if (error.code !== "23505") throw new Error("failed to record payment webhook event");

  /* مكرر: يُعاد فحصه فقط إذا لم يكن قد اكتمل. أي فشل في قراءة `processed`
     يُخرج ردًا غير 2xx — لا يُعتبر الحدث صالحًا ولا مكتملًا. */
  const { data, error: readError } = await getServiceSupabase()
    .from("payment_webhook_events")
    .select("processed")
    .eq("provider", input.provider)
    .eq("event_id", eventId)
    .maybeSingle();
  if (readError || !data) throw new Error("failed to read payment webhook event");
  return { firstTime: data.processed !== true };
}

/** صفّ الشراء المطابق لمرجع المزود — للربط عند وصول إشعار. */
export async function paymentIdByProviderReference(
  provider: Provider,
  providerPaymentId: string,
): Promise<string | null> {
  const { data, error } = await getServiceSupabase()
    .from("course_payments")
    .select("id")
    .eq("provider", provider)
    .eq("provider_payment_id", providerPaymentId)
    .maybeSingle();
  /* تعذّر القراءة ≠ «لا شراء بحساب»: نرمي ليردّ معالج الإشعار غير 2xx بدل 200
     فيبقى الحدث غير مُعلَّم ويُعاد فحصه عند إعادة الإرسال. */
  if (error) throw new Error("failed to read payment by provider reference");
  return data?.id ?? null;
}

export async function markWebhookProcessed(provider: Provider, eventId: string): Promise<void> {
  const { error } = await getServiceSupabase()
    .from("payment_webhook_events")
    .update({ processed: true })
    .eq("provider", provider)
    .eq("event_id", eventId.slice(0, 200));
  /* عميل Supabase يُرجع الخطأ في `{error}` ولا يرميه؛ نرميه نحن حتى يرد
     المعالج غير 2xx ويعيد المزود الإرسال، فيُعاد الفحص بلا تكرار أثر. */
  if (error) throw new Error("failed to mark payment webhook processed");
}
