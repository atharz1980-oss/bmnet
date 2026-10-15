import { beforeEach, describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { createFakeSupabase, type FakeSupabase, type Row } from "./support/fake-supabase";

/*
 * لوحة المؤشرات المالية (Server Component) — تتحقق من بوابة الصلاحية،
 * حالة الفشل المغلق، وعرض الأرقام والوسوم الصحيحة في الوضعين.
 */

mock.module("server-only", () => ({}));

let client: FakeSupabase;
mock.module("@/lib/supabase/service", () => ({
  getServiceSupabase: () => client,
  getPublicAnonClient: () => client,
}));

let gate: { ok: true; data: { userId: string } } | { ok: false; error: string } = {
  ok: true,
  data: { userId: "u1" },
};
mock.module("@/lib/admin/session", () => ({
  requirePermission: async () => gate,
}));

const { FinancialKpisPanel } = await import("@/components/admin/dashboard/financial-kpis-panel");

function paidCourse(overrides: Partial<Row> = {}): Row {
  return {
    status: "paid",
    total_amount: 0,
    refunded_amount: 0,
    paid_at: "2026-01-02T00:00:00Z",
    environment: "test",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

async function render(): Promise<string> {
  return renderToStaticMarkup(await FinancialKpisPanel({}));
}

beforeEach(() => {
  client = createFakeSupabase();
  gate = { ok: true, data: { userId: "u1" } };
  delete process.env.PAYMENTS_MODE;
});

describe("FinancialKpisPanel", () => {
  test("لا يعرض شيئًا لمن لا يملك صلاحية payments:view", async () => {
    gate = { ok: false, error: "غير مصرح" };
    expect(await render()).toBe("");
  });

  test("يعرض حالة «تعذّر التحميل» عند فشل الاستعلام (لا أصفار مضللة)", async () => {
    client.failures.push({
      table: "workshop_orders",
      op: "select",
      error: { code: "57014", message: "timeout" },
    });
    const html = await render();
    expect(html).toContain("تعذّر تحميل المؤشرات المالية");
    expect(html).not.toContain("إجمالي المحصّل");
  });

  test("يعرض الأرقام الموسومة ببيئة الاختبار والاستردادات منفصلة", async () => {
    client.tables.course_payments = [
      paidCourse({ total_amount: 123_456 }),
      paidCourse({ total_amount: 50_000, refunded_amount: 10_000 }),
    ];
    client.tables.guest_course_orders = [paidCourse({ total_amount: 20_000 })];
    client.tables.workshop_payments = [
      paidCourse({ amount: 3_000, paid_at: "2026-01-02T00:00:00Z" }),
    ];
    client.tables.workshop_orders = [
      {
        status: "deposit_paid",
        total_amount: 5_000,
        paid_amount: 2_000,
        refund_status: "due",
        refund_due_amount: 1_000,
        environment: "test",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    const html = await render();
    expect(html).toContain("بيئة الاختبار");
    expect(html).toContain("المحصّل المؤكد محليًا");
    // إجمالي المحصّل: 123,456 + 50,000 + 20,000 + 3,000 = 196,456 هللة = 1964.56 ر.س
    expect(html).toContain("1,964.56 ر.س");
    // مدفوعات الدورات: 123,456 + 50,000 = 173,456 هللة = 1734.56 ر.س
    expect(html).toContain("1,734.56 ر.س");
    // الاسترداد الموثّق للدورات 10,000 = 100.00 ر.س
    expect(html).toContain("100.00 ر.س");
    // مستحق ورش 1,000 = 10.00 ر.س
    expect(html).toContain("10.00 ر.س");
    // المتبقي 3,000 = 30.00 ر.س
    expect(html).toContain("30.00 ر.س");
    expect(html).toContain("الاستردادات (منفصلة");
    // تنويه صريح بأنه ليس صافيًا ولا إيرادًا مكتسبًا — لا رقم صافٍ مدموج.
    expect(html).toContain("ليس صافيًا ولا إيرادًا مكتسبًا");
  });

  test("يوسم بيئة الإنتاج ويقرأ صفوف الإنتاج فقط", async () => {
    const previous = process.env.PAYMENTS_MODE;
    process.env.PAYMENTS_MODE = "production";
    try {
      client.tables.course_payments = [
        paidCourse({ environment: "test", total_amount: 10_000 }),
        paidCourse({ environment: "production", total_amount: 70_000 }),
      ];

      const html = await render();
      expect(html).toContain("بيئة الإنتاج");
      expect(html).toContain("700.00 ر.س");
      expect(html).not.toContain("100.00 ر.س");
    } finally {
      if (previous === undefined) delete process.env.PAYMENTS_MODE;
      else process.env.PAYMENTS_MODE = previous;
    }
  });
});
