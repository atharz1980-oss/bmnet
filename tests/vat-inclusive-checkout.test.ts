/**
 * اختبار ارتدادي: ثبات إعداد «شامل الضريبة» عند حفظ إعدادات الدفع.
 *
 * العطب السابق:
 * كان DepositForm في payments-preparation.tsx يضبط prices_include_tax: false
 * بدلاً من settings.prices_include_tax، فكل حفظ لإعدادات السداد يقلب القيمة
 * في قاعدة البيانات إلى false صامتًا، مما يسقط checkoutReady("moyasar")
 * ويعطّل زر الدفع في صفحة الدورة.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";

/* `server-only` حارس بناء في Next لا حزمة مثبّتة — نُسكته في الاختبار. */
mock.module("server-only", () => ({}));

import { depositSchema, type CommerceSettings, type DepositSettings } from "../src/lib/payments/settings";

const VIEW_PATH = "src/components/admin/settings/payments-preparation.tsx";
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const baseCommerceSettings: CommerceSettings = {
  legal_name: "بيت المصور",
  legal_name_en: "Bayt Almosawer",
  commercial_registration: "7055038298",
  unified_number: "",
  national_short_address: "RRRD2929",
  national_address: "الرياض، حي الملز",
  invoice_email: "billing@baytalmosawer.net",
  invoice_phone: "+966500000000",
  vat_status: "registered",
  vat_number: "314975690900003",
  tax_rate_bps: 1500,
  prices_include_tax: true,
  full_payment_enabled: true,
  deposit_enabled: false,
  deposit_type: "unconfigured",
  deposit_value: null,
  balance_due_days: null,
  policies_approved: true,
};

describe("payment preparation preserves prices_include_tax", () => {
  test("source code initializes prices_include_tax from settings, never hardcoded false", () => {
    const source = read(VIEW_PATH);
    /* لا يجوز أبدًا كتابة prices_include_tax: false في نموذج السداد */
    expect(source).not.toContain("prices_include_tax: false");
    expect(source).toContain("prices_include_tax: settings.prices_include_tax");
  });

  test("existing prices_include_tax=true remains true when deposit settings are loaded and saved", () => {
    const settings = { ...baseCommerceSettings, prices_include_tax: true };

    /* محاكاة إعداد المسودة كما في DepositForm */
    const draft: DepositSettings = {
      prices_include_tax: settings.prices_include_tax,
      full_payment_enabled: settings.full_payment_enabled,
      deposit_enabled: settings.deposit_enabled,
      deposit_type: settings.deposit_type,
      deposit_value: settings.deposit_value,
      balance_due_days: settings.balance_due_days,
      policies_approved: settings.policies_approved,
    };

    expect(draft.prices_include_tax).toBe(true);

    /* محاكاة بناء الحمولة المرسلة إلى saveDepositAction */
    const payload: DepositSettings = {
      ...draft,
      deposit_value: null,
      balance_due_days: null,
    };

    const parsed = depositSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.prices_include_tax).toBe(true);
    }
  });

  test("saving payment preparation settings cannot silently flip prices_include_tax from true to false", () => {
    const settings = { ...baseCommerceSettings, prices_include_tax: true };

    /* حتى مع تعديل خيارات السداد الأخرى، يبقى prices_include_tax صحيحًا */
    const userModifiedPayload: DepositSettings = {
      prices_include_tax: settings.prices_include_tax,
      full_payment_enabled: true,
      deposit_enabled: false,
      deposit_type: "unconfigured",
      deposit_value: null,
      balance_due_days: null,
      policies_approved: true,
    };

    const parsed = depositSchema.parse(userModifiedPayload);
    expect(parsed.prices_include_tax).toBe(true);
    expect(parsed.prices_include_tax).not.toBe(false);
  });
});

describe("checkoutReady respects the VAT-inclusive pricing gate", () => {
  const MOYASAR_KEY = "sk_test_0123456789abcdefghij";
  const WEBHOOK_SECRET = "webhook-secret-0123456789";

  beforeEach(() => {
    process.env.PAYMENTS_MODE = "test";
    process.env.MOYASAR_SECRET_KEY = MOYASAR_KEY;
    process.env.MOYASAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterEach(() => {
    delete process.env.MOYASAR_SECRET_KEY;
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    delete process.env.PAYMENTS_MODE;
  });

  test("checkoutReady('moyasar') passes when VAT is configured, prices_include_tax=true, and env is valid", async () => {
    let currentSettings: CommerceSettings = { ...baseCommerceSettings, prices_include_tax: true };

    mock.module("../src/lib/payments/configuration", () => ({
      loadCommerce: async () => ({ settings: currentSettings, databaseReady: true }),
      loadCredentialMetadata: async () => [],
      loadSecrets: async () => { throw new Error("not needed"); },
    }));

    const { checkoutReady } = await import("../src/lib/payments/purchase");

    /* 1. عند prices_include_tax=true يجتاز البوابة بنجاح */
    currentSettings = { ...baseCommerceSettings, prices_include_tax: true };
    const readyWithTaxInclusive = await checkoutReady("moyasar");
    expect(readyWithTaxInclusive).toBe(true);

    /* 2. عند prices_include_tax=false يسقط ويعيد false */
    currentSettings = { ...baseCommerceSettings, prices_include_tax: false };
    const readyWithTaxExclusive = await checkoutReady("moyasar");
    expect(readyWithTaxExclusive).toBe(false);
  });
});
