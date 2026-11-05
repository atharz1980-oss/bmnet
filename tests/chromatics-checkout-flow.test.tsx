import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { createFakeSupabase, type FakeSupabase, type Row, type UniqueRule } from "./support/fake-supabase";

/*
 * CHROMATICS Masterclass: Moyasar Guest Checkout Flow Tests
 *
 * Safe payment testing:
 * 1. ZERO real charges (intercepted with fake Moyasar API).
 * 2. ZERO production database calls (isolated in-memory FakeSupabase).
 * 3. Exact 199 SAR (19,900 halalas) VAT inclusive pricing verification.
 * 4. Preserves all student details: Name, Email, Phone, and Experience Level in utm_content.
 * 5. Fails closed against honeypot bots, rate limits, duplicate orders, and non-VAT configurations.
 */

const FAKE_ENV = {
  PAYMENTS_MODE: "test",
  MOYASAR_SECRET_KEY: ["sk", "test", "fakefakefakefakefakefake"].join("_"),
  MOYASAR_WEBHOOK_SECRET: "w".repeat(32),
};
const savedEnv: Record<string, string | undefined> = {};
for (const [k, v] of Object.entries(FAKE_ENV)) {
  savedEnv[k] = process.env[k];
  process.env[k] = v;
}

let client: FakeSupabase;
let requestHeaders = new Headers({ "x-forwarded-for": "10.0.1.99" });

class Redirect extends Error {
  constructor(public readonly to: string) {
    super(`redirect:${to}`);
  }
}

mock.module("server-only", () => ({}));
mock.module("@/lib/supabase/service", () => ({
  getServiceSupabase: () => client,
  getPublicAnonClient: () => client,
}));
mock.module("next/headers", () => ({
  headers: async () => requestHeaders,
  cookies: async () => ({ get: () => undefined, getAll: () => [] }),
}));
mock.module("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

const { commerceSchema, defaultCommerce } = await import("@/lib/payments/settings");
mock.module("@/lib/payments/configuration", () => ({
  loadCommerce: async () => {
    const supabase = (await import("@/lib/supabase/service")).getServiceSupabase();
    const { data, error } = await supabase.from("commerce_settings").select("*").eq("id", true).maybeSingle();
    if (error || !data) return { settings: defaultCommerce, databaseReady: false };
    const parsed = commerceSchema.safeParse(data);
    return { settings: parsed.success ? parsed.data : defaultCommerce, databaseReady: parsed.success };
  },
  loadCredentialMetadata: async () => [],
  loadSecrets: async () => {
    throw new Error("not used by workshop checkout");
  },
}));
mock.module("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
  notFound: () => {
    throw new Error("notFound");
  },
  useRouter: () => ({ refresh() {}, push() {}, replace() {} }),
  usePathname: () => "/lp/chromatics",
  useSearchParams: () => new URLSearchParams(),
}));

const { startChromaticsCheckoutAction } = await import("@/app/lp/chromatics/actions");
const { resetRateLimits } = await import("@/lib/cms/rate-limit");
const { resetCheckoutStatusCache } = await import("@/lib/workshops/checkout-status");
const { loadWorkshopReceipt, workshopCheckoutReady } = await import("@/lib/workshops/orders");
const { workshopCatalog } = await import("@/lib/workshops/catalog");
const {
  CHROMATICS_HONEYPOT_FIELD,
  CHROMATICS_PRICING,
  CHROMATICS_SLUG,
} = await import("@/data/landing/chromatics");
const { default: ChromaticsSuccessPage } = await import("@/app/lp/chromatics/success/page");

const SLUG = CHROMATICS_SLUG;
const PRICE_HALALAS = 19_900; // 199 SAR * 100

/* ─────────────────────────── Mock Moyasar API ─────────────────────────── */

const invoices = new Map<string, Row>();
const invoicePosts: Row[] = [];

async function moyasarApi(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.host !== "api.moyasar.com") return new Response("blocked", { status: 599 });
  if (init?.method === "POST" && url.pathname === "/v1/invoices") {
    const body = JSON.parse(String(init.body)) as Row;
    invoicePosts.push(body);
    const id = randomUUID();
    invoices.set(id, { id, status: "initiated", amount: body.amount, currency: body.currency, metadata: body.metadata, refunded: 0 });
    return Response.json({ id, url: `https://checkout.moyasar.com/invoices/${id}` });
  }
  const match = /^\/v1\/invoices\/([0-9a-f-]{36})$/.exec(url.pathname);
  if (match && init?.method === "GET") {
    const invoice = invoices.get(match[1]);
    return invoice ? Response.json(invoice) : new Response("not found", { status: 404 });
  }
  return new Response("unexpected", { status: 500 });
}

