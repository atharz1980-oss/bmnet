/**
 * حجز المقاعد — اختبار حيّ على قاعدة الإنتاج ببيانات مؤقتة.
 *
 *   BMNET_LIVE_SEATS_TEST=1 bun test supabase/tests/session_seats_live.test.ts
 *
 * المقعد الأخير لا يُثبت بالقراءة: الحالات هنا تُطلق طلبات متوازية حقيقية
 * على القاعدة نفسها، لأن ما يُكسر تحت التزامن لا يظهر في تشغيل متسلسل.
 *
 * كل ما يُنشأ موسوم بـTAG ويُحذف في النهاية، والمقاعد تُحذف قبل الدفعات
 * لأن حارس الحذف يرفض دفعة لها سجل مقاعد — وهو المطلوب.
 */

import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

mock.module("server-only", () => ({}));

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && existsSync(".env.local")) {
  const newline = String.fromCharCode(10);
  for (const raw of readFileSync(".env.local", "utf8").split(newline)) {
    const line = raw.trim();
    const index = line.indexOf("=");
    if (index <= 0 || line.startsWith("#")) continue;
    const key = line.slice(0, index).trim();
    if (!process.env[key]) process.env[key] = line.slice(index + 1).trim().replace(/^"|"$/g, "");
  }
}

const LIVE = process.env.BMNET_LIVE_SEATS_TEST === "1";
const TAG = "bmnet-seat";
const TEST_VAT_NUMBER = "300000000000003";
const GROSS = 45_000;
const NET = 39_130;
const VAT = 5_870;

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";
const H = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" };

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
const rows = async <T>(path: string): Promise<T[]> => (await (await rest(path)).json()) as T[];
const one = async <T>(path: string): Promise<T | undefined> => (await rows<T>(path))[0];
const rpc = async (name: string, body: Record<string, unknown>) => {
  const response = await fetch(`${SB}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify(body),
  });
  return { ok: response.ok, status: response.status, body: await response.text() };
};

interface Ids {
  paidCourse: string;
  freeCourse: string;
  corporateCourse: string;
  draftCourse: string;
  onlineCourse: string;
  paidSession: string;
  freeSession: string;
  corporateSession: string;
  pastSession: string;
  cancelledSession: string;
  otherCourseSession: string;
  /* عشرة متسابقين على مقعد واحد — هؤلاء وحدهم يدخلون السباق. */
  users: string[];
  /* لكل حالة لاحقة مستخدمها: مقعد عالق من سباق سابق يفسد ما بعده. */
  extra: Record<Role, string>;
}

type Role =
  | "dup"
  | "probe"
  | "expired"
  | "manual"
  | "late"
  | "rival"
  | "failedCheckout"
  | "orphanPayment"
  | "online";

const ROLES: Role[] = [
  "dup", "probe", "expired", "manual", "late",
  "rival", "failedCheckout", "orphanPayment", "online",
];

let ids: Ids;
let commerceBackup: Record<string, unknown> | null = null;

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const past = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

async function makeCourse(spec: {
  slug: string;
  name: string;
  free?: boolean;
  published?: boolean;
  category?: string;
  quote?: boolean;
  price?: number;
}): Promise<string> {
  const trainer = await one<{ id: string }>("trainers?select=id&limit=1");
  const response = await fetch(`${SB}/rest/v1/rpc/save_course_atomic`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      p_course_id: null,
      p_course: {
        name: spec.name,
        slug: spec.slug,
        summary: "دورة مؤقتة لاختبار المقاعد. تُحذف بعده.",
        description: "مؤقتة.",
        category: spec.category ?? "in-person-individuals",
        level: "beginner",
        price: spec.free ? 0 : (spec.price ?? 450),
        is_free: spec.free ?? false,
        request_quote: spec.quote ?? false,
        duration_days: 1,
        duration_hours: 3,
        language: "ar",
        image_path: "/images/course-fundamentals.jpg",
        image_alt: "مؤقتة",
        publish_status: (spec.published ?? true) ? "published" : "draft",
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

async function makeSession(spec: {
  courseId: string;
  name: string;
  capacity: number;
  startDate: string;
  status?: string;
  manual?: number;
}): Promise<string> {
  const response = await rest("course_sessions", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      course_id: spec.courseId,
      batch_name: spec.name,
      start_date: spec.startDate,
      start_time: "17:00",
      end_time: "20:00",
      location: "استوديو الاختبار",
      city: "جدة",
      capacity: spec.capacity,
      registered_count: spec.manual ?? 0,
      status: spec.status ?? "open",
    }),
  });
  const body = (await response.json()) as Array<{ id: string }>;
  if (!Array.isArray(body) || !body[0]?.id) {
    throw new Error(`تعذر إنشاء الموعد: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body[0].id;
}

async function makeUser(email: string): Promise<string> {
  const response = await fetch(`${SB}/auth/v1/admin/users`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email, password: `${crypto.randomUUID()}Aa1!`, email_confirm: true }),
  });
  const body = (await response.json()) as { id?: string };
  if (!body.id) throw new Error(`تعذر إنشاء المستخدم: ${JSON.stringify(body).slice(0, 160)}`);
  return body.id;
}

