import { describe, expect, mock, test } from "bun:test";
mock.module("server-only", () => ({}));
const {
  fetchMoyasarPayment, keyMatchesMode, parseMoyasarPayment,
  paymentMatchesOrder, toHalalas, validPaymentId,
} = await import("../src/lib/payments/moyasar");

const id = "12345678-1234-4234-8234-123456789012";
const key = ["sk", "test", "x".repeat(24)].join("_");
const payment = {
  id, status: "paid", amount: 15000, currency: "SAR", refunded: 0,
  metadata: { order_id: "order-1", environment: "test" },
};
const order = { id: "order-1", amount: 15000, currency: "SAR" as const, mode: "test" as const };

describe("Moyasar payment verification", () => {
  test("money conversion preserves decimals and rejects ambiguous amounts", () => {
    expect(toHalalas("150.25")).toBe(15025);
    expect(toHalalas(1)).toBe(100);
    for (const invalid of ["0", "0.99", "-1", "1.001", "1e3", " 100", "NaN", "Infinity", "100,00"]) {
      expect(() => toHalalas(invalid)).toThrow();
    }
  });
  test("test and live keys cannot be mixed or substituted with publishable keys", () => {
    expect(keyMatchesMode(key, "sk", "test")).toBe(true);
    expect(keyMatchesMode(key, "sk", "production")).toBe(false);
    expect(keyMatchesMode(key, "pk", "test")).toBe(false);
    expect(keyMatchesMode(`${key}\n`, "sk", "test")).toBe(false);
  });
  test("callback identifiers cannot inject URLs or paths", () => {
    expect(validPaymentId(id)).toBe(true);
    for (const input of ["../payments", "https://example.com", `${id}?key=bad`, null]) {
      expect(validPaymentId(input)).toBe(false);
    }
  });
  test("fulfilled payments must match the persisted order and environment", () => {
    expect(paymentMatchesOrder(payment, order)).toBe(true);
    for (const status of ["initiated", "authorized", "failed", "refunded", "captured"]) {
      expect(paymentMatchesOrder({ ...payment, status }, order)).toBe(false);
    }
    expect(paymentMatchesOrder({ ...payment, amount: 14999 }, order)).toBe(false);
    expect(paymentMatchesOrder({ ...payment, currency: "USD" }, order)).toBe(false);
    expect(paymentMatchesOrder({ ...payment, refunded: 1 }, order)).toBe(false);
    expect(paymentMatchesOrder({ ...payment, metadata: { order_id: "someone-else", environment: "test" } }, order)).toBe(false);
    expect(paymentMatchesOrder({ ...payment, metadata: { order_id: "order-1", environment: "production" } }, order)).toBe(false);
  });
  test("malformed provider data cannot approve an order", () => {
    expect(parseMoyasarPayment(payment)).toEqual(payment);
    for (const value of [null, [], { ...payment, amount: "15000" }, { ...payment, refunded: undefined }, { ...payment, metadata: [] }]) {
      expect(() => parseMoyasarPayment(value)).toThrow();
    }
  });
  test("verification uses fixed HTTPS endpoint, Basic auth, and disables caching and redirects", async () => {
    const request = (async (url: string | URL | Request, init?: RequestInit) => {
      expect(url).toBe(`https://api.moyasar.com/v1/payments/${id}`);
      expect(init?.headers).toEqual({ Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` });
      expect(init?.cache).toBe("no-store");
      expect(init?.redirect).toBe("error");
      return Response.json(payment);
    });
    expect(await fetchMoyasarPayment(id, key, "test", request)).toEqual(payment);
  });
  test("API failures and substituted payment IDs fail closed without exposing secrets", async () => {
    await expect(fetchMoyasarPayment(id, key, "test", async () => { throw new Error(key); }))
      .rejects.toThrow("تعذر الاتصال بميسر");
    await expect(fetchMoyasarPayment(id, key, "test", async () => Response.json({ secret: key }, { status: 401 })))
      .rejects.toThrow("تعذر التحقق");
    await expect(fetchMoyasarPayment(id, key, "test", async () => Response.json({ ...payment, id: id.replace("12345678", "87654321") })))
      .rejects.toThrow("لا تطابق");
  });
});
