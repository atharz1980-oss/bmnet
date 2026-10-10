import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { createFakeSupabase, type FakeSupabase, type Row, type UniqueRule } from "./support/fake-supabase";

/*
 * ورشة «أساسيات التصوير» — الطبقات الحقيقية كلها (workshops/orders والرصيد
 * ومحوّل ميسّر ومسار الإشعار والصفحات)، والمزيّف فقط: القاعدة (في الذاكرة
 * بقيودها الفريدة ودالتيها الذريتين كما في الترحيل) وواجهة ميسّر الشبكية.
 * لا شبكة ولا أسرار حقيقية.
 */

const FAKE_ENV = {
  PAYMENTS_MODE: "test",
  MOYASAR_SECRET_KEY: ["sk", "test", "fakefakefakefakefakefake"].join("_"),
  MOYASAR_WEBHOOK_SECRET: "w".repeat(32),
};
const savedEnv: Record<string, string | undefined> = {};

let client: FakeSupabase;
let requestHeaders = new Headers({ "x-forwarded-for": "10.0.1.1" });

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
/*
 * ملف اختبار سابق يستبدل هذه الوحدة للعملية كلها ويتركها على إعداد آخر؛
 * هنا نسخة من `loadCommerce` الحقيقية سطرًا بسطر فوق القاعدة المزيّفة لهذا الملف.
 */
const { commerceSchema, defaultCommerce } = await import("@/lib/payments/settings");
mock.module("@/lib/payments/configuration", () => ({
  loadCommerce: async () => {
    const { data, error } = await client.from("commerce_settings").select("*").eq("id", true).maybeSingle();
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
  usePathname: () => "/lp/photography-basics",
  useSearchParams: () => new URLSearchParams(),
}));

const workshops = await import("@/lib/workshops/orders");
const credits = await import("@/lib/workshops/credits");
const { startPhotographyCheckoutAction } = await import("@/app/lp/photography-basics/actions");
const { resetRateLimits } = await import("@/lib/cms/rate-limit");
const { POST: webhook } = await import("@/app/api/payments/webhook/[provider]/route");
const { default: SuccessPage } = await import("@/app/lp/photography-basics/(campaign)/success/page");
const { default: BalancePage } = await import("@/app/lp/photography-basics/pay/[token]/page");
const { PixelPurchase } = await import("@/components/landing/mobile-content/pixel-events");
const { PhotographyBasicsLanding } = await import("@/components/landing/photography-basics/landing-page");
const { photographyJsonLd } = await import("@/lib/landing/photography-json-ld");
const { GET: checkoutStatus } = await import("@/app/api/workshops/[slug]/checkout-status/route");
const { resetCheckoutStatusCache, CHECKOUT_STATUS_TTL_MS, cachedWorkshopCheckoutReady } = await import("@/lib/workshops/checkout-status");
const { PHOTOGRAPHY_WHATSAPP_GROUP_URL, photographyGroupLinkFor } = await import("@/lib/workshops/group-links");
const contact = await import("@/lib/landing/contact");
const data = await import("@/data/landing/photography-basics");

const SLUG = data.PHOTOGRAPHY_BASICS_SLUG;
const FULL = 79_600;
const DEPOSIT = 30_000;
const BALANCE = 49_600;

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
const fetcher = moyasarApi as unknown as typeof fetch;
const realFetch = globalThis.fetch;

/* ─────────────────────────── القاعدة: افتراضيات وقيود الترحيل ─────────────────────────── */

let clock = Date.parse("2026-10-10T08:00:00Z");
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
  { table: "workshop_orders", conflict: (a, b) => a.balance_token_hash !== null && a.balance_token_hash === b.balance_token_hash },
  {
    table: "workshop_payments",
    conflict: (a, b) => a.provider_payment_id !== null && a.provider === b.provider && a.provider_payment_id === b.provider_payment_id,
  },
  { table: "workshop_payments", conflict: (a, b) => OPEN.includes(String(a.status)) && OPEN.includes(String(b.status)) && a.order_id === b.order_id },
  { table: "workshop_payments", conflict: (a, b) => a.idempotency_key === b.idempotency_key },
  { table: "payment_webhook_events", conflict: (a, b) => a.provider === b.provider && a.event_id === b.event_id },
];

function raise(message: string, code = "P0001"): never {
  throw Object.assign(new Error(message), { code });
}

/** مرآة `cancel_workshop_order_to_credit` في الترحيل — سطرًا بسطر. */
function cancelToCreditRpc(args: Row): string | null {
  const order = (client.tables.workshop_orders ?? []).find((row) => row.id === args.p_order_id && LIVE.includes(String(row.status)));
  if (!order) raise("order_not_cancellable");
  const now = new Date();
  Object.assign(order, { status: "cancelled_by_customer", cancelled_at: now.toISOString(), cancelled_by: args.p_actor });
  if ((order.paid_amount as number) <= 0) return null;
  client.tables.training_credits ??= [];
  if (client.tables.training_credits.some((row) => row.source_type === "workshop_order" && row.source_id === order.id)) raise("duplicate", "23505");
  const expires = new Date(now);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  const credit = {
    id: randomUUID(),
    holder_name: order.customer_name,
    holder_email: order.email,
    holder_phone: order.phone,
    source_type: "workshop_order",
    source_id: order.id,
    original_amount: order.paid_amount,
    balance: order.paid_amount,
    status: "active",
    issued_at: now.toISOString(),
    expires_at: expires.toISOString(),
    created_by: args.p_actor,
  };
  client.tables.training_credits.push(credit);
  (client.tables.training_credit_transactions ??= []).push({
    id: randomUUID(),
    credit_id: credit.id,
    kind: "issue",
    amount: order.paid_amount,
    reference: `workshop_order:${order.id}`,
  });
  return credit.id;
}

