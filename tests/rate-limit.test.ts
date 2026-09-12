/**
 * حدّ معدل النماذج العامة.
 * contact_messages وcorporate_requests يقبلان INSERT من anon بالتصميم،
 * فالحدّ هو ما يمنع الإغراق الآلي قبل لمس القاعدة.
 */
import { beforeEach, describe, expect, test, mock } from "bun:test";
mock.module("server-only", () => ({}));

const { checkRateLimit, requesterKey, resetRateLimits } = await import("../src/lib/cms/rate-limit");

beforeEach(() => resetRateLimits());

describe("checkRateLimit", () => {
  test("allows exactly up to the limit then refuses", () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      expect(checkRateLimit("k", 3, 60_000, 1_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit("k", 3, 60_000, 1_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  test("keys are independent", () => {
    expect(checkRateLimit("a", 1, 60_000, 0).allowed).toBe(true);
    expect(checkRateLimit("a", 1, 60_000, 0).allowed).toBe(false);
    /* مرسِل آخر لا يتأثر بحدّ الأول. */
    expect(checkRateLimit("b", 1, 60_000, 0).allowed).toBe(true);
  });

  test("the window reopens once it elapses", () => {
    expect(checkRateLimit("w", 1, 1_000, 0).allowed).toBe(true);
    expect(checkRateLimit("w", 1, 1_000, 500).allowed).toBe(false);
    expect(checkRateLimit("w", 1, 1_000, 1_000).allowed).toBe(true);
  });

  test("retryAfter shrinks as the window drains", () => {
    checkRateLimit("r", 1, 10_000, 0);
    expect(checkRateLimit("r", 1, 10_000, 0).retryAfterSeconds).toBe(10);
    expect(checkRateLimit("r", 1, 10_000, 6_000).retryAfterSeconds).toBe(4);
  });

  test("a blocked caller cannot extend its own window by retrying", () => {
    checkRateLimit("x", 1, 1_000, 0);
    /* محاولات مرفوضة لا تزيد العدّاد ولا تؤجل الفتح. */
    checkRateLimit("x", 1, 1_000, 200);
    checkRateLimit("x", 1, 1_000, 400);
    expect(checkRateLimit("x", 1, 1_000, 1_000).allowed).toBe(true);
  });
});

describe("requesterKey", () => {
  const key = (init: Record<string, string>) => requesterKey(new Headers(init), "form");

  test("prefers the first forwarded address", () => {
    expect(key({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })).toBe("form:203.0.113.5");
  });

  test("falls back to x-real-ip", () => {
    expect(key({ "x-real-ip": "203.0.113.9" })).toBe("form:203.0.113.9");
  });

  test("groups header-less callers instead of letting them through unlimited", () => {
    expect(key({})).toBe("form:unknown");
  });

  test("scopes separate the two public forms", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5" });
    expect(requesterKey(headers, "contact-message")).not.toBe(
      requesterKey(headers, "corporate-request"),
    );
  });
});
