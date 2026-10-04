import { describe, expect, test } from "bun:test";

import {
  formatSaudiMobile,
  maskEmail,
  normalizeEmail,
  normalizeName,
  normalizeSaudiMobile,
  validateGuestContact,
} from "@/lib/landing/guest-validation";

describe("Saudi mobile normalization (server-authoritative)", () => {
  test.each([
    ["0512345678", "966512345678"],
    ["512345678", "966512345678"],
    ["+966512345678", "966512345678"],
    ["966512345678", "966512345678"],
    ["00966512345678", "966512345678"],
    ["051 234 5678", "966512345678"],
    ["051-234-5678", "966512345678"],
    ["(051) 2345678", "966512345678"],
    ["+966 51 234 5678", "966512345678"],
    ["٠٥١٢٣٤٥٦٧٨", "966512345678"],
    ["۰۵۱۲۳۴۵۶۷۸", "966512345678"],
    ["‎0512345678", "966512345678"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeSaudiMobile(input)).toBe(expected);
  });

  test.each([
    "",
    "0412345678", // landline-style prefix, not 05
    "05123456789", // too long
    "051234567", // too short
    "+971512345678", // UAE
    "+201012345678", // Egypt
    "966412345678",
    "05x2345678",
    "abc",
    "+",
  ])("rejects %s", (input) => {
    expect(normalizeSaudiMobile(input)).toBeNull();
  });

  test("display format", () => {
    expect(formatSaudiMobile("966512345678")).toBe("+966 51 234 5678");
  });
});

describe("email and name", () => {
  test("email is trimmed and lowercased; invalid rejected; no verification required", () => {
    expect(normalizeEmail("  Noura@Example.COM ")).toBe("noura@example.com");
    for (const bad of ["", "a", "a@b", "a@b.c", "a b@c.com", "@c.com", `${"a".repeat(250)}@x.com`]) {
      expect(normalizeEmail(bad)).toBeNull();
    }
  });

  test("masked email for display", () => {
    expect(maskEmail("noura@example.com")).toBe("n***@example.com");
  });

  test("name is collapsed and bounded; markup and links rejected", () => {
    expect(normalizeName("  نورة    أحمد  ")).toBe("نورة أحمد");
    expect(normalizeName("Al-Qahtani O'Neil")).toBe("Al-Qahtani O'Neil");
    for (const bad of ["", "a", "x".repeat(81), "<script>", "http://spam.example", "www.spam.com", "a\u0000b"]) {
      expect(normalizeName(bad)).toBeNull();
    }
  });

  test("validateGuestContact returns per-field errors and ignores non-string input", () => {
    const result = validateGuestContact({ name: ["x"], phone: 512345678, email: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["email", "name", "phone"]);
    const ok = validateGuestContact({ name: "نورة أحمد", phone: "0512345678", email: "N@E.co" });
    expect(ok).toEqual({ ok: true, contact: { name: "نورة أحمد", phone: "966512345678", email: "n@e.co" } });
  });
});
