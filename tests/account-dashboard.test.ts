import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";

// Mock Supabase server client
const mockUserId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";

describe("Account / Student Dashboard V1 Architecture & Logic", () => {
  test("guest redirect contract: /account redirects unauthenticated visitor to login with next=/account", () => {
    const accountPageCode = readFileSync("src/app/account/page.tsx", "utf8");
    expect(accountPageCode).toContain('redirect("/community/login?next=%2Faccount")');
    expect(accountPageCode).not.toContain('redirect("/community/profile")');
  });

  test("staff redirect contract: /account redirects staff directly to /admin", () => {
    const accountPageCode = readFileSync("src/app/account/page.tsx", "utf8");
    expect(accountPageCode).toContain('const staff = await getAdminSession()');
    expect(accountPageCode).toContain('if (staff) redirect("/admin")');
  });

  test("community profile is NOT required: normal user without community_profiles reaches AccountDashboard", () => {
    const accountPageCode = readFileSync("src/app/account/page.tsx", "utf8");
    // Verify viewerId is checked, but community member is not forced
    expect(accountPageCode).toContain("const viewerId = await getCommunityViewerId()");
    expect(accountPageCode).toContain("const data = await loadAccountDashboard(viewerId");
    expect(accountPageCode).toContain("<AccountDashboard data={data} />");
  });

  test("navbar account link targets /account for signed-in users", () => {
    const accountLinkCode = readFileSync("src/components/layout/account-link.tsx", "utf8");
    expect(accountLinkCode).toContain('const href = signedIn ? "/account" : communityLoginHref(pathname)');
    expect(accountLinkCode).toContain('const label = signedIn ? "حسابي" : "تسجيل الدخول"');
  });

  test("post-payment success view includes a direct CTA to /account", () => {
    const paymentStatusPageCode = readFileSync("src/app/payment/status/[paymentId]/page.tsx", "utf8");
    expect(paymentStatusPageCode).toContain('href="/account"');
    expect(paymentStatusPageCode).toContain("الذهاب إلى حسابي");
  });

  test("no fake progress or certificate tracking is included in account types or dashboard", () => {
    const typesCode = readFileSync("src/lib/account/types.ts", "utf8");
    expect(typesCode).not.toContain("progressPercentage");
    expect(typesCode).not.toContain("completionPercentage");
    expect(typesCode).not.toContain("certificateUrl");
    expect(typesCode).not.toContain("resumeCheckpoint");

    const dashboardCode = readFileSync("src/components/account/account-dashboard.tsx", "utf8");
    expect(dashboardCode).not.toContain("certificate");
    expect(dashboardCode).not.toContain("شهادة");
    expect(dashboardCode).not.toContain("نسبة الإنجاز");
  });

  test("payments history exposes ONLY safe student-facing fields", () => {
    const loaderCode = readFileSync("src/lib/account/loader.ts", "utf8");
    // Verifies the query does not ask for internal/sensitive fields
    expect(loaderCode).toContain('.select("id, course_id, provider, status, total_amount, currency, created_at, paid_at")');
    expect(loaderCode).not.toContain("idempotency_key");
    expect(loaderCode).not.toContain("raw_response");
    expect(loaderCode).not.toContain("secret_token");
    expect(loaderCode).not.toContain("webhook_signature");
  });

  test("safe user isolation: loader filters by user_id = userId for enrollments, seats, and payments", () => {
    const loaderCode = readFileSync("src/lib/account/loader.ts", "utf8");
    expect(loaderCode).toContain('.from("course_enrollments")');
    expect(loaderCode).toContain('.eq("user_id", userId)');
    expect(loaderCode).toContain('.from("course_session_seats")');
    expect(loaderCode).toContain('.eq("user_id", userId)');
    expect(loaderCode).toContain('.from("course_payments")');
    expect(loaderCode).toContain('.eq("user_id", userId)');
  });

  test("empty state exists when user has no activity", () => {
    const dashboardCode = readFileSync("src/components/account/account-dashboard.tsx", "utf8");
    expect(dashboardCode).toContain("!hasAnyActivity");
    expect(dashboardCode).toContain("مرحباً بك في بيت المصور");
    expect(dashboardCode).toContain("لم تسجل في أي دورة تدريبية بعد");
    expect(dashboardCode).toContain('href="/courses"');
  });

  test("confirmed physical session displays clear confirmation status and batch name", () => {
    const dashboardCode = readFileSync("src/components/account/account-dashboard.tsx", "utf8");
    expect(dashboardCode).toContain("الحجز مؤكد");
    expect(dashboardCode).toContain("الموعد التدريبي القادم");
    expect(dashboardCode).toContain("nearestUpcomingSession");
  });
});
