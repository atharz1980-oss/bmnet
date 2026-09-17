/**
 * اختبار حيّ لتدفّق الشراء على قاعدة الإنتاج — ببيانات مؤقتة تُحذف بعده.
 *
 *   BMNET_LIVE_PAYMENTS_TEST=1 bun test supabase/tests/payments_live.test.ts
 *
 * لا يُشغَّل مع `bun test tests/` ولا في أي بناء: يحتاج العلم صراحةً، وبدونه
 * يتخطّى كل شيء.
 *
 * المزوّد مزيَّف هنا عمدًا: لا نملك مفاتيح ميسر التجريبية، والمطلوب إثباته
 * ليس أن ميسر يعمل، بل أن **قاعدتنا وتدفّقنا** يرفضان كل ما ليس مطابقًا:
 * مبلغ مختلف، عملة مختلفة، بيئة مختلفة، ربط مختلف، تكرار، تزامن.
 *
 * كل ما يُنشأ موسوم بـTAG ويُحذف في النهاية، وتُستعاد إعدادات التجارة كما
 * كانت بالضبط.
 */

import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

mock.module("server-only", () => ({}));

/* البيئة من .env.local كما تفعل بقية الاختبارات الحية في هذا المجلد. */
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && existsSync(".env.local")) {
  const newline = String.fromCharCode(10);
  for (const raw of readFileSync(".env.local", "utf8").split(newline)) {
    const line = raw.trim();
    const index = line.indexOf("=");
    if (index <= 0 || line.startsWith("#")) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value.replace(/^"|"$/g, "");
  }
}

const LIVE = process.env.BMNET_LIVE_PAYMENTS_TEST === "1";
const TAG = "bmnet-pay-test";
const SLUG = "bmnet-pay-test-course";
const PRICE = 1000; // ريال، شامل الضريبة
const GROSS = 100_000; // هللة
const NET = 86_957;
/** رقم ضريبي وهمي للاختبار وحده — يُستعاد الأصل في النهاية. */
const TEST_VAT_NUMBER = "300000000000003";
const VAT = 13_043;

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";
const H = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" };

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
const rows = async <T>(path: string): Promise<T[]> => (await (await rest(path)).json()) as T[];
const one = async <T>(path: string): Promise<T | undefined> => (await rows<T>(path))[0];

interface Ids {
  courseId: string;
  userId: string;
  otherUserId: string;
  draftCourseId: string;
  inPersonFreeId: string;
  inPersonPaidId: string;
  corporateFreeId: string;
  corporatePaidId: string;
  corporateNoFlagId: string;
}

let ids: Ids;
let commerceBackup: Record<string, unknown> | null = null;

/**
 * فاتورة ميسر مزيّفة بالشكل الذي يعيده المزود.
 * لكل عملية مرجعها: المزود لا يعيد المعرّف نفسه لعمليتين، والقيد الفريد
 * عندنا يعتمد على ذلك.
 */
function invoice(paymentId: string, providerId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: providerId,
    status: "paid",
    amount: GROSS,
    currency: "SAR",
    refunded: 0,
    metadata: { payment_id: paymentId, environment: "test" },
    ...overrides,
  };
}

function fetcherFor(body: (url: string) => unknown, status = 200) {
  return (async (url: string) =>
    new Response(JSON.stringify(body(url)), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

/** مُحضِر ينشئ فاتورة بمرجع جديد في كل مرة. */
function checkoutFetcher() {
  return fetcherFor(() => ({ id: crypto.randomUUID(), url: "https://moyasar.test/invoice/abc" }));
}

/** مرجع المزود المحفوظ لعملية — ما نبني عليه الفاتورة المزيّفة. */
async function providerRef(paymentId: string): Promise<string> {
  const row = await one<{ provider_payment_id: string }>(
    `course_payments?id=eq.${paymentId}&select=provider_payment_id`,
  );
  return row!.provider_payment_id;
}

async function createUser(email: string): Promise<string> {
  const response = await fetch(`${SB}/auth/v1/admin/users`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email, password: `${crypto.randomUUID()}Aa1!`, email_confirm: true }),
  });
  const body = (await response.json()) as { id?: string };
  if (!body.id) throw new Error(`تعذر إنشاء مستخدم الاختبار: ${JSON.stringify(body).slice(0, 200)}`);
  return body.id;
}

