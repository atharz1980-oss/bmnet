import { describe, expect, test } from "bun:test";

import { isDisplayableSocialHref, socialHref } from "../src/lib/cms/social";
import { isSocialPlatform, SOCIAL_PLATFORMS } from "../src/types";
import { companySchema, defaultCommerce, depositSchema } from "../src/lib/payments/settings";

const company = {
  legal_name: "بيت المصور",
  legal_name_en: "Bayt Almosawer",
  commercial_registration: "7055038298",
  unified_number: "",
  national_short_address: "",
  national_address: "",
  invoice_email: "",
  invoice_phone: "",
  vat_status: "not_registered" as const,
  vat_number: "",
  tax_rate_bps: 0,
};

const deposit = {
  prices_include_tax: false as const,
  full_payment_enabled: true,
  deposit_enabled: false,
  deposit_type: "unconfigured" as const,
  deposit_value: null,
  balance_due_days: null,
  policies_approved: false,
};

describe("social link normalisation", () => {
  test("keeps only http and https for ordinary platforms", () => {
    expect(socialHref("instagram", "https://instagram.com/bm")).toBe("https://instagram.com/bm");
    expect(socialHref("instagram", "http://instagram.com/bm")).toBe("http://instagram.com/bm");
    expect(socialHref("instagram", "javascript:alert(1)")).toBeNull();
    expect(socialHref("instagram", "data:text/html,<script>")).toBeNull();
    expect(socialHref("website", "instagram.com/bm")).toBeNull();
    expect(socialHref("x", "  ")).toBeNull();
  });

  test("builds wa.me from digits and rejects short or non numeric input", () => {
    expect(socialHref("whatsapp", "+966 55 123 4567")).toBe("https://wa.me/966551234567");
    expect(socialHref("whatsapp", "12345")).toBeNull();
    expect(socialHref("whatsapp", "abc")).toBeNull();
  });

  test("builds mailto once and rejects malformed addresses", () => {
    expect(socialHref("email", "info@example.com")).toBe("mailto:info@example.com");
    expect(socialHref("email", "mailto:info@example.com")).toBe("mailto:info@example.com");
    expect(socialHref("email", "info@example")).toBeNull();
  });

  test("platform guard accepts the published list only", () => {
    for (const platform of SOCIAL_PLATFORMS) expect(isSocialPlatform(platform)).toBe(true);
    expect(isSocialPlatform("myspace")).toBe(false);
    expect(isSocialPlatform("")).toBe(false);
  });
});

describe("company identity schema", () => {
  test("accepts the approved identity", () => {
    expect(companySchema.safeParse(company).success).toBe(true);
  });

  test("registered status demands both a rate and a fifteen digit number", () => {
    expect(companySchema.safeParse({ ...company, vat_status: "registered", tax_rate_bps: 1500 }).success).toBe(false);
    expect(companySchema.safeParse({ ...company, vat_status: "registered", vat_number: "3".repeat(15), tax_rate_bps: null }).success).toBe(false);
    expect(companySchema.safeParse({ ...company, vat_status: "registered", vat_number: "3".repeat(15), tax_rate_bps: 1500 }).success).toBe(true);
  });

  test("an unregistered establishment cannot carry a tax rate", () => {
    expect(companySchema.safeParse({ ...company, tax_rate_bps: 1500 }).success).toBe(false);
  });

  test("optional identity fields are empty or exactly formatted", () => {
    expect(companySchema.safeParse({ ...company, unified_number: "7001234567" }).success).toBe(true);
    expect(companySchema.safeParse({ ...company, unified_number: "1001234567" }).success).toBe(false);
    expect(companySchema.safeParse({ ...company, national_short_address: "RRRD2929" }).success).toBe(true);
    expect(companySchema.safeParse({ ...company, national_short_address: "rrrd2929" }).success).toBe(false);
    expect(companySchema.safeParse({ ...company, invoice_phone: "+966551234567" }).success).toBe(true);
    expect(companySchema.safeParse({ ...company, invoice_phone: "0551234567" }).success).toBe(false);
  });

  test("commercial registration stays ten digits", () => {
    expect(companySchema.safeParse({ ...company, commercial_registration: "705503829" }).success).toBe(false);
  });

  test("the shipped default is not yet an approved tax configuration", () => {
    expect(defaultCommerce.vat_status).toBe("unconfigured");
    expect(defaultCommerce.tax_rate_bps).toBeNull();
    expect(defaultCommerce.policies_approved).toBe(false);
  });
});

describe("deposit schema", () => {
  test("at least one payment method must stay enabled", () => {
    expect(depositSchema.safeParse(deposit).success).toBe(true);
    expect(depositSchema.safeParse({ ...deposit, full_payment_enabled: false }).success).toBe(false);
  });

  test("a percentage deposit cannot exceed one hundred percent", () => {
    const percentage = { ...deposit, deposit_enabled: true, deposit_type: "percentage" as const, balance_due_days: 3 };
    expect(depositSchema.safeParse({ ...percentage, deposit_value: 10000 }).success).toBe(true);
    expect(depositSchema.safeParse({ ...percentage, deposit_value: 10001 }).success).toBe(false);
  });

  test("prices stay exclusive of tax", () => {
    expect(depositSchema.safeParse({ ...deposit, prices_include_tax: true }).success).toBe(false);
  });
});

describe("social rows mapping", () => {
  test("orders by sort order and drops unknown platforms", async () => {
    const { socialFromDb } = await import("../src/lib/cms/mappers");
    const mapped = socialFromDb([
      { platform: "tiktok", url: "https://tiktok.com/@bm", label: "تيك توك", enabled: true, sort_order: 2 },
      { platform: "myspace", url: "https://myspace.com/bm", label: "قديمة", enabled: true, sort_order: 1 },
      { platform: "instagram", url: "https://instagram.com/bm", label: "إنستغرام", enabled: false, sort_order: 1 },
    ]);
    expect(mapped.map((link) => link.platform)).toEqual(["instagram", "tiktok"]);
    expect(mapped[0].enabled).toBe(false);
  });
});

describe("stored href is re-checked before it reaches a page", () => {
  test("accepts what socialHref produces", () => {
    for (const value of [
      socialHref("instagram", "https://instagram.com/bm"),
      socialHref("whatsapp", "+966551234567"),
      socialHref("email", "info@example.com"),
    ]) {
      expect(value).not.toBeNull();
      expect(isDisplayableSocialHref(value as string)).toBe(true);
    }
  });

  test("rejects a row written around the action", () => {
    /* عميل خدمة أو SQL مباشر أو استعادة نسخة قد تضع أي نص. */
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,<script>",
      "  ",
      "instagram.com/bm",
      "mailto:not-an-email",
      "vbscript:msgbox(1)",
    ]) {
      expect(isDisplayableSocialHref(bad)).toBe(false);
    }
  });
});
