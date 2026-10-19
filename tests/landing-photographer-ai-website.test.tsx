import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("server-only", () => ({}));

const { isChromelessPath } = await import("@/components/layout/chrome-gate");
const { UNLISTED_LANDING_COURSE_SLUGS } = await import("@/data/public-bridge");
const {
  curriculum,
  faqList,
  hero,
  landingCheckoutTarget,
  photographySpecialties,
  problemSolution,
  targetAudience,
  toolsDisclosure,
  whatIsIncluded,
  whatYouWillBuild,
} = await import("@/data/landing/photographer-ai-website");
const { PhotographerAiLanding } = await import(
  "@/components/landing/photographer-ai-website/landing-page"
);
const {
  normalizeEmail,
  normalizeName,
  normalizeSaudiMobile,
} = await import("@/lib/landing/guest-validation");

describe("photographer-ai-website: route, isolation, and unlisted behavior", () => {
  test("route exists as an App Router page with strict noindex, nofollow metadata", () => {
    const pageSource = readFileSync("src/app/lp/photographer-ai-website/page.tsx", "utf8");
    expect(pageSource).toContain("export default async function PhotographerAiLandingPage");
    expect(pageSource).toContain("robots: {");
    expect(pageSource).toContain("index: false");
    expect(pageSource).toContain("alternates: { canonical: PATH }");
  });

  test("success route exists and has strict noindex, nofollow metadata", () => {
    const successSource = readFileSync(
      "src/app/lp/photographer-ai-website/success/page.tsx",
      "utf8",
    );
    expect(successSource).toContain("export default async function PhotographerAiSuccessPage");
    expect(successSource).toContain("robots: { index: false, follow: false }");
  });

  test("ChromeGate isolates the landing page from main site Navbar and Footer", () => {
    expect(isChromelessPath("/lp/photographer-ai-website")).toBe(true);
    expect(isChromelessPath("/lp/photographer-ai-website/success")).toBe(true);
  });

  test("unlisted course slug is permanently excluded from public catalog and sitemap generation", () => {
    expect(UNLISTED_LANDING_COURSE_SLUGS.has("photographer-ai-website")).toBe(true);
    expect(UNLISTED_LANDING_COURSE_SLUGS.has("course-jawal")).toBe(true);
  });

  test("landing page code never imports public site Navbar, Footer, or Account links", () => {
    const landingFiles = [
      "src/app/lp/photographer-ai-website/page.tsx",
      "src/app/lp/photographer-ai-website/layout.tsx",
      "src/app/lp/photographer-ai-website/actions.ts",
      "src/app/lp/photographer-ai-website/success/page.tsx",
      "src/components/landing/photographer-ai-website/landing-page.tsx",
      "src/components/landing/photographer-ai-website/hero-section.tsx",
      "src/components/landing/photographer-ai-website/registration-form.tsx",
      "src/components/landing/photographer-ai-website/landing-footer.tsx",
    ];
    for (const file of landingFiles) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/components\/layout\/(navbar|footer|account-link)/);
    }
  });
});