interface CourseSpec {
  slug: string;
  name: string;
  published?: boolean;
  free?: boolean;
  category?: string;
  requestQuote?: boolean;
  price?: number;
}

async function makeCourse(spec: CourseSpec): Promise<string> {
  const { slug, name, published = true, free = false } = spec;
  const trainer = await one<{ id: string }>("trainers?select=id&limit=1");
  const response = await fetch(`${SB}/rest/v1/rpc/save_course_atomic`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      p_course_id: null,
      p_course: {
        name,
        slug,
        summary: "دورة مؤقتة لاختبار الدفع. تُحذف فور انتهاء الاختبار.",
        description: "مؤقتة.",
        category: spec.category ?? "online",
        level: "beginner",
        price: free ? 0 : (spec.price ?? PRICE),
        is_free: free,
        request_quote: spec.requestQuote ?? false,
        duration_days: 1,
        duration_hours: 2,
        language: "ar",
        image_path: "/images/course-fundamentals.jpg",
        image_alt: "مؤقتة",
        publish_status: published ? "published" : "draft",
        featured: false,
        trainer_id: trainer?.id ?? null,
        outcomes: [],
        audience: [],
        requirements: [],
      },
      p_curriculum: [],
      p_sessions: [],
    }),
  });
  const id = (await response.json()) as unknown;
  if (typeof id !== "string") throw new Error(`تعذر إنشاء الدورة: ${JSON.stringify(id).slice(0, 200)}`);
  return id;
}

beforeAll(async () => {
  if (!LIVE) return;
  if (!SB || !SECRET) throw new Error("بيئة القاعدة غير محمّلة.");

  process.env.PAYMENTS_MODE = "test";
  process.env.MOYASAR_SECRET_KEY = "sk_test_livecheck0123456789";
  process.env.MOYASAR_WEBHOOK_SECRET = "live-check-webhook-secret";

  /* إعدادات التجارة: لقطة ثم ضبط مؤقت، وتُستعاد حرفيًا في النهاية.
     ولو وجدنا قيمة الاختبار مسبقًا فذلك أثر تشغيل سابق لم يُنظَّف — نتوقف
     بدل أن نلتقطه "أصلًا" ونعيد كتابته على الإنتاج. */
  commerceBackup =
    (await one<Record<string, unknown>>("commerce_settings?select=*&id=eq.true")) ?? null;
  if (commerceBackup?.vat_number === TEST_VAT_NUMBER) {
    throw new Error(
      "إعدادات الضريبة تحمل قيمة اختبار من تشغيل سابق — أعدها يدويًا قبل إعادة التشغيل.",
    );
  }
  await rest("commerce_settings?id=eq.true", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      vat_status: "registered",
      vat_number: TEST_VAT_NUMBER,
      tax_rate_bps: 1500,
      prices_include_tax: true,
    }),
  });

  const courseId = await makeCourse({ slug: SLUG, name: `${TAG} دورة مدفوعة` });
  const draftCourseId = await makeCourse({ slug: `${SLUG}-draft`, name: `${TAG} دورة مسودة`, published: false, free: true });
  /* مصفوفة القرار الجديدة: نوع التسليم لا يقرر، والشركات وحدها استثناء. */
  const inPersonFreeId = await makeCourse({ slug: `${SLUG}-ip-free`, name: `${TAG} ورشة حضورية مجانية`, free: true, category: "in-person-individuals" });
  const inPersonPaidId = await makeCourse({ slug: `${SLUG}-ip-paid`, name: `${TAG} ورشة حضورية مدفوعة`, category: "in-person-individuals" });
  const corporateFreeId = await makeCourse({ slug: `${SLUG}-corp-free`, name: `${TAG} برنامج شركات مجاني`, free: true, category: "in-person-corporates", requestQuote: true });
  const corporatePaidId = await makeCourse({ slug: `${SLUG}-corp-paid`, name: `${TAG} برنامج شركات مدفوع`, category: "in-person-corporates", requestQuote: true });
  /* تصنيف شركات بلا علَم: الحارس الثاني وحده يمنعه. */
  const corporateNoFlagId = await makeCourse({ slug: `${SLUG}-corp-noflag`, name: `${TAG} شركات بلا علَم`, category: "in-person-corporates" });
  await rest("course_payment_methods", {
    method: "POST",
    body: JSON.stringify([
      { course_id: inPersonPaidId, provider: "moyasar", enabled: true, sort_order: 0 },
      { course_id: corporatePaidId, provider: "moyasar", enabled: true, sort_order: 0 },
      { course_id: corporateNoFlagId, provider: "moyasar", enabled: true, sort_order: 0 },
    ]),
  });
  await rest("course_payment_methods", {
    method: "POST",
    body: JSON.stringify({ course_id: courseId, provider: "moyasar", enabled: true, sort_order: 0 }),
  });

  ids = {
    courseId,
    draftCourseId,
    inPersonFreeId,
    inPersonPaidId,
    corporateFreeId,
    corporatePaidId,
    corporateNoFlagId,
    userId: await createUser(`${TAG}-buyer@example.invalid`),
    otherUserId: await createUser(`${TAG}-other@example.invalid`),
  };
}, 120_000);

