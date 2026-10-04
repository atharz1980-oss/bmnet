import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import {
  PAYMENT_UNIQUE_RULES,
  createFakeSupabase,
  guestOrderDefaults,
  type FakeSupabase,
  type Row,
} from "./support/fake-supabase";

/*
 * Fast Guest Checkout — الطبقات الحقيقية كلها (guest-orders وpurchase ومحوّل
 * ميسّر ومسار الإشعار وصفحة النجاح والإدارة)، والمزيّف فقط: القاعدة (في
 * الذاكرة بقيودها الفريدة) وواجهة ميسّر الشبكية. لا شبكة ولا أسرار حقيقية.
 */

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
let decision: { status: "ready"; courseId: string } | { status: "unavailable"; reason: string } = {
  status: "ready",
  courseId: COURSE_ID,
};
let requestHeaders = new Headers({ "x-forwarded-for": "10.0.0.1" });

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
mock.module("@/lib/landing/checkout-target", () => ({ resolveLandingCheckout: async () => decision }));
mock.module("next/headers", () => ({
  headers: async () => requestHeaders,
  cookies: async () => ({ get: () => undefined, getAll: () => [] }),
}));
mock.module("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
  notFound: () => {
    throw new Error("notFound");
  },
  useRouter: () => ({ refresh() {}, push() {}, replace() {} }),
  usePathname: () => "/lp/mobile-content",
  useSearchParams: () => new URLSearchParams(),
}));

const guest = await import("@/lib/payments/guest-orders");
const { startGuestCheckoutAction } = await import("@/app/lp/mobile-content/actions");
const { resetRateLimits } = await import("@/lib/cms/rate-limit");
const { POST: webhook } = await import("@/app/api/payments/webhook/[provider]/route");
const { default: SuccessPage } = await import("@/app/lp/mobile-content/success/page");
const { guestOrdersCsv, csvCell } = await import("@/lib/admin/guest-orders-csv");
const { landingCheckoutTarget } = await import("@/data/landing/mobile-content");

/* السعر الفعّال (المعتمد 96، أو سعر التجربة المؤقت) — نفس ما يتحقق منه الخادم. */
const PRICE = landingCheckoutTarget.expectedPriceSar;
const GROSS = Math.round(PRICE * 100);

/* ─────────────────────────── ميسّر المزيّف ─────────────────────────── */

const invoices = new Map<string, Row>();
const invoicePosts: Row[] = [];

async function moyasarApi(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.host !== "api.moyasar.com") return new Response("blocked", { status: 599 });
  if (init?.method === "POST" && url.pathname === "/v1/invoices") {
    const body = JSON.parse(String(init.body)) as Row;
    invoicePosts.push(body);
    const id = randomUUID();
    invoices.set(id, {
      id,
      status: "initiated",
      amount: body.amount,
      currency: body.currency,
      metadata: body.metadata,
      refunded: 0,
    });
    return Response.json({ id, url: `https://checkout.moyasar.com/invoices/${id}` });
  }
  const match = /^\/v1\/invoices\/([0-9a-f-]{36})$/.exec(url.pathname);
  if (match && init?.method === "GET") {
    const invoice = invoices.get(match[1]);
    return invoice ? Response.json(invoice) : new Response("not found", { status: 404 });
  }
  return new Response("unexpected", { status: 500 });
}
const fetcher = moyasarApi as unknown as typeof fetch;
const realFetch = globalThis.fetch;

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
  policies_approved: false,
};

function freshDatabase(overrides: { price?: string; settings?: Row } = {}) {
  client = createFakeSupabase({
    defaults: { guest_course_orders: guestOrderDefaults },
    unique: PAYMENT_UNIQUE_RULES,
    rpc: { finalize_course_purchase: () => "33333333-3333-4333-8333-333333333333" },
  });
  client.tables.courses = [
    {
      id: COURSE_ID,
      slug: "course-jawal",
      name: "احتراف صناعة المحتوى بالجوال",
      category: "online",
      publish_status: "published",
      price: overrides.price ?? PRICE.toFixed(2),
      is_free: false,
      request_quote: false,
    },
  ];
  client.tables.course_payment_methods = [{ course_id: COURSE_ID, provider: "moyasar", enabled: true, sort_order: 0 }];
  client.tables.commerce_settings = [overrides.settings ?? SETTINGS];
}

const orders = () => client.tables.guest_course_orders ?? [];
const CONTACT = { name: "نورة أحمد", phone: "966512345678", email: "noura@example.com" };

function markInvoice(providerPaymentId: string, patch: Row) {
  Object.assign(invoices.get(providerPaymentId) as Row, patch);
}

