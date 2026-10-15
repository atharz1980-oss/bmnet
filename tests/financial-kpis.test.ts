import { beforeEach, describe, expect, mock, test } from "bun:test";

import { createFakeSupabase, type FakeSupabase, type Row } from "./support/fake-supabase";

/*
 * المؤشرات المالية (Phase 1) — الطبقة الحقيقية كاملة (financial-kpis.ts)
 * فوق قاعدة مزيّفة في الذاكرة. نتحقق من: الحساب النقي، منع الازدواج،
 * عزل البيئة إنتاج/اختبار، الفشل المغلق، وتجاوز حد الصفوف بالترقيم الكامل.
 */

mock.module("server-only", () => ({}));

let client: FakeSupabase;
mock.module("@/lib/supabase/service", () => ({
  getServiceSupabase: () => client,
  getPublicAnonClient: () => client,
}));

const { computeFinancialKpis, fetchAllPages, loadFinancialKpis } = await import(
  "@/lib/admin/financial-kpis"
);
type CourseGuestRow = import("@/lib/admin/financial-kpis").CourseGuestRow;
type WorkshopPaymentRow = import("@/lib/admin/financial-kpis").WorkshopPaymentRow;
type WorkshopOrderRow = import("@/lib/admin/financial-kpis").WorkshopOrderRow;