afterAll(async () => {
  if (!LIVE || !ids) return;
  for (const courseId of [
    ids.courseId,
    ids.draftCourseId,
    ids.inPersonFreeId,
    ids.inPersonPaidId,
    ids.corporateFreeId,
    ids.corporatePaidId,
    ids.corporateNoFlagId,
  ]) {
    await rest(`course_payments?course_id=eq.${courseId}`, { method: "DELETE" });
    await rest(`course_enrollments?course_id=eq.${courseId}`, { method: "DELETE" });
    await rest(`course_payment_methods?course_id=eq.${courseId}`, { method: "DELETE" });
    await rest(`course_curriculum_days?course_id=eq.${courseId}`, { method: "DELETE" });
    await rest(`course_sessions?course_id=eq.${courseId}`, { method: "DELETE" });
    await rest(`courses?id=eq.${courseId}`, { method: "DELETE" });
  }
  for (const userId of [ids.userId, ids.otherUserId]) {
    await rest(`course_payments?user_id=eq.${userId}`, { method: "DELETE" });
    await fetch(`${SB}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: H });
  }
  if (commerceBackup) {
    await rest("commerce_settings?id=eq.true", {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        vat_status: commerceBackup.vat_status,
        vat_number: commerceBackup.vat_number,
        tax_rate_bps: commerceBackup.tax_rate_bps,
        prices_include_tax: commerceBackup.prices_include_tax,
      }),
    });
  }
}, 120_000);

const maybe = LIVE ? describe : describe.skip;

maybe("free enrollment is idempotent and cannot be aimed at a paid course", () => {
  test("a paid course rejects the free endpoint", async () => {
    const { enrollFree } = await import("../../src/lib/payments/purchase");
    const result = await enrollFree(ids.userId, ids.courseId);
    expect(result.ok).toBe(false);
    const enrollments = await rows(`course_enrollments?course_id=eq.${ids.courseId}`);
    expect(enrollments).toHaveLength(0);
  });

  test("a draft course rejects it too", async () => {
    const { enrollFree } = await import("../../src/lib/payments/purchase");
    const result = await enrollFree(ids.userId, ids.draftCourseId);
    expect(result.ok).toBe(false);
  });

  test("a published free course enrols once, however many clicks", async () => {
    const { enrollFree } = await import("../../src/lib/payments/purchase");
    await rest(`courses?id=eq.${ids.draftCourseId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ publish_status: "published" }),
    });
    const results = await Promise.all([
      enrollFree(ids.userId, ids.draftCourseId),
      enrollFree(ids.userId, ids.draftCourseId),
      enrollFree(ids.userId, ids.draftCourseId),
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    const enrollments = await rows<{ status: string; source: string }>(
      `course_enrollments?course_id=eq.${ids.draftCourseId}&select=status,source`,
    );
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].status).toBe("active");
    expect(enrollments[0].source).toBe("manual");
    /* ولا صف دفع للمجاني بحال. */
    expect(await rows(`course_payments?course_id=eq.${ids.draftCourseId}`)).toHaveLength(0);
  });
});

