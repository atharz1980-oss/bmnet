/**
 * مزوّد ميسر ومحيطه — بمُحضِر مزيّف بدل الشبكة.
 *
 * ما يُختبر هنا هو ما لا يكشفه تشغيل ناجح واحد: ماذا يُرسَل بالضبط، وماذا
 * يحدث حين يكذب المزود أو يُزوَّر إشعار أو ينقص مفتاح. النجاح سهل؛ الفشل
 * المغلق هو ما يحمي المال.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";

/* `server-only` حارس بناء في Next لا حزمة مثبّتة — نُسكته في الاختبار. */
mock.module("server-only", () => ({}));

const KEY = "sk_test_0123456789abcdefghij";
const WEBHOOK = "webhook-secret-0123456789";

const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function setEnv() {
  process.env.PAYMENTS_MODE = "test";
  process.env.MOYASAR_SECRET_KEY = KEY;
  process.env.MOYASAR_WEBHOOK_SECRET = WEBHOOK;
}
function clearEnv() {
  delete process.env.MOYASAR_SECRET_KEY;
  delete process.env.MOYASAR_WEBHOOK_SECRET;
  delete process.env.PAYMENTS_MODE;
}

/** مُحضِر مزيّف: يسجّل ما أُرسل ويعيد ما نطلبه منه. */
function fakeFetcher(response: unknown, status = 200) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetcher = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(response), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetcher: fetcher as unknown as typeof fetch, calls };
}

const INVOICE_ID = "11111111-2222-4333-8444-555555555555";
const PAYMENT_ROW_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function paidInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE_ID,
    status: "paid",
    amount: 100_000,
    currency: "SAR",
    refunded: 0,
    metadata: { payment_id: PAYMENT_ROW_ID, environment: "test" },
    ...overrides,
  };
}

describe("the server environment decides whether payment exists at all", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  test("no key means no payment — not an unverified payment", async () => {
    const { moyasarEnvironment } = await import("../src/lib/payments/env");
    expect(moyasarEnvironment({} as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  test("a live key in test mode is refused", async () => {
    const { moyasarEnvironment } = await import("../src/lib/payments/env");
    expect(
      moyasarEnvironment({
        PAYMENTS_MODE: "test",
        MOYASAR_SECRET_KEY: "sk_live_0123456789abcdefghij",
        MOYASAR_WEBHOOK_SECRET: WEBHOOK,
      } as unknown as NodeJS.ProcessEnv),
    ).toBeNull();
  });

  test("a short webhook secret is refused — it is the only door", async () => {
    const { moyasarEnvironment } = await import("../src/lib/payments/env");
    expect(
      moyasarEnvironment({
        PAYMENTS_MODE: "test",
        MOYASAR_SECRET_KEY: KEY,
        MOYASAR_WEBHOOK_SECRET: "short",
      } as unknown as NodeJS.ProcessEnv),
    ).toBeNull();
  });

  test("a complete test configuration is accepted", async () => {
    const { moyasarEnvironment } = await import("../src/lib/payments/env");
    const env = moyasarEnvironment({
      PAYMENTS_MODE: "test",
      MOYASAR_SECRET_KEY: KEY,
      MOYASAR_WEBHOOK_SECRET: WEBHOOK,
    } as unknown as NodeJS.ProcessEnv);
    expect(env?.mode).toBe("test");
  });

  test("secret comparison does not leak length by returning early on content", async () => {
    const { secretsMatch } = await import("../src/lib/payments/env");
    expect(secretsMatch(WEBHOOK, WEBHOOK)).toBe(true);
    expect(secretsMatch(WEBHOOK, `${WEBHOOK}x`)).toBe(false);
    expect(secretsMatch("", "")).toBe(true);
    expect(secretsMatch(WEBHOOK, "")).toBe(false);
  });
});

describe("creating a hosted checkout", () => {
  beforeEach(setEnv);
  afterEach(clearEnv);

  const request = {
    paymentId: PAYMENT_ROW_ID,
    idempotencyKey: "77777777-8888-4999-8aaa-bbbbbbbbbbbb",
    amount: 100_000,
    currency: "SAR" as const,
    description: "دورة",
    successUrl: "https://baytalmosawer.net/payment/return?p=x",
    backUrl: "https://baytalmosawer.net/courses/x",
    callbackUrl: "https://baytalmosawer.net/api/payments/webhook/moyasar",
    expiresAt: new Date("2026-09-17T12:00:00Z"),
    mode: "test" as const,
  };

  test("it sends the exact gross amount in halalas and our own reference", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const { fetcher, calls } = fakeFetcher({ id: INVOICE_ID, url: "https://moyasar.com/invoices/x" });
    const session = await createMoyasarProvider(fetcher).createCheckout(request);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.moyasar.com/v1/invoices");
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.amount).toBe(100_000);
    expect(body.currency).toBe("SAR");
    expect(body.metadata.payment_id).toBe(PAYMENT_ROW_ID);
    expect(body.metadata.environment).toBe("test");
    expect(body.callback_url).toContain("/api/payments/webhook/moyasar");
    expect(session.providerPaymentId).toBe(INVOICE_ID);
    expect(session.checkoutUrl).toBe("https://moyasar.com/invoices/x");
  });

  test("the secret key travels in the authorization header, never in the body", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const { fetcher, calls } = fakeFetcher({ id: INVOICE_ID, url: "https://moyasar.com/invoices/x" });
    await createMoyasarProvider(fetcher).createCheckout(request);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization.startsWith("Basic ")).toBe(true);
    expect(String(calls[0].init.body)).not.toContain(KEY);
  });

  test("a checkout url that is not https is rejected", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const { fetcher } = fakeFetcher({ id: INVOICE_ID, url: "http://evil.example/x" });
    await expect(createMoyasarProvider(fetcher).createCheckout(request)).rejects.toThrow();
  });

  test("a provider error becomes an Arabic sentence, not a leak", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const { fetcher } = fakeFetcher({ message: "Invalid API key sk_test_xyz" }, 401);
    await expect(createMoyasarProvider(fetcher).createCheckout(request)).rejects.toThrow(
      /بوابة الدفع/,
    );
  });

  test("a mode that disagrees with the server is refused before any call", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const { fetcher, calls } = fakeFetcher({ id: INVOICE_ID, url: "https://moyasar.com/x" });
    await expect(
      createMoyasarProvider(fetcher).createCheckout({ ...request, mode: "production" }),
    ).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});

