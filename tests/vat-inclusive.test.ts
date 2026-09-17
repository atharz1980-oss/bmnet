/**
 * الضريبة داخل السعر — الحساب الذي يُخصم به المال.
 *
 * الثابت الوحيد الذي لا يجوز كسره: `net + vat = gross` حرفيًا، وأن يكون
 * `gross` هو السعر المعروض نفسه بالهللات. كل اختبار هنا يتحقق من ذلك
 * بأعداد صحيحة، بلا أي مقارنة تقريبية.
 */

import { describe, expect, test } from "bun:test";

import {
  MAX_CHARGE_HALALAS,
  MIN_CHARGE_HALALAS,
  formatHalalas,
  splitVatInclusive,
  toHalalas,
} from "../src/lib/payments/money";
import { quoteCoursePrice, type CommerceSettings } from "../src/lib/payments/settings";

const VAT = 1500;

describe("the displayed price is the charged price", () => {
  const cases: Array<[label: string, riyals: number, gross: number, net: number, vat: number]> = [
    ["100 SAR", 100, 10_000, 8_696, 1_304],
    ["450 SAR", 450, 45_000, 39_130, 5_870],
    ["1,000 SAR", 1000, 100_000, 86_957, 13_043],
    ["2,500 SAR", 2500, 250_000, 217_391, 32_609],
  ];

  for (const [label, riyals, gross, net, vat] of cases) {
    test(`${label} splits into a net and a vat that add back to the total`, () => {
      expect(toHalalas(riyals)).toBe(gross);
      const result = splitVatInclusive(gross, VAT);
      expect(result.gross).toBe(gross);
      expect(result.net).toBe(net);
      expect(result.vat).toBe(vat);
      expect(result.net + result.vat).toBe(gross);
      /* ما يصل ميسر هو الإجمالي المعروض بالهللات، لا الصافي. */
      expect(result.gross).toBe(riyals * 100);
    });
  }

  test("the invariant holds for every riyal from 1 to 3000", () => {
    for (let riyals = 1; riyals <= 3000; riyals += 1) {
      const gross = riyals * 100;
      const { net, vat } = splitVatInclusive(gross, VAT);
      expect(net + vat).toBe(gross);
      expect(net).toBeGreaterThan(0);
      expect(vat).toBeGreaterThanOrEqual(0);
    }
  });

  test("and for awkward halala amounts too", () => {
    for (const gross of [100, 101, 137, 999, 1_001, 12_345, 99_999, 123_457, 999_999_999]) {
      const { net, vat } = splitVatInclusive(gross, VAT);
      expect(net + vat).toBe(gross);
    }
  });

  test("vat is never more than the rate implies, and never negative", () => {
    for (const gross of [10_000, 45_000, 100_000, 250_000]) {
      const { net, vat } = splitVatInclusive(gross, VAT);
      expect(vat).toBeGreaterThan(0);
      expect(vat).toBeLessThan(gross);
      /* الضريبة = 15% من الصافي، بفارق هلل واحد للتقريب لا أكثر. */
      expect(Math.abs(vat * 10000 - net * VAT)).toBeLessThanOrEqual(10000);
    }
  });
});

describe("rounding is deterministic integer arithmetic", () => {
  test("an exact half rounds up, and still sums back to the total", () => {
    /* نسبة 100% تجعل الباقي نصفًا بالضبط عند الإجمالي الفردي. */
    const { net, vat } = splitVatInclusive(300, 10000);
    expect(net).toBe(150);
    expect(vat).toBe(150);
    const odd = splitVatInclusive(301, 10000);
    expect(odd.net).toBe(151);
    expect(odd.vat).toBe(150);
    expect(odd.net + odd.vat).toBe(301);
  });

  test("a zero rate means no tax and no drift", () => {
    const result = splitVatInclusive(45_000, 0);
    expect(result.net).toBe(45_000);
    expect(result.vat).toBe(0);
  });

  test("the result is always integers", () => {
    for (const gross of [10_000, 45_001, 250_003]) {
      const { net, vat } = splitVatInclusive(gross, VAT);
      expect(Number.isSafeInteger(net)).toBe(true);
      expect(Number.isSafeInteger(vat)).toBe(true);
    }
  });

  test("it refuses amounts it cannot charge", () => {
    expect(() => splitVatInclusive(99, VAT)).toThrow();
    expect(() => splitVatInclusive(MAX_CHARGE_HALALAS + 1, VAT)).toThrow();
    expect(() => splitVatInclusive(100.5, VAT)).toThrow();
    expect(() => splitVatInclusive(10_000, 10001)).toThrow();
    expect(() => splitVatInclusive(10_000, -1)).toThrow();
    expect(MIN_CHARGE_HALALAS).toBe(100);
  });
});

describe("prices convert to halalas without floating point", () => {
  test("decimal riyals convert exactly", () => {
    expect(toHalalas("150.25")).toBe(15_025);
    expect(toHalalas("1000")).toBe(100_000);
    expect(toHalalas(450)).toBe(45_000);
    expect(toHalalas("99.9")).toBe(9_990);
  });

  test("it rejects anything it would have to guess at", () => {
    for (const invalid of ["1,000", "1e3", "10.005", "-5", "", "abc", "0.99", " 100"]) {
      expect(() => toHalalas(invalid)).toThrow();
    }
  });

  test("halalas format back to a two-decimal string", () => {
    expect(formatHalalas(100_000)).toBe("1000.00");
    expect(formatHalalas(8_696)).toBe("86.96");
    expect(formatHalalas(5)).toBe("0.05");
  });
});

describe("the commerce quote refuses to guess", () => {
  const base: CommerceSettings = {
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
    tax_rate_bps: VAT,
    prices_include_tax: true,
    full_payment_enabled: true,
    deposit_enabled: false,
    deposit_type: "unconfigured",
    deposit_value: null,
    balance_due_days: null,
    policies_approved: true,
  };

  test("a configured registered business quotes an inclusive price", () => {
    const quote = quoteCoursePrice(100_000, base);
    expect(quote.gross).toBe(100_000);
    expect(quote.net).toBe(86_957);
    expect(quote.vat).toBe(13_043);
    expect(quote.currency).toBe("SAR");
  });

  test("an unconfigured tax status blocks the quote entirely", () => {
    expect(() =>
      quoteCoursePrice(100_000, { ...base, vat_status: "unconfigured", vat_number: "", tax_rate_bps: null }),
    ).toThrow();
  });

  test("a business that is not registered charges the price with no tax", () => {
    const quote = quoteCoursePrice(100_000, {
      ...base,
      vat_status: "not_registered",
      vat_number: "",
      tax_rate_bps: 0,
    });
    expect(quote.net).toBe(100_000);
    expect(quote.vat).toBe(0);
  });

  test("exclusive pricing is refused — the displayed price must be the charged price", () => {
    expect(() => quoteCoursePrice(100_000, { ...base, prices_include_tax: false })).toThrow();
  });

  test("legacy deposit configuration cannot change the amount", () => {
    const withLegacyDeposit = quoteCoursePrice(100_000, {
      ...base,
      deposit_enabled: true,
      deposit_type: "fixed",
      deposit_value: 30_000,
      balance_due_days: 14,
    });
    expect(withLegacyDeposit.gross).toBe(100_000);
    expect(withLegacyDeposit.net + withLegacyDeposit.vat).toBe(100_000);
  });
});