function fetcherFor(body: (url: string) => unknown, status = 200) {
  return (async (url: string) =>
    new Response(JSON.stringify(body(url)), { status, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
}
const checkoutFetcher = () =>
  fetcherFor(() => ({ id: crypto.randomUUID(), url: "https://moyasar.test/invoice/seat" }));
const paidInvoice = (paymentId: string, providerId: string, overrides: Record<string, unknown> = {}) => ({
  id: providerId,
  status: "paid",
  amount: GROSS,
  currency: "SAR",
  refunded: 0,
  metadata: { payment_id: paymentId, environment: "test" },
  ...overrides,
});

beforeAll(async () => {
  if (!LIVE) return;
  if (!SB || !SECRET) throw new Error("بيئة القاعدة غير محمّلة.");

  process.env.PAYMENTS_MODE = "test";
  process.env.MOYASAR_SECRET_KEY = "sk_test_seatcheck0123456789";
  process.env.MOYASAR_WEBHOOK_SECRET = "seat-check-webhook-secret";

  commerceBackup = (await one<Record<string, unknown>>("commerce_settings?select=*&id=eq.true")) ?? null;
  if (commerceBackup?.vat_number === TEST_VAT_NUMBER) {
    throw new Error("إعدادات الضريبة تحمل قيمة اختبار من تشغيل سابق — أعدها يدويًا أولًا.");
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

  const paidCourse = await makeCourse({ slug: `${TAG}-paid`, name: `${TAG} ورشة مدفوعة` });
  const freeCourse = await makeCourse({ slug: `${TAG}-free`, name: `${TAG} ورشة مجانية`, free: true });
  const corporateCourse = await makeCourse({
    slug: `${TAG}-corp`, name: `${TAG} برنامج شركات`, category: "in-person-corporates", quote: true, price: 5000,
  });
  const draftCourse = await makeCourse({ slug: `${TAG}-draft`, name: `${TAG} مسودة`, published: false });
  const onlineCourse = await makeCourse({ slug: `${TAG}-online`, name: `${TAG} أونلاين`, category: "online" });

  await rest("course_payment_methods", {
    method: "POST",
    body: JSON.stringify([
      { course_id: paidCourse, provider: "moyasar", enabled: true, sort_order: 0 },
      { course_id: onlineCourse, provider: "moyasar", enabled: true, sort_order: 0 },
      { course_id: draftCourse, provider: "moyasar", enabled: true, sort_order: 0 },
    ]),
  });

  ids = {
    paidCourse,
    freeCourse,
    corporateCourse,
    draftCourse,
    onlineCourse,
    paidSession: await makeSession({ courseId: paidCourse, name: "دفعة مدفوعة", capacity: 1, startDate: future(30) }),
    freeSession: await makeSession({ courseId: freeCourse, name: "دفعة مجانية", capacity: 1, startDate: future(30) }),
    corporateSession: await makeSession({ courseId: corporateCourse, name: "دفعة شركات", capacity: 10, startDate: future(30) }),
    pastSession: await makeSession({ courseId: freeCourse, name: "دفعة ماضية", capacity: 10, startDate: past(5) }),
    cancelledSession: await makeSession({ courseId: freeCourse, name: "دفعة ملغاة", capacity: 10, startDate: future(20), status: "cancelled" }),
    otherCourseSession: await makeSession({ courseId: onlineCourse, name: "دفعة دورة أخرى", capacity: 10, startDate: future(30) }),
    users: await Promise.all(
      Array.from({ length: 10 }, (_, index) => makeUser(`${TAG}-race-${index}@example.invalid`)),
    ),
    extra: Object.fromEntries(
      await Promise.all(
        ROLES.map(async (role) => [role, await makeUser(`${TAG}-${role}@example.invalid`)] as const),
      ),
    ) as Record<Role, string>,
  };
}, 180_000);

afterAll(async () => {
  if (!LIVE || !ids) return;
  const courses = [ids.paidCourse, ids.freeCourse, ids.corporateCourse, ids.draftCourse, ids.onlineCourse];
  for (const courseId of courses) {
    /* المقاعد أولًا: حارس الحذف يرفض دفعة لها سجل مقاعد. */
    await rest(`course_session_seats?course_id=eq.${courseId}`, { method: "DELETE" });
    await rest(`course_payments?course_id=eq.${courseId}`, { method: "DELETE" });
    await rest(`course_enrollments?course_id=eq.${courseId}`, { method: "DELETE" });
    await rest(`course_payment_methods?course_id=eq.${courseId}`, { method: "DELETE" });
    await rest(`course_sessions?course_id=eq.${courseId}`, { method: "DELETE" });
    await rest(`course_curriculum_days?course_id=eq.${courseId}`, { method: "DELETE" });
    await rest(`courses?id=eq.${courseId}`, { method: "DELETE" });
  }
  for (const userId of [...ids.users, ...Object.values(ids.extra)]) {
    await rest(`course_session_seats?user_id=eq.${userId}`, { method: "DELETE" });
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
}, 180_000);

const maybe = LIVE ? describe : describe.skip;

/* ───────────────────── المقعد الأخير تحت التزامن ───────────────────── */

maybe("the last seat survives ten people reaching for it at once", () => {
  test("1. ten simultaneous free claims yield exactly one seat", async () => {
    const { enrollFree } = await import("../../src/lib/payments/purchase");
    const results = await Promise.all(
      ids.users.map((userId) => enrollFree(userId, ids.freeCourse, ids.freeSession)),
    );
    const winners = results.filter((result) => result.ok);
    expect(winners).toHaveLength(1);
    const seats = await rows<{ status: string }>(
      `course_session_seats?session_id=eq.${ids.freeSession}&select=status`,
    );
    expect(seats.filter((seat) => seat.status === "confirmed")).toHaveLength(1);
    const enrollments = await rows(`course_enrollments?course_id=eq.${ids.freeCourse}`);
    expect(enrollments).toHaveLength(1);
    /* والخاسرون يقرأون سببًا مفهومًا لا خطأ قاعدة. */
    const refusals = results.filter((result) => !result.ok);
    const messages = [...new Set(refusals.map((r) => (r.ok ? "" : r.error)))];
    expect(messages).toEqual(["اكتملت مقاعد هذا الموعد."]);
  }, 60_000);

  test("2. ten simultaneous paid holds yield exactly one live hold", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const results = await Promise.all(
      ids.users.map((userId) =>
        startCheckout(userId, ids.paidCourse, "moyasar", ids.paidSession, checkoutFetcher()),
      ),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const live = await rows(
      `course_session_seats?session_id=eq.${ids.paidSession}&status=eq.held&select=id`,
    );
    expect(live).toHaveLength(1);
    const payments = await rows(`course_payments?course_id=eq.${ids.paidCourse}&select=id,status`);
    /* لا صف دفع لمن لم يحجز: المال لا يُطلب لمقعد لا نملكه. */
    expect(payments).toHaveLength(1);
  }, 60_000);

  test("3 & 4. the same user clicking twice, or from two tabs, keeps one seat", async () => {
    const { enrollFree } = await import("../../src/lib/payments/purchase");
    const user = ids.extra.dup;
    const session = await makeSession({
      courseId: ids.freeCourse, name: "دفعة التكرار", capacity: 5, startDate: future(40),
    });
    const results = await Promise.all([
      enrollFree(user, ids.freeCourse, session),
      enrollFree(user, ids.freeCourse, session),
      enrollFree(user, ids.freeCourse, session),
    ]);
    /* كل النداءات تنجح ولا واحد منها يكشف خطأ قيد فريد. */
    expect(results.every((result) => result.ok)).toBe(true);
    const seats = await rows(`course_session_seats?session_id=eq.${session}&user_id=eq.${user}`);
    expect(seats).toHaveLength(1);
    await rest(`course_session_seats?session_id=eq.${session}`, { method: "DELETE" });
    await rest(`course_enrollments?user_id=eq.${user}&course_id=eq.${ids.freeCourse}`, { method: "DELETE" });
    await rest(`course_sessions?id=eq.${session}`, { method: "DELETE" });
  }, 60_000);
});

/* ───────────────────── ما يجب أن يُرفض ───────────────────── */

maybe("the claim refuses everything that is not a live, matching, selectable seat", () => {
  const cases: Array<[string, () => { course: string; session: string }, string]> = [
    ["5. session belonging to another course", () => ({ course: ids.freeCourse, session: ids.otherCourseSession }), "session_course_mismatch"],
    ["7. cancelled session", () => ({ course: ids.freeCourse, session: ids.cancelledSession }), "session_not_open"],
    ["8. past session", () => ({ course: ids.freeCourse, session: ids.pastSession }), "session_in_past"],
    ["10. corporate course", () => ({ course: ids.corporateCourse, session: ids.corporateSession }), "corporate_course"],
  ];

  for (const [label, target, code] of cases) {
    test(label, async () => {
      const { course, session } = target();
      const result = await rpc("claim_session_seat", {
        p_user_id: ids.extra.probe,
        p_course_id: course,
        p_session_id: session,
        p_mode: "free",
        p_hold_minutes: 20,
      });
      expect(result.ok).toBe(false);
      expect(result.body).toContain(code);
    });
  }

  test("7b. a closed session refuses the claim too", async () => {
    const session = await makeSession({
      courseId: ids.freeCourse, name: "دفعة مغلقة", capacity: 5, startDate: future(25), status: "closed",
    });
    const result = await rpc("claim_session_seat", {
      p_user_id: ids.extra.probe, p_course_id: ids.freeCourse, p_session_id: session,
      p_mode: "free", p_hold_minutes: 20,
    });
    expect(result.ok).toBe(false);
    expect(result.body).toContain("session_not_open");
    await rest(`course_sessions?id=eq.${session}`, { method: "DELETE" });
  });

  test("6. a full session refuses the next claim", async () => {
    const result = await rpc("claim_session_seat", {
      p_user_id: ids.extra.probe,
      p_course_id: ids.freeCourse,
      p_session_id: ids.freeSession,
      p_mode: "free",
      p_hold_minutes: 20,
    });
    expect(result.ok).toBe(false);
    expect(result.body).toContain("session_full");
  });

  test("9. a draft course refuses the claim", async () => {
    const session = await makeSession({
      courseId: ids.draftCourse, name: "دفعة مسودة", capacity: 5, startDate: future(30),
    });
    const result = await rpc("claim_session_seat", {
      p_user_id: ids.extra.probe,
      p_course_id: ids.draftCourse,
      p_session_id: session,
      p_mode: "purchase",
      p_hold_minutes: 20,
    });
    expect(result.ok).toBe(false);
    expect(result.body).toContain("course_not_published");
    await rest(`course_sessions?id=eq.${session}`, { method: "DELETE" });
  });

  test("capacity zero means not configured, never unlimited", async () => {
    const session = await makeSession({
      courseId: ids.freeCourse, name: "دفعة بلا سعة", capacity: 0, startDate: future(30),
    });
    const result = await rpc("claim_session_seat", {
      p_user_id: ids.extra.probe,
      p_course_id: ids.freeCourse,
      p_session_id: session,
      p_mode: "free",
      p_hold_minutes: 20,
    });
    expect(result.ok).toBe(false);
    expect(result.body).toContain("session_capacity_unset");
    await rest(`course_sessions?id=eq.${session}`, { method: "DELETE" });
  });
});

/* ───────────────────── الدفع والمقعد معًا ───────────────────── */

maybe("payment and seat finish as one transaction", () => {
  test("12. a verified payment confirms the held seat and activates access", async () => {
    const { verifyAndFinalize } = await import("../../src/lib/payments/purchase");
    const payment = await one<{ id: string; provider_payment_id: string; session_id: string; session_label: string; session_start_date: string }>(
      `course_payments?course_id=eq.${ids.paidCourse}&select=id,provider_payment_id,session_id,session_label,session_start_date`,
    );
    expect(payment?.session_id).toBe(ids.paidSession);
    /* اللقطة المالية محفوظة وقت الشراء لا وقت العرض. */
    expect(payment?.session_label).toBe("دفعة مدفوعة");
    expect(payment?.session_start_date).not.toBeNull();

    const outcome = await verifyAndFinalize(
      payment!.id,
      fetcherFor(() => paidInvoice(payment!.id, payment!.provider_payment_id)),
    );
    expect(outcome.outcome).toBe("paid");
    const seat = await one<{ status: string; enrollment_id: string | null }>(
      `course_session_seats?payment_id=eq.${payment!.id}&select=status,enrollment_id`,
    );
    expect(seat?.status).toBe("confirmed");
    expect(seat?.enrollment_id).not.toBeNull();
    const enrollments = await rows<{ status: string; source: string }>(
      `course_enrollments?course_id=eq.${ids.paidCourse}&select=status,source`,
    );
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].source).toBe("purchase");
  }, 60_000);

  test("14 & 15. repeated and simultaneous finalizers change nothing", async () => {
    const { verifyAndFinalize } = await import("../../src/lib/payments/purchase");
    const payment = await one<{ id: string; provider_payment_id: string }>(
      `course_payments?course_id=eq.${ids.paidCourse}&select=id,provider_payment_id`,
    );
    const fetcher = fetcherFor(() => paidInvoice(payment!.id, payment!.provider_payment_id));
    const [a, b, c] = await Promise.all([
      verifyAndFinalize(payment!.id, fetcher),
      verifyAndFinalize(payment!.id, fetcher),
      verifyAndFinalize(payment!.id, fetcher),
    ]);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
    expect(await rows(`course_enrollments?course_id=eq.${ids.paidCourse}`)).toHaveLength(1);
    expect(
      await rows(`course_session_seats?session_id=eq.${ids.paidSession}&status=eq.confirmed`),
    ).toHaveLength(1);
  }, 60_000);

  test("13. a payment that lands after the seat is gone pays but grants nothing", async () => {
    const { verifyAndFinalize } = await import("../../src/lib/payments/purchase");
    const session = await makeSession({
      courseId: ids.paidCourse, name: "دفعة السباق", capacity: 1, startDate: future(50),
    });
    const late = ids.extra.probe;

    /* حجز انتهت مهلته، ثم شخص آخر أخذ المقعد وأكّده. */
    const seatRow = await (await rest("course_session_seats", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        session_id: session, course_id: ids.paidCourse, user_id: late,
        status: "held", hold_expires_at: new Date(Date.now() - 60_000).toISOString(), source: "purchase",
      }),
    })).json();
    const seatId = (seatRow as Array<{ id: string }>)[0].id;

    const paymentRow = await (await rest("course_payments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: late, course_id: ids.paidCourse, provider: "moyasar", environment: "test",
        status: "pending", net_amount: NET, tax_amount: VAT, total_amount: GROSS, tax_rate_bps: 1500,
        provider_payment_id: crypto.randomUUID(),
        session_id: session, session_label: "دفعة السباق", session_start_date: future(50),
      }),
    })).json();
    const payment = (paymentRow as Array<{ id: string; provider_payment_id: string }>)[0];
    await rest(`course_session_seats?id=eq.${seatId}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ payment_id: payment.id }),
    });

    /* المنافس يأخذ المقعد الوحيد ويؤكّده. */
    const rival = await rpc("claim_session_seat", {
      p_user_id: ids.extra.rival, p_course_id: ids.paidCourse, p_session_id: session,
      p_mode: "purchase", p_hold_minutes: 20,
    });
    expect(rival.ok).toBe(true);
    const rivalSeat = JSON.parse(rival.body) as string;
    await rest(`course_session_seats?id=eq.${rivalSeat}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "confirmed", confirmed_at: new Date().toISOString(), hold_expires_at: null }),
    });

    const outcome = await verifyAndFinalize(
      payment.id,
      fetcherFor(() => paidInvoice(payment.id, payment.provider_payment_id)),
    );
    expect(outcome.outcome).toBe("unknown");

    const settled = await one<{ status: string; failure_code: string; enrollment_id: string | null }>(
      `course_payments?id=eq.${payment.id}&select=status,failure_code,enrollment_id`,
    );
    /* المال وصل — يُسجَّل صدقًا. والوصول لا يُفتح. */
    expect(settled?.status).toBe("paid");
    expect(settled?.failure_code).toBe("seat_unavailable");
    expect(settled?.enrollment_id).toBeNull();
    expect(await rows(`course_enrollments?course_id=eq.${ids.paidCourse}&user_id=eq.${late}`)).toHaveLength(0);
    const confirmed = await rows(`course_session_seats?session_id=eq.${session}&status=eq.confirmed`);
    expect(confirmed).toHaveLength(1);

    await rest(`course_session_seats?session_id=eq.${session}`, { method: "DELETE" });
    await rest(`course_payments?id=eq.${payment.id}`, { method: "DELETE" });
    await rest(`course_sessions?id=eq.${session}`, { method: "DELETE" });
  }, 60_000);

  test("11. a payment naming a session but holding no seat grants nothing", async () => {
    const { verifyAndFinalize } = await import("../../src/lib/payments/purchase");
    const session = await makeSession({
      courseId: ids.paidCourse, name: "دفعة بلا مقعد", capacity: 5, startDate: future(60),
    });
    const user = ids.extra.orphanPayment;
    const paymentRow = await (await rest("course_payments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: user, course_id: ids.paidCourse, provider: "moyasar", environment: "test",
        status: "pending", net_amount: NET, tax_amount: VAT, total_amount: GROSS, tax_rate_bps: 1500,
        provider_payment_id: crypto.randomUUID(),
        session_id: session, session_label: "دفعة بلا مقعد", session_start_date: future(60),
      }),
    })).json();
    const payment = (paymentRow as Array<{ id: string; provider_payment_id: string }>)[0];

    const outcome = await verifyAndFinalize(
      payment.id,
      fetcherFor(() => paidInvoice(payment.id, payment.provider_payment_id)),
    );
    expect(outcome.outcome).toBe("unknown");
    const settled = await one<{ failure_code: string }>(
      `course_payments?id=eq.${payment.id}&select=failure_code`,
    );
    expect(settled?.failure_code).toBe("seat_unavailable");
    expect(await rows(`course_enrollments?course_id=eq.${ids.paidCourse}&user_id=eq.${user}`)).toHaveLength(0);
    await rest(`course_payments?id=eq.${payment.id}`, { method: "DELETE" });
    await rest(`course_sessions?id=eq.${session}`, { method: "DELETE" });
  }, 60_000);

  test("20. a failed checkout releases the seat immediately", async () => {
    const { startCheckout } = await import("../../src/lib/payments/purchase");
    const session = await makeSession({
      courseId: ids.paidCourse, name: "دفعة فشل الدفع", capacity: 2, startDate: future(70),
    });
    const failing = fetcherFor(() => ({ message: "no" }), 401);
    const result = await startCheckout(ids.extra.failedCheckout, ids.paidCourse, "moyasar", session, failing);
    expect(result.ok).toBe(false);
    const seats = await rows<{ status: string; release_reason: string }>(
      `course_session_seats?session_id=eq.${session}&select=status,release_reason`,
    );
    expect(seats).toHaveLength(1);
    expect(seats[0].status).toBe("released");
    expect(seats[0].release_reason).toBe("checkout_failed");
    /* والمقعد عاد متاحًا فورًا لا بعد انتهاء مهلة. */
    const availability = await rpc("session_availability", { p_course_id: ids.paidCourse });
    const row = (JSON.parse(availability.body) as Array<{ session_id: string; available: number }>).find(
      (entry) => entry.session_id === session,
    );
    expect(row?.available).toBe(2);
    await rest(`course_session_seats?session_id=eq.${session}`, { method: "DELETE" });
    await rest(`course_payments?course_id=eq.${ids.paidCourse}&status=eq.failed`, { method: "DELETE" });
    await rest(`course_sessions?id=eq.${session}`, { method: "DELETE" });
  }, 60_000);
});

