import { describe, expect, mock, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import type { LandingContact } from "@/components/landing/mobile-content/landing-page";
import type { LandingCheckout } from "@/lib/landing/checkout";

/* زر الدفع يستورد إجراء الخادم، وسلسلته تمر بوحدات server-only. */
mock.module("server-only", () => ({}));

const { isChromelessPath } = await import("@/components/layout/chrome-gate");
const { MobileContentLanding } = await import("@/components/landing/mobile-content/landing-page");
const { EVENT_START_ISO, curriculum, landingCheckoutTarget } = await import("@/data/landing/mobile-content");
const { siteConfig } = await import("@/data/site");
const { pickCampaignParams, withCampaignParams } = await import("@/lib/landing/campaign");
const { decideLandingCheckout, toLandingView } = await import("@/lib/landing/checkout");
const { landingInstagramHref, landingWhatsappHref } = await import("@/lib/landing/contact");
const { countdownParts } = await import("@/lib/landing/countdown");

/*
 * صفحة الهبوط /lp/mobile-content — عزل عن واجهة الموقع، محتوى معتمد،
 * عداد من الموعد الفعلي، وزر دفع يعيد استخدام تدفق الشراء القائم فقط.
 */

const READY: LandingCheckout = { status: "ready" };
const CLOSED: LandingCheckout = { status: "unavailable", reason: "unmapped" };
const WA = "https://wa.me/966500000000";
const NO_CONTACT: LandingContact = { whatsappHref: null, instagramHref: null };

function render(checkout: LandingCheckout, contact: LandingContact = NO_CONTACT): string {
  return renderToStaticMarkup(<MobileContentLanding checkout={checkout} contact={contact} />);
}

/** نص مرئي فقط — بلا وسوم. */
function text(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const LANDING_FILES = [
  "src/app/lp/mobile-content/page.tsx",
  "src/app/lp/mobile-content/actions.ts",
  ...walk("src/components/landing/mobile-content"),
  ...walk("src/lib/landing"),
  "src/data/landing/mobile-content.ts",
];

describe("route and isolation", () => {
  test("/lp/mobile-content exists as an App Router page", () => {
    const source = readFileSync("src/app/lp/mobile-content/page.tsx", "utf8");
    expect(source).toContain("export default async function MobileContentLandingPage");
    expect(source).toContain("export const metadata");
  });

  test("ChromeGate removes site chrome under /lp only", () => {
    expect(isChromelessPath("/lp/mobile-content")).toBe(true);
    expect(isChromelessPath("/lp")).toBe(true);
    expect(isChromelessPath("/admin")).toBe(true);
    for (const path of ["/", "/account", "/community", "/community/login", "/courses", "/courses/x", "/lpx", "/blog/lp"]) {
      expect(isChromelessPath(path)).toBe(false);
    }
  });

  test("root layout still mounts Navbar and Footer only through ChromeGate", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toMatch(/<ChromeGate>\s*<Navbar \/>\s*<\/ChromeGate>/);
    expect(layout).toMatch(/<ChromeGate>\s*<Footer \/>\s*<\/ChromeGate>/);
  });

  test("landing never imports the site Navbar, Footer, or account link", () => {
    for (const file of LANDING_FILES) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/components\/layout\/(navbar|footer|account-link)/);
    }
  });

  test("rendered landing has no site navigation, account, or community links", () => {
    const variants = [
      render(READY, { whatsappHref: WA, instagramHref: "https://instagram.com/x" }),
      render(CLOSED),
    ];
    for (const html of variants) {
      expect(html).not.toContain("<nav");
      expect(html).not.toContain('href="/account');
      expect(html).not.toContain('href="/community');
      expect(html).not.toContain('href="/"');
      expect(html).not.toContain('href="/admin');
      expect(text(html)).not.toContain("حسابي");
      expect(text(html)).not.toContain("تسجيل الدخول");
      expect(text(html)).not.toContain("المجتمع");
      /* لا تذييل الموقع العام (روابط السياسات وأقسام الموقع) */
      expect(html).not.toContain('href="/policies');
      expect(html).not.toContain('href="/courses?');
    }
  });
});