/** مرآة `redeem_training_credit` — والتكرار يُلغي الخصم كما تلغيه المعاملة. */
function redeemRpc(args: Row): number {
  const amount = args.p_amount as number;
  const reference = String(args.p_reference ?? "").trim();
  if (!amount || amount <= 0) raise("invalid_amount");
  if (!reference) raise("reference_required");
  const credit = (client.tables.training_credits ?? []).find(
    (row) =>
      row.id === args.p_credit_id &&
      row.status === "active" &&
      Date.parse(String(row.expires_at)) > Date.now() &&
      (row.balance as number) >= amount,
  );
  if (!credit) raise("credit_unavailable");
  const txs = (client.tables.training_credit_transactions ??= []);
  if (txs.some((tx) => tx.credit_id === credit.id && tx.kind === "redeem" && tx.reference === reference)) raise("duplicate key", "23505");
  credit.balance = (credit.balance as number) - amount;
  if (credit.balance === 0) credit.status = "used";
  txs.push({ id: randomUUID(), credit_id: credit.id, kind: "redeem", amount, reference });
  return credit.balance as number;
}

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
    rpc: { cancel_workshop_order_to_credit: cancelToCreditRpc, redeem_training_credit: redeemRpc },
  });
  client.tables.commerce_settings = [settings];
}

const orders = () => client.tables.workshop_orders ?? [];
const payments = () => client.tables.workshop_payments ?? [];
const CONTACT = { name: "سارة محمد", phone: "966512345670", email: "sara@example.com" };
const ADMIN = "44444444-4444-4444-8444-444444444444";

function markInvoice(providerPaymentId: string, patch: Row) {
  Object.assign(invoices.get(providerPaymentId) as Row, patch);
}

async function book(plan: "full" | "deposit", who = CONTACT) {
  return workshops.startWorkshopCheckout(SLUG, who, plan, {}, fetcher);
}

/** حجز ودفع مؤكد عبر ميسّر المزيّف — يعيد الطلب والدفعة. */
async function bookAndPay(plan: "full" | "deposit", who = CONTACT) {
  expect((await book(plan, who)).ok).toBe(true);
  const payment = payments().at(-1) as Row;
  markInvoice(payment.provider_payment_id as string, { status: "paid" });
  expect(await workshops.verifyWorkshopPayment(payment.id as string, fetcher)).toBe("paid");
  return { order: orders().find((row) => row.id === payment.order_id) as Row, payment };
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
  invoices.clear();
  invoicePosts.length = 0;
  resetRateLimits();
  requestHeaders = new Headers({ "x-forwarded-for": `10.0.1.${Math.floor(Math.random() * 250)}` });
  /* لا شبكة في هذا الملف: ميسّر المزيّف افتراضيًا، وأي مضيف آخر يُرفض (599). */
  globalThis.fetch = moyasarApi as typeof fetch;
});

/* ═══════════════════════════ الدفع الكامل والعربون ═══════════════════════════ */

