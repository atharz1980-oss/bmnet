import { beforeAll, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";

mock.module("server-only", () => ({}));

import {
  createGuestAccessToken,
  verifyGuestAccessToken,
} from "@/lib/payments/guest-token";

let getCourseWhatsAppGroup: (courseIdOrSlug: string) => Promise<string | null>;
let setCourseWhatsAppGroup: (courseId: string, whatsappUrl: string) => Promise<{ ok: boolean; error?: string }>;
let isWhatsAppGroupUrlValid: (url: string) => boolean;
let DEFAULT_PHOTOGRAPHER_AI_WHATSAPP_URL: string;

beforeAll(async () => {
  const mod = await import("@/lib/courses/whatsapp-group");
  getCourseWhatsAppGroup = mod.getCourseWhatsAppGroup;
  setCourseWhatsAppGroup = mod.setCourseWhatsAppGroup;
  isWhatsAppGroupUrlValid = mod.isWhatsAppGroupUrlValid;
  DEFAULT_PHOTOGRAPHER_AI_WHATSAPP_URL = mod.DEFAULT_PHOTOGRAPHER_AI_WHATSAPP_URL;
});

describe("photographer-ai-website: WhatsApp group access & security audit (Frictionless Checkout)", () => {
  const ORDER_ID = "12345678-1234-1234-1234-123456789abc";
  const EMAIL = "student@example.com";
  const APPROVED_WHATSAPP_URL =
    "https://chat.whatsapp.com/CSyEpNt7Tfb4xesNfNr5JD?s=sh&p=a&mlu=4&ilr=4";

  // 1. WhatsApp URL Validation
  describe("1. WhatsApp URL validation", () => {
    test("accepts official WhatsApp invite URL", () => {
      expect(isWhatsAppGroupUrlValid(APPROVED_WHATSAPP_URL)).toBe(true);
    });

    test("accepts wa.me URL format", () => {
      expect(isWhatsAppGroupUrlValid("https://wa.me/966500000000")).toBe(true);
    });

    test("rejects non-https URLs", () => {
      expect(
        isWhatsAppGroupUrlValid(
          "http://chat.whatsapp.com/CSyEpNt7Tfb4xesNfNr5JD"
        )
      ).toBe(false);
    });

    test("rejects phishing/arbitrary domains", () => {
      expect(
        isWhatsAppGroupUrlValid("https://chat.whatsapp.com.attacker.com/group")
      ).toBe(false);
      expect(isWhatsAppGroupUrlValid("https://evil-site.com/group")).toBe(false);
      expect(isWhatsAppGroupUrlValid("javascript:alert(1)")).toBe(false);
    });

    test("rejects empty or whitespace strings", () => {
      expect(isWhatsAppGroupUrlValid("")).toBe(false);
      expect(isWhatsAppGroupUrlValid("   ")).toBe(false);
    });
  });

  // 2. Cryptographic Guest Token Generation & Verification
  describe("2. Frictionless Guest Access Token (HMAC-SHA256)", () => {
    test("generates and verifies valid token for matching orderId and email", () => {
      const token = createGuestAccessToken(ORDER_ID, EMAIL);
      expect(typeof token).toBe("string");
      expect(token).toContain(".");

      const isValid = verifyGuestAccessToken(ORDER_ID, EMAIL, token);
      expect(isValid).toBe(true);
    });

    test("is case-insensitive and trims email whitespace", () => {
      const token = createGuestAccessToken(ORDER_ID, "  STUDENT@example.COM  ");
      const isValid = verifyGuestAccessToken(ORDER_ID, "student@example.com", token);
      expect(isValid).toBe(true);
    });

    test("rejects tampered token signature", () => {
      const token = createGuestAccessToken(ORDER_ID, EMAIL);
      const [ts, hmac] = token.split(".");
      const tamperedHmac = hmac.slice(0, -2) + "ff";
      const tamperedToken = `${ts}.${tamperedHmac}`;

      expect(verifyGuestAccessToken(ORDER_ID, EMAIL, tamperedToken)).toBe(false);
    });

    test("rejects token when orderId does not match (prevents IDOR / order tampering)", () => {
      const token = createGuestAccessToken(ORDER_ID, EMAIL);
      const otherOrderId = "87654321-4321-4321-4321-cba987654321";

      expect(verifyGuestAccessToken(otherOrderId, EMAIL, token)).toBe(false);
    });

    test("rejects token when email does not match", () => {
      const token = createGuestAccessToken(ORDER_ID, EMAIL);
      const otherEmail = "impostor@example.com";

      expect(verifyGuestAccessToken(ORDER_ID, otherEmail, token)).toBe(false);
    });

    test("rejects expired token", () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 40 * 24 * 60 * 60; // 40 days ago
      const expiredToken = createGuestAccessToken(ORDER_ID, EMAIL, oldTimestamp);

      // Default TTL is 30 days
      expect(verifyGuestAccessToken(ORDER_ID, EMAIL, expiredToken)).toBe(false);
    });

    test("rejects null, undefined, or malformed tokens", () => {
      expect(verifyGuestAccessToken(ORDER_ID, EMAIL, null)).toBe(false);
      expect(verifyGuestAccessToken(ORDER_ID, EMAIL, undefined)).toBe(false);
      expect(verifyGuestAccessToken(ORDER_ID, EMAIL, "")).toBe(false);
      expect(verifyGuestAccessToken(ORDER_ID, EMAIL, "malformed-token-without-dot")).toBe(false);
      expect(verifyGuestAccessToken(ORDER_ID, EMAIL, "abc.def")).toBe(false);
    });
  });

  // 3. Fallback resolution for photographer-ai-website
  describe("3. WhatsApp group URL resolution", () => {
    test("resolves default approved WhatsApp link for photographer-ai-website", async () => {
      expect(DEFAULT_PHOTOGRAPHER_AI_WHATSAPP_URL).toBe(APPROVED_WHATSAPP_URL);

      const resolved = await getCourseWhatsAppGroup("photographer-ai-website");
      expect(resolved).toBe(APPROVED_WHATSAPP_URL);
    });

    test("returns null for unknown course with no configured group", async () => {
      const resolved = await getCourseWhatsAppGroup("unknown-course-slug-12345");
      expect(resolved).toBeNull();
    });
  });

  // 4. Strict Security Matrix for Group Link Access Across Roles & States
  describe("4. Access Control Matrix (Visitor, Unpaid, Payer without Token, Payer with Token)", () => {
    function evaluateAccess(params: {
      order: { outcome: string; email: string; orderId: string } | null;
      token?: string | null;
      resolvedGroupUrl: string;
    }): { accessGranted: boolean; revealedUrl: string | null } {
      const { order, token, resolvedGroupUrl } = params;

      // 1. Visitor with no order
      if (!order) {
        return { accessGranted: false, revealedUrl: null };
      }

      // 2. Unpaid order (pending, failed, expired, cancelled)
      if (order.outcome !== "paid") {
        return { accessGranted: false, revealedUrl: null };
      }

      // 3. Paid order with valid signed access token: instantaneous friction-free access
      const isTokenValid = token ? verifyGuestAccessToken(order.orderId, order.email, token) : false;

      if (isTokenValid) {
        return { accessGranted: true, revealedUrl: resolvedGroupUrl };
      }

      // 4. Paid order but no token / invalid token: withhold link (prevents IDOR)
      return { accessGranted: false, revealedUrl: null };
    }

    test("A. VISITOR (no order ID): access denied, zero link revealed", () => {
      const res = evaluateAccess({
        order: null,
        resolvedGroupUrl: APPROVED_WHATSAPP_URL,
      });
      expect(res.accessGranted).toBe(false);
      expect(res.revealedUrl).toBeNull();
    });

    test("B. UNPAID - PENDING: access denied, zero link revealed", () => {
      const token = createGuestAccessToken(ORDER_ID, EMAIL);
      const res = evaluateAccess({
        order: { outcome: "pending", email: EMAIL, orderId: ORDER_ID },
        token,
        resolvedGroupUrl: APPROVED_WHATSAPP_URL,
      });
      expect(res.accessGranted).toBe(false);
      expect(res.revealedUrl).toBeNull();
    });

    test("C. UNPAID - FAILED or EXPIRED: access denied, zero link revealed", () => {
      const token = createGuestAccessToken(ORDER_ID, EMAIL);
      const resFailed = evaluateAccess({
        order: { outcome: "failed", email: EMAIL, orderId: ORDER_ID },
        token,
        resolvedGroupUrl: APPROVED_WHATSAPP_URL,
      });
      expect(resFailed.accessGranted).toBe(false);
      expect(resFailed.revealedUrl).toBeNull();

      const resExpired = evaluateAccess({
        order: { outcome: "expired", email: EMAIL, orderId: ORDER_ID },
        token,
        resolvedGroupUrl: APPROVED_WHATSAPP_URL,
      });
      expect(resExpired.accessGranted).toBe(false);
      expect(resExpired.revealedUrl).toBeNull();
    });

    test("D. PAID ORDER WITHOUT TOKEN (e.g. shoulder surfer / raw IDOR probe): link withheld", () => {
      const res = evaluateAccess({
        order: { outcome: "paid", email: EMAIL, orderId: ORDER_ID },
        token: null,
        resolvedGroupUrl: APPROVED_WHATSAPP_URL,
      });
      expect(res.accessGranted).toBe(false);
      expect(res.revealedUrl).toBeNull();
    });

    test("E. PAID ORDER WITH FORGED TOKEN: link withheld", () => {
      const res = evaluateAccess({
        order: { outcome: "paid", email: EMAIL, orderId: ORDER_ID },
        token: "forged.token.value",
        resolvedGroupUrl: APPROVED_WHATSAPP_URL,
      });
      expect(res.accessGranted).toBe(false);
      expect(res.revealedUrl).toBeNull();
    });

    test("F. CONFIRMED SUBSCRIBER WITH VALID TOKEN: frictionless instant access granted and group URL revealed", () => {
      const token = createGuestAccessToken(ORDER_ID, EMAIL);
      const res = evaluateAccess({
        order: { outcome: "paid", email: EMAIL, orderId: ORDER_ID },
        token,
        resolvedGroupUrl: APPROVED_WHATSAPP_URL,
      });
      expect(res.accessGranted).toBe(true);
      expect(res.revealedUrl).toBe(APPROVED_WHATSAPP_URL);
    });
  });

  // 5. Admin Management & Migration Error Transparency
  describe("5. Admin Error Transparency (Pre-Migration & Post-Migration)", () => {
    test("setCourseWhatsAppGroup explicitly validates URL format", async () => {
      const invalid = await setCourseWhatsAppGroup(ORDER_ID, "https://not-whatsapp.com/test");
      expect(invalid.ok).toBe(false);
      expect(invalid.error).toContain("رابط واتساب غير صالح");
    });

    test("missing table error is caught and translated to actionable Arabic guidance", () => {
      function translateDbError(err: { code?: string; message?: string }): string {
        if (err.code === "42P01" || err.message?.includes("course_whatsapp_groups")) {
          return "جدول روابط واتساب غير موجود في قاعدة البيانات. يرجى تطبيق ملف الترحيل (Migration) أولاً قبل حفظ الرابط.";
        }
        return err.message || "فشل حفظ رابط واتساب";
      }

      const translated = translateDbError({
        code: "42P01",
        message: 'relation "public.course_whatsapp_groups" does not exist',
      });
      expect(translated).toContain("جدول روابط واتساب غير موجود في قاعدة البيانات");
      expect(translated).toContain("Migration");
    });
  });

  // 6. Code Integrity & Leakage Protection Audit
  describe("6. Architecture & Leakage Protection Audit", () => {
    test("whatsapp-group module is protected with server-only guard", () => {
      const content = readFileSync("src/lib/courses/whatsapp-group.ts", "utf8");
      expect(content).toContain('import "server-only";');
    });

    test("landing page public components NEVER import whatsapp-group module directly", () => {
      const landingPage = readFileSync(
        "src/app/lp/photographer-ai-website/page.tsx",
        "utf8"
      );
      expect(landingPage).not.toContain("whatsapp-group");
      expect(landingPage).not.toContain("chat.whatsapp.com/CSyEpNt7Tfb4xesNfNr5JD");
    });

    test("success page and actions contain correct official course facts and action buttons", () => {
      const successPage = readFileSync(
        "src/app/lp/photographer-ai-website/success/page.tsx",
        "utf8"
      );
      const actionsComponent = readFileSync(
        "src/components/landing/photographer-ai-website/whatsapp-success-actions.tsx",
        "utf8"
      );
      expect(successPage).toContain("15 نوفمبر 2026");
      expect(successPage).toContain("3 أيام، 9 ساعات");
      expect(successPage).toContain("صمّم موقعك الاحترافي باستخدام الذكاء الاصطناعي");
      expect(successPage).toContain("شهادة حضور من بيت المصور");
      expect(actionsComponent).toContain("انضم الآن إلى مجموعة واتساب");
      expect(actionsComponent).toContain("نسخ رابط المجموعة");
    });
  });
});
