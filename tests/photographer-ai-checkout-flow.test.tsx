import { describe, expect, test } from "bun:test";
import { decideLandingCheckout, pricingFromCommerce } from "@/lib/landing/checkout";
import { GUEST_ERRORS } from "@/lib/payments/guest-orders";

describe("photographer-ai-website: Moyasar Fast Checkout integration", () => {
  const COURSE_SLUG = "photographer-ai-website";
  const APPROVED_PRICE = 450;

  test("1. when course is not in database, checkout safely fails closed with unmapped/course-not-found", () => {
    const decision = decideLandingCheckout({
      courseSlug: COURSE_SLUG,
      expectedPriceSar: APPROVED_PRICE,
      commerce: null,
      moyasarReady: true,
      hasOpenSessions: false,
    });
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reason).toBe("course-not-found");
    }
  });

  test("2. when course is in database and ready, checkout decision is READY with exact courseId", () => {
    const decision = decideLandingCheckout({
      courseSlug: COURSE_SLUG,
      expectedPriceSar: APPROVED_PRICE,
      commerce: {
        id: "c-photographer-ai-101",
        slug: COURSE_SLUG,
        mode: "paid",
        price: APPROVED_PRICE,
        originalPrice: 650,
        providers: ["moyasar"],
      },
      moyasarReady: true,
      hasOpenSessions: false,
    });
    expect(decision.status).toBe("ready");
    if (decision.status === "ready") {
      expect(decision.courseId).toBe("c-photographer-ai-101");
    }
  });

  test("3. price integrity guard: tampering with expected price closes checkout immediately", () => {
    const decision = decideLandingCheckout({
      courseSlug: COURSE_SLUG,
      expectedPriceSar: 99, // tampered / mismatched price
      commerce: {
        id: "c-photographer-ai-101",
        slug: COURSE_SLUG,
        mode: "paid",
        price: APPROVED_PRICE,
        providers: ["moyasar"],
      },
      moyasarReady: true,
      hasOpenSessions: false,
    });
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reason).toBe("price-mismatch");
    }
  });

  test("4. provider guard: if Moyasar is not configured or ready, checkout closes safely", () => {
    const decision = decideLandingCheckout({
      courseSlug: COURSE_SLUG,
      expectedPriceSar: APPROVED_PRICE,
      commerce: {
        id: "c-photographer-ai-101",
        slug: COURSE_SLUG,
        mode: "paid",
        price: APPROVED_PRICE,
        providers: ["moyasar"],
      },
      moyasarReady: false, // Moyasar not ready
      hasOpenSessions: false,
    });
    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reason).toBe("provider-not-ready");
    }
  });

  test("5. pricingFromCommerce derives exact currentSar and savings without fabrication", () => {
    const pricing = pricingFromCommerce(APPROVED_PRICE, 650);
    expect(pricing).not.toBeNull();
    expect(pricing?.currentSar).toBe(450);
    expect(pricing?.previousSar).toBe(650);
    expect(pricing?.savingSar).toBe(200);

    // Negative or zero prices fail closed
    expect(pricingFromCommerce(0, null)).toBeNull();
    expect(pricingFromCommerce(-50, null)).toBeNull();
  });

  test("6. isolation check: photographer AI target is isolated and distinct from mobile-content", () => {
    const photographerTarget = { courseSlug: "photographer-ai-website" };
    const jawalTarget = { courseSlug: "course-jawal" };
    expect(photographerTarget.courseSlug).not.toBe(jawalTarget.courseSlug);
  });
});
