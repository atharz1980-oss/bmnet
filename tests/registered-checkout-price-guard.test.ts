/**
 * حارس تغيّر السعر للمستخدم المسجّل — بنفس مبدأ حماية دفع الضيوف.
 *
 * الطبقات الحقيقية: `startCheckout` في purchase والقاعدة المزيّفة وواجهة
 * ميسر الشبكية المزيّفة. لا شبكة ولا أسرار حقيقية ولا مدفوعات.
 *
 * الثابت: السعر المعروض عند فتح الصفحة يُقارن بإجمالي القاعدة الطازج قبل
 * إنشاء أي صف — والمبلغ المحصَّل يبقى مشتقًا من القاعدة لا من المتصفح.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createFakeSupabase, type FakeSupabase, type Row } from "./support/fake-supabase";

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

/* مفاتيح وهمية بصيغة وضع الاختبار — لا قيمة حقيقية. */
const FAKE_ENV = {
  PAYMENTS_MODE: "test",
  MOYASAR_SECRET_KEY: ["sk", "test", "fakefakefakefakefakefake"].join("_"),
  MOYASAR_WEBHOOK_SECRET: "w".repeat(32),
};
const savedEnv: Record<string, string | undefined> = {};

let client: FakeSupabase;

mock.module("server-only", () => ({}));
mock.module("@/lib/supabase/service", () => ({
  getServiceSupabase: () => client,
  getPublicAnonClient: () => client,
}));
mock.module("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined, getAll: () => [] }),
}));

const { startCheckout, PRICE_CHANGED_ERROR } = await import("@/lib/payments/purchase");

/* السعر المعتمد: 96 ريال شامل الضريبة. */
const PRICE = 96;
const GROSS = Math.round(PRICE * 100);

/* ─────────────────────────── ميسّر المزيّف ─────────────────────────── */

const invoices: Row[] = [];
const invoicePosts: Row[] = [];

async function moyasarApi(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.host !== "api.moyasar.com") return new Response("blocked", { status: 599 });
  if (init?.method === "POST" && url.pathname === "/v1/invoices") {
    const body = JSON.parse(String(init.body)) as Row;
    invoicePosts.push(body);
    const id = randomUUID();
    invoices.push({ id, status: "initiated", amount: body.amount, currency: body.currency, metadata: body.metadata });
    return Response.json({ id, url: `https://checkout.moyasar.com/invoices/${id}` });
  }
  return new Response("unexpected", { status: 500 });
}
const fetcher = moyasarApi as unknown as typeof fetch;

/* ─────────────────────────── تهيئة القاعدة ─────────────────────────── */

const SETTINGS: Row = {
  id: true,
  legal_name: "بيت المصور",
  legal_name_en: "",
  commercial_registration: "7055038298",
  unified_number: "",
  national_short_address: "",
  national_address: "",
  invoice_email: "",
  invoice_phone: "",
  vat_status: "registered",
  vat_number: "300000000000003",
  tax_rate_bps: 1500,
  prices_include_tax: true,
  full_payment_enabled: true,
  deposit_enabled: false,
  deposit_type: "unconfigured",
  deposit_value: null,
  balance_due_days: null,
  policies_approved: true,
};

function freshDatabase(price = PRICE.toFixed(2)) {
  client = createFakeSupabase({
    defaults: { course_payments: () => ({ id: randomUUID(), idempotency_key: randomUUID() }) },
  });
  client.tables.courses = [
    {
      id: COURSE_ID,
      slug: "course-jawal",
      name: "دورة تجريبية",
      category: "online",
      publish_status: "published",
      price,
      is_free: false,
      request_quote: false,
    },
  ];
  client.tables.course_payment_methods = [
    { course_id: COURSE_ID, provider: "moyasar", enabled: true, sort_order: 0 },
  ];
  client.tables.commerce_settings = [SETTINGS];
  client.tables.course_enrollments = [];
  client.tables.course_sessions = [];
}