/* ─────────────────────────── In-Memory Database ─────────────────────────── */

let clock = Date.parse("2026-11-04T12:00:00Z");
const stamp = () => new Date((clock += 1000)).toISOString();

const DEFAULTS: Record<string, () => Row> = {
  workshop_orders: () => ({
    id: randomUUID(),
    workshop_title_snapshot: "",
    status: "pending",
    currency: "SAR",
    deposit_amount: 0,
    paid_amount: 0,
    balance_token_hash: null,
    balance_link_created_at: null,
    refund_status: "none",
    refund_due_amount: 0,
    refunded_at: null,
    cancelled_at: null,
    cancelled_by: null,
    admin_note: "",
    created_at: stamp(),
  }),
  workshop_payments: () => ({
    id: randomUUID(),
    provider: "moyasar",
    status: "created",
    currency: "SAR",
    idempotency_key: randomUUID(),
    provider_payment_id: null,
    provider_checkout_url: null,
    checkout_expires_at: null,
    paid_at: null,
    failed_at: null,
    failure_code: "",
    refunded_amount: 0,
    refunded_at: null,
    created_at: stamp(),
  }),
};

const OPEN = ["created", "pending", "authorized"];
const LIVE = ["pending", "deposit_paid", "paid"];

const UNIQUE: UniqueRule[] = [
  {
    table: "workshop_orders",
    conflict: (a, b) =>
      LIVE.includes(String(a.status)) && LIVE.includes(String(b.status)) && a.workshop_slug === b.workshop_slug && a.email === b.email,
  },
  {
    table: "workshop_payments",
    conflict: (a, b) => a.provider_payment_id !== null && a.provider === b.provider && a.provider_payment_id === b.provider_payment_id,
  },
  {
    table: "workshop_payments",
    conflict: (a, b) => OPEN.includes(String(a.status)) && OPEN.includes(String(b.status)) && a.order_id === b.order_id,
  },
  { table: "workshop_payments", conflict: (a, b) => a.idempotency_key === b.idempotency_key },
];

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
  policies_approved: false,
};

function freshDatabase(settings: Row = SETTINGS) {
  client = createFakeSupabase({
    defaults: DEFAULTS,
    unique: UNIQUE,
  });
  client.tables.commerce_settings = [settings];
  client.tables.workshop_orders = [];
  client.tables.workshop_payments = [];
  invoices.clear();
  invoicePosts.length = 0;
  resetRateLimits();
  resetCheckoutStatusCache();
}

function orders(): Row[] {
  return client.tables.workshop_orders ?? [];
}
function payments(): Row[] {
  return client.tables.workshop_payments ?? [];
}

function createFormData(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    form.set(k, v);
  }
  return form;
}

const VALID_STUDENT = {
  name: "Sarah Al-Otaibi",
  phone: "0512345678",
  email: "sarah.otaibi@example.com",
  service: "Portrait Photographer",
  [CHROMATICS_HONEYPOT_FIELD]: "",
};

/* ─────────────────────────── الاختبارات الآمنة ─────────────────────────── */