describe("reading the truth back from the provider", () => {
  beforeEach(setEnv);
  afterEach(clearEnv);

  test("a paid invoice is reported with its amount, currency and our metadata", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const { fetcher, calls } = fakeFetcher(paidInvoice());
    const state = await createMoyasarProvider(fetcher).fetchState(INVOICE_ID);
    expect(calls[0].url).toBe(`https://api.moyasar.com/v1/invoices/${INVOICE_ID}`);
    expect(state.status).toBe("paid");
    expect(state.amount).toBe(100_000);
    expect(state.currency).toBe("SAR");
    expect(state.metadataPaymentId).toBe(PAYMENT_ROW_ID);
    expect(state.metadataEnvironment).toBe("test");
    expect(state.refunded).toBe(0);
  });

  test("provider vocabulary maps onto ours, and the unknown stays pending", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const expected: Array<[string, string]> = [
      ["paid", "paid"],
      ["captured", "paid"],
      ["failed", "failed"],
      ["canceled", "cancelled"],
      ["voided", "cancelled"],
      ["expired", "expired"],
      ["refunded", "refunded"],
      ["initiated", "pending"],
      ["on_hold", "pending"],
      ["something_new", "pending"],
    ];
    for (const [providerStatus, ours] of expected) {
      const { fetcher } = fakeFetcher(paidInvoice({ status: providerStatus }));
      const state = await createMoyasarProvider(fetcher).fetchState(INVOICE_ID);
      expect(state.status).toBe(ours as typeof state.status);
    }
  });

  test("an id that does not match what we asked for is refused", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const { fetcher } = fakeFetcher(paidInvoice({ id: "99999999-2222-4333-8444-555555555555" }));
    await expect(createMoyasarProvider(fetcher).fetchState(INVOICE_ID)).rejects.toThrow();
  });

  test("a malformed reference never reaches the network", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const { fetcher, calls } = fakeFetcher(paidInvoice());
    await expect(createMoyasarProvider(fetcher).fetchState("../../admin")).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  test("a refund on the inner payment is surfaced", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const { fetcher } = fakeFetcher({
      id: INVOICE_ID,
      status: "paid",
      amount: 100_000,
      currency: "SAR",
      payments: [{ refunded: 100_000, metadata: { payment_id: PAYMENT_ROW_ID, environment: "test" } }],
    });
    const state = await createMoyasarProvider(fetcher).fetchState(INVOICE_ID);
    expect(state.refunded).toBe(100_000);
  });
});