describe("photographer-ai-website: content integrity and compliance", () => {
  test("headline and core copy match the approved brief exactly", () => {
    expect(hero.title).toBe("صورك تستحق موقعًا يليق بها.");
    expect(hero.subtitle).toBe("ابنِ موقعك الاحترافي بالذكاء الاصطناعي.");
    expect(hero.eyebrow).toBe("دورة أونلاين مباشرة من بيت المصور");
    expect(hero.description).toContain("في 3 أيام فقط (9 ساعات تدريبية)، تعلّم كيف تنشئ موقعًا إلكترونيًا يعرض أعمالك الفوتوغرافية باحتراف");
  });

  test("curriculum consists of 3 distinct days with explicit outcomes and no misleading guarantees", () => {
    expect(curriculum.days.length).toBe(3);
    expect(curriculum.days[0].dayNumber).toBe("اليوم الأول");
    expect(curriculum.days[0].title).toBe("إنشاء موقع المصور");
    expect(curriculum.days[1].title).toBe("الحجوزات ولوحة الإدارة");
    expect(curriculum.days[2].title).toBe("الإطلاق");
  });

  test("target audience encompasses all 6 photography disciplines and beginners", () => {
    expect(targetAudience.categories.length).toBe(6);
    expect(targetAudience.levelNote).toContain("مبتدئ تمامًا");
    expect(photographySpecialties.length).toBeGreaterThanOrEqual(6);
  });

  test("what students build includes 12 comprehensive features and subscription transparency disclaimer", () => {
    expect(whatYouWillBuild.features.length).toBe(12);
    expect(whatYouWillBuild.disclaimer).toContain("الربط المتقدم والدومين الخاص واشتراكات الأدوات المدفوعة");
  });

  test("tools disclosure truthfully presents general AI tools without misrepresenting subscriptions", () => {
    expect(toolsDisclosure.tools.map((t) => t.name)).toEqual([
      "أدوات بناء وتوليد المواقع بالذكاء الاصطناعي",
      "نماذج التخطيط وهندسة الأوامر الذكية",
    ]);
    expect(toolsDisclosure.clarification).toContain("ولا تشمل أي اشتراكات مدفوعة اختيارية");
  });

  test("what is included contains 11 items and no fake lifetime access promises", () => {
    expect(whatIsIncluded.items.length).toBe(11);
    expect(whatIsIncluded.items.some((i) => i.title.includes("شهادة حضور"))).toBe(true);
    expect(whatIsIncluded.items.some((i) => i.title.includes("ماستر برومبت"))).toBe(true);
  });

  test("FAQ accordion contains all 10 required questions", () => {
    expect(faqList.length).toBe(10);
    const questions = faqList.map((f) => f.q);
    expect(questions).toContain("هل أحتاج خبرة في البرمجة؟");
    expect(questions).toContain("هل أحتاج لابتوب؟");
    expect(questions).toContain("هل الدورة مباشرة أم مسجلة؟");
    expect(questions).toContain("هل سأبني موقعي بنفسي؟");
    expect(questions).toContain("هل سأتمكن من استقبال الحجوزات؟");
    expect(questions).toContain("هل أحتاج شراء دومين؟");
    expect(questions).toContain("هل أدوات الذكاء الاصطناعي مجانية؟");
    expect(questions).toContain("هل أحصل على شهادة؟");
    expect(questions).toContain("هل يوجد دعم بعد الدورة؟");
    expect(questions).toContain("هل يمكن استرداد رسوم الدورة؟");
  });
});

describe("photographer-ai-website: form validation and safety", () => {
  test("validates Saudi phone format strictly", () => {
    expect(normalizeSaudiMobile("0501234567")).toBe("966501234567");
    expect(normalizeSaudiMobile("+966501234567")).toBe("966501234567");
    expect(normalizeSaudiMobile("966501234567")).toBe("966501234567");
    expect(normalizeSaudiMobile("050 123 4567")).toBe("966501234567");
    expect(normalizeSaudiMobile("0111234567")).toBeNull();
    expect(normalizeSaudiMobile("12345")).toBeNull();
    expect(normalizeSaudiMobile("abcdef")).toBeNull();
  });

  test("normalizes and validates email addresses", () => {
    expect(normalizeEmail("Photographer@Example.Com")).toBe("photographer@example.com");
    expect(normalizeEmail("invalid-email")).toBeNull();
    expect(normalizeEmail("")).toBeNull();
  });

  test("normalizes customer names and strips control characters", () => {
    expect(normalizeName("  أحمد   الشريف  ")).toBe("أحمد الشريف");
    expect(normalizeName("a")).toBeNull();
    expect(normalizeName("<script>alert(1)</script>")).toBeNull();
  });
});

describe("photographer-ai-website: render states", () => {
  test("renders gracefully in unconfigured registration-interest state without payment button", () => {
    const html = renderToStaticMarkup(
      <PhotographerAiLanding
        checkout={{ status: "unavailable", reason: "unmapped" }}
        pricing={null}
        contact={{ whatsappHref: null, instagramHref: null }}
      />,
    );
    expect(html).toContain("ابنِ موقعك الاحترافي بالذكاء الاصطناعي");
    expect(html).toContain("احجز مقعدك وأولويتك");
    expect(html).not.toContain("ادفع الآن بـ");
    expect(html).not.toContain("fake-discount");
  });

  test("renders verified price when configured with checkout ready", () => {
    const html = renderToStaticMarkup(
      <PhotographerAiLanding
        checkout={{ status: "ready" }}
        pricing={{ currentSar: 490, previousSar: 750, savingSar: 260 }}
        contact={{ whatsappHref: "https://wa.me/966500000000", instagramHref: "https://instagram.com/baytalmosawer" }}
      />,
    );
    expect(html).toContain("490");
    expect(html).toContain("احجز مقعدك الآن");
    expect(html).toContain("السعر شامل ضريبة القيمة المضافة");
  });
});