maybe("the registration matrix: delivery type never decides, corporate is the only exception", () => {
  test("1. a free online course registers, and lands on its first lesson when it has one", async () => {
    const { enrollFree } = await import("../../src/lib/payments/purchase");
    await rest(`courses?id=eq.${ids.draftCourseId}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ publish_status: "published" }),
    });
    const result = await enrollFree(ids.userId, ids.draftCourseId);
    expect(result.ok).toBe(true);
    /* لا محتوى منشورًا لهذه الدورة، فالوجهة صفحة تأكيد لا درس. */
    if (result.ok) expect(result.kind).toBe("registered");
    const enrollments = await rows(
      `course_enrollments?course_id=eq.${ids.draftCourseId}&user_id=eq.${ids.userId}`,
    );
    expect(enrollments).toHaveLength(1);
  });

  test("2. a free in-person workshop registers, and lands on a confirmation not a lesson", async () => {
    const { enrollFree } = await import("../../src/lib/payments/purchase");
    const result = await enrollFree(ids.userId, ids.inPersonFreeId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.kind).toBe("registered");
      expect(result.href).toContain("/registered");
    }
    const enrollments = await rows<{ status: string }>(
      `course_enrollments?course_id=eq.${ids.inPersonFreeId}&select=status`,
    );
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].status).toBe("active");
  });

  test("3. a paid online course opens checkout", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const result = await startCheckout(ids.otherUserId, ids.courseId, "moyasar", undefined, checkoutFetcher());
    expect(result.ok).toBe(true);
    await rest(`course_payments?user_id=eq.${ids.otherUserId}`, { method: "DELETE" });
  });

  test("4. a paid in-person workshop opens checkout too", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const result = await startCheckout(ids.userId, ids.inPersonPaidId, "moyasar", undefined, checkoutFetcher());
    expect(result.ok).toBe(true);
    const payment = await one<{ total_amount: number; net_amount: number; tax_amount: number }>(
      `course_payments?course_id=eq.${ids.inPersonPaidId}&select=total_amount,net_amount,tax_amount`,
    );
    expect(payment?.total_amount).toBe(GROSS);
    expect((payment?.net_amount ?? 0) + (payment?.tax_amount ?? 0)).toBe(GROSS);
    await rest(`course_payments?course_id=eq.${ids.inPersonPaidId}`, { method: "DELETE" });
  });

  test("5. a corporate course marked free still refuses self enrolment", async () => {
    const { enrollFree } = await import("../../src/lib/payments/purchase");
    const result = await enrollFree(ids.userId, ids.corporateFreeId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("الشركات");
    expect(await rows(`course_enrollments?course_id=eq.${ids.corporateFreeId}`)).toHaveLength(0);
  });

  test("6. a corporate course with a price refuses checkout", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const result = await startCheckout(ids.userId, ids.corporatePaidId, "moyasar", undefined, checkoutFetcher());
    expect(result.ok).toBe(false);
    expect(await rows(`course_payments?course_id=eq.${ids.corporatePaidId}`)).toHaveLength(0);
  });

  test("7. a corporate course is quote-only, whichever guard catches it", async () => {
    const { commercialMode, loadCourseCommerce, startCheckout } = await import(
      "../../src/lib/payments/purchase"
    );
    for (const courseId of [ids.corporateFreeId, ids.corporatePaidId, ids.corporateNoFlagId]) {
      const commerce = await loadCourseCommerce(courseId);
      expect(commerce?.mode).toBe("quote");
    }
    /* التصنيف وحده يكفي حتى بلا علَم request_quote. */
    expect(
      commercialMode({
        publish_status: "published",
        category: "in-person-corporates",
        is_free: false,
        request_quote: false,
        price: 1000,
      }),
    ).toBe("quote");
    const result = await startCheckout(ids.userId, ids.corporateNoFlagId, "moyasar", undefined, checkoutFetcher());
    expect(result.ok).toBe(false);
  });

  test("8. a draft course refuses registration", async () => {
    const { enrollFree } = await import("../../src/lib/payments/purchase");
    await rest(`courses?id=eq.${ids.inPersonFreeId}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ publish_status: "draft" }),
    });
    const result = await enrollFree(ids.otherUserId, ids.inPersonFreeId);
    expect(result.ok).toBe(false);
    await rest(`courses?id=eq.${ids.inPersonFreeId}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ publish_status: "published" }),
    });
  });

  test("9. an unpublished course refuses payment", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    await rest(`courses?id=eq.${ids.inPersonPaidId}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ publish_status: "draft" }),
    });
    const result = await startCheckout(ids.otherUserId, ids.inPersonPaidId, "moyasar", undefined, checkoutFetcher());
    expect(result.ok).toBe(false);
    await rest(`courses?id=eq.${ids.inPersonPaidId}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ publish_status: "published" }),
    });
  });

  test("10. a paid course sent to the free endpoint is refused", async () => {
    const { enrollFree } = await import("../../src/lib/payments/purchase");
    const result = await enrollFree(ids.otherUserId, ids.inPersonPaidId);
    expect(result.ok).toBe(false);
    expect(await rows(`course_enrollments?course_id=eq.${ids.inPersonPaidId}`)).toHaveLength(0);
  });

  test("11. a free course sent to the paid endpoint is refused", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const result = await startCheckout(ids.otherUserId, ids.inPersonFreeId, "moyasar", undefined, checkoutFetcher());
    expect(result.ok).toBe(false);
    expect(await rows(`course_payments?course_id=eq.${ids.inPersonFreeId}`)).toHaveLength(0);
  });

  test("12. duplicate free registration yields one enrolment", async () => {
    const { enrollFree } = await import("../../src/lib/payments/purchase");
    const results = await Promise.all([
      enrollFree(ids.otherUserId, ids.inPersonFreeId),
      enrollFree(ids.otherUserId, ids.inPersonFreeId),
      enrollFree(ids.otherUserId, ids.inPersonFreeId),
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    const enrollments = await rows(
      `course_enrollments?course_id=eq.${ids.inPersonFreeId}&user_id=eq.${ids.otherUserId}`,
    );
    expect(enrollments).toHaveLength(1);
  });

  test("13. duplicate successful payment yields one enrolment", async () => {
    const { startCheckout, verifyAndFinalize } = await import("../../src/lib/payments/purchase");
    const started = await startCheckout(ids.userId, ids.inPersonPaidId, "moyasar", undefined, checkoutFetcher());
    expect(started.ok).toBe(true);
    const payment = await one<{ id: string }>(
      `course_payments?course_id=eq.${ids.inPersonPaidId}&user_id=eq.${ids.userId}&select=id`,
    );
    const reference = await providerRef(payment!.id);
    const fetcher = fetcherFor(() => invoice(payment!.id, reference));
    const outcomes = await Promise.all([
      verifyAndFinalize(payment!.id, fetcher),
      verifyAndFinalize(payment!.id, fetcher),
      verifyAndFinalize(payment!.id, fetcher),
    ]);
    expect(outcomes.every((outcome) => outcome.outcome === "paid")).toBe(true);
    const enrollments = await rows<{ status: string; source: string }>(
      `course_enrollments?course_id=eq.${ids.inPersonPaidId}&user_id=eq.${ids.userId}&select=status,source`,
    );
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].source).toBe("purchase");
    expect(
      await rows(`course_payments?course_id=eq.${ids.inPersonPaidId}&status=eq.paid`),
    ).toHaveLength(1);
  });
});

maybe("the paid endpoint refuses everything that is not a purchasable course", () => {
  test("a free course cannot be pushed through checkout", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const result = await startCheckout(ids.otherUserId, ids.draftCourseId, "moyasar", undefined, checkoutFetcher());
    expect(result.ok).toBe(false);
    expect(await rows(`course_payments?course_id=eq.${ids.draftCourseId}`)).toHaveLength(0);
  });

  test("a provider that is not enabled for the course is refused", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const result = await startCheckout(ids.otherUserId, ids.courseId, "tabby", undefined, checkoutFetcher());
    expect(result.ok).toBe(false);
  });

  test("an unpublished course is refused", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    await rest(`courses?id=eq.${ids.courseId}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ publish_status: "draft" }),
    });
    const result = await startCheckout(ids.otherUserId, ids.courseId, "moyasar", undefined, checkoutFetcher());
    expect(result.ok).toBe(false);
    await rest(`courses?id=eq.${ids.courseId}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ publish_status: "published" }),
    });
  });
});

maybe("checkout snapshots the trusted price", () => {
  test("it stores gross, net and vat that add up exactly", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const result = await startCheckout(ids.userId, ids.courseId, "moyasar", undefined, checkoutFetcher());
    expect(result.ok).toBe(true);

    const payment = await one<{
      status: string;
      total_amount: number;
      net_amount: number;
      tax_amount: number;
      tax_rate_bps: number;
      currency: string;
      environment: string;
      provider_payment_id: string;
    }>(`course_payments?user_id=eq.${ids.userId}&course_id=eq.${ids.courseId}&select=*`);

    expect(payment?.status).toBe("pending");
    expect(payment?.total_amount).toBe(GROSS);
    expect(payment?.net_amount).toBe(NET);
    expect(payment?.tax_amount).toBe(VAT);
    expect((payment?.net_amount ?? 0) + (payment?.tax_amount ?? 0)).toBe(GROSS);
    expect(payment?.tax_rate_bps).toBe(1500);
    expect(payment?.currency).toBe("SAR");
    expect(payment?.environment).toBe("test");
    /* مرجع المزود محفوظ كما أعاده، ولا يُخترع عندنا. */
    expect(payment?.provider_payment_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });

  test("a second click reuses the same open attempt", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const again = await startCheckout(ids.userId, ids.courseId, "moyasar", undefined, checkoutFetcher());
    expect(again.ok).toBe(true);
    const open = await rows(
      `course_payments?user_id=eq.${ids.userId}&course_id=eq.${ids.courseId}&status=in.(created,pending,authorized)`,
    );
    expect(open).toHaveLength(1);
  });

  test("no enrollment exists while the payment is only pending", async () => {
    const enrollments = await rows(`course_enrollments?course_id=eq.${ids.courseId}`);
    expect(enrollments).toHaveLength(0);
  });
});

maybe("verification refuses everything that does not match", () => {
  async function freshPayment(): Promise<string> {
    await rest(`course_payments?user_id=eq.${ids.userId}&course_id=eq.${ids.courseId}`, { method: "DELETE" });
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const result = await startCheckout(ids.userId, ids.courseId, "moyasar", undefined, checkoutFetcher());
    expect(result.ok).toBe(true);
    const payment = await one<{ id: string }>(
      `course_payments?user_id=eq.${ids.userId}&course_id=eq.${ids.courseId}&select=id`,
    );
    return payment!.id;
  }

  const cases: Array<[string, (paymentId: string, reference: string) => Record<string, unknown>, string]> = [
    ["a different amount", (id, ref) => invoice(id, ref, { amount: 1 }), "amount_mismatch"],
    ["a different currency", (id, ref) => invoice(id, ref, { currency: "USD" }), "currency_mismatch"],
    [
      "another payment's metadata",
      (_id, ref) => invoice("aaaaaaaa-0000-4000-8000-000000000000", ref),
      "metadata_mismatch",
    ],
    [
      "a production environment tag",
      (id, ref) => invoice(id, ref, { metadata: { payment_id: id, environment: "production" } }),
      "environment_mismatch",
    ],
  ];

  for (const [label, body, reason] of cases) {
    test(`${label} fails closed and grants nothing`, async () => {
      const paymentId = await freshPayment();
      const reference = await providerRef(paymentId);
      const { verifyAndFinalize } = await import("../../src/lib/payments/purchase");
      const outcome = await verifyAndFinalize(paymentId, fetcherFor(() => body(paymentId, reference)));
      expect(outcome.outcome).toBe("failed");
      expect("reason" in outcome ? outcome.reason : "").toBe(reason);
      const enrollments = await rows(`course_enrollments?course_id=eq.${ids.courseId}`);
      expect(enrollments).toHaveLength(0);
      const payment = await one<{ status: string; failure_code: string }>(
        `course_payments?id=eq.${paymentId}&select=status,failure_code`,
      );
      expect(payment?.status).toBe("failed");
      expect(payment?.failure_code).toBe(reason);
    });
  }

  test("a provider that is unreachable leaves the payment pending, not failed", async () => {
    const paymentId = await freshPayment();
    const { verifyAndFinalize } = await import("../../src/lib/payments/purchase");
    const outcome = await verifyAndFinalize(paymentId, (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch);
    expect(outcome.outcome).toBe("pending");
    const payment = await one<{ status: string }>(`course_payments?id=eq.${paymentId}&select=status`);
    expect(payment?.status).toBe("pending");
  });

  test("a matching paid invoice activates access exactly once", async () => {
    const paymentId = await freshPayment();
    const reference = await providerRef(paymentId);
    const { verifyAndFinalize } = await import("../../src/lib/payments/purchase");
    const fetcher = fetcherFor(() => invoice(paymentId, reference));

    const first = await verifyAndFinalize(paymentId, fetcher);
    expect(first.outcome).toBe("paid");

    /* تكرار — الحالة نفسها والتسجيل نفسه بلا صف ثانٍ. */
    const second = await verifyAndFinalize(paymentId, fetcher);
    expect(second).toEqual(first);

    /* تزامن — نداءان معًا. */
    const [a, b] = await Promise.all([
      verifyAndFinalize(paymentId, fetcher),
      verifyAndFinalize(paymentId, fetcher),
    ]);
    expect(a).toEqual(first);
    expect(b).toEqual(first);

    const enrollments = await rows<{ status: string; source: string }>(
      `course_enrollments?course_id=eq.${ids.courseId}&select=status,source`,
    );
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].status).toBe("active");
    expect(enrollments[0].source).toBe("purchase");

    const paid = await rows(`course_payments?course_id=eq.${ids.courseId}&status=eq.paid`);
    expect(paid).toHaveLength(1);
  });

  test("buying the same course again is refused while access is active", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const result = await startCheckout(ids.userId, ids.courseId, "moyasar", undefined, checkoutFetcher());
    expect(result.ok).toBe(false);
  });

  test("another member cannot ride someone else's transaction", async () => {
    const { startCheckout, verifyAndFinalize } = await import("../../src/lib/payments/purchase");

    /* عضو آخر يبدأ عمليته هو — وهذا مسموح: الدورة نفسها يشتريها كثيرون. */
    const started = await startCheckout(ids.otherUserId, ids.courseId, "moyasar", undefined, checkoutFetcher());
    expect(started.ok).toBe(true);
    const mine = await one<{ id: string }>(
      `course_payments?user_id=eq.${ids.otherUserId}&course_id=eq.${ids.courseId}&select=id`,
    );
    const myReference = await providerRef(mine!.id);
    const theirPaid = await one<{ id: string; provider_payment_id: string }>(
      `course_payments?user_id=eq.${ids.userId}&course_id=eq.${ids.courseId}&status=eq.paid&select=id,provider_payment_id`,
    );

    /* فاتورة تحمل بيانات عملية غيره: تُرفض ولا تفتح له شيئًا. */
    const outcome = await verifyAndFinalize(
      mine!.id,
      fetcherFor(() => invoice(theirPaid!.id, myReference)),
    );
    expect(outcome.outcome).toBe("failed");
    const enrollments = await rows<{ user_id: string }>(
      `course_enrollments?course_id=eq.${ids.courseId}&select=user_id`,
    );
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].user_id).toBe(ids.userId);

    /* ولا يستطيع نسبة مرجع المزود نفسه لصفّه: قيد فريد يمنعه. */
    const stolen = await rest(`course_payments?id=eq.${mine!.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ provider_payment_id: theirPaid!.provider_payment_id }),
    });
    expect(stolen.status).toBeGreaterThanOrEqual(400);
    await rest(`course_payments?user_id=eq.${ids.otherUserId}&course_id=eq.${ids.courseId}`, {
      method: "DELETE",
    });
  });
});