describe("a webhook is a hint, and an unsigned one is not even that", () => {
  beforeEach(setEnv);
  afterEach(clearEnv);

  const event = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
      id: "evt_1",
      type: "payment_paid",
      secret_token: WEBHOOK,
      live: false,
      data: { id: INVOICE_ID, status: "paid", amount: 100_000 },
      ...overrides,
    });

  test("the right secret is accepted and the reference extracted", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const result = createMoyasarProvider().inspectWebhook(event(), new Headers());
    expect(result.signatureValid).toBe(true);
    expect(result.eventId).toBe("evt_1");
    expect(result.eventType).toBe("payment_paid");
    expect(result.providerPaymentId).toBe(INVOICE_ID);
    expect(result.live).toBe(false);
  });

  test("a wrong or missing secret is rejected", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const provider = createMoyasarProvider();
    expect(provider.inspectWebhook(event({ secret_token: "wrong" }), new Headers()).signatureValid).toBe(false);
    expect(provider.inspectWebhook(event({ secret_token: "" }), new Headers()).signatureValid).toBe(false);
    expect(provider.inspectWebhook('{"type":"payment_paid"}', new Headers()).signatureValid).toBe(false);
  });

  test("garbage is not a webhook, and still produces a stable event id", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const provider = createMoyasarProvider();
    const first = provider.inspectWebhook("not json at all", new Headers());
    const second = provider.inspectWebhook("not json at all", new Headers());
    expect(first.signatureValid).toBe(false);
    expect(first.eventId).toBe(second.eventId);
    expect(first.eventId.length).toBeGreaterThan(16);
  });

  test("an event with no id still de-duplicates by body fingerprint", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const provider = createMoyasarProvider();
    const body = event({ id: undefined });
    expect(provider.inspectWebhook(body, new Headers()).eventId).toBe(
      provider.inspectWebhook(body, new Headers()).eventId,
    );
  });

  test("a forged reference that is not a uuid is dropped", async () => {
    const { createMoyasarProvider } = await import("../src/lib/payments/providers/moyasar-provider");
    const result = createMoyasarProvider().inspectWebhook(
      event({ data: { id: "'; drop table course_payments; --" } }),
      new Headers(),
    );
    expect(result.providerPaymentId).toBeNull();
  });
});

describe("commercial mode is derived from the database, never from the browser", () => {
  test("free, paid, quote and the broken in-between", async () => {
    const { commercialMode } = await import("../src/lib/payments/purchase");
    const base = { publish_status: "published", category: "online", is_free: false, request_quote: false, price: 1000 };
    expect(commercialMode(base)).toBe("paid");
    expect(commercialMode({ ...base, is_free: true, price: 0 })).toBe("free");
    expect(commercialMode({ ...base, request_quote: true })).toBe("quote");
    /* سعر صفر وليست مجانية: لا تُباع ولا تُمنح. */
    expect(commercialMode({ ...base, price: 0 })).toBe("unavailable");
    expect(commercialMode({ ...base, publish_status: "draft" })).toBe("unavailable");
  });
});

/* ───────────────── عقود المصدر: ما لا يكشفه تشغيل واحد ───────────────── */