describe("CHROMATICS: Moyasar Guest Checkout Flow", () => {
  beforeAll(() => {
    globalThis.fetch = moyasarApi as typeof fetch;
  });

  afterAll(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  beforeEach(() => {
    freshDatabase();
    requestHeaders = new Headers({ "x-forwarded-for": `10.0.2.${Math.floor(Math.random() * 200) + 1}` });
  });

  test("1. Workshop definition in catalog has exact 199 SAR VAT inclusive price and full payment only", () => {
    const def = workshopCatalog(SLUG);
    expect(def).not.toBeNull();
    expect(def?.priceSar).toBe(199);
    expect(def?.depositSar).toBe(199); // No deposit path for chromatics
    expect(def?.checkoutEnabled).toBe(true);
    expect(def?.path).toBe("/lp/chromatics");
  });

  test("2. Successful registration creates order at 19900 halalas and redirects to Moyasar invoice", async () => {
    const form = createFormData({
      ...VALID_STUDENT,
      utm_source: "instagram",
      utm_campaign: "chromatics_launch",
    });

    const thrown = await startChromaticsCheckoutAction({ error: null }, form).catch((err) => err);

    expect(thrown).toBeInstanceOf(Redirect);
    const redirectUrl = (thrown as Redirect).to;
    expect(redirectUrl).toMatch(/^https:\/\/checkout\.moyasar\.com\/invoices\/[0-9a-f-]{36}$/);

    // Verify order in database
    const orderList = orders();
    expect(orderList.length).toBe(1);
    const order = orderList[0];
    expect(order.workshop_slug).toBe("chromatics");
    expect(order.customer_name).toBe("Sarah Al-Otaibi");
    expect(order.email).toBe("sarah.otaibi@example.com");
    expect(order.phone).toBe("966512345678");
    expect(order.total_amount).toBe(PRICE_HALALAS);
    expect(order.deposit_amount).toBe(0);
    expect(order.paid_amount).toBe(0);
    expect(order.status).toBe("pending");
    expect(order.payment_plan).toBe("full");
    expect(order.utm_source).toBe("instagram");
    expect(order.utm_campaign).toBe("chromatics_launch");
    // Verify experience level is preserved in utm_content
    expect(order.utm_content).toBe("Portrait Photographer");

    // Verify payment in database
    const paymentList = payments();
    expect(paymentList.length).toBe(1);
    const payment = paymentList[0];
    expect(payment.order_id).toBe(order.id);
    expect(payment.amount).toBe(PRICE_HALALAS);
    expect(payment.currency).toBe("SAR");
    expect(payment.provider).toBe("moyasar");
    expect(payment.kind).toBe("full");
    expect(payment.status).toBe("pending");
    expect(payment.provider_checkout_url).toBe(redirectUrl);

    // Verify Moyasar Invoice payload sent
    expect(invoicePosts.length).toBe(1);
    const invoice = invoicePosts[0];
    expect(invoice.amount).toBe(PRICE_HALALAS);
    expect(invoice.currency).toBe("SAR");
    expect(invoice.description).toContain("Creative Lighting with Color Gels");
  });

  test("3. Preserves all 4 experience levels in student registration details", async () => {
    const levels = [
      "Studio Owner",
      "Visual Artist / Director",
      "Visual Artist / Creative Director",
      "Enthusiast / Beginner",
    ];

    for (let i = 0; i < levels.length; i++) {
      requestHeaders = new Headers({ "x-forwarded-for": `10.0.3.${i + 1}` });
      const form = createFormData({
        name: `Student Level ${i}`,
        phone: `051111111${i}`,
        email: `student${i}@test.com`,
        service: levels[i],
        [CHROMATICS_HONEYPOT_FIELD]: "",
      });

      const thrown = await startChromaticsCheckoutAction({ error: null }, form).catch((err) => err);
      expect(thrown).toBeInstanceOf(Redirect);

      const studentOrder = orders().find((o) => o.email === `student${i}@test.com`);
      expect(studentOrder).toBeDefined();
      expect(studentOrder?.utm_content).toBe(levels[i]);
    }
  });

  test("4. Invalid contact details are safely rejected without touching database", async () => {
    // Bad name
    const badName = await startChromaticsCheckoutAction(
      { error: null },
      createFormData({ ...VALID_STUDENT, name: "X" }),
    );
    expect(badName.fieldErrors?.name).toBeTruthy();

    // Bad phone
    const badPhone = await startChromaticsCheckoutAction(
      { error: null },
      createFormData({ ...VALID_STUDENT, phone: "123" }),
    );
    expect(badPhone.fieldErrors?.phone).toBeTruthy();

    // Bad email
    const badEmail = await startChromaticsCheckoutAction(
      { error: null },
      createFormData({ ...VALID_STUDENT, email: "not-an-email" }),
    );
    expect(badEmail.fieldErrors?.email).toBeTruthy();

    // Bad service
    const badService = await startChromaticsCheckoutAction(
      { error: null },
      createFormData({ ...VALID_STUDENT, service: "Hacker / Exploit" }),
    );
    expect(badService.fieldErrors?.service).toBeTruthy();

    expect(orders().length).toBe(0);
    expect(payments().length).toBe(0);
  });

  test("5. Honeypot trap stops automated bots immediately", async () => {
    const form = createFormData({
      ...VALID_STUDENT,
      [CHROMATICS_HONEYPOT_FIELD]: "https://spam-bot.site",
    });

    const res = await startChromaticsCheckoutAction({ error: null }, form);
    expect(res.error).toBe("تعذر بدء عملية الدفع. حاول مرة أخرى.");
    expect(orders().length).toBe(0);
    expect(invoicePosts.length).toBe(0);
  });

  test("6. Duplicate booking guard prevents re-registration for students already confirmed", async () => {
    // Seed an already paid order
    client.tables.workshop_orders = [
      {
        id: randomUUID(),
        workshop_slug: SLUG,
        workshop_title_snapshot: "CHROMATICS",
        environment: "test",
        status: "paid",
        payment_plan: "full",
        customer_name: VALID_STUDENT.name,
        email: VALID_STUDENT.email,
        phone: "+966512345678",
        total_amount: PRICE_HALALAS,
        deposit_amount: 0,
        paid_amount: PRICE_HALALAS,
        created_at: stamp(),
      },
    ];

    const form = createFormData(VALID_STUDENT);
    const res = await startChromaticsCheckoutAction({ error: null }, form);
    expect(res.error).toBe("يوجد حجز قائم بهذا البريد أو الجوال لهذه الورشة. تواصل معنا إن احتجت مساعدة.");
    expect(payments().length).toBe(0);
  });

  test("7. Price integrity & VAT guard: fails closed if prices do not include VAT", async () => {
    freshDatabase({ ...SETTINGS, prices_include_tax: false });

    const form = createFormData(VALID_STUDENT);
    const res = await startChromaticsCheckoutAction({ error: null }, form);
    expect(res.error).toBe("الدفع الإلكتروني لهذه الورشة غير متاح حاليًا.");
    expect(orders().length).toBe(0);
  });

  test("8. Rate limit protects against form flooding", async () => {
    const fixedHeaders = new Headers({ "x-forwarded-for": "10.0.99.1" });
    mock.module("next/headers", () => ({
      headers: async () => fixedHeaders,
      cookies: async () => ({ get: () => undefined, getAll: () => [] }),
    }));

    // Perform 8 rapid checkout attempts
    for (let i = 0; i < 8; i++) {
      const form = createFormData({
        ...VALID_STUDENT,
        email: `flood${i}@test.com`,
        phone: `051234500${i}`,
      });
      await startChromaticsCheckoutAction({ error: null }, form).catch((err) => err);
    }

    // 9th attempt must be blocked by rate limiter
    const blocked = await startChromaticsCheckoutAction(
      { error: null },
      createFormData({ ...VALID_STUDENT, email: "flood9@test.com" }),
    );
    expect(blocked.error).toContain("محاولات كثيرة خلال وقت قصير");
  });

  test("9. Receipt verification and success page resolution", async () => {
    const orderId = randomUUID();
    const paymentId = randomUUID();

    client.tables.workshop_orders = [
      {
        id: orderId,
        workshop_slug: SLUG,
        workshop_title_snapshot: "Creative Lighting with Color Gels — 3-Day LIVE Online Portrait Masterclass",
        environment: "test",
        status: "paid",
        payment_plan: "full",
        customer_name: VALID_STUDENT.name,
        email: VALID_STUDENT.email,
        phone: "+966512345678",
        total_amount: PRICE_HALALAS,
        deposit_amount: 0,
        paid_amount: PRICE_HALALAS,
        created_at: stamp(),
      },
    ];

    client.tables.workshop_payments = [
      {
        id: paymentId,
        order_id: orderId,
        provider: "moyasar",
        environment: "test",
        status: "paid",
        amount: PRICE_HALALAS,
        currency: "SAR",
        kind: "full",
        paid_at: stamp(),
        created_at: stamp(),
      },
    ];

    const receipt = await loadWorkshopReceipt(SLUG, paymentId);
    expect(receipt).not.toBeNull();
    expect(receipt?.outcome).toBe("paid");
    expect(receipt?.paymentAmount).toBe(PRICE_HALALAS);
    expect(receipt?.workshopTitle).toBe("Creative Lighting with Color Gels — 3-Day LIVE Online Portrait Masterclass");
    expect(receipt?.email).toBe(VALID_STUDENT.email);

    // Render the React success page with the receipt
    const pageElement = await ChromaticsSuccessPage({
      searchParams: Promise.resolve({ o: paymentId }),
    });
    expect(pageElement).toBeDefined();
  });
});
