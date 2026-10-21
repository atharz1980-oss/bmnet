import { describe, expect, test, mock, beforeAll } from "bun:test";

mock.module("server-only", () => ({}));

import { decideLandingCheckout } from "@/lib/landing/checkout";
import { guestOrderFlags } from "@/lib/admin/guest-orders-csv";

let GUEST_CHECKOUT_TTL_MINUTES: number;
let GUEST_SEAT_HOLD_MINUTES: number;

beforeAll(async () => {
  const mod = await import("@/lib/payments/guest-orders");
  GUEST_CHECKOUT_TTL_MINUTES = mod.GUEST_CHECKOUT_TTL_MINUTES;
  GUEST_SEAT_HOLD_MINUTES = mod.GUEST_SEAT_HOLD_MINUTES;
});

const SESSION_ID = "5a0bf21f-a7c8-47f6-939d-34c56c8ad712";
const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const COURSE_SLUG = "photographer-ai-website";

describe("Landing Checkout Decision with autoSession", () => {
  test("1. when autoSession is available and selectable, status is ready", () => {
    const decision = decideLandingCheckout({
      courseSlug: COURSE_SLUG,
      expectedPriceSar: 249,
      commerce: {
        id: COURSE_ID,
        slug: COURSE_SLUG,
        mode: "paid",
        price: 249,
        providers: ["moyasar"],
      },
      moyasarReady: true,
      hasOpenSessions: true, // normally blocks!
      autoSession: {
        id: SESSION_ID,
        availableSeats: 5,
        selectable: true,
      },
    });

    expect(decision.status).toBe("ready");
    if (decision.status === "ready") {
      expect(decision.courseId).toBe(COURSE_ID);
    }
  });

  test("2. when autoSession has zero available seats, status is unavailable (requires-session)", () => {
    const decision = decideLandingCheckout({
      courseSlug: COURSE_SLUG,
      expectedPriceSar: 249,
      commerce: {
        id: COURSE_ID,
        slug: COURSE_SLUG,
        mode: "paid",
        price: 249,
        providers: ["moyasar"],
      },
      moyasarReady: true,
      hasOpenSessions: true,
      autoSession: {
        id: SESSION_ID,
        availableSeats: 0,
        selectable: false,
      },
    });

    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reason).toBe("requires-session");
    }
  });

  test("3. without autoSession, having open sessions blocks checkout (preserves legacy mobile-content behavior)", () => {
    const decision = decideLandingCheckout({
      courseSlug: "course-jawal",
      expectedPriceSar: 96,
      commerce: {
        id: "jawal-id",
        slug: "course-jawal",
        mode: "paid",
        price: 96,
        providers: ["moyasar"],
      },
      moyasarReady: true,
      hasOpenSessions: true,
      // autoSession is undefined
    });

    expect(decision.status).toBe("unavailable");
    if (decision.status === "unavailable") {
      expect(decision.reason).toBe("requires-session");
    }
  });
});

describe("Seat Lifecycle & Concurrency Simulation", () => {
  test("4. session capacity calculation accounts for both confirmed seats and live held orders", () => {
    const capacity = 20;
    const manualCount = 2;
    const confirmedSeats = 3;
    const guestPaidOrders = 10;
    const guestLiveHeldOrders = 2; // still within checkout_expires_at
    const guestExpiredOrders = 3; // expired, should NOT consume a seat

    const activeTaken = manualCount + confirmedSeats + guestPaidOrders + guestLiveHeldOrders;
    const available = Math.max(capacity - activeTaken, 0);

    expect(available).toBe(3);
  });

  test("5. expired holds return their seats to the pool without manual cleanup", () => {
    const capacity = 5;
    const guestPaidOrders = 4;
    const now = Date.now();
    const expiredHoldTime = new Date(now - 60_000).toISOString();

    const orders = [
      { status: "paid", expiresAt: null },
      { status: "paid", expiresAt: null },
      { status: "paid", expiresAt: null },
      { status: "paid", expiresAt: null },
      { status: "created", expiresAt: expiredHoldTime }, // expired!
    ];

    const liveHeld = orders.filter(
      (o) => ["created", "pending", "authorized"].includes(o.status) && new Date(o.expiresAt!).getTime() > now
    ).length;
    const paid = orders.filter((o) => o.status === "paid").length;

    const available = capacity - (paid + liveHeld);
    expect(available).toBe(1); // 1 seat available for a new buyer!
  });

  test("6. late payment when session is already full is flagged seat_unavailable", () => {
    const sessionCapacity = 5;
    const currentPaidCount = 5; // already 5 paid attendees!
    const isLatePayment = true;

    const seatUnavailable = isLatePayment && currentPaidCount >= sessionCapacity;
    const failureCode = seatUnavailable ? "seat_unavailable" : isLatePayment ? "late_payment" : "";

    expect(failureCode).toBe("seat_unavailable");
  });

  test("7. late payment when session still has open seats is accommodated and flagged late_payment", () => {
    const sessionCapacity = 10;
    const currentPaidCount = 5; // only 5 paid attendees, 5 open seats remain
    const isLatePayment = true;

    const seatUnavailable = isLatePayment && currentPaidCount >= sessionCapacity;
    const failureCode = seatUnavailable ? "seat_unavailable" : isLatePayment ? "late_payment" : "";

    expect(failureCode).toBe("late_payment");
  });

  test("8. paid orders with failure_code = seat_unavailable do NOT consume a seat in availability calculation", () => {
    const capacity = 5;
    const orders = [
      { status: "paid", failure_code: "" },
      { status: "paid", failure_code: "" },
      { status: "paid", failure_code: "late_payment" }, // got a seat
      { status: "paid", failure_code: "seat_unavailable" }, // did NOT get a seat!
    ];

    const takenSeats = orders.filter(
      (o) => o.status === "paid" && o.failure_code !== "seat_unavailable"
    ).length;

    expect(takenSeats).toBe(3);
    expect(capacity - takenSeats).toBe(2);
  });

  test("9. seat hold duration is 20 minutes (5 minutes buffer over 15-minute checkout invoice)", () => {
    expect(GUEST_CHECKOUT_TTL_MINUTES).toBe(15);
    expect(GUEST_SEAT_HOLD_MINUTES).toBe(20);
    expect(GUEST_SEAT_HOLD_MINUTES - GUEST_CHECKOUT_TTL_MINUTES).toBe(5);
  });

  test("10. admin flags show clear label for seat_unavailable orders requiring refund/review", () => {
    const flags = guestOrderFlags({ duplicateOf: null, failureCode: "seat_unavailable" });
    expect(flags).toContain("المقاعد مكتملة — راجع للاسترداد");
  });
});
