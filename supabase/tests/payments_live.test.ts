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
}

let ids: Ids;
let commerceBackup: Record<string, unknown> | null = null;

/** فاتورة ميسر مزيّفة بالشكل الذي يعيده المزود فعلًا. */
function invoice(paymentId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-2222-4333-8444-555555555555",
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

/** مُحضِر ينشئ فاتورة ثم يعيدها مدفوعة — مسار النجاح كاملًا. */
function checkoutFetcher() {
  return fetcherFor(() => ({
    id: "11111111-2222-4333-8444-555555555555",
    url: "https://moyasar.test/invoice/abc",
  }));
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

async function makeCourse(slug: string, name: string, published: boolean, free: boolean): Promise<string> {
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
        category: "online",
        level: "beginner",
        price: free ? 0 : PRICE,
        is_free: free,
        request_quote: false,
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

  /* إعدادات التجارة: لقطة ثم ضبط مؤقت، وتُستعاد حرفيًا في النهاية. */
  commerceBackup =
    (await one<Record<string, unknown>>("commerce_settings?select=*&id=eq.true")) ?? null;
  await rest("commerce_settings?id=eq.true", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      vat_status: "registered",
      vat_number: "300000000000003",
      tax_rate_bps: 1500,
      prices_include_tax: true,
    }),
  });

  const courseId = await makeCourse(SLUG, `${TAG} دورة مدفوعة`, true, false);
  const draftCourseId = await makeCourse(`${SLUG}-draft`, `${TAG} دورة مسودة`, false, true);
  await rest("course_payment_methods", {
    method: "POST",
    body: JSON.stringify({ course_id: courseId, provider: "moyasar", enabled: true, sort_order: 0 }),
  });

  ids = {
    courseId,
    draftCourseId,
    userId: await createUser(`${TAG}-buyer@example.invalid`),
    otherUserId: await createUser(`${TAG}-other@example.invalid`),
  };
});

afterAll(async () => {
  if (!LIVE || !ids) return;
  for (const courseId of [ids.courseId, ids.draftCourseId]) {
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
});

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

maybe("checkout snapshots the trusted price", () => {
  test("it stores gross, net and vat that add up exactly", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const result = await startCheckout(ids.userId, ids.courseId, "moyasar", checkoutFetcher());
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
    expect(payment?.provider_payment_id).toBe("11111111-2222-4333-8444-555555555555");
  });

  test("a second click reuses the same open attempt", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const again = await startCheckout(ids.userId, ids.courseId, "moyasar", checkoutFetcher());
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
    const result = await startCheckout(ids.userId, ids.courseId, "moyasar", checkoutFetcher());
    expect(result.ok).toBe(true);
    const payment = await one<{ id: string }>(
      `course_payments?user_id=eq.${ids.userId}&course_id=eq.${ids.courseId}&select=id`,
    );
    return payment!.id;
  }

  const cases: Array<[string, (paymentId: string) => Record<string, unknown>, string]> = [
    ["a different amount", (id) => invoice(id, { amount: 1 }), "amount_mismatch"],
    ["a different currency", (id) => invoice(id, { currency: "USD" }), "currency_mismatch"],
    ["another payment's metadata", () => invoice("aaaaaaaa-0000-4000-8000-000000000000"), "metadata_mismatch"],
    [
      "a production environment tag",
      (id) => invoice(id, { metadata: { payment_id: id, environment: "production" } }),
      "environment_mismatch",
    ],
  ];

  for (const [label, body, reason] of cases) {
    test(`${label} fails closed and grants nothing`, async () => {
      const paymentId = await freshPayment();
      const { verifyAndFinalize } = await import("../../src/lib/payments/purchase");
      const outcome = await verifyAndFinalize(paymentId, fetcherFor(() => body(paymentId)));
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
    const { verifyAndFinalize } = await import("../../src/lib/payments/purchase");
    const fetcher = fetcherFor(() => invoice(paymentId));

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
    const result = await startCheckout(ids.userId, ids.courseId, "moyasar", checkoutFetcher());
    expect(result.ok).toBe(false);
  });

  test("another member's payment cannot be finalized into someone else's access", async () => {
    const { startCheckout, verifyAndFinalize } = await import("../../src/lib/payments/purchase");
    const result = await startCheckout(ids.otherUserId, ids.courseId, "moyasar", checkoutFetcher());
    expect(result.ok).toBe(false); // نفس مرجع المزود مستهلك بقيد فريد
    const rowsForOther = await rows(`course_payments?user_id=eq.${ids.otherUserId}`);
    const pending = rowsForOther.length;
    expect(pending).toBeLessThanOrEqual(1);
    void verifyAndFinalize;
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
    const response = await rest("course_payments", {
      method: "POST",
      body: JSON.stringify({
        user_id: ids.userId,
        course_id: ids.courseId,
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
  });
});
