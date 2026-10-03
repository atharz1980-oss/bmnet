import { beforeEach, describe, expect, mock, test } from "bun:test";

/*
 * إجراء زر الدفع في صفحة الهبوط — سلوكه بمعزل عن الشبكة والقاعدة:
 * يعيد التحقق، ثم يفوّض `startCheckoutAction` القائم بميسّر وبلا موعد،
 * ويحوّل إلى صفحة الدفع أو إلى الدخول مع العودة إلى الصفحة نفسها.
 */

type Decision = { status: "ready"; courseId: string } | { status: "unavailable"; reason: string };
type Step = { ok: true; data: { kind: string; href: string } } | { ok: false; error: string };

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
let decision: Decision = { status: "ready", courseId: COURSE_ID };
let step: Step = { ok: true, data: { kind: "checkout", href: "https://checkout.moyasar.com/invoices/x" } };
const calls: unknown[][] = [];

class Redirect extends Error {
  constructor(public readonly to: string) {
    super(`redirect:${to}`);
  }
}

mock.module("server-only", () => ({}));
mock.module("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));
mock.module("@/lib/landing/checkout-target", () => ({
  resolveLandingCheckout: async () => decision,
}));
mock.module("@/app/courses/actions/enrollment", () => ({
  startCheckoutAction: async (...args: unknown[]) => {
    calls.push(args);
    return step;
  },
}));

const { landingCheckoutAction } = await import("@/app/lp/mobile-content/actions");

async function run(fields: Record<string, string> = {}): Promise<{ redirect?: string; error?: string | null }> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  try {
    const state = await landingCheckoutAction({ error: null }, form);
    return { error: state.error };
  } catch (error) {
    if (error instanceof Redirect) return { redirect: error.to };
    throw error;
  }
}

beforeEach(() => {
  decision = { status: "ready", courseId: COURSE_ID };
  step = { ok: true, data: { kind: "checkout", href: "https://checkout.moyasar.com/invoices/x" } };
  calls.length = 0;
});

describe("landingCheckoutAction", () => {
  test("ready: delegates to startCheckoutAction(courseId, 'moyasar') with no session, then redirects to the hosted page", async () => {
    const result = await run();
    expect(calls).toEqual([[COURSE_ID, "moyasar"]]);
    expect(result.redirect).toBe("https://checkout.moyasar.com/invoices/x");
  });

  test("fail-closed: unavailable decision never reaches the checkout", async () => {
    decision = { status: "unavailable", reason: "price-mismatch" };
    const result = await run();
    expect(calls.length).toBe(0);
    expect(result.error).toBe("الدفع الإلكتروني لهذه الورشة غير متاح حاليًا.");
  });

  test("guest: sent to login with a safe return to the landing page that resumes checkout and keeps UTM", async () => {
    step = { ok: true, data: { kind: "sign-in", href: "/community/login?next=%2Fcourses%2Fx" } };
    const result = await run({ utm_source: "ig", utm_campaign: "oct", evil: "1" });
    expect(result.redirect).toBeDefined();
    const url = new URL(result.redirect!, "https://x.invalid");
    expect(url.pathname).toBe("/community/login");
    expect(url.searchParams.get("next")).toBe("/lp/mobile-content?resume=checkout&utm_source=ig&utm_campaign=oct");
  });

  test("existing-flow errors are surfaced as-is (e.g. already enrolled)", async () => {
    step = { ok: false, error: "أنت مسجّل في هذه الدورة بالفعل." };
    const result = await run();
    expect(result.error).toBe("أنت مسجّل في هذه الدورة بالفعل.");
  });

  test("ignores any client-supplied course, amount, or provider fields", async () => {
    await run({ courseId: "22222222-2222-4222-8222-222222222222", amount: "1", provider: "tabby" });
    expect(calls).toEqual([[COURSE_ID, "moyasar"]]);
  });
});