const payments = () => client.tables.course_payments ?? [];
/* السعر المعروض إلزامي في العقد؛ نمرّره من نوع أوسع لنغطّي حالة الغياب
   وقت التشغيل (استدعاء غير مصنّف) التي يجب أن تفشل مغلقة أيضًا. */
const checkout = (displayed: number | null | undefined) =>
  startCheckout(USER_ID, COURSE_ID, "moyasar", undefined, displayed as number | null, fetcher);

beforeAll(() => {
  for (const [key, value] of Object.entries(FAKE_ENV)) {
    savedEnv[key] = process.env[key];
    process.env[key] = value;
  }
});
afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
beforeEach(() => {
  freshDatabase();
  invoices.length = 0;
  invoicePosts.length = 0;
});

/* ═══════════════ الحارس: السعر المعروض = المبلغ المحصَّل ═══════════════ */

describe("startCheckout — server price authority and shown-vs-charged guard", () => {
  test("a matching displayed price charges the database gross and creates one payment", async () => {
    const result = await checkout(PRICE);
    expect(result.ok).toBe(true);
    expect(payments()).toHaveLength(1);
    const payment = payments()[0];
    expect(payment.total_amount).toBe(GROSS);
    expect((payment.net_amount as number) + (payment.tax_amount as number)).toBe(GROSS);
    expect(payment.tax_rate_bps).toBe(1500);
    expect(payment.user_id).toBe(USER_ID);
    expect(payment.course_id).toBe(COURSE_ID);
    expect(payment.provider).toBe("moyasar");
    expect(payment.environment).toBe("test");
    expect(payment.status).toBe("pending");
    expect(invoicePosts).toHaveLength(1);
    expect(invoicePosts[0].amount).toBe(GROSS);
  });

  test("a displayed price that differs from the database closes checkout — no payment row, no invoice", async () => {
    const result = await checkout(PRICE - 1);
    expect(result).toEqual({ ok: false, error: PRICE_CHANGED_ERROR });
    expect(payments()).toHaveLength(0);
    expect(invoicePosts).toHaveLength(0);
    /* لا صف دفع أُنشئ أصلًا: الحارس يسبق الإدراج. */
    expect(client.log.some((entry) => entry.table === "course_payments" && entry.op === "insert")).toBe(false);
  });

  test("an admin price change after the page was shown is caught before any payment", async () => {
    freshDatabase("120.00");
    const result = await checkout(PRICE);
    expect(result).toEqual({ ok: false, error: PRICE_CHANGED_ERROR });
    expect(payments()).toHaveLength(0);
    expect(invoicePosts).toHaveLength(0);
  });

  test("a missing or non-finite displayed price fails closed", async () => {
    for (const value of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      freshDatabase();
      const result = await checkout(value);
      expect(result).toEqual({ ok: false, error: PRICE_CHANGED_ERROR });
    }
    expect(payments()).toHaveLength(0);
    expect(invoicePosts).toHaveLength(0);
  });

  test("the charged amount is always the database gross, never the displayed number", async () => {
    for (const dbPrice of [96, 120, 250]) {
      freshDatabase(dbPrice.toFixed(2));
      const result = await checkout(dbPrice);
      expect(result.ok).toBe(true);
      expect(payments()[0].total_amount).toBe(dbPrice * 100);
    }
    expect(invoicePosts.map((post) => post.amount)).toEqual([9600, 12000, 25000]);
  });

  test("the action forwards a displayed price for comparison but never an amount; the charge is server-derived", () => {
    const action = readFileSync("src/app/courses/actions/enrollment.ts", "utf8");
    expect(action).toContain("displayedPriceSar");
    expect(action).not.toContain("amount");
    const purchase = readFileSync("src/lib/payments/purchase.ts", "utf8");
    expect(purchase).toContain("total_amount: quote.gross");
    /* الحارس يسبق أول تعامل مع صفوف الدفع. */
    expect(purchase.indexOf("quote.gross !== expectedHalalas")).toBeLessThan(
      purchase.indexOf('.from("course_payments")'),
    );
  });
});