describe("secrets and authority stay where they belong", () => {
  const CLIENT_FILES = [
    "src/components/courses/enroll-card.tsx",
    "src/components/courses/course-details.tsx",
    "src/components/admin/courses/editor/payment-methods.tsx",
    "src/components/admin/courses/editor/pricing-tab.tsx",
  ];

  test("no client component names a payment secret", () => {
    for (const path of CLIENT_FILES) {
      const source = read(path);
      expect(source).not.toContain("MOYASAR_SECRET_KEY");
      expect(source).not.toContain("MOYASAR_WEBHOOK_SECRET");
      expect(source).not.toContain("PAYMENTS_ENCRYPTION_KEY");
      expect(source).not.toContain("NEXT_PUBLIC_MOYASAR");
    }
  });

  test("no client component imports the server-only payment modules", () => {
    for (const path of CLIENT_FILES) {
      const source = code(path);
      expect(source).not.toContain("@/lib/payments/env");
      expect(source).not.toContain("@/lib/payments/purchase");
      expect(source).not.toContain("@/lib/payments/providers/");
    }
  });

  test("every server-side payment module is marked server-only", () => {
    for (const path of [
      "src/lib/payments/env.ts",
      "src/lib/payments/purchase.ts",
      "src/lib/payments/provider.ts",
      "src/lib/payments/providers/moyasar-provider.ts",
      "src/lib/payments/configuration.ts",
      "src/lib/payments/moyasar.ts",
      "src/lib/payments/secrets.ts",
    ]) {
      expect(read(path)).toContain('import "server-only"');
    }
  });

  test("the checkout action accepts a course and a provider — never an amount", () => {
    const action = read("src/app/courses/actions/enrollment.ts");
    expect(action).toContain("startCheckoutAction");
    expect(action).not.toContain("amount");
    expect(action).not.toContain("price");
    expect(action).toContain("getCommunityViewerId");
  });

  test("the amount is computed from the stored price inside the server flow", () => {
    const purchase = read("src/lib/payments/purchase.ts");
    expect(purchase).toContain("quoteCoursePrice(toHalalas(course.price), settings)");
    expect(purchase).toContain("total_amount: quote.gross");
  });

  test("only the database function activates access", () => {
    const purchase = read("src/lib/payments/purchase.ts");
    expect(purchase).toContain('rpc("finalize_course_purchase"');
    /* التفعيل الوحيد خارجها هو التسجيل المجاني، ولا صف دفع فيه. */
    const paidSection = purchase.slice(purchase.indexOf("export async function verifyAndFinalize"));
    expect(paidSection).not.toContain('status: "active"');
  });

  test("the webhook route never finalizes on the body alone", () => {
    const route = code("src/app/api/payments/webhook/[provider]/route.ts");
    expect(route).toContain("inspectWebhook");
    expect(route).toContain("verifyAndFinalize");
    expect(route).not.toContain("course_enrollments");
    expect(route).not.toContain('status: "paid"');
    /* لا توقيع صالح = لا معالجة. */
    expect(route).toContain("if (!inspection.signatureValid) return ack();");
    /* جسم الاستجابة يُبنى لكل طلب: كائن واحد مشترك يُفرغ بعد أول استهلاك. */
    expect(route).toContain("function ack(): NextResponse {");
    expect(route).not.toContain("const ACK =");
  });

  test("the return page reads our own id and nothing else from the url", () => {
    const ret = code("src/app/payment/return/page.tsx");
    expect(ret).toContain("params.p");
    expect(ret).not.toContain("success");
    expect(ret).not.toContain("status=");
  });

  test("the status page refuses to show a payment that is not yours", () => {
    const status = read("src/app/payment/status/[paymentId]/page.tsx");
    expect(status).toContain("data.user_id !== viewerId");
    expect(status).toContain("notFound()");
  });

  test("verification compares every field before finalizing", () => {
    const purchase = read("src/lib/payments/purchase.ts");
    for (const guard of [
      "state.amount !== payment.total_amount",
      "state.currency !== payment.currency",
      "state.metadataPaymentId !== payment.id",
      "state.metadataEnvironment !== payment.environment",
      "state.providerPaymentId !== payment.provider_payment_id",
      "payment.environment !== paymentsMode()",
    ]) {
      expect(purchase).toContain(guard);
    }
  });

  test("the free flow never creates a payment row", () => {
    const purchase = read("src/lib/payments/purchase.ts");
    const free = purchase.slice(
      purchase.indexOf("export async function enrollFree"),
      purchase.indexOf("function absoluteUrl"),
    );
    expect(free).not.toContain("course_payments");
    expect(free).toContain('course.mode !== "free"');
    expect(free).toContain('course.category !== "online"');
  });
});