function courseGuestRow(overrides: Partial<CourseGuestRow & Row> = {}): CourseGuestRow & Row {
  return {
    status: "paid",
    total_amount: 0,
    refunded_amount: 0,
    paid_at: null,
    environment: "test",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as CourseGuestRow & Row;
}

function workshopPaymentRow(
  overrides: Partial<WorkshopPaymentRow & Row> = {},
): WorkshopPaymentRow & Row {
  return {
    status: "paid",
    amount: 0,
    refunded_amount: 0,
    paid_at: null,
    environment: "test",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as WorkshopPaymentRow & Row;
}

function workshopOrderRow(overrides: Partial<WorkshopOrderRow & Row> = {}): WorkshopOrderRow & Row {
  return {
    status: "deposit_paid",
    total_amount: 0,
    paid_amount: 0,
    refund_status: "none",
    refund_due_amount: 0,
    environment: "test",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as WorkshopOrderRow & Row;
}

beforeEach(() => {
  client = createFakeSupabase();
});

describe("computeFinancialKpis — الحساب النقي", () => {
  test("يجمع المحصّل لكل مصدر فقط من صفوف paid_at, وعدّها", () => {
    const kpis = computeFinancialKpis({
      environment: "test",
      coursePayments: [
        courseGuestRow({ total_amount: 10_000, paid_at: "2026-01-02T00:00:00Z" }),
        courseGuestRow({ total_amount: 5_000, paid_at: null, status: "pending" }),
      ],
      guestOrders: [courseGuestRow({ total_amount: 20_000, paid_at: "2026-01-02T00:00:00Z" })],
      workshopPayments: [
        workshopPaymentRow({ amount: 3_000, paid_at: "2026-01-02T00:00:00Z" }),
        workshopPaymentRow({ amount: 7_000, paid_at: null, status: "authorized" }),
      ],
      workshopOrders: [],
    });

    expect(kpis.collected.courses).toBe(10_000);
    expect(kpis.collected.guests).toBe(20_000);
    expect(kpis.collected.workshops).toBe(3_000);
    expect(kpis.collected.total).toBe(33_000);
    expect(kpis.collected.count).toBe(3);
  });

  test("صف مدفوع ثم مسترد كليًا (status='paid', refunded_amount) يُحتسب محصّلًا وموثّقًا معًا", () => {
    const kpis = computeFinancialKpis({
      environment: "test",
      coursePayments: [
        courseGuestRow({
          total_amount: 8_000,
          paid_at: "2026-01-02T00:00:00Z",
          status: "paid",
          refunded_amount: 8_000,
        }),
      ],
      guestOrders: [],
      workshopPayments: [],
      workshopOrders: [],
    });

    expect(kpis.collected.courses).toBe(8_000);
    expect(kpis.documentedRefunds.courses).toBe(8_000);
  });

  test("صف لم يُدفع محليًا (status='refunded' بلا paid_at) لا يُحتسب محصّلًا ولا استردادًا", () => {
    const kpis = computeFinancialKpis({
      environment: "test",
      coursePayments: [
        courseGuestRow({ total_amount: 9_000, paid_at: null, status: "refunded", refunded_amount: 9_000 }),
      ],
      guestOrders: [],
      workshopPayments: [],
      workshopOrders: [],
    });

    expect(kpis.collected.courses).toBe(0);
    expect(kpis.documentedRefunds.courses).toBe(0);
    expect(kpis.collected.count).toBe(0);
  });

  test("الاسترداد الموثّق محدود بمبلغ الأصل (Least) حتى لو تجاوز الـ refunded_amount", () => {
    const kpis = computeFinancialKpis({
      environment: "test",
      coursePayments: [
        courseGuestRow({ total_amount: 5_000, paid_at: "2026-01-02T00:00:00Z", refunded_amount: 9_999 }),
      ],
      guestOrders: [courseGuestRow({ total_amount: 4_000, paid_at: "2026-01-02T00:00:00Z", refunded_amount: 1_500 })],
      workshopPayments: [
        workshopPaymentRow({ amount: 2_000, paid_at: "2026-01-02T00:00:00Z", refunded_amount: 2_500 }),
      ],
      workshopOrders: [],
    });

    expect(kpis.documentedRefunds.courses).toBe(5_000);
    expect(kpis.documentedRefunds.guests).toBe(1_500);
    expect(kpis.documentedRefunds.workshops).toBe(2_000);
  });

  test("قناتا استرداد الورش لا تُجمعان: كل قناة تُعرض مستقلة والمحصّل لا ينقص", () => {
    const kpis = computeFinancialKpis({
      environment: "test",
      coursePayments: [],
      guestOrders: [],
      workshopPayments: [
        workshopPaymentRow({ amount: 6_000, paid_at: "2026-01-02T00:00:00Z", refunded_amount: 3_000 }),
      ],
      workshopOrders: [
        workshopOrderRow({
          status: "cancelled_by_academy",
          total_amount: 6_000,
          paid_amount: 6_000,
          refund_status: "refunded",
          refund_due_amount: 5_000,
        }),
      ],
    });

    expect(kpis.documentedRefunds.workshops).toBe(3_000);
    expect(kpis.workshopManualRefunds).toBe(5_000);
    // لا دمج: لا يوجد حقل صافٍ ولا مجموع قناتَي الاسترداد.
    expect(kpis.collected.workshops).toBe(6_000);
    expect(Object.keys(kpis)).not.toContain("net");
    expect(Object.keys(kpis)).not.toContain("refundTotal");
  });

  test("المتبقي على الورش (deposit_paid) والمستحق (due) مؤشران منفصلان", () => {
    const kpis = computeFinancialKpis({
      environment: "test",
      coursePayments: [],
      guestOrders: [],
      workshopPayments: [],
      workshopOrders: [
        workshopOrderRow({
          status: "deposit_paid",
          total_amount: 5_000,
          paid_amount: 2_000,
          refund_status: "due",
          refund_due_amount: 1_000,
        }),
        workshopOrderRow({
          status: "paid",
          total_amount: 5_000,
          paid_amount: 5_000,
          refund_status: "none",
          refund_due_amount: 0,
        }),
      ],
    });

    expect(kpis.workshopRemaining).toBe(3_000);
    expect(kpis.workshopRefundsDue).toBe(1_000);
  });

  test("المتبقي لا يصير سالبًا لو تجاوز المدفوع الإجمالي", () => {
    const kpis = computeFinancialKpis({
      environment: "test",
      coursePayments: [],
      guestOrders: [],
      workshopPayments: [],
      workshopOrders: [
        workshopOrderRow({ status: "deposit_paid", total_amount: 3_000, paid_amount: 4_000 }),
      ],
    });

    expect(kpis.workshopRemaining).toBe(0);
  });

  test("المحاولات غير المكتملة تُعد وتُجمع من الحالات المفتوحة فقط", () => {
    const kpis = computeFinancialKpis({
      environment: "test",
      coursePayments: [
        courseGuestRow({ status: "created", total_amount: 1_000 }),
        courseGuestRow({ status: "pending", total_amount: 2_000 }),
        courseGuestRow({ status: "authorized", total_amount: 3_000 }),
        courseGuestRow({ status: "failed", total_amount: 4_000 }),
      ],
      guestOrders: [courseGuestRow({ status: "pending", total_amount: 500 })],
      workshopPayments: [workshopPaymentRow({ status: "created", amount: 700 })],
      workshopOrders: [],
    });

    expect(kpis.pendingAttempts.count).toBe(5);
    expect(kpis.pendingAttempts.amount).toBe(1_000 + 2_000 + 3_000 + 500 + 700);
  });
});

describe("fetchAllPages — الترقيم الكامل", () => {
  test("يجمع الصفحات حتى تجاوز الحد الافتراضي (1000)", async () => {
    const calls: Array<[number, number]> = [];
    const rows = Array.from({ length: 1001 }, (_, i) => ({ i }));
    const result = await fetchAllPages((from, to) => {
      calls.push([from, to]);
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
    });

    expect(result).toHaveLength(1001);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  test("يرجع null عند أي خطأ في أي صفحة", async () => {
    const result = await fetchAllPages(() =>
      Promise.resolve({ data: null, error: { message: "boom" } }),
    );
    expect(result).toBeNull();
  });
});

describe("loadFinancialKpis — عزل البيئة والفشل المغلق", () => {
  test("يحسب صفوف الوضع المطلوب فقط ولا يخلط إنتاجًا باختبار", async () => {
    client.tables.course_payments = [
      courseGuestRow({ environment: "test", total_amount: 10_000, paid_at: "2026-01-02T00:00:00Z" }),
      courseGuestRow({ environment: "production", total_amount: 90_000, paid_at: "2026-01-02T00:00:00Z" }),
    ];

    const testKpis = await loadFinancialKpis("test");
    const prodKpis = await loadFinancialKpis("production");

    expect(testKpis?.collected.courses).toBe(10_000);
    expect(prodKpis?.collected.courses).toBe(90_000);
    expect(testKpis?.environment).toBe("test");
    expect(prodKpis?.environment).toBe("production");
  });

  test("يقرأ الوضع من PAYMENTS_MODE افتراضيًا", async () => {
    client.tables.guest_course_orders = [
      courseGuestRow({ environment: "production", total_amount: 7_000, paid_at: "2026-01-02T00:00:00Z" }),
    ];
    const previous = process.env.PAYMENTS_MODE;
    process.env.PAYMENTS_MODE = "production";
    try {
      const kpis = await loadFinancialKpis();
      expect(kpis?.collected.guests).toBe(7_000);
    } finally {
      if (previous === undefined) delete process.env.PAYMENTS_MODE;
      else process.env.PAYMENTS_MODE = previous;
    }
  });

  test("يرجع null عند فشل أي جدول من الجداول الأربعة", async () => {
    for (const table of [
      "course_payments",
      "guest_course_orders",
      "workshop_payments",
      "workshop_orders",
    ]) {
      client = createFakeSupabase();
      client.failures.push({
        table,
        op: "select",
        error: { code: "57014", message: "timeout" },
      });
      const kpis = await loadFinancialKpis("test");
      expect(kpis).toBeNull();
    }
  });

  test("يجلب أكثر من 1000 صف (لا يتوقف عند الحد الافتراضي)", async () => {
    client.tables.course_payments = Array.from({ length: 1001 }, (_, i) =>
      courseGuestRow({
        environment: "test",
        total_amount: 1,
        paid_at: "2026-01-02T00:00:00Z",
        created_at: `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z`,
      }),
    );

    const kpis = await loadFinancialKpis("test");
    expect(kpis?.collected.count).toBe(1001);
    expect(kpis?.collected.courses).toBe(1001);
  });
});

describe("loadFinancialKpis — ثبات الترقيم عند تعادل created_at", () => {
  test("يجمع كل صف مرة واحدة بالضبط مع 1001 صف بنفس created_at", async () => {
    // نُفعّل محاكاة عدم ثبات ترتيب الصفوف المتعادلة (كما لو غاب معيار فريد):
    // بدون كسر التعادل بـ id قد يُفقد صف ويتكرر آخر بين الصفحتين.
    client = createFakeSupabase({ unstableTies: true });

    const count = 1001;
    client.tables.course_payments = Array.from({ length: count }, (_, i) =>
      courseGuestRow({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        environment: "test",
        total_amount: i + 1,
        paid_at: "2026-01-02T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
      }),
    );

    const kpis = await loadFinancialKpis("test");

    // العدد والمجموع معًا (1 + 2 + ... + 1001) يكشفان أي فقد أو تكرار.
    expect(kpis?.collected.count).toBe(count);
    expect(kpis?.collected.courses).toBe((count * (count + 1)) / 2);
  });
});