/* ───────────────────── التوافر والحرّاس ───────────────────── */

maybe("availability and guards tell the truth", () => {
  test("19. an expired hold stops consuming a seat with no cleanup job", async () => {
    const session = await makeSession({
      courseId: ids.freeCourse, name: "دفعة الانتهاء", capacity: 1, startDate: future(80),
    });
    await rest("course_session_seats", {
      method: "POST",
      body: JSON.stringify({
        session_id: session, course_id: ids.freeCourse, user_id: ids.extra.expired,
        status: "held", hold_expires_at: new Date(Date.now() - 1_000).toISOString(), source: "purchase",
      }),
    });
    const availability = await rpc("session_availability", { p_course_id: ids.freeCourse });
    const parsed = JSON.parse(availability.body) as Array<{ session_id: string; available: number; selectable: boolean }>;
    const row = parsed.find((entry) => entry.session_id === session);
    expect(row?.available).toBe(1);
    expect(row?.selectable).toBe(true);
    await rest(`course_session_seats?session_id=eq.${session}`, { method: "DELETE" });
    await rest(`course_sessions?id=eq.${session}`, { method: "DELETE" });
  });

  test("manual registrations consume capacity alongside seats", async () => {
    const session = await makeSession({
      courseId: ids.freeCourse, name: "دفعة يدوية", capacity: 3, startDate: future(90), manual: 3,
    });
    const availability = await rpc("session_availability", { p_course_id: ids.freeCourse });
    const parsed = JSON.parse(availability.body) as Array<{ session_id: string; available: number; selectable: boolean }>;
    const row = parsed.find((entry) => entry.session_id === session);
    expect(row?.available).toBe(0);
    expect(row?.selectable).toBe(false);
    const claim = await rpc("claim_session_seat", {
      p_user_id: ids.extra.expired, p_course_id: ids.freeCourse, p_session_id: session,
      p_mode: "free", p_hold_minutes: 20,
    });
    expect(claim.ok).toBe(false);
    expect(claim.body).toContain("session_full");
    await rest(`course_sessions?id=eq.${session}`, { method: "DELETE" });
  });

  test("16. capacity cannot be pushed below what is already taken", async () => {
    const response = await rest(`course_sessions?id=eq.${ids.paidSession}`, {
      method: "PATCH",
      body: JSON.stringify({ capacity: 0 }),
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.text()).toContain("capacity_below_taken");
  });

  test("24a. a session with seat history cannot be deleted", async () => {
    const response = await rest(`course_sessions?id=eq.${ids.paidSession}`, { method: "DELETE" });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.text()).toContain("session_has_seats");
  });

  test("24b. atomic course save cannot silently drop a booked session", async () => {
    const trainer = await one<{ id: string }>("trainers?select=id&limit=1");
    const response = await fetch(`${SB}/rest/v1/rpc/save_course_atomic`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        p_course_id: ids.paidCourse,
        p_course: {
          name: `${TAG} ورشة مدفوعة`, slug: `${TAG}-paid`, category: "in-person-individuals",
          level: "beginner", price: 450, is_free: false, request_quote: false,
          duration_days: 1, duration_hours: 3, language: "ar", publish_status: "published",
          featured: false, trainer_id: trainer?.id ?? null, outcomes: [], audience: [], requirements: [],
        },
        p_curriculum: [],
        p_sessions: [],
      }),
    });
    expect(response.ok).toBe(false);
    expect(await response.text()).toContain("session_has_seats");
    /* والدفعة ما زالت قائمة ومقعدها معها. */
    expect(await rows(`course_sessions?id=eq.${ids.paidSession}`)).toHaveLength(1);
  }, 60_000);

  test("18. a member cannot read another member's seat", async () => {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
    const response = await fetch(`${SB}/rest/v1/course_session_seats?select=*&limit=1`, {
      headers: { apikey: anon },
    });
    const body = await response.text();
    expect(response.ok).toBe(false);
    expect(body).toContain("42501");
  });

  test("22 & 23. online courses without sessions and manual enrolments are untouched", async () => {
    const { enrollFree, startCheckout } = await import("../../src/lib/payments/purchase");
    /* الدورة الأونلاين هنا لها دفعة، فهي تطلب اختيارًا — وهذا القرار المعتمد. */
    const withSession = await startCheckout(ids.extra.online, ids.onlineCourse, "moyasar", undefined, checkoutFetcher());
    expect(withSession.ok).toBe(false);

    /* دورة أونلاين بلا دفعات: المسار القديم كما هو. */
    const plain = await makeCourse({ slug: `${TAG}-online-plain`, name: `${TAG} أونلاين بلا دفعات`, category: "online", free: true });
    const result = await enrollFree(ids.extra.online, plain);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.kind).toBe("registered");
    expect(await rows(`course_session_seats?course_id=eq.${plain}`)).toHaveLength(0);
    await rest(`course_enrollments?course_id=eq.${plain}`, { method: "DELETE" });
    await rest(`courses?id=eq.${plain}`, { method: "DELETE" });
  }, 60_000);

  test("21. a free registration never creates a payment row", async () => {
    expect(await rows(`course_payments?course_id=eq.${ids.freeCourse}`)).toHaveLength(0);
  });
});