describe("approved content", () => {
  const html = render(READY);
  const visible = text(html);

  test("title, dates, and price render", () => {
    expect(visible).toContain("احتراف صناعة المحتوى بالجوال");
    expect(visible).toContain("أونلاين عبر زووم — 27، 28، 29 أكتوبر 2026");
    expect(visible).toContain("الثلاثاء 27 أكتوبر 2026 — 8:00 مساءً (بتوقيت الرياض)");
    expect(visible).toContain("ادفع الآن بـ 96 ريال");
    expect(visible).toContain("497 ر.س");
    expect(visible).toContain("توفر: 401 ريال");
    expect(visible).toContain("96 ر.س");
    expect(visible).toContain("شامل ضريبة القيمة المضافة");
  });

  test("old Breakout Rooms copy is absent everywhere", () => {
    expect(html).not.toContain("Breakout");
    expect(html).not.toContain("غرف منفصلة");
    for (const file of LANDING_FILES) {
      expect(readFileSync(file, "utf8")).not.toContain("Breakout");
    }
  });

  test("new Day 2 copy is present and no invented detail is added", () => {
    expect(visible).toContain("اليوم الثاني — الأربعاء 28 أكتوبر 2026");
    expect(visible).toContain("الذكاء الاصطناعي لصنّاع المحتوى + التطبيق العملي للمتدربين");
    const day2 = curriculum.days[1];
    expect(day2.groups.map((group) => group.title)).toEqual([
      "الذكاء الاصطناعي لصنّاع المحتوى",
      "التطبيق العملي للمتدربين",
    ]);
    expect(day2.groups.every((group) => group.items.length === 0)).toBe(true);
  });

  test("unverified testimonials are not published", () => {
    for (const name of ["نورة الشهري", "عبدالله القحطاني", "سارة العمري", "فهد الدوسري", "رنا الحارثي"]) {
      expect(html).not.toContain(name);
    }
    expect(visible).not.toContain("كلام المتدربين");
  });

  test("partner names render as text, not unverified logos", () => {
    for (const name of ["Sony", "Nanlite", "Neom", "UBT"]) expect(visible).toContain(name);
    expect(html).not.toMatch(/<img[^>]+(sony|nanlite|neom|ubt)/i);
  });

  test("payment trust copy uses ميسّر and renders no card inputs", () => {
    expect(visible).toContain("يتم الدفع عبر صفحة دفع آمنة ومشفّرة (ميسّر).");
    expect(visible).toContain("لا نطلب أي بيانات بطاقة على هذا الموقع.");
    for (const method of ["مدى", "VISA", "Mastercard", "Apple Pay"]) expect(visible).toContain(method);
    /* النماذج الوحيدة أزرار دفع؛ لا حقل إدخال ظاهر ولا اسم حقل بطاقة. */
    const inputs = html.match(/<input[^>]*>/g) ?? [];
    for (const input of inputs) expect(input).toContain('type="hidden"');
    expect(html).not.toMatch(/name="[^"]*(card|cvc|cvv|expir|pan)[^"]*"/i);
    expect(html).not.toMatch(/autocomplete="cc-/);
  });

  test("minimal landing footer renders", () => {
    expect(visible).toContain("© 2026 احترف صناعة المحتوى بالجوال — جميع الحقوق محفوظة");
    expect(visible).toContain("المدفوعات عبر منصة ميسّر (Moyasar)");
  });
});

describe("countdown", () => {
  test("target is 27 Oct 2026 20:00 Asia/Riyadh (17:00 UTC)", () => {
    expect(Date.parse(EVENT_START_ISO)).toBe(Date.UTC(2026, 9, 27, 17, 0, 0));
  });

  test("parts derive from the real target, not hardcoded values", () => {
    const target = Date.parse(EVENT_START_ISO);
    const now = Date.UTC(2026, 9, 3, 12, 0, 0);
    expect(countdownParts(target, now)).toEqual({ started: false, days: 24, hours: 5, minutes: 0, seconds: 0 });
    expect(countdownParts(target, target - 61_000)).toEqual({
      started: false,
      days: 0,
      hours: 0,
      minutes: 1,
      seconds: 1,
    });
  });

  test("after start there are no negative values — a neutral started state", () => {
    const target = Date.parse(EVENT_START_ISO);
    expect(countdownParts(target, target)).toEqual({ started: true });
    expect(countdownParts(target, target + 86_400_000)).toEqual({ started: true });
  });

  test("server HTML carries no clock values (hydration-safe)", () => {
    const html = render(READY);
    expect(html).toContain(`data-countdown-target="${EVENT_START_ISO}"`);
    expect(text(html)).toContain("تنطلق الدورة بعد");
    expect((html.match(/>--</g) ?? []).length).toBe(4);
  });
});

describe("payment wiring reuses the existing purchase flow", () => {
  const base = { courseSlug: "ws", expectedPriceSar: 96, moyasarReady: true, hasOpenSessions: false };
  const COURSE_ID = "11111111-1111-4111-8111-111111111111";
  const paid = { id: COURSE_ID, slug: "ws", mode: "paid", price: "96.00", providers: ["moyasar"] };

  test("ready only when course is paid, priced 96 in the DB, Moyasar ready, and no open sessions", () => {
    expect(decideLandingCheckout({ ...base, commerce: paid })).toEqual({ status: "ready", courseId: COURSE_ID });
    expect(decideLandingCheckout({ ...base, commerce: { ...paid, price: 96 } }).status).toBe("ready");
    expect(decideLandingCheckout({ ...base, commerce: { ...paid, price: "96.01" } }).status).toBe("unavailable");
    expect(decideLandingCheckout({ ...base, hasOpenSessions: true, commerce: paid })).toEqual({
      status: "unavailable",
      reason: "requires-session",
    });
    expect(decideLandingCheckout({ ...base, courseSlug: null, commerce: paid })).toEqual({
      status: "unavailable",
      reason: "unmapped",
    });
    expect(decideLandingCheckout({ ...base, commerce: null })).toEqual({
      status: "unavailable",
      reason: "course-not-found",
    });
    expect(decideLandingCheckout({ ...base, commerce: { ...paid, slug: "other" } }).status).toBe("unavailable");
    expect(decideLandingCheckout({ ...base, commerce: { ...paid, mode: "free" } })).toEqual({
      status: "unavailable",
      reason: "not-paid",
    });
    expect(decideLandingCheckout({ ...base, commerce: { ...paid, price: 450 } })).toEqual({
      status: "unavailable",
      reason: "price-mismatch",
    });
    expect(decideLandingCheckout({ ...base, commerce: { ...paid, providers: [] } })).toEqual({
      status: "unavailable",
      reason: "provider-not-ready",
    });
    expect(decideLandingCheckout({ ...base, moyasarReady: false, commerce: paid })).toEqual({
      status: "unavailable",
      reason: "provider-not-ready",
    });
  });

  test("landing targets the verified course by slug and the approved price", () => {
    expect(landingCheckoutTarget.courseSlug).toBe("course-jawal");
    expect(landingCheckoutTarget.expectedPriceSar).toBe(96);
  });

  test("server resolver reads only the existing purchase module", () => {
    const source = readFileSync("src/lib/landing/checkout-target.ts", "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).toContain('import { checkoutReady, loadCourseCommerce } from "@/lib/payments/purchase"');
    expect(source).toContain('import { sessionRequirement } from "@/lib/sessions/availability"');
    expect(source).not.toMatch(/startCheckout|createMoyasar|insert\(|update\(|upsert\(|rpc\(/);
  });

  test("course id never reaches the browser view", () => {
    expect(toLandingView({ status: "ready", courseId: "secret-ish" })).toEqual({ status: "ready" });
    const page = readFileSync("src/app/lp/mobile-content/page.tsx", "utf8");
    expect(page).toContain("checkout={toLandingView(decision)}");
  });

  test("ready CTAs are submit buttons in forms bound to the landing action — no amount, no course id", () => {
    const html = render(READY);
    const forms = html.match(/<form[^>]*data-lp-checkout-form[^>]*>[\s\S]*?<\/form>/g) ?? [];
    expect(forms.length).toBe(4);
    for (const form of forms) {
      expect(form).toMatch(/<button[^>]*type="submit"[^>]*data-lp-checkout="ready"/);
      expect(form).not.toMatch(/name="(amount|price|course|courseId|provider|session)/i);
    }
  });

  test("landing action re-verifies, then delegates to the existing startCheckoutAction with moyasar", () => {
    const action = readFileSync("src/app/lp/mobile-content/actions.ts", "utf8");
    expect(action.startsWith('"use server"')).toBe(true);
    expect(action).toContain('import { startCheckoutAction } from "@/app/courses/actions/enrollment"');
    expect(action).toContain("const decision = await resolveLandingCheckout(landingCheckoutTarget)");
    expect(action).toContain('await startCheckoutAction(decision.courseId, "moyasar")');
    /* بلا موعد: الورشة أونلاين ولا ترسل الصفحة معرّف دفعة. */
    expect(action).not.toMatch(/startCheckoutAction\([^)]*,[^)]*,/);
    expect(action).toContain("communityLoginHref(resume)");
  });

  test("closed CTA renders disabled buttons and no checkout link", () => {
    const html = render(CLOSED);
    expect(html).not.toContain('data-lp-checkout="ready"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-lp-checkout="unavailable"/);
    expect(text(html)).toContain("الدفع الإلكتروني لهذه الورشة غير متاح حاليًا.");
  });

  test("landing code contains no second checkout implementation", () => {
    for (const file of LANDING_FILES) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/startCheckout\(|createMoyasarProvider|finalize_course_purchase|api\.moyasar|fetch\(/);
      if (!file.endsWith("actions.ts")) {
        expect(source).not.toMatch(/startCheckoutAction\(|@\/app\/courses\/actions/);
      }
      expect(source).not.toMatch(/toHalalas|splitVatInclusive|quoteCoursePrice/);
    }
  });

  test("no payment secrets or server env reach client components", () => {
    const clientFiles = LANDING_FILES.filter((file) => readFileSync(file, "utf8").startsWith('"use client"'));
    expect(clientFiles.length).toBeGreaterThanOrEqual(3);
    for (const file of clientFiles) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(
        /process\.env|MOYASAR|SECRET|server-only|@\/lib\/payments\/(purchase|env|secrets|moyasar)|supabase/i,
      );
    }
    for (const file of LANDING_FILES) {
      expect(readFileSync(file, "utf8")).not.toMatch(/sk_live|sk_test|pk_live|SUPABASE_SECRET_KEY/);
    }
  });
});

describe("mobile sticky CTA", () => {
  test("renders once, mobile-only, safe-area aware, hidden until other CTAs scroll away", () => {
    const html = render(READY);
    const sticky = html.match(/<div[^>]*data-lp-sticky-cta[^>]*>/g) ?? [];
    expect(sticky.length).toBe(1);
    expect(sticky[0]).toContain("md:hidden");
    expect(sticky[0]).toContain("safe-area-inset-bottom");
    expect(sticky[0]).toContain('aria-hidden="true"');
    expect(sticky[0]).toContain("inert");
    expect(text(html)).toContain("احجز الآن");
  });

  test("sticky uses the same checkout action as the main CTA", () => {
    const html = render(READY);
    const stickyBlock = html.slice(html.indexOf("data-lp-sticky-cta"));
    expect(stickyBlock).toContain("data-lp-checkout-form");
    expect(stickyBlock).toContain('data-lp-checkout="ready"');
  });

  test("hero, pricing card, final CTA, and footer are CTA zones that hide the bar", () => {
    const html = render(READY);
    expect((html.match(/data-lp-cta-zone=""/g) ?? []).length).toBe(4);
  });

  test("when checkout is closed the sticky bar scrolls to booking instead of a dead button", () => {
    const html = render(CLOSED);
    const stickyBlock = html.slice(html.indexOf("data-lp-sticky-cta"));
    expect(stickyBlock).toContain('href="#booking"');
    expect(html).toContain('id="booking"');
  });
});

describe("contact channels come from CMS settings only", () => {
  const settings = {
    whatsappHref: "https://wa.me/966512345678?text=hi",
    instagram: "https://instagram.com/baytalmosawer",
    channels: {
      phone: true,
      whatsapp: true,
      email: true,
      address: true,
      workingHours: true,
      instagram: true,
      tiktok: true,
      maps: true,
    },
  };

  test("valid admin WhatsApp is used; mock fallback and disabled channel are hidden", () => {
    expect(landingWhatsappHref(settings)).toBe(settings.whatsappHref);
    expect(landingWhatsappHref({ ...settings, whatsappHref: siteConfig.whatsappLink })).toBeNull();
    expect(landingWhatsappHref({ ...settings, channels: { ...settings.channels, whatsapp: false } })).toBeNull();
    expect(landingWhatsappHref(null)).toBeNull();
  });

  test("Instagram must be an enabled https instagram.com URL", () => {
    expect(landingInstagramHref(settings)).toBe(settings.instagram);
    expect(landingInstagramHref({ ...settings, instagram: "javascript:alert(1)" })).toBeNull();
    expect(landingInstagramHref({ ...settings, channels: { ...settings.channels, instagram: false } })).toBeNull();
  });

  test("WhatsApp CTAs render only when a canonical number exists", () => {
    const without = render(READY);
    expect(without).not.toContain("wa.me");
    expect(text(without)).not.toContain("سجّل عبر واتساب");
    const withWa = text(render(READY, { whatsappHref: WA, instagramHref: null }));
    expect(withWa).toContain("سجّل عبر واتساب");
    expect(withWa).toContain("تواصل عبر واتساب");
  });
});

describe("campaign parameters", () => {
  test("only the five UTM keys are forwarded", () => {
    const picked = pickCampaignParams(
      "?utm_source=ig&utm_medium=paid&utm_campaign=oct&utm_content=a&utm_term=b&fbclid=x&evil=1",
    );
    expect(picked.map(([key]) => key)).toEqual(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]);
  });

  test("forwarded onto internal links only", () => {
    expect(withCampaignParams("/courses/ws", [["utm_source", "ig"]])).toBe("/courses/ws?utm_source=ig");
    expect(withCampaignParams("https://evil.example", [["utm_source", "ig"]])).toBe("https://evil.example");
    expect(withCampaignParams("/courses/ws", [])).toBe("/courses/ws");
  });
});

describe("existing areas unchanged", () => {
  function unchanged(paths: string[]): boolean {
    return Bun.spawnSync(["git", "diff", "--quiet", "HEAD", "--", ...paths]).exitCode === 0;
  }

  test("/account and account dashboard are untouched", () => {
    expect(unchanged(["src/app/account", "src/components/account", "src/lib/account"])).toBe(true);
    expect(isChromelessPath("/account")).toBe(false);
  });

  test("Community is untouched", () => {
    expect(unchanged(["src/app/community", "src/components/community", "src/lib/community"])).toBe(true);
    expect(isChromelessPath("/community")).toBe(false);
  });

  test("payments, purchase pages, schema, and root layout are untouched", () => {
    expect(
      unchanged(["src/lib/payments", "src/app/api", "src/app/payment", "src/app/courses", "supabase", "src/app/layout.tsx"]),
    ).toBe(true);
    expect(existsSync("src/app/lp/mobile-content/page.tsx")).toBe(true);
  });
});