describe("full and deposit payments — the server decides the amount", () => {
  test("full: one order (796) and one payment of 79600 halalas; confirmed only after asking Moyasar", async () => {
    const result = await book("full");
    expect(result.ok).toBe(true);
    expect(orders().length).toBe(1);
    expect(payments().length).toBe(1);
    const [order] = orders();
    const [payment] = payments();
    expect(order).toMatchObject({ workshop_slug: SLUG, status: "pending", payment_plan: "full", total_amount: FULL, deposit_amount: 0, paid_amount: 0, environment: "test" });
    expect(payment).toMatchObject({ kind: "full", amount: FULL, status: "pending", order_id: order.id });

    const sent = invoicePosts[0];
    expect(sent.amount).toBe(FULL);
    expect(sent.currency).toBe("SAR");
    expect((sent.metadata as Row).payment_id).toBe(payment.id);
    expect(sent.success_url).toBe(`https://baytalmosawer.net/lp/photography-basics/success?o=${payment.id}`);
    expect(sent.back_url).toBe("https://baytalmosawer.net/lp/photography-basics#booking");
    expect(sent.callback_url).toBe("https://baytalmosawer.net/api/payments/webhook/moyasar");
    for (const pii of [CONTACT.email, CONTACT.phone, CONTACT.name]) expect(JSON.stringify(sent)).not.toContain(pii);

    /* لم يُدفع بعد: التحقق يبقيه معلقًا. */
    expect(await workshops.verifyWorkshopPayment(payment.id as string, fetcher)).toBe("pending");
    expect(orders()[0].status).toBe("pending");

    markInvoice(payment.provider_payment_id as string, { status: "paid" });
    expect(await workshops.verifyWorkshopPayment(payment.id as string, fetcher)).toBe("paid");
    expect(orders()[0]).toMatchObject({ status: "paid", paid_amount: FULL });
  });

  test("deposit: 30000 now, order deposit_paid with 49600 remaining", async () => {
    const { order, payment } = await bookAndPay("deposit");
    expect(payment).toMatchObject({ kind: "deposit", amount: DEPOSIT, status: "paid" });
    expect(order).toMatchObject({ status: "deposit_paid", payment_plan: "deposit", total_amount: FULL, deposit_amount: DEPOSIT, paid_amount: DEPOSIT });
    expect(invoicePosts[0].amount).toBe(DEPOSIT);
  });

  test("the action takes no amount from the browser and rejects an unknown plan", async () => {
    const form = (fields: Record<string, string>) => {
      const body = new FormData();
      for (const [key, value] of Object.entries(fields)) body.set(key, value);
      return body;
    };
    const base = { name: CONTACT.name, phone: "0512345670", email: CONTACT.email };
    const bad = await startPhotographyCheckoutAction({ error: null }, form({ ...base, plan: "half" }));
    expect(bad.fieldErrors?.plan).toBeTruthy();
    expect(orders().length).toBe(0);

    globalThis.fetch = moyasarApi as typeof fetch;
    const thrown = await startPhotographyCheckoutAction({ error: null }, form({ ...base, plan: "deposit", amount: "1", total_amount: "100" })).catch(
      (error: unknown) => error,
    );
    expect(thrown).toBeInstanceOf(Redirect);
    expect((thrown as Redirect).to).toMatch(/^https:\/\/checkout\.moyasar\.com\/invoices\//);
    expect(payments()[0].amount).toBe(DEPOSIT);
    expect(orders()[0].total_amount).toBe(FULL);
  });

  test("fails closed without VAT-inclusive pricing or Moyasar keys — no order, no invoice", async () => {
    freshDatabase({ ...SETTINGS, prices_include_tax: false });
    expect(await book("full")).toEqual({ ok: false, error: workshops.WORKSHOP_ERRORS.unavailable });
    freshDatabase();
    const saved = process.env.MOYASAR_SECRET_KEY;
    delete process.env.MOYASAR_SECRET_KEY;
    try {
      expect((await book("deposit")).ok).toBe(false);
    } finally {
      process.env.MOYASAR_SECRET_KEY = saved;
    }
    expect(orders().length).toBe(0);
    expect(invoicePosts.length).toBe(0);
  });

  test("an existing confirmed booking (same email or phone) blocks a second one", async () => {
    await bookAndPay("deposit");
    expect(await book("full")).toEqual({ ok: false, error: workshops.WORKSHOP_ERRORS.alreadyBooked });
    expect(await book("full", { ...CONTACT, email: "other@example.com" })).toEqual({ ok: false, error: workshops.WORKSHOP_ERRORS.alreadyBooked });
    expect(orders().length).toBe(1);
  });

  test("repeated submissions reuse the pending order and the open invoice; switching plan mid-invoice is refused", async () => {
    const first = await book("full");
    const second = await book("full");
    expect(second).toEqual(first);
    expect(orders().length).toBe(1);
    expect(invoicePosts.length).toBe(1);
    expect(await book("deposit")).toEqual({ ok: false, error: workshops.WORKSHOP_ERRORS.inProgress });
    /* بعد انتهاء صلاحية الفاتورة: يُغلق القديم ويبدأ عربون جديد على الطلب نفسه. */
    payments()[0].checkout_expires_at = new Date(Date.now() - 60_000).toISOString();
    expect((await book("deposit")).ok).toBe(true);
    expect(orders().length).toBe(1);
    expect(orders()[0]).toMatchObject({ payment_plan: "deposit", deposit_amount: DEPOSIT });
    expect(payments().map((row) => [row.kind, row.status])).toEqual([
      ["full", "expired"],
      ["deposit", "pending"],
    ]);
  });
});

/* ═══════════════════════════ الفشل والتلاعب ═══════════════════════════ */

describe("payment failure and verification guards", () => {
  test("a failed payment leaves the order unpaid; retry creates a new attempt", async () => {
    await book("full");
    const payment = payments()[0];
    markInvoice(payment.provider_payment_id as string, { status: "failed" });
    expect(await workshops.verifyWorkshopPayment(payment.id as string, fetcher)).toBe("failed");
    expect(payments()[0].status).toBe("failed");
    expect(orders()[0]).toMatchObject({ status: "pending", paid_amount: 0 });
    expect((await book("full")).ok).toBe(true);
    expect(payments().length).toBe(2);
  });

  test("invoice creation failure marks the attempt failed (no dangling open payment)", async () => {
    const broken = (async () => new Response("down", { status: 503 })) as unknown as typeof fetch;
    const result = await workshops.startWorkshopCheckout(SLUG, CONTACT, "full", {}, broken);
    expect(result).toEqual({ ok: false, error: workshops.WORKSHOP_ERRORS.failed });
    expect(payments()[0].status).toBe("failed");
    expect((await book("full")).ok).toBe(true);
  });

  test("amount, currency, metadata or environment mismatch never marks paid", async () => {
    for (const patch of [{ amount: DEPOSIT - 100 }, { currency: "USD" }, { metadata: { payment_id: randomUUID(), environment: "test" } }, { metadata: {} }]) {
      freshDatabase();
      await book("deposit");
      const payment = payments()[0];
      markInvoice(payment.provider_payment_id as string, { status: "paid", ...patch });
      expect(await workshops.verifyWorkshopPayment(payment.id as string, fetcher)).toBe("failed");
      expect(orders()[0]).toMatchObject({ status: "pending", paid_amount: 0 });
    }
  });

  test("a provider outage is not a failure — the attempt stays pending", async () => {
    await book("full");
    const down = (async () => new Response("down", { status: 503 })) as unknown as typeof fetch;
    expect(await workshops.verifyWorkshopPayment(payments()[0].id as string, down)).toBe("pending");
    expect(payments()[0].status).toBe("pending");
  });
});

/* ═══════════════════════════ الإشعار ═══════════════════════════ */

describe("webhook — workshop branch, duplicates recorded once", () => {
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

  test("the webhook confirms a workshop payment by asking Moyasar; guest orders untouched", async () => {
    await book("deposit");
    const payment = payments()[0];
    markInvoice(payment.provider_payment_id as string, { status: "paid" });
    globalThis.fetch = moyasarApi as typeof fetch;
    client.log.length = 0;
    const response = await send(event(payment.provider_payment_id as string));
    expect(await response.json()).toEqual({ received: true });
    expect(orders()[0]).toMatchObject({ status: "deposit_paid", paid_amount: DEPOSIT });
    expect(client.log.some((entry) => entry.table === "guest_course_orders" && entry.op !== "select")).toBe(false);
    expect(client.rpcCalls.length).toBe(0);
    expect((client.tables.payment_webhook_events.at(-1) as Row).processed).toBe(true);
  });

  test("duplicate webhooks (same and different event ids) record the deposit exactly once", async () => {
    await book("deposit");
    const payment = payments()[0];
    markInvoice(payment.provider_payment_id as string, { status: "paid" });
    globalThis.fetch = moyasarApi as typeof fetch;
    const replay = event(payment.provider_payment_id as string);
    const body = await replay.clone().text();
    await send(replay);
    await send(new Request(replay.url, { method: "POST", body }));
    await send(event(payment.provider_payment_id as string));
    await Promise.all([send(event(payment.provider_payment_id as string)), workshops.verifyWorkshopPayment(payment.id as string, fetcher)]);
    expect(payments().filter((row) => row.status === "paid").length).toBe(1);
    expect(orders()[0]).toMatchObject({ status: "deposit_paid", paid_amount: DEPOSIT });
    /* الإعادة بالمعرّف نفسه يبتلعها القيد الفريد: ثلاثة أحداث مسجلة، وتأكيد واحد. */
    expect(client.tables.payment_webhook_events.length).toBe(3);
  });

  test("a forged webhook (wrong secret) never confirms", async () => {
    await book("full");
    const payment = payments()[0];
    markInvoice(payment.provider_payment_id as string, { status: "paid" });
    globalThis.fetch = moyasarApi as typeof fetch;
    await send(event(payment.provider_payment_id as string, { secret_token: "x".repeat(32) }));
    expect(orders()[0]).toMatchObject({ status: "pending", paid_amount: 0 });
  });
});

/* ═══════════════════════════ سداد المتبقي ═══════════════════════════ */

describe("balance link and later payment", () => {
  test("link only for a deposit order; the token is never stored (hash only)", async () => {
    const { order } = await bookAndPay("full", { ...CONTACT, email: "full@example.com", phone: "966512345671" });
    expect((await workshops.createBalanceLink(order.id as string)).ok).toBe(false);

    const deposit = await bookAndPay("deposit");
    const link = await workshops.createBalanceLink(deposit.order.id as string);
    expect(link.ok).toBe(true);
    if (!link.ok) return;
    const token = link.url.split("/pay/")[1];
    expect(link.url).toBe(`https://baytalmosawer.net/lp/photography-basics/pay/${token}`);
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(link.remaining).toBe(BALANCE);
    const stored = orders().find((row) => row.id === deposit.order.id) as Row;
    expect(stored.balance_token_hash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(JSON.stringify(client.tables)).not.toContain(token);
  });

  test("full flow: deposit → link → balance 49600 → order paid 79600, link dies after", async () => {
    const { order } = await bookAndPay("deposit");
    const link = await workshops.createBalanceLink(order.id as string);
    if (!link.ok) throw new Error("no link");
    const token = link.url.split("/pay/")[1];

    expect(await workshops.loadBalanceSummary(token)).toMatchObject({ totalAmount: FULL, paidAmount: DEPOSIT, remainingAmount: BALANCE, firstName: "سارة" });
    const html = renderToStaticMarkup(await BalancePage({ params: Promise.resolve({ token }) }));
    expect(html).toContain("496");
    expect(html).not.toContain(CONTACT.email);
    expect(html).not.toContain(CONTACT.phone);

    const started = await workshops.startBalancePayment(token, fetcher);
    expect(started.ok).toBe(true);
    const balance = payments().at(-1) as Row;
    expect(balance).toMatchObject({ kind: "balance", amount: BALANCE, order_id: order.id });
    expect(invoicePosts.at(-1)?.amount).toBe(BALANCE);
    /* إعادة الضغط تعيد الفاتورة نفسها. */
    expect(await workshops.startBalancePayment(token, fetcher)).toEqual(started);

    markInvoice(balance.provider_payment_id as string, { status: "paid" });
    expect(await workshops.verifyWorkshopPayment(balance.id as string, fetcher)).toBe("paid");
    expect(await workshops.verifyWorkshopPayment(balance.id as string, fetcher)).toBe("paid");
    expect(orders()[0]).toMatchObject({ status: "paid", paid_amount: FULL, balance_token_hash: null });
    expect(await workshops.loadBalanceSummary(token)).toBeNull();
    expect(await workshops.startBalancePayment(token, fetcher)).toEqual({ ok: false, error: workshops.WORKSHOP_ERRORS.linkInvalid });
  });

  test("a regenerated link invalidates the previous one; malformed tokens are rejected", async () => {
    const { order } = await bookAndPay("deposit");
    const first = await workshops.createBalanceLink(order.id as string);
    const second = await workshops.createBalanceLink(order.id as string);
    if (!first.ok || !second.ok) throw new Error("no link");
    expect(await workshops.loadBalanceSummary(first.url.split("/pay/")[1])).toBeNull();
    expect(await workshops.loadBalanceSummary(second.url.split("/pay/")[1])).not.toBeNull();
    for (const bad of ["", "short", "../../etc", "a".repeat(200)]) expect(await workshops.loadBalanceSummary(bad)).toBeNull();
  });

  test("the admin action returns a manual WhatsApp share link to the customer's number — nothing is sent", async () => {
    const { order } = await bookAndPay("deposit");
    mock.module("@/lib/admin/session", () => ({
      requirePermission: async () => ({ ok: true, data: { userId: ADMIN } }),
    }));
    const { createBalanceLinkAction } = await import("@/app/admin/actions/workshops");
    const fetchSpy = mock(async () => new Response("no network"));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    const result = await createBalanceLinkAction(order.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.whatsappHref.startsWith(`https://wa.me/${CONTACT.phone}?text=`)).toBe(true);
    const text = decodeURIComponent(result.data.whatsappHref.split("?text=")[1]);
    expect(text).toContain(result.data.url);
    expect(text).toContain("496");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ═══════════════════════════ الإلغاء والرصيد ═══════════════════════════ */

describe("cancellation and training credit", () => {
  test("academy cancels → full refund due, no provider call; then recorded as refunded manually", async () => {
    const { order } = await bookAndPay("deposit");
    invoices.clear(); /* أي نداء لميسّر بعد الآن سيفشل */
    expect(await workshops.cancelOrderByAcademy(order.id as string, ADMIN)).toEqual({ ok: true });
    expect(orders()[0]).toMatchObject({ status: "cancelled_by_academy", refund_status: "due", refund_due_amount: DEPOSIT, cancelled_by: ADMIN });
    expect(await workshops.markRefundCompleted(order.id as string)).toEqual({ ok: true });
    expect(orders()[0].refund_status).toBe("refunded");
    expect((await workshops.markRefundCompleted(order.id as string)).ok).toBe(false);
    expect(client.tables.training_credits ?? []).toEqual([]);
  });

  test("customer cancels → the full paid amount becomes a credit valid one calendar year; only once", async () => {
    const { order } = await bookAndPay("full");
    const result = await credits.cancelOrderToCredit(order.id as string, ADMIN);
    expect(result.ok).toBe(true);
    const [credit] = client.tables.training_credits;
    expect(credit).toMatchObject({ original_amount: FULL, balance: FULL, status: "active", holder_email: CONTACT.email, source_id: order.id });
    const issued = new Date(String(credit.issued_at));
    const expires = new Date(String(credit.expires_at));
    expect(expires.getUTCFullYear()).toBe(issued.getUTCFullYear() + 1);
    expect(expires.getUTCMonth()).toBe(issued.getUTCMonth());
    expect(expires.getUTCDate()).toBe(issued.getUTCDate());
    expect(orders()[0].status).toBe("cancelled_by_customer");
    expect(await credits.cancelOrderToCredit(order.id as string, ADMIN)).toEqual({ ok: false, error: "لا يمكن إلغاء هذا الطلب." });
    expect(client.tables.training_credits.length).toBe(1);
  });

  test("deposit-only cancellation credits exactly the deposit; unpaid pending order gives no credit", async () => {
    const { order } = await bookAndPay("deposit");
    await credits.cancelOrderToCredit(order.id as string, ADMIN);
    expect(client.tables.training_credits[0]).toMatchObject({ original_amount: DEPOSIT, balance: DEPOSIT });

    freshDatabase();
    await book("full");
    expect(await credits.cancelOrderToCredit(orders()[0].id as string, ADMIN)).toEqual({ ok: true, creditId: null });
    expect(client.tables.training_credits ?? []).toEqual([]);
    expect(payments()[0].status).toBe("cancelled");
  });

  test("redeem: partial, then the rest (used); a repeated reference, over-balance, and expired credit are refused", async () => {
    const { order } = await bookAndPay("full");
    const issued = await credits.cancelOrderToCredit(order.id as string, ADMIN);
    if (!issued.ok || !issued.creditId) throw new Error("no credit");
    const id = issued.creditId;
    expect(await credits.redeemTrainingCredit(id, 50_000, "course-order-1", ADMIN)).toEqual({ ok: true, balance: 29_600 });
    expect(await credits.redeemTrainingCredit(id, 100, "course-order-1", ADMIN)).toEqual({
      ok: false,
      error: "هذا المرجع استُخدم من قبل على هذا الرصيد.",
    });
    expect((await credits.redeemTrainingCredit(id, 29_700, "course-order-2", ADMIN)).ok).toBe(false);
    expect(await credits.redeemTrainingCredit(id, 29_600, "course-order-2", ADMIN)).toEqual({ ok: true, balance: 0 });
    expect(client.tables.training_credits[0].status).toBe("used");
    expect((await credits.redeemTrainingCredit(id, 100, "course-order-3", ADMIN)).ok).toBe(false);

    freshDatabase();
    const again = await bookAndPay("deposit");
    const second = await credits.cancelOrderToCredit(again.order.id as string, ADMIN);
    if (!second.ok || !second.creditId) throw new Error("no credit");
    client.tables.training_credits[0].expires_at = new Date(Date.now() - 1000).toISOString();
    expect(await credits.redeemTrainingCredit(second.creditId, 100, "late", ADMIN)).toEqual({
      ok: false,
      error: "الرصيد غير متاح: منتهٍ أو مستخدم أو غير كافٍ.",
    });
    expect((await credits.listTrainingCredits())[0]).toMatchObject({ expired: true, balance: DEPOSIT });
    expect(await credits.redeemTrainingCredit(second.creditId, 0, "zero", ADMIN)).toEqual({ ok: false, error: "المبلغ غير صالح." });
  });

  test("a late balance payment after customer cancellation is kept for review, never re-opens the order", async () => {
    const { order } = await bookAndPay("deposit");
    const link = await workshops.createBalanceLink(order.id as string);
    if (!link.ok) throw new Error("no link");
    await workshops.startBalancePayment(link.url.split("/pay/")[1], fetcher);
    const balance = payments().at(-1) as Row;
    await credits.cancelOrderToCredit(order.id as string, ADMIN);
    markInvoice(balance.provider_payment_id as string, { status: "paid" });
    expect(await workshops.verifyWorkshopPayment(balance.id as string, fetcher)).toBe("paid");
    expect(orders()[0].status).toBe("cancelled_by_customer");
    const listed = (await workshops.listWorkshopOrders())[0];
    expect(listed.paidAmount).toBe(FULL);
    expect(client.tables.training_credits[0].original_amount).toBe(DEPOSIT);
  });

  test("the browser cannot create or change credits: no client code writes these tables", () => {
    const migration = readFileSync("supabase/migrations/20261010090000_workshop_orders_and_training_credits.sql", "utf8");
    for (const table of ["workshop_orders", "workshop_payments", "training_credits", "training_credit_transactions"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
    expect(migration).toMatch(/revoke all on public\.workshop_orders, public\.workshop_payments,\s+public\.training_credits, public\.training_credit_transactions\s+from public, anon, authenticated, service_role;/);
    expect(migration).toContain("grant select on public.training_credits, public.training_credit_transactions to service_role;");
    expect(migration).not.toMatch(/grant[^;]*(insert|update|delete)[^;]*training_credit/i);
    expect(migration).not.toMatch(/create policy/i);
    expect(migration).toContain("now() + interval '1 year'");
    const credSource = readFileSync("src/lib/workshops/credits.ts", "utf8");
    expect(credSource).not.toMatch(/from\("training_credits"\)\s*\.(insert|update|delete)/);
    expect(credSource.startsWith('import "server-only";')).toBe(true);
  });
});

/* ═══════════════════════════ الصفحات ═══════════════════════════ */

function findElements(node: ReactNode, type: unknown, found: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) node.forEach((child) => findElements(child, type, found));
  else if (isValidElement(node)) {
    if (node.type === type) found.push(node);
    findElements((node.props as { children?: ReactNode }).children, type, found);
  }
  return found;
}

describe("success page — Purchase per confirmed payment with its own value", () => {
  async function renderSuccess(paymentId: string) {
    return SuccessPage({ searchParams: Promise.resolve({ o: paymentId }) });
  }

  test("production: deposit → value 300; balance → value 496; stable event id per payment", async () => {
    process.env.PAYMENTS_MODE = "production";
    const savedPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "999999999999999"; /* معرّف اختبار — ليس المعرّف الحي */
    try {
      const orderId = randomUUID();
      const depositId = randomUUID();
      const balanceId = randomUUID();
      const now = new Date().toISOString();
      client.tables.workshop_orders = [
        { ...DEFAULTS.workshop_orders(), id: orderId, workshop_slug: SLUG, workshop_title_snapshot: "ورشة أساسيات التصوير الفوتوغرافي", environment: "production", status: "deposit_paid", payment_plan: "deposit", customer_name: CONTACT.name, email: CONTACT.email, phone: CONTACT.phone, total_amount: FULL, deposit_amount: DEPOSIT, paid_amount: DEPOSIT },
      ];
      client.tables.workshop_payments = [
        { ...DEFAULTS.workshop_payments(), id: depositId, order_id: orderId, kind: "deposit", environment: "production", status: "paid", amount: DEPOSIT, provider_payment_id: randomUUID(), paid_at: now },
      ];
      const depositTree = await renderSuccess(depositId);
      const [depositPixel] = findElements(depositTree, PixelPurchase);
      expect(depositPixel.props).toMatchObject({ valueSar: 300, content: data.PHOTOGRAPHY_PIXEL_CONTENT });
      expect((depositPixel.props as { eventId: string }).eventId).toMatch(/^purchase:[0-9a-f]{32}$/);
      const html = renderToStaticMarkup(depositTree);
      expect(html).toContain("تم حجز مقعدك بالعربون");
      expect(html).toContain("496");
      expect(html).not.toContain(depositId);

      client.tables.workshop_payments.push({ ...DEFAULTS.workshop_payments(), id: balanceId, order_id: orderId, kind: "balance", environment: "production", status: "paid", amount: BALANCE, provider_payment_id: randomUUID(), paid_at: now });
      const balanceTree = await renderSuccess(balanceId);
      const [balancePixel] = findElements(balanceTree, PixelPurchase);
      expect(balancePixel.props).toMatchObject({ valueSar: 496 });
      expect((balancePixel.props as { eventId: string }).eventId).not.toBe((depositPixel.props as { eventId: string }).eventId);
      expect(orders()[0]).toMatchObject({ status: "paid", paid_amount: FULL });
      expect(renderToStaticMarkup(balanceTree)).toContain("تم سداد المبلغ المتبقي بنجاح");
    } finally {
      process.env.PAYMENTS_MODE = FAKE_ENV.PAYMENTS_MODE;
      if (savedPixel === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
      else process.env.NEXT_PUBLIC_META_PIXEL_ID = savedPixel;
    }
  });

  test("test mode, pending, failed or unknown payment → no Purchase", async () => {
    const { payment } = await bookAndPay("full");
    expect(findElements(await renderSuccess(payment.id as string), PixelPurchase)).toEqual([]);
    freshDatabase();
    await book("deposit");
    const pending = payments()[0];
    expect(findElements(await renderSuccess(pending.id as string), PixelPurchase)).toEqual([]);
    expect(findElements(await renderSuccess(randomUUID()), PixelPurchase)).toEqual([]);
    expect(findElements(await renderSuccess("not-a-uuid"), PixelPurchase)).toEqual([]);
  });
});

describe("landing page content, SEO, and WhatsApp", () => {
  const SETTINGS_VIEW = {
    whatsappHref: "https://wa.me/966500000000?text=old",
    instagram: "",
    channels: { whatsapp: true, instagram: false },
  } as never;

  test("WhatsApp: the site number with this page's message only; the mobile page keeps its own", () => {
    const href = contact.landingWhatsappHref(SETTINGS_VIEW, data.PHOTOGRAPHY_WHATSAPP_MESSAGE);
    expect(href).toBe(`https://wa.me/966500000000?text=${encodeURIComponent("السلام عليكم، حاب أستفسر عن ورشة أساسيات التصوير وعرض الـ796 ريال.")}`);
    expect(contact.landingWhatsappHref(SETTINGS_VIEW)).toBe(
      `https://wa.me/966500000000?text=${encodeURIComponent(contact.LANDING_WHATSAPP_MESSAGE)}`,
    );
    expect(contact.LANDING_WHATSAPP_MESSAGE).toBe("السلام عليكم، حاب أستفسر عن ورشة صناعة المحتوى بالموبايل وعرض الـ96 ريال.");
  });

  test("renders the approved offer, payment options, location, curriculum — and no invented dates", () => {
    const whatsappHref = contact.landingWhatsappHref(SETTINGS_VIEW, data.PHOTOGRAPHY_WHATSAPP_MESSAGE);
    const html = renderToStaticMarkup(<PhotographyBasicsLanding checkoutEnabled whatsappHref={whatsappHref} />);
    for (const text of ["796", "1,400", "300", "496", "عرض اليوم الوطني السعودي الـ96", "مقر أكاديمية بيت المصور – جدة", "خلال أكتوبر 2026", "4 أيام تدريبية", "حضورية", "مثلث التعريض", "عمق الميدان Depth of Field"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain('href="https://maps.google.com/?q=21.563940,39.185852"');
    expect(html).toContain("data-lp-workshop-form");
    expect(html).toContain('value="deposit"');
    expect(html).toContain(whatsappHref?.replace(/&/g, "&amp;") ?? "missing");
    expect(html.match(/data-curriculum-day/g)?.length).toBe(4);
    /* لا تاريخ يوم محدد ولا عدّاد ولا موعد انتهاء للعرض. */
    expect(html).not.toMatch(/\d{1,2}\s*(–|-|إلى)?\s*\d{0,2}\s*أكتوبر/);
    expect(html).not.toMatch(/ينتهي العرض|countdown|data-countdown/i);
  });

  test("checkout disabled in config → no form, WhatsApp remains", () => {
    const html = renderToStaticMarkup(<PhotographyBasicsLanding checkoutEnabled={false} whatsappHref="https://wa.me/966500000000?text=x" />);
    expect(html).not.toContain("data-lp-workshop-form");
    expect(html).toContain('data-lp-checkout="unavailable"');
    expect(html).toContain("data-lp-whatsapp");
  });

  test("JSON-LD: Course, onsite in Jeddah, 796 SAR, no start date or offer expiry", () => {
    const ld = photographyJsonLd();
    expect(ld["@type"]).toBe("Course");
    expect(ld.offers).toMatchObject({ price: 796, priceCurrency: "SAR" });
    expect(ld.hasCourseInstance.courseMode).toBe("Onsite");
    expect(ld.syllabusSections.length).toBe(4);
    expect(JSON.stringify(ld)).not.toMatch(/startDate|endDate|validThrough|priceValidUntil/);
  });

  test("metadata: canonical, OpenGraph, and indexable; success and pay pages are noindex", async () => {
    const page = await import("@/app/lp/photography-basics/(campaign)/page");
    expect(page.metadata.alternates?.canonical).toBe("/lp/photography-basics");
    expect(page.metadata.openGraph).toMatchObject({ url: "/lp/photography-basics", locale: "ar_SA" });
    const success = await import("@/app/lp/photography-basics/(campaign)/success/page");
    const pay = await import("@/app/lp/photography-basics/pay/[token]/page");
    expect(success.metadata.robots).toEqual({ index: false, follow: false });
    expect(pay.metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("the mobile-content page is unaffected", () => {
  test("its files are untouched and its routes do not import the workshop modules", () => {
    const changed = Bun.spawnSync(["git", "diff", "--name-only", "origin/main", "--", "src/app/lp/mobile-content", "src/components/landing/mobile-content/landing-page.tsx", "src/components/landing/mobile-content/guest-checkout-form.tsx", "src/lib/payments", "src/data/landing/mobile-content.ts", "src/lib/landing/workshop-group.ts"])
      .stdout.toString()
      .trim();
    expect(changed).toBe("");
  });
});

/* ═══════════════════════════ جروب واتساب الورشة ═══════════════════════════ */

describe("success page — WhatsApp group only after a server-verified full/deposit payment", () => {
  const GROUP = "https://chat.whatsapp.com/FMGrrSnxG8EGPy5nkLaCxq?mode=gi_t";
  const render = async (params: Record<string, string | string[]>) =>
    renderToStaticMarkup(await SuccessPage({ searchParams: Promise.resolve(params) }));
  const hasGroup = (html: string) => html.includes(GROUP) || html.includes("chat.whatsapp.com") || html.includes("data-workshop-group");

  test("the link is exactly the approved one", () => {
    expect(PHOTOGRAPHY_WHATSAPP_GROUP_URL).toBe(GROUP);
  });

  test("full payment (796) confirmed by Moyasar → heading and button shown", async () => {
    await book("full");
    const payment = payments()[0];
    markInvoice(payment.provider_payment_id as string, { status: "paid" });
    globalThis.fetch = moyasarApi as typeof fetch;
    /* الصفحة نفسها تسأل ميسّر وتتحقق — لا اعتماد على أي معامل آخر. */
    const html = await render({ o: payment.id as string });
    expect(html).toContain("تم تأكيد حجزك بنجاح!");
    expect(html).toContain("انضم الآن إلى جروب واتساب الورشة");
    expect(html).toContain(`href="${GROUP}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(orders()[0]).toMatchObject({ status: "paid", paid_amount: FULL });
  });

  test("deposit (300) confirmed → button shown", async () => {
    const { payment } = await bookAndPay("deposit");
    globalThis.fetch = moyasarApi as typeof fetch;
    const html = await render({ o: payment.id as string });
    expect(html).toContain("تم تأكيد حجزك بنجاح!");
    expect(html).toContain(`href="${GROUP}"`);
  });

  test("pending (not paid at Moyasar) → no link, even with status=paid in the URL", async () => {
    await book("deposit");
    const payment = payments()[0];
    globalThis.fetch = moyasarApi as typeof fetch;
    const html = await render({ o: payment.id as string, status: "paid", id: payment.provider_payment_id as string, message: "APPROVED" });
    expect(html).toContain('data-workshop-outcome="pending"');
    expect(hasGroup(html)).toBe(false);
    expect(payments()[0].status).toBe("pending");
  });

  test("failed payment → no link", async () => {
    await book("full");
    const payment = payments()[0];
    markInvoice(payment.provider_payment_id as string, { status: "failed" });
    globalThis.fetch = moyasarApi as typeof fetch;
    const html = await render({ o: payment.id as string, status: "paid" });
    expect(html).toContain('data-workshop-outcome="failed"');
    expect(hasGroup(html)).toBe(false);
  });

  test("provider says paid but the amount/metadata do not match → not verified, no link", async () => {
    await book("full");
    const payment = payments()[0];
    markInvoice(payment.provider_payment_id as string, { status: "paid", amount: 100 });
    globalThis.fetch = moyasarApi as typeof fetch;
    const html = await render({ o: payment.id as string });
    expect(hasGroup(html)).toBe(false);
    expect(orders()[0].paid_amount).toBe(0);
  });

  test("provider unreachable → stays pending, no link", async () => {
    await book("full");
    const payment = payments()[0];
    markInvoice(payment.provider_payment_id as string, { status: "paid" });
    globalThis.fetch = (async () => new Response("down", { status: 503 })) as unknown as typeof fetch;
    const html = await render({ o: payment.id as string });
    expect(hasGroup(html)).toBe(false);
  });

  test("URL tampering: unknown, malformed, missing, or array ids never reveal the link", async () => {
    await bookAndPay("full");
    globalThis.fetch = moyasarApi as typeof fetch;
    const tampered: Array<Record<string, string | string[]>> = [
      { o: randomUUID(), status: "paid" },
      { o: "not-a-uuid", status: "paid" },
      { status: "paid", id: randomUUID() },
      { o: ["not-a-uuid", payments()[0].id as string] },
      { o: "' or 1=1 --" },
    ];
    for (const params of tampered) expect(hasGroup(await render(params))).toBe(false);
  });

  test("the provider reference (invoice id) is not accepted in place of our payment id", async () => {
    const { payment } = await bookAndPay("full");
    globalThis.fetch = moyasarApi as typeof fetch;
    expect(hasGroup(await render({ o: payment.provider_payment_id as string }))).toBe(false);
  });

  test("balance payment, refunded, or cancelled booking → no link", async () => {
    expect(photographyGroupLinkFor({ outcome: "paid", kind: "balance", orderStatus: "paid" })).toBeNull();
    expect(photographyGroupLinkFor({ outcome: "refunded", kind: "full", orderStatus: "paid" })).toBeNull();
    expect(photographyGroupLinkFor({ outcome: "paid", kind: "full", orderStatus: "cancelled_by_customer" })).toBeNull();
    expect(photographyGroupLinkFor({ outcome: "paid", kind: "deposit", orderStatus: "cancelled_by_academy" })).toBeNull();
    expect(photographyGroupLinkFor({ outcome: "pending", kind: "full", orderStatus: "pending" })).toBeNull();
    expect(photographyGroupLinkFor(null)).toBeNull();
    expect(photographyGroupLinkFor({ outcome: "paid", kind: "full", orderStatus: "paid" })).toBe(GROUP);
    expect(photographyGroupLinkFor({ outcome: "paid", kind: "deposit", orderStatus: "deposit_paid" })).toBe(GROUP);

    const { order } = await bookAndPay("full");
    await credits.cancelOrderToCredit(order.id as string, ADMIN);
    globalThis.fetch = moyasarApi as typeof fetch;
    const cancelledHtml = await render({ o: payments()[0].id as string });
    expect(hasGroup(cancelledHtml)).toBe(false);
    /* لا «حجز مؤكد» لحجز ملغى، ولا ملاحظة سداد متبقٍّ. */
    expect(cancelledHtml).toContain("تم استلام دفعتك");
    expect(cancelledHtml).not.toContain("تم حجز مقعدك");
    expect(cancelledHtml).not.toContain("data-balance-note");
  });

  test("the link never reaches browser code: server-only module, used only by the success page", () => {
    const source = readFileSync("src/lib/workshops/group-links.ts", "utf8");
    expect(source.startsWith('import "server-only";')).toBe(true);
    const files = (readdirSync("src", { recursive: true }) as string[])
      .map((file) => `src/${file.replace(/\\/g, "/")}`)
      .filter((file) => /\.(ts|tsx)$/.test(file));
    const holders = files.filter((file) => readFileSync(file, "utf8").includes("FMGrrSnxG8EGPy5nkLaCxq"));
    expect(holders).toEqual(["src/lib/workshops/group-links.ts"]);
    const importers = files.filter((file) => readFileSync(file, "utf8").includes("workshops/group-links"));
    expect(importers).toEqual(["src/app/lp/photography-basics/(campaign)/success/page.tsx"]);
    expect(readFileSync(importers[0], "utf8")).not.toContain('"use client"');
    /* صفحة الجوال وجروبها كما هما. */
    expect(readFileSync("src/lib/landing/workshop-group.ts", "utf8")).toContain("EJHwb7EVOhrBr1cE3b7D8l");
  });
});

/* ═══════════════════════════ جاهزية الدفع عند الزيارة (لا لحظة البناء) ═══════════════════════════ */

describe("checkout readiness is decided per visit, not frozen at build time", () => {
  const status = async (slug: string) => {
    const response = await checkoutStatus(new Request(`https://baytalmosawer.net/api/workshops/${slug}/checkout-status`), {
      params: Promise.resolve({ slug }),
    });
    return { code: response.status, cache: response.headers.get("cache-control"), body: (await response.json()) as Record<string, unknown> };
  };

  test("ready → {ready:true}, no-store, and only a boolean (no settings or secrets)", async () => {
    resetCheckoutStatusCache();
    const result = await status(SLUG);
    expect(result).toEqual({ code: 200, cache: "no-store", body: { ready: true } });
  });

  test("VAT-exclusive or missing Moyasar key → {ready:false}", async () => {
    resetCheckoutStatusCache();
    freshDatabase({ ...SETTINGS, prices_include_tax: false });
    expect((await status(SLUG)).body).toEqual({ ready: false });
    resetCheckoutStatusCache();
    freshDatabase();
    const saved = process.env.MOYASAR_SECRET_KEY;
    delete process.env.MOYASAR_SECRET_KEY;
    try {
      expect((await status(SLUG)).body).toEqual({ ready: false });
    } finally {
      process.env.MOYASAR_SECRET_KEY = saved;
    }
  });

  test("unknown workshop → 404 {ready:false}", async () => {
    expect(await status("nope")).toEqual({ code: 404, cache: "no-store", body: { ready: false } });
  });

  test("short memo (15s): a fixed configuration is picked up after the TTL", async () => {
    resetCheckoutStatusCache();
    freshDatabase({ ...SETTINGS, prices_include_tax: false });
    const t0 = Date.now();
    expect(await cachedWorkshopCheckoutReady(SLUG, t0)).toBe(false);
    freshDatabase();
    expect(await cachedWorkshopCheckoutReady(SLUG, t0 + 1000)).toBe(false);
    expect(await cachedWorkshopCheckoutReady(SLUG, t0 + CHECKOUT_STATUS_TTL_MS + 1)).toBe(true);
    resetCheckoutStatusCache();
  });

  test("the static page renders the form optimistically inside the gate; payment is still re-checked server-side on submit", () => {
    const html = renderToStaticMarkup(<PhotographyBasicsLanding checkoutEnabled whatsappHref={null} />);
    expect(html).toContain('data-checkout-gate="ready"');
    expect(html).toContain("data-lp-workshop-form");
    const page = readFileSync("src/app/lp/photography-basics/(campaign)/page.tsx", "utf8");
    expect(page).not.toMatch(/workshopCheckoutReady|checkoutReady\(/);
    const gate = readFileSync("src/components/landing/photography-basics/checkout-gate.tsx", "utf8");
    expect(gate).toContain("/checkout-status");
    expect(gate).toContain('cache: "no-store"');
  });

  test("submitting while payments are not ready → refused on the server, nothing created", async () => {
    freshDatabase({ ...SETTINGS, prices_include_tax: false });
    expect(await book("full")).toEqual({ ok: false, error: workshops.WORKSHOP_ERRORS.unavailable });
    expect(orders().length).toBe(0);
    expect(invoicePosts.length).toBe(0);
  });
});
