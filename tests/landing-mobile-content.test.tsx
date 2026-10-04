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
const { APPROVED_PRICE_SAR, EVENT_START_ISO, TEMPORARY_TEST_PRICE_SAR, curriculum, landingCheckoutTarget, pricing } =
  await import("@/data/landing/mobile-content");
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
  "src/app/lp/mobile-content/success/page.tsx",
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
      /* لا تذييل الموقع العام: رابط السياسات الوحيد هو سطر موافقة الخصوصية في نموذج الحجز. */
      const policyLinks = html.match(/href="\/policies[^"]*"/g) ?? [];
      expect(policyLinks.every((link) => link === 'href="/policies/privacy"')).toBe(true);
      expect(html).not.toContain('href="/courses?');
    }
  });

  test("the only policy link is the privacy consent inside the booking form", () => {
    const html = render(READY);
    expect((html.match(/href="\/policies\/privacy"/g) ?? []).length).toBe(1);
    expect(text(render(CLOSED))).not.toContain("سياسة الخصوصية");
  });
});

describe("approved content", () => {
  const html = render(READY);
  const visible = text(html);

  test("title, dates, and price render", () => {
    expect(visible).toContain("احتراف صناعة المحتوى بالجوال");
    expect(visible).toContain("أونلاين عبر زووم — 27، 28، 29 أكتوبر 2026");
    expect(visible).toContain("الثلاثاء 27 أكتوبر 2026 — 8:00 مساءً (بتوقيت الرياض)");
    expect(visible).toContain(`ادفع الآن بـ ${pricing.currentSar} ريال`);
    expect(visible).toContain("497 ر.س");
    expect(visible).toContain(`توفر: ${497 - pricing.currentSar} ريال`);
    expect(visible).toContain(`${pricing.currentSar} ر.س`);
    expect(visible).toContain(`— ${pricing.currentSar} ريال فقط بدل 497 ريال`);
    expect(visible).toContain("شامل ضريبة القيمة المضافة");
  });

  test("old Breakout Rooms copy is absent everywhere", () => {
    expect(html).not.toContain("Breakout");
    expect(html).not.toContain("غرف منفصلة");
    for (const file of LANDING_FILES) {
      expect(readFileSync(file, "utf8")).not.toContain("Breakout");
    }
  });

  const DAY2_BULLETS = [
    "كتابة سكريبت احترافي باستخدام ChatGPT",
    "توليد أفكار محتوى لا تنتهي",
    "كتابة Hooks قوية",
    "تحسين جودة الصوت",
    "إنشاء صور للمحتوى",
    "إنشاء عناوين ووصف للنشر",
  ];

  /** نص بطاقة يوم بعينه من الصفحة المصيّرة (من رقمه حتى رقم اليوم التالي). */
  function dayCardText(number: string, next?: string): string {
    const start = html.indexOf(`>${number}<`);
    const end = next ? html.indexOf(`>${next}<`, start) : html.indexOf("</ol>", start);
    return text(html.slice(start, end));
  }

  test("Day 2 shows the approved title and exactly the six approved bullets", () => {
    const day2 = curriculum.days[1];
    expect(day2.date).toBe("اليوم الثاني — الأربعاء 28 أكتوبر 2026");
    expect(day2.time).toBe("8:00 مساءً");
    expect(day2.focus).toBe("الذكاء الاصطناعي لصنّاع المحتوى");
    expect(day2.groups.flatMap((group) => group.items)).toEqual(DAY2_BULLETS);
    expect("closing" in day2).toBe(false);

    const card = dayCardText("02", "03");
    expect(card).toContain("اليوم الثاني — الأربعاء 28 أكتوبر 2026");
    expect(card).toContain("8:00 مساءً");
    expect(card).toContain("الذكاء الاصطناعي لصنّاع المحتوى");
    for (const bullet of DAY2_BULLETS) expect(card).toContain(bullet);
    /* العنوان لا يتكرر عنوانًا فرعيًا تحت نفسه. */
    expect(card.split("الذكاء الاصطناعي لصنّاع المحتوى").length - 1).toBe(1);
  });

  test("the AI bullets appear only once on the page — in Day 2, not Day 3", () => {
    const day3 = dayCardText("03");
    for (const bullet of DAY2_BULLETS) {
      expect(day3).not.toContain(bullet);
      expect(visible.split(bullet).length - 1).toBe(1);
    }
    expect(curriculum.days[2].groups.map((group) => group.title)).toEqual(["تطبيق عملي على المونتاج"]);
  });

  test("old Day 2 content is gone", () => {
    const card = dayCardText("02", "03");
    for (const old of ["التطبيق العملي للمتدربين", "Breakout", "غرف منفصلة", "تقسيم المتدربين", "فرق", "+"]) {
      expect(card).not.toContain(old);
    }
    const source = readFileSync("src/data/landing/mobile-content.ts", "utf8");
    expect(source).not.toContain("التطبيق العملي للمتدربين");
  });

  test("Day 1 is unchanged", () => {
    expect(curriculum.days[0]).toEqual({
      number: "01",
      date: "اليوم الأول — الثلاثاء 27 أكتوبر 2026",
      focus: "تصوير الفيديو بالجوال — النظري + شرح مباشر",
      time: "8:00 مساءً",
      groups: [
        { title: "فهم كاميرا الجوال", items: ["إعدادات الكاميرا", "أفضل جودة تصوير", "Frame Rate & Resolution", "تثبيت الصورة"] },
        {
          title: "أساسيات صناعة الفيديو",
          items: ["أنواع اللقطات وأحجامها", "زوايا التصوير", "تكوين الصورة وقاعدة الأثلاث", "خطوط التوجيه والعمق داخل الكادر"],
        },
        {
          title: "الإضاءة",
          items: [
            "الضوء الطبيعي وأفضل وقت للتصوير",
            "الاتجاه الصحيح للإضاءة",
            "الإضاءة المستمرة وRGB",
            "التصوير داخل الاستوديو (نماذج عملية مباشرة)",
            "محاكاة ضوء الشمس",
            "الإضاءة السينمائية",
          ],
        },
        { title: "الصوت", items: ["أخطاء الصوت الشائعة", "المايكات المناسبة", "تسجيل Voice Over", "تحسين جودة التسجيل"] },
        {
          title: "بناء الريلز",
          items: ["Hook — الجملة الأولى", "Body — المحتوى الأساسي", "CTA — الدعوة للإجراء", "مدة الفيديو المثالية"],
        },
      ],
    });
  });

  test("Day 3 keeps only the editing group and final project (AI group moved to Day 2)", () => {
    expect(curriculum.days[2]).toEqual({
      number: "03",
      date: "اليوم الثالث — الخميس 29 أكتوبر 2026",
      focus: "تطبيق عملي على برنامج المونتاج + صناعة المحتوى بالذكاء الاصطناعي",
      time: "8:00 مساءً",
      groups: [
        {
          title: "تطبيق عملي على المونتاج",
          items: [
            "مقدمة شاملة على برنامج المونتاج",
            "قص وترتيب اللقطات",
            "إضافة تأثيرات وانتقالات",
            "تصدير الفيديو بالجودة المطلوبة",
          ],
        },
      ],
      closing: {
        title: "المشروع النهائي",
        body: "كل متدرب ينتج الفيديو الذي صوّره في اليوم الثاني، ثم يعرضه أمام المجموعة عبر زووم. وفي نهاية الورشة يتم تقييم كل مشروع مع توضيح نقاط القوة وفرص التحسين.",
      },
    });
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
    /* الحقول الظاهرة الوحيدة: الاسم والجوال والبريد (وحقل الفخ المخفي). لا حقل بطاقة. */
    const names = (html.match(/<input[^>]*>/g) ?? [])
      .filter((input) => !input.includes('type="hidden"'))
      .map((input) => /name="([^"]+)"/.exec(input)?.[1]);
    expect(names.sort()).toEqual(["email", "name", "phone", "website"]);
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
    expect(APPROVED_PRICE_SAR).toBe(96);
    expect(landingCheckoutTarget.expectedPriceSar).toBe(TEMPORARY_TEST_PRICE_SAR ?? APPROVED_PRICE_SAR);
  });

  test("displayed price always equals the server-checked price (no show-one-charge-another)", () => {
    expect(pricing.currentSar).toBe(landingCheckoutTarget.expectedPriceSar);
    /* سعر التجربة المؤقت: إما مغلق (null) أو 1 ريال فقط. */
    expect([null, 1]).toContain(TEMPORARY_TEST_PRICE_SAR);
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

  test("one guest form: name, mobile, email, privacy consent, pay button — no amount, course, or provider field", () => {
    const html = render(READY);
    const forms = html.match(/<form[^>]*data-lp-guest-form[^>]*>[\s\S]*?<\/form>/g) ?? [];
    expect(forms.length).toBe(1);
    const form = forms[0] ?? "";
    expect(form).toContain('id="guest-checkout"');
    for (const label of ["الاسم", "رقم الجوال", "البريد الإلكتروني"]) expect(text(form)).toContain(label);
    expect(form).toMatch(/<button[^>]*type="submit"[^>]*data-lp-checkout="ready"[^>]*>[\s\S]*ادفع الآن بـ 96 ريال/);
    expect(form).toContain('href="/policies/privacy"');
    expect(text(form)).toContain("توافق على");
    expect(form).not.toMatch(/name="(amount|price|total|course|course_id|courseId|provider|status|session)/i);
    /* بلا حساب: لا كلمة مرور ولا دخول. */
    expect(form).not.toMatch(/type="password"|تسجيل الدخول|كلمة المرور/);
  });

  test("hero, final, and sticky CTAs lead to the single guest form", () => {
    const html = render(READY);
    const links = html.match(/<a[^>]*data-lp-checkout="ready"[^>]*>/g) ?? [];
    expect(links.length).toBe(3);
    for (const link of links) expect(link).toContain('href="#guest-checkout"');
  });

  test("landing action is guest checkout: validates on the server and delegates to startGuestCheckout", () => {
    const action = readFileSync("src/app/lp/mobile-content/actions.ts", "utf8");
    expect(action.startsWith('"use server"')).toBe(true);
    expect(action).toContain("validateGuestContact(");
    expect(action).toContain("await startGuestCheckout(parsed.contact, campaign)");
    expect(action).toContain("checkRateLimit(");
    expect(action).not.toMatch(/startCheckoutAction|getCommunityViewerId|communityLoginHref/);
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

  test("sticky leads to the same guest form as every other CTA", () => {
    const html = render(READY);
    const stickyBlock = html.slice(html.indexOf("data-lp-sticky-cta"));
    expect(stickyBlock).toMatch(/<a[^>]*href="#guest-checkout"[^>]*data-lp-checkout="ready"/);
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

  test("existing payment core, purchase pages, migrations, and root layout are untouched", () => {
    expect(
      unchanged([
        "src/lib/payments/purchase.ts",
        "src/lib/payments/providers",
        "src/lib/payments/env.ts",
        "src/lib/payments/settings.ts",
        "src/lib/payments/configuration.ts",
        "src/lib/payments/money.ts",
        "src/lib/payments/provider.ts",
        "src/lib/payments/moyasar.ts",
        "src/app/payment",
        "src/app/courses",
        "src/app/account",
        "src/components/courses",
        "src/middleware.ts",
        "src/components/layout/chrome-gate.tsx",
        "next.config.ts",
        "src/app/layout.tsx",
      ]),
    ).toBe(true);
    /* كل ملفات الترحيل القائمة كما هي؛ الجديد ملف ترحيل إضافي واحد. */
    const changedMigrations = Bun.spawnSync(["git", "diff", "--name-only", "HEAD", "--", "supabase/migrations"])
      .stdout.toString()
      .trim();
    expect(changedMigrations).toBe("");
    expect(existsSync("src/app/lp/mobile-content/page.tsx")).toBe(true);
  });

  test("the webhook change is purely additive (one line replaced by the guest branch)", () => {
    const diff = Bun.spawnSync([
      "git",
      "diff",
      "--unified=0",
      "HEAD",
      "--",
      "src/app/api/payments/webhook/[provider]/route.ts",
    ]).stdout.toString();
    const removed = diff.split("\n").filter((line) => line.startsWith("-") && !line.startsWith("---"));
    expect(removed).toEqual(["-  if (!paymentId) return ack();"]);
  });
});