maybe("the database refuses what the application might miss", () => {
  test("a payment whose parts do not add up is rejected by a constraint", async () => {
    const response = await rest("course_payments", {
      method: "POST",
      body: JSON.stringify({
        user_id: ids.userId,
        course_id: ids.courseId,
        provider: "moyasar",
        environment: "test",
        status: "created",
        net_amount: 1000,
        tax_amount: 100,
        total_amount: 999,
        tax_rate_bps: 1500,
      }),
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test("two paid rows for the same member and course cannot coexist", async () => {
    /* شرطه الأول يُبنى هنا لا يُورَث من اختبار سابق. */
    const seed = await rest("course_payments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: ids.otherUserId,
        course_id: ids.corporateFreeId,
        provider: "moyasar",
        environment: "test",
        status: "paid",
        paid_at: new Date().toISOString(),
        net_amount: NET,
        tax_amount: VAT,
        total_amount: GROSS,
        tax_rate_bps: 1500,
      }),
    });
    expect(seed.status).toBeLessThan(400);
    const response = await rest("course_payments", {
      method: "POST",
      body: JSON.stringify({
        user_id: ids.otherUserId,
        course_id: ids.corporateFreeId,
        provider: "moyasar",
        environment: "test",
        status: "paid",
        paid_at: new Date().toISOString(),
        net_amount: NET,
        tax_amount: VAT,
        total_amount: GROSS,
        tax_rate_bps: 1500,
      }),
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    await rest(`course_payments?user_id=eq.${ids.otherUserId}&course_id=eq.${ids.corporateFreeId}`, {
      method: "DELETE",
    });
  });
});