maybe("what the outside world may do to a seat", () => {
  test("14. the same webhook arriving twice is recorded once and changes nothing", async () => {
    const { recordWebhookEvent } = await import("../../src/lib/payments/purchase");
    const payment = await one<{ id: string; provider_payment_id: string }>(
      `course_payments?course_id=eq.${ids.paidCourse}&status=eq.paid&select=id,provider_payment_id`,
    );
    const eventId = `${TAG}-event-${crypto.randomUUID()}`;
    const event = {
      provider: "moyasar" as const,
      eventId,
      eventType: "payment_paid",
      providerPaymentId: payment!.provider_payment_id,
      paymentId: payment!.id,
      signatureValid: true,
    };
    const first = await recordWebhookEvent(event);
    const second = await recordWebhookEvent(event);
    expect(first.firstTime).toBe(true);
    /* القيد الفريد هو الذي يبتلع التكرار — لا فحص في التطبيق. */
    expect(second.firstTime).toBe(false);
    expect(await rows(`payment_webhook_events?event_id=eq.${eventId}`)).toHaveLength(1);
    expect(
      await rows(`course_session_seats?session_id=eq.${ids.paidSession}&status=eq.confirmed`),
    ).toHaveLength(1);
    expect(await rows(`course_enrollments?course_id=eq.${ids.paidCourse}`)).toHaveLength(1);
    await rest(`payment_webhook_events?event_id=eq.${eventId}`, { method: "DELETE" });
  }, 60_000);

  test("23. an existing manual enrolment keeps working without any seat", async () => {
    const { registrationDestination } = await import("../../src/lib/payments/purchase");
    const user = ids.extra.manual;
    await rest("course_enrollments", {
      method: "POST",
      body: JSON.stringify({
        user_id: user, course_id: ids.onlineCourse, source: "manual", status: "active",
      }),
    });
    const enrollment = await one<{ status: string }>(
      `course_enrollments?user_id=eq.${user}&course_id=eq.${ids.onlineCourse}&select=status`,
    );
    expect(enrollment?.status).toBe("active");
    /* لا مقعد له، ووجهته تُحسب كما كانت قبل المقاعد. */
    expect(await rows(`course_session_seats?user_id=eq.${user}`)).toHaveLength(0);
    const destination = await registrationDestination(ids.onlineCourse, `${TAG}-online`);
    expect(destination.href).toContain(`${TAG}-online`);
    await rest(`course_enrollments?user_id=eq.${user}&course_id=eq.${ids.onlineCourse}`, { method: "DELETE" });
  }, 60_000);

  test("17 & 18. a signed-in member can neither forge a seat nor touch one", async () => {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
    const headers = { apikey: anon, "Content-Type": "application/json" };
    const insert = await fetch(`${SB}/rest/v1/course_session_seats`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        session_id: ids.paidSession, course_id: ids.paidCourse, user_id: ids.extra.probe,
        status: "confirmed", source: "free",
      }),
    });
    expect(insert.ok).toBe(false);
    const update = await fetch(
      `${SB}/rest/v1/course_session_seats?session_id=eq.${ids.paidSession}`,
      { method: "PATCH", headers, body: JSON.stringify({ status: "confirmed" }) },
    );
    expect(update.ok).toBe(false);
    /* والدالة نفسها ليست مفتوحة للمتصفح: المقعد يُطلب من الخادم لا منه. */
    const claim = await fetch(`${SB}/rest/v1/rpc/claim_session_seat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_user_id: ids.extra.probe, p_course_id: ids.paidCourse,
        p_session_id: ids.paidSession, p_mode: "free", p_hold_minutes: 20,
      }),
    });
    expect(claim.ok).toBe(false);
  });
});