async function checkout(contact = CONTACT, campaign: Record<string, string> = {}) {
  return guest.startGuestCheckout(contact, campaign, fetcher);
}

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
  globalThis.fetch = realFetch;
});
beforeEach(() => {
  freshDatabase();
  decision = { status: "ready", courseId: COURSE_ID };
  invoices.clear();
  invoicePosts.length = 0;
  resetRateLimits();
  requestHeaders = new Headers({ "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` });
  globalThis.fetch = realFetch;
});

/* ═══════════════════════════ بدء الدفع ═══════════════════════════ */

describe("startGuestCheckout — server price authority", () => {
  test("creates one order priced from the database (96 SAR VAT-inclusive) and a Moyasar invoice", async () => {
    const result = await checkout(CONTACT, { utm_source: "instagram", utm_campaign: "oct" });
    expect(result.ok).toBe(true);
    expect(orders().length).toBe(1);
    const order = orders()[0];
    expect(order.status).toBe("pending");
    expect(order.total_amount).toBe(GROSS);
    expect((order.net_amount as number) + (order.tax_amount as number)).toBe(GROSS);
    expect(order.tax_amount as number).toBeGreaterThan(0);
    expect(order.tax_rate_bps).toBe(1500);
    expect(order.course_id).toBe(COURSE_ID);
    expect(order.provider).toBe("moyasar");
    expect(order.environment).toBe("test");
    expect(order.utm_source).toBe("instagram");
    expect(order.utm_campaign).toBe("oct");
    expect(order.provider_payment_id).toBe(result.ok ? result.checkoutUrl.split("/").pop() : "");

    expect(invoicePosts.length).toBe(1);
    const sent = invoicePosts[0];
    expect(sent.amount).toBe(GROSS);
    expect(sent.currency).toBe("SAR");
    expect((sent.metadata as Row).payment_id).toBe(order.id);
    expect(sent.success_url).toBe(`https://baytalmosawer.net/lp/mobile-content/success?o=${order.id}`);
    expect(sent.back_url).toBe("https://baytalmosawer.net/lp/mobile-content#booking");
    expect(sent.callback_url).toBe("https://baytalmosawer.net/api/payments/webhook/moyasar");
    /* لا بيانات شخصية تُرسل إلى ميسّر. */
    const serialized = JSON.stringify(sent);
    for (const pii of [CONTACT.email, CONTACT.phone, CONTACT.name]) expect(serialized).not.toContain(pii);
  });

  test("fails closed when the landing guard is not ready — no order, no invoice", async () => {
    for (const reason of ["not-paid", "price-mismatch", "provider-not-ready", "requires-session", "course-not-found"]) {
      decision = { status: "unavailable", reason };
      const result = await checkout();
      expect(result).toEqual({ ok: false, error: guest.GUEST_ERRORS.unavailable });
    }
    expect(orders().length).toBe(0);
    expect(invoicePosts.length).toBe(0);
  });

  test("fails closed if the database price is not exactly the approved price (second guard)", async () => {
    freshDatabase({ price: "50.00" });
    expect((await checkout()).ok).toBe(false);
    freshDatabase({ price: (PRICE + 0.01).toFixed(2) });
    expect((await checkout()).ok).toBe(false);
    expect(invoicePosts.length).toBe(0);
  });

  test("fails closed when VAT-inclusive pricing is not configured", async () => {
    freshDatabase({ settings: { ...SETTINGS, vat_status: "unconfigured", tax_rate_bps: null, vat_number: "" } });
    expect((await checkout()).ok).toBe(false);
    freshDatabase({ settings: { ...SETTINGS, prices_include_tax: false } });
    expect((await checkout()).ok).toBe(false);
    expect(invoicePosts.length).toBe(0);
  });

  test("fails closed when the course is free, a quote, unpublished, or Moyasar is disabled", async () => {
    for (const patch of [{ is_free: true }, { request_quote: true }, { publish_status: "draft" }]) {
      freshDatabase();
      Object.assign(client.tables.courses[0], patch);
      expect((await checkout()).ok).toBe(false);
    }
    freshDatabase();
    client.tables.course_payment_methods = [];
    expect((await checkout()).ok).toBe(false);
    expect(invoicePosts.length).toBe(0);
  });

  test("fails closed when Moyasar keys are not configured on the server", async () => {
    const saved = process.env.MOYASAR_SECRET_KEY;
    delete process.env.MOYASAR_SECRET_KEY;
    try {
      expect((await checkout()).ok).toBe(false);
    } finally {
      process.env.MOYASAR_SECRET_KEY = saved;
    }
    expect(invoicePosts.length).toBe(0);
  });

  test("invoice creation failure marks the order failed (no dangling open attempt)", async () => {
    const broken = (async () => new Response("down", { status: 503 })) as unknown as typeof fetch;
    const result = await guest.startGuestCheckout(CONTACT, {}, broken);
    expect(result).toEqual({ ok: false, error: guest.GUEST_ERRORS.failed });
    expect(orders()[0].status).toBe("failed");
    /* والمحاولة التالية ممكنة فورًا. */
    expect((await checkout()).ok).toBe(true);
  });
});

/* ═══════════════════════════ التكرار والإعادة ═══════════════════════════ */

describe("duplicate / retry policy", () => {
  test("repeated submissions reuse the same open order and Moyasar URL", async () => {
    const first = await checkout();
    const second = await checkout({ ...CONTACT, name: "نورة أحمد العتيبي" }, { utm_source: "tiktok" });
    expect(first).toEqual(second);
    expect(orders().length).toBe(1);
    expect(invoicePosts.length).toBe(1);
    /* الاسم والحملة يُحدَّثان على المحاولة نفسها. */
    expect(orders()[0].customer_name).toBe("نورة أحمد العتيبي");
    expect(orders()[0].utm_source).toBe("tiktok");
  });

  test("double-click race creates exactly one order and one invoice", async () => {
    const results = await Promise.all([checkout(), checkout()]);
    expect(orders().length).toBe(1);
    expect(invoicePosts.length).toBe(1);
    expect(results.filter((result) => result.ok).length).toBeGreaterThanOrEqual(1);
  });

  test("an expired open attempt is closed and a new one created", async () => {
    await checkout();
    orders()[0].checkout_expires_at = new Date(Date.now() - 60_000).toISOString();
    const retry = await checkout();
    expect(retry.ok).toBe(true);
    expect(orders().map((order) => order.status)).toEqual(["expired", "pending"]);
    expect(invoicePosts.length).toBe(2);
  });

  test("a still-payable attempt is never cancelled (its invoice could still be paid)", async () => {
    await checkout();
    orders()[0].total_amount = 4500; /* محاولة بسعر قديم ما زالت مفتوحة */
    orders()[0].net_amount = 4500;
    orders()[0].tax_amount = 0;
    const result = await checkout();
    expect(result).toEqual({ ok: false, error: guest.GUEST_ERRORS.inProgress });
    expect(orders().length).toBe(1);
    expect(orders()[0].status).toBe("pending");
  });

  test("retry is allowed after a failed or expired attempt", async () => {
    await checkout();
    orders()[0].status = "failed";
    expect((await checkout()).ok).toBe(true);
    expect(orders().length).toBe(2);
  });

  test("a confirmed paid booking blocks a new purchase by the same email OR the same phone", async () => {
    await checkout();
    orders()[0].status = "paid";
    orders()[0].paid_at = new Date().toISOString();
    expect(await checkout()).toEqual({ ok: false, error: guest.GUEST_ERRORS.alreadyPaid });
    expect(await checkout({ ...CONTACT, email: "other@example.com" })).toEqual({
      ok: false,
      error: guest.GUEST_ERRORS.alreadyPaid,
    });
    expect(await checkout({ ...CONTACT, phone: "966598765432" })).toEqual({
      ok: false,
      error: guest.GUEST_ERRORS.alreadyPaid,
    });
    /* شخص آخر تمامًا يحجز. */
    expect((await checkout({ name: "فهد", phone: "966598765432", email: "fahad@example.com" })).ok).toBe(true);
  });
});

/* ═══════════════════════════ التحقق الموثوق ═══════════════════════════ */

describe("verifyGuestOrder — provider is the only proof of payment", () => {
  async function pendingOrder() {
    await checkout();
    return orders()[0];
  }

  test("paid only after Moyasar confirms; idempotent afterwards (no second provider call)", async () => {
    const order = await pendingOrder();
    expect(await guest.verifyGuestOrder(order.id as string, fetcher)).toBe("pending");
    expect(orders()[0].status).toBe("pending");

    markInvoice(order.provider_payment_id as string, { status: "paid" });
    expect(await guest.verifyGuestOrder(order.id as string, fetcher)).toBe("paid");
    expect(orders()[0].status).toBe("paid");
    expect(orders()[0].paid_at).toBeTruthy();

    const calls = client.log.length;
    const broken = (async () => {
      throw new Error("must not be called");
    }) as unknown as typeof fetch;
    expect(await guest.verifyGuestOrder(order.id as string, broken)).toBe("paid");
    expect(client.log.length).toBe(calls + 1); /* قراءة واحدة، لا كتابة */
  });

  test("amount, currency, metadata, and environment mismatches never mark paid", async () => {
    for (const patch of [
      { amount: GROSS + 100 },
      { currency: "USD" },
      { metadata: { payment_id: randomUUID(), environment: "test" } },
      { metadata: { payment_id: "placeholder", environment: "production" } },
    ]) {
      freshDatabase();
      const order = await pendingOrder();
      const fix = { ...patch } as Row;
      if ((fix.metadata as Row | undefined)?.payment_id === "placeholder") {
        fix.metadata = { payment_id: order.id, environment: "production" };
      }
      markInvoice(order.provider_payment_id as string, { status: "paid", ...fix });
      expect(await guest.verifyGuestOrder(order.id as string, fetcher)).toBe("failed");
      expect(orders()[0].status).toBe("failed");
      expect(String(orders()[0].failure_code)).toMatch(/mismatch/);
    }
  });

  test("provider failure/expiry is recorded; a later real payment is still recorded (late_payment)", async () => {
    const order = await pendingOrder();
    markInvoice(order.provider_payment_id as string, { status: "expired" });
    expect(await guest.verifyGuestOrder(order.id as string, fetcher)).toBe("expired");
    markInvoice(order.provider_payment_id as string, { status: "paid" });
    expect(await guest.verifyGuestOrder(order.id as string, fetcher)).toBe("paid");
    expect(orders()[0].failure_code).toBe("late_payment");
  });

  test("a second paid order for the same email/phone is recorded and flagged duplicate_of", async () => {
    const first = await pendingOrder();
    markInvoice(first.provider_payment_id as string, { status: "paid" });
    await guest.verifyGuestOrder(first.id as string, fetcher);
    /* مسار ضيق: طلب ثانٍ أُنشئ قبل تأكيد الأول ثم دُفع. */
    const second: Row = { ...guestOrderDefaults(), ...first, id: randomUUID(), idempotency_key: randomUUID(), status: "pending", paid_at: null };
    const invoiceId = randomUUID();
    second.provider_payment_id = invoiceId;
    client.tables.guest_course_orders.push(second);
    invoices.set(invoiceId, {
      id: invoiceId,
      status: "paid",
      amount: GROSS,
      currency: "SAR",
      metadata: { payment_id: second.id, environment: "test" },
      refunded: 0,
    });
    expect(await guest.verifyGuestOrder(second.id as string, fetcher)).toBe("paid");
    expect(orders()[1].duplicate_of).toBe(first.id);
  });

  test("one provider payment identifier can never belong to two orders", async () => {
    const order = await pendingOrder();
    const other: Row = { ...guestOrderDefaults(), course_id: COURSE_ID, provider: "moyasar", environment: "test", email: "x@example.com", phone: "966500000001", customer_name: "x", net_amount: 1, total_amount: 100, tax_rate_bps: 0 };
    client.tables.guest_course_orders.push(other);
    const { error } = await client
      .from("guest_course_orders")
      .update({ provider_payment_id: order.provider_payment_id })
      .eq("id", other.id as string);
    expect((error as Row | null)?.code).toBe("23505");
    const sql = readFileSync("supabase/migrations/20261004120000_guest_course_orders.sql", "utf8");
    expect(sql).toMatch(/create unique index uq_guest_course_orders_provider_ref\s+on public\.guest_course_orders \(provider, provider_payment_id\)\s+where provider_payment_id is not null/);
  });
});

/* ═══════════════════════════ إجراء الصفحة ═══════════════════════════ */

describe("startGuestCheckoutAction — no auth, server-validated", () => {
  function form(fields: Record<string, string>): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    return data;
  }
  async function run(fields: Record<string, string>) {
    try {
      return { state: await startGuestCheckoutAction({ error: null }, form(fields)) };
    } catch (error) {
      if (error instanceof Redirect) return { redirect: error.to };
      throw error;
    }
  }
  const VALID = { name: "  نورة   أحمد ", phone: "٠٥١٢٣٤٥٦٧٨", email: " Noura@Example.com " };

  test("guest (no session, no cookies) is redirected straight to the Moyasar hosted page", async () => {
    globalThis.fetch = moyasarApi as typeof fetch;
    const result = await run({ ...VALID, utm_source: "ig", utm_campaign: "launch", evil: "x" });
    expect(result.redirect).toMatch(/^https:\/\/checkout\.moyasar\.com\/invoices\//);
    const order = orders()[0];
    expect(order.customer_name).toBe("نورة أحمد");
    expect(order.phone).toBe("966512345678");
    expect(order.email).toBe("noura@example.com");
    expect(order.utm_source).toBe("ig");
    expect(order.utm_campaign).toBe("launch");
  });

  test("forged amount / course / provider / status fields are ignored", async () => {
    globalThis.fetch = moyasarApi as typeof fetch;
    await run({
      ...VALID,
      amount: "100",
      total_amount: "100",
      course_id: randomUUID(),
      courseId: randomUUID(),
      provider: "tabby",
      status: "paid",
    });
    const order = orders()[0];
    expect(order.total_amount).toBe(GROSS);
    expect(order.course_id).toBe(COURSE_ID);
    expect(order.provider).toBe("moyasar");
    expect(order.status).toBe("pending");
    expect(invoicePosts[0].amount).toBe(GROSS);
  });

  test("invalid input returns per-field Arabic errors and creates nothing", async () => {
    const result = await run({ name: "a", phone: "0512", email: "nope" });
    expect(result.state?.fieldErrors?.name).toBeTruthy();
    expect(result.state?.fieldErrors?.phone).toBeTruthy();
    expect(result.state?.fieldErrors?.email).toBeTruthy();
    expect(orders().length).toBe(0);
  });

  test("honeypot submissions create nothing", async () => {
    const result = await run({ ...VALID, website: "http://spam.example" });
    expect(result.state?.error).toBe(guest.GUEST_ERRORS.failed);
    expect(orders().length).toBe(0);
  });

  test("rate limit stops floods from one address", async () => {
    for (let index = 0; index < 8; index += 1) await run({ name: "", phone: "", email: "" });
    const blocked = await run(VALID);
    expect(blocked.state?.error).toMatch(/محاولات كثيرة/);
    expect(orders().length).toBe(0);
  });

  test("the action and guest module never consult authentication", () => {
    for (const file of ["src/app/lp/mobile-content/actions.ts", "src/lib/payments/guest-orders.ts"]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/getCommunityViewerId|auth\.getUser|createSupabaseServerClient|communityLoginHref|startCheckoutAction/);
    }
  });
});

/* ═══════════════════════════ الإشعار ═══════════════════════════ */

describe("webhook — existing path first, guest branch additive", () => {
  function event(invoiceId: string, overrides: Row = {}): Request {
    return new Request("https://baytalmosawer.net/api/payments/webhook/moyasar", {
      method: "POST",
      body: JSON.stringify({
        id: randomUUID(),
        type: "payment_paid",
        secret_token: FAKE_ENV.MOYASAR_WEBHOOK_SECRET,
        live: false,
        data: { invoice_id: invoiceId },
        ...overrides,
      }),
    });
  }
  const send = (request: Request) => webhook(request, { params: Promise.resolve({ provider: "moyasar" }) });
  const guestQueries = () => client.log.filter((entry) => entry.table === "guest_course_orders").length;

  test("an existing authenticated course payment is processed exactly as before — guest table untouched", async () => {
    globalThis.fetch = moyasarApi as typeof fetch;
    const paymentId = randomUUID();
    const invoiceId = randomUUID();
    client.tables.course_payments = [
      {
        id: paymentId,
        user_id: USER_ID,
        course_id: COURSE_ID,
        provider: "moyasar",
        environment: "test",
        status: "pending",
        total_amount: GROSS,
        currency: "SAR",
        idempotency_key: randomUUID(),
        provider_payment_id: invoiceId,
        provider_checkout_url: "https://checkout.moyasar.com/invoices/x",
        checkout_expires_at: new Date(Date.now() + 600_000).toISOString(),
        enrollment_id: null,
      },
    ];
    invoices.set(invoiceId, {
      id: invoiceId,
      status: "paid",
      amount: GROSS,
      currency: "SAR",
      metadata: { payment_id: paymentId, environment: "test" },
      refunded: 0,
    });
    client.log.length = 0;
    const response = await send(event(invoiceId));
    expect(await response.json()).toEqual({ received: true });
    expect(client.rpcCalls.map((call) => call.name)).toEqual(["finalize_course_purchase"]);
    expect(client.rpcCalls[0].args.p_payment_id).toBe(paymentId);
    expect(guestQueries()).toBe(0);
  });

  test("a guest order is confirmed by the webhook via direct provider verification", async () => {
    await checkout();
    const order = orders()[0];
    markInvoice(order.provider_payment_id as string, { status: "paid" });
    globalThis.fetch = moyasarApi as typeof fetch;
    await send(event(order.provider_payment_id as string));
    expect(orders()[0].status).toBe("paid");
    expect(client.rpcCalls.length).toBe(0); /* لا تسجيل في دورة ولا مسار الشراء بحساب */
    const recorded = client.tables.payment_webhook_events.at(-1) as Row;
    expect(recorded.payment_id).toBeNull();
    expect(recorded.processed).toBe(true);
  });

  test("a forged webhook (wrong secret) is recorded but never reaches the guest branch", async () => {
    await checkout();
    const order = orders()[0];
    markInvoice(order.provider_payment_id as string, { status: "paid" });
    globalThis.fetch = moyasarApi as typeof fetch;
    client.log.length = 0;
    await send(event(order.provider_payment_id as string, { secret_token: "x".repeat(32) }));
    expect(orders()[0].status).toBe("pending");
    expect(guestQueries()).toBe(0);
  });

  test("a replayed/duplicate event id is swallowed; processing is idempotent", async () => {
    await checkout();
    const order = orders()[0];
    globalThis.fetch = moyasarApi as typeof fetch;
    const eventId = randomUUID();
    await send(event(order.provider_payment_id as string, { id: eventId })); /* invoice still initiated */
    expect(orders()[0].status).toBe("pending");
    markInvoice(order.provider_payment_id as string, { status: "paid" });
    await send(event(order.provider_payment_id as string, { id: eventId })); /* same id again */
    expect(orders()[0].status).toBe("pending");
    await send(event(order.provider_payment_id as string)); /* new delivery */
    expect(orders()[0].status).toBe("paid");
    const paidAt = orders()[0].paid_at;
    await send(event(order.provider_payment_id as string)); /* yet another */
    expect(orders()[0].paid_at).toBe(paidAt);
  });

  test("live/test environment mismatch is not processed", async () => {
    await checkout();
    const order = orders()[0];
    markInvoice(order.provider_payment_id as string, { status: "paid" });
    globalThis.fetch = moyasarApi as typeof fetch;
    await send(event(order.provider_payment_id as string, { live: true }));
    expect(orders()[0].status).toBe("pending");
  });

  test("an unknown reference is acknowledged without processing", async () => {
    globalThis.fetch = moyasarApi as typeof fetch;
    const response = await send(event(randomUUID()));
    expect(await response.json()).toEqual({ received: true });
    expect(client.rpcCalls.length).toBe(0);
  });

  test("route source: the course-payment path is unchanged and runs first", () => {
    const source = readFileSync("src/app/api/payments/webhook/[provider]/route.ts", "utf8");
    const order = [
      "paymentIdByProviderReference(provider, inspection.providerPaymentId)",
      "await recordWebhookEvent({",
      "if (!inspection.signatureValid) return ack();",
      "if (!firstTime) return ack();",
      "if (inspection.live !== null",
      "if (!paymentId) {",
      "guestOrderIdByProviderReference(provider, inspection.providerPaymentId)",
      "await verifyGuestOrder(guestOrderId);",
      "await verifyAndFinalize(paymentId);",
    ].map((needle) => source.indexOf(needle));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

/* ═══════════════════════════ صفحة النجاح ═══════════════════════════ */

describe("success page — status resolved on the server", () => {
  async function render(search: Record<string, string>) {
    const element = await SuccessPage({ searchParams: Promise.resolve(search) });
    return renderToStaticMarkup(element);
  }

  test("verified paid → «تم حجز مقعدك بنجاح» with workshop identity and no personal data", async () => {
    await checkout();
    const order = orders()[0];
    markInvoice(order.provider_payment_id as string, { status: "paid" });
    globalThis.fetch = moyasarApi as typeof fetch;
    const html = await render({ o: order.id as string });
    expect(html).toContain("تم حجز مقعدك بنجاح");
    expect(html).toContain("احتراف صناعة المحتوى بالجوال");
    expect(html).toContain(`${PRICE} ريال`);
    expect(html).toContain("27 – 29 أكتوبر 2026");
    expect(html).toContain("أونلاين عبر Zoom");
    expect(html).toContain("n***@example.com");
    for (const pii of [CONTACT.email, CONTACT.phone, CONTACT.name, order.provider_payment_id as string]) {
      expect(html).not.toContain(pii);
    }
  });

  test("browser return with forged ?status=paid cannot claim success while provider is pending", async () => {
    await checkout();
    const order = orders()[0];
    globalThis.fetch = moyasarApi as typeof fetch;
    const html = await render({ o: order.id as string, status: "paid", paid: "true" });
    expect(html).not.toContain("تم حجز مقعدك بنجاح");
    expect(html).toContain("جارٍ تأكيد الدفع");
    expect(orders()[0].status).toBe("pending");
  });

  test("reload is safe: paid stays paid without re-querying the provider", async () => {
    await checkout();
    const order = orders()[0];
    markInvoice(order.provider_payment_id as string, { status: "paid" });
    globalThis.fetch = moyasarApi as typeof fetch;
    await render({ o: order.id as string });
    globalThis.fetch = (async () => {
      throw new Error("no provider call on reload");
    }) as unknown as typeof fetch;
    expect(await render({ o: order.id as string })).toContain("تم حجز مقعدك بنجاح");
  });

  test("unknown or malformed order id → not found, never success", async () => {
    expect(await render({ o: randomUUID() })).toContain("لم نجد هذا الطلب");
    expect(await render({ o: "../../etc" })).toContain("لم نجد هذا الطلب");
    expect(await render({})).toContain("لم نجد هذا الطلب");
  });

  test("failed attempt offers a retry link back to the form", async () => {
    await checkout();
    const order = orders()[0];
    markInvoice(order.provider_payment_id as string, { status: "failed" });
    globalThis.fetch = moyasarApi as typeof fetch;
    const html = await render({ o: order.id as string });
    expect(html).toContain("لم يكتمل الدفع");
    expect(html).toContain('href="/lp/mobile-content#guest-checkout"');
  });
});

/* ═══════════════════════ جروب واتساب الورشة — للمدفوع فقط ═══════════════════════ */

describe("workshop WhatsApp group — revealed only for a verified PAID order", () => {
  const GROUP_URL = "https://chat.whatsapp.com/EJHwb7EVOhrBr1cE3b7D8l?s=cl&p=i&mlu=0&ilr=4";
  const GROUP_HOST = "chat.whatsapp.com";

  async function render(search: Record<string, string>) {
    const element = await SuccessPage({ searchParams: Promise.resolve(search) });
    return renderToStaticMarkup(element);
  }
  /** قيم href بعد فك ترميز HTML (& تُصيَّر &amp;). */
  function hrefs(html: string): string[] {
    return [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1].replace(/&amp;/g, "&"));
  }
  async function orderWithInvoice(status: string) {
    await checkout();
    const order = orders()[0];
    markInvoice(order.provider_payment_id as string, { status });
    globalThis.fetch = moyasarApi as typeof fetch;
    return order;
  }

  test("verified PAID: success headline, final-step copy, and the group CTA to the exact URL", async () => {
    const order = await orderWithInvoice("paid");
    const html = await render({ o: order.id as string });
    expect(html).toContain("تم حجز مقعدك بنجاح 🎉");
    expect(html).toContain("الخطوة الأخيرة:");
    expect(html).toContain("انضم إلى جروب الورشة على واتساب لتصلك روابط Zoom والتنبيهات وكل تفاصيل الورشة.");
    const cta = html.match(/<a[^>]*href="https:\/\/chat\.whatsapp\.com[^"]*"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? "";
    expect(cta).toContain("انضم الآن إلى جروب الورشة");
    expect(cta).toContain('target="_blank"');
    expect(cta).toContain('rel="noopener noreferrer"');
    expect(hrefs(html).filter((href) => href.includes(GROUP_HOST))).toEqual([GROUP_URL]);
    /* بيانات الطلب الموثقة باقية. */
    expect(html).toContain(`${PRICE} ريال`);
    expect(html).toContain("27 – 29 أكتوبر 2026");
  });

  test("PENDING: group URL absent", async () => {
    const order = await orderWithInvoice("initiated");
    const html = await render({ o: order.id as string });
    expect(html).toContain("جارٍ تأكيد الدفع");
    expect(html).not.toContain(GROUP_HOST);
  });

  test("FAILED, EXPIRED, CANCELLED, REFUNDED: group URL absent", async () => {
    for (const status of ["failed", "expired", "canceled"]) {
      freshDatabase();
      const order = await orderWithInvoice(status);
      expect(await render({ o: order.id as string })).not.toContain(GROUP_HOST);
    }
    freshDatabase();
    const refunded = await orderWithInvoice("paid");
    markInvoice(refunded.provider_payment_id as string, { refunded: GROSS });
    expect(await render({ o: refunded.id as string })).not.toContain(GROUP_HOST);
  });

  test("UNKNOWN or invalid order: group URL absent", async () => {
    for (const search of [{ o: randomUUID() }, { o: "not-a-uuid" }, {}]) {
      expect(await render(search as Record<string, string>)).not.toContain(GROUP_HOST);
    }
  });

  test("forged ?status=paid (and similar) cannot reveal the group URL", async () => {
    const order = await orderWithInvoice("initiated");
    const html = await render({
      o: order.id as string,
      status: "paid",
      paid: "true",
      outcome: "paid",
      group: "1",
    });
    expect(html).not.toContain(GROUP_HOST);
    expect(html).not.toContain("تم حجز مقعدك بنجاح");
    expect(orders()[0].status).toBe("pending");
    /* وبلا معرّف طلب حقيقي أيضًا. */
    expect(await render({ status: "paid" })).not.toContain(GROUP_HOST);
  });

  test("there is NO automatic redirect to WhatsApp", async () => {
    const order = await orderWithInvoice("paid");
    const html = await render({ o: order.id as string });
    expect(html).not.toMatch(/http-equiv="refresh"/i);
    expect(html).not.toMatch(/<script/i);
    for (const file of [
      "src/app/lp/mobile-content/success/page.tsx",
      "src/components/landing/mobile-content/receipt-refresh.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/location\.(assign|replace|href\s*=)|window\.open|redirect\(|http-equiv/);
    }
    /* التحديث التلقائي الوحيد يخص حالة «قيد التأكيد» ولا يغادر الصفحة. */
    const refresh = readFileSync("src/components/landing/mobile-content/receipt-refresh.tsx", "utf8");
    expect(refresh).toContain("router.refresh()");
    expect(refresh).not.toContain("whatsapp");
  });

  test("the group URL lives only in a server-only module and never on the landing page", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
      );
    const holders = walk("src").filter((file) => readFileSync(file, "utf8").includes("EJHwb7EVOhrBr1cE3b7D8l"));
    expect(holders.map((file) => file.replace(/\\/g, "/"))).toEqual(["src/lib/landing/workshop-group.ts"]);
    expect(readFileSync("src/lib/landing/workshop-group.ts", "utf8")).toContain('import "server-only"');
    const importers = walk("src").filter((file) => readFileSync(file, "utf8").includes("@/lib/landing/workshop-group"));
    expect(importers.map((file) => file.replace(/\\/g, "/"))).toEqual(["src/app/lp/mobile-content/success/page.tsx"]);
  });
});

/* ═══════════════════════════ الإدارة ═══════════════════════════ */

describe("admin guest registrations (read-only)", () => {
  test("list returns operational fields only — no provider references or checkout URLs", async () => {
    await checkout(CONTACT, { utm_source: "instagram", utm_campaign: "oct" });
    orders()[0].status = "paid";
    orders()[0].paid_at = "2026-10-04T17:30:00.000Z";
    const [item] = await guest.listGuestOrders("paid");
    expect(item).toMatchObject({
      customerName: CONTACT.name,
      phone: CONTACT.phone,
      email: CONTACT.email,
      status: "paid",
      totalAmount: GROSS,
      utmSource: "instagram",
      utmCampaign: "oct",
    });
    expect(Object.keys(item)).not.toContain("providerPaymentId");
    expect(JSON.stringify(item)).not.toContain("checkout.moyasar.com");
    expect(await guest.listGuestOrders("pending")).toEqual([]);
  });

  test("CSV escapes spreadsheet formulas and contains no provider data", async () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+1")).toBe(`"'+1"`);
    expect(csvCell("-2")).toBe(`"'-2"`);
    expect(csvCell("@cmd")).toBe(`"'@cmd"`);
    const csv = guestOrdersCsv([
      {
        id: randomUUID(),
        customerName: "=cmd|' /C calc'!A0",
        phone: "966512345678",
        email: "a@example.com",
        status: "paid",
        totalAmount: GROSS,
        paidAt: "2026-10-04T17:30:00.000Z",
        createdAt: "2026-10-04T17:20:00.000Z",
        utmSource: "instagram",
        utmCampaign: null,
        failureCode: "",
        duplicateOf: null,
      },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain(`"'=cmd|' /C calc'!A0"`);
    expect(csv).toContain(`"966 51 234 5678"`);
    expect(csv).toContain(`"${(GROSS / 100).toFixed(2)}"`);
    expect(csv).toContain(`"2026-10-04 20:30"`); /* Asia/Riyadh */
  });

  test("page and CSV route reuse the existing payments:view permission and expose no write action", () => {
    for (const file of [
      "src/app/admin/(dashboard)/guest-orders/page.tsx",
      "src/app/admin/(dashboard)/guest-orders/export/route.ts",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain('requirePermission("payments", "view")');
      expect(source).not.toMatch(/"use server"|\.update\(|\.insert\(|\.delete\(|provider_payment_id|provider_checkout_url/);
    }
  });
});

/* ═══════════════════════════ الترحيل ═══════════════════════════ */

describe("guest_course_orders migration", () => {
  const sql = readFileSync("supabase/migrations/20261004120000_guest_course_orders.sql", "utf8");
  const statements = sql.replace(/--.*$/gm, "");

  test("is additive and non-destructive", () => {
    expect(statements).not.toMatch(/\bdrop\b/i);
    expect(statements).not.toMatch(/\btruncate\b|\bdelete\s+from\b/i);
    expect(statements).not.toMatch(/alter table public\.(?!guest_course_orders)/i);
    expect(statements).not.toMatch(/create or replace function|create policy|alter policy/i);
    expect(statements).not.toMatch(/course_payments|course_enrollments|payment_webhook_events/);
    expect(statements).toMatch(/^\s*begin;/m);
    expect(statements).toMatch(/^\s*commit;/m);
  });

  /* ملاحظة: Supabase يمنح service_role افتراضيًا كل الصلاحيات على جداول public الجديدة؛
     المنح الصريح هنا لا يضيف delete، والأدوار المتصفحة بلا أي منح (متحقق على الإنتاج). */
  test("RLS on, browser roles revoked, explicit service_role grant has no delete", () => {
    expect(statements).toContain("alter table public.guest_course_orders enable row level security;");
    expect(statements).toContain("revoke all on public.guest_course_orders from public, anon, authenticated;");
    expect(statements).toContain("grant select, insert, update on public.guest_course_orders to service_role;");
    expect(statements).not.toMatch(/grant[^;]*to (anon|authenticated)/i);
  });

  test("has the approved constraints and duplicate protections", () => {
    for (const needle of [
      "check (phone ~ '^9665[0-9]{8}$')",
      "check (status in ('created','pending','authorized','paid','failed','cancelled','expired','refunded'))",
      "constraint guest_course_orders_total_matches check (total_amount = net_amount + tax_amount)",
      "constraint guest_course_orders_idempotency_unique unique (idempotency_key)",
      "create unique index uq_guest_course_orders_one_open",
      "where status in ('created','pending','authorized')",
      "utm_source text",
      "utm_term text",
    ]) {
      expect(statements).toContain(needle);
    }
    /* لا قيد فريد على «مدفوع لكل بريد/جوال» — المال المأخوذ يجب أن يُسجَّل. */
    expect(statements).not.toMatch(/create unique index[^;]*where status = 'paid'/);
    /* لا بيانات بطاقة. */
    expect(statements).not.toMatch(/card|cvv|cvc|pan\b/i);
  });
});
