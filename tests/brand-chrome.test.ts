/**
 * المرحلة B2 — الهوية الرسمية على واجهة الموقع (Header وقائمة الجوال وFooter).
 *
 * الحراسة هنا على ما ينكسر بصمت عند تعديل ألوان مكوّن مشترك:
 *  1. الرموز — قيم ملف الهوية حرفيًا، ومعزولة عن :root وglobals.css.
 *  2. التباين — لا نص أبيض فوق البرتقالي (3.58:1 يفشل)، وزر الحجز فحمي على برتقالي.
 *  3. الأبعاد — ارتفاع الهيدر 64/76px وبداية قائمة الجوال top-16 (الأعمدة اللاصقة lg:top-24 تعتمد عليهما).
 *  4. السلوك — Escape وحصر التركيز واستعادته وinert وaria-* كما هي.
 *  5. النطاق — الواجهة غائبة عن /lp و/admin، ولا خط جديد عام ولا ارتباط بالدفع أو التتبع.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { brandTokens } from "../src/components/brand/brand-tokens";
import { isChromelessPath } from "../src/components/layout/chrome-gate";

const read = (path: string) => readFileSync(path, "utf8");
const NAVBAR = "src/components/layout/navbar.tsx";
const FOOTER = "src/components/layout/footer.tsx";
const ACCOUNT = "src/components/layout/account-link.tsx";
const CHROME = [NAVBAR, FOOTER, ACCOUNT];

/* كل سلسلة فئات (بين علامتي تنصيص) تحتوي الخلفية البرتقالية */
const orangeClassStrings = (source: string) =>
  [...source.matchAll(/"([^"]*bg-\[var\(--bm-orange\)\][^"]*)"/g)].map((m) => m[1].split(/\s+/));

describe("brand tokens are the official values, shared and scoped", () => {
  test("the approved colours come straight from the brand file", () => {
    const tokens = brandTokens as Record<string, string>;
    expect(tokens["--bm-orange"]).toBe("#E65A2E");
    expect(tokens["--bm-ink"]).toBe("#1D1D1B");
    expect(tokens["--bm-white"]).toBe("#FFFFFF");
    expect(tokens["--bm-gray-200"]).toBe("#DADADA");
  });

  test("tokens never reach :root — globals.css and the root layout stay untouched", () => {
    expect(read("src/app/globals.css")).not.toContain("--bm-");
    expect(read("src/app/layout.tsx")).not.toContain("brandTokens");
  });

  test("each chrome surface carries the tokens itself (the mobile menu is a separate fixed element)", () => {
    const navbar = read(NAVBAR);
    expect(navbar.match(/style=\{brandTokens\}/g)?.length).toBe(2);
    expect(read(FOOTER)).toContain("style={brandTokens}");
  });

  test("/contact still reads the same shared tokens", () => {
    expect(read("src/app/contact/page.tsx")).toContain('from "@/components/brand/brand-tokens"');
    expect(read("src/app/contact/_brand/contact-hero.tsx")).toContain('from "@/components/brand/brand-shape"');
  });
});

describe("contrast on orange", () => {
  test("no white text ever sits on the orange background", () => {
    for (const file of CHROME) {
      for (const classes of orangeClassStrings(read(file))) {
        /* hover:text-white على خلفية تتحول عند المرور مسموح فقط إن تغيرت الخلفية أيضًا — هنا ممنوع كليًا */
        const plainText = classes.filter((c) => !c.includes(":"));
        expect(plainText).not.toContain("text-white");
        expect(plainText).not.toContain("text-[var(--bm-white)]");
      }
    }
  });

  test("the booking CTA is charcoal on orange, desktop and mobile", () => {
    const navbar = read(NAVBAR);
    const cta = navbar.match(/const ctaClass =\s*"([^"]+)"/)?.[1].split(/\s+/) ?? [];
    expect(cta).toContain("bg-[var(--bm-orange)]");
    expect(cta).toContain("text-[var(--bm-ink)]");
    /* المرور يقلب الخلفية إلى الأبيض والنص يبقى فحميًا */
    expect(cta).toContain("hover:bg-[var(--bm-white)]");
    expect(cta).toContain("hover:text-[var(--bm-ink)]");
    expect(navbar.match(/className=\{cn\([^)]*ctaClass\)\}/g)?.length).toBe(2);
  });

  test("the CTA stays visible and focusable in forced-colors mode", () => {
    const navbar = read(NAVBAR);
    expect(navbar).toContain("forced-colors:border-[ButtonText]");
    expect(navbar).toContain("forced-colors:focus-visible:outline-[Highlight]");
  });
});

describe("chrome surfaces use the brand palette", () => {
  test("header, mobile menu and footer are charcoal", () => {
    const navbar = read(NAVBAR);
    expect(navbar).toMatch(/<header[^>]*bg-\[var\(--bm-ink\)\]/);
    expect(navbar).toMatch(/id="mobile-menu"[\s\S]*?bg-\[var\(--bm-ink\)\]/);
    expect(read(FOOTER)).toMatch(/<footer[\s\S]*?bg-\[var\(--bm-ink\)\]/);
  });

  test("the old palette is gone from the chrome", () => {
    for (const file of CHROME) {
      const source = read(file);
      expect(source).not.toMatch(/\b(?:text|bg|border|ring)-(?:charcoal|brand)-\d/);
    }
  });

  test("the footer brand shape is decorative and cannot catch input", () => {
    const footer = read(FOOTER);
    expect(footer).toMatch(/<BrandCoreShape className="pointer-events-none absolute[^"]*-z-10/);
    expect(footer).toMatch(/<footer[\s\S]*?overflow-hidden/);
    expect(read("src/components/brand/brand-shape.tsx")).toContain('aria-hidden="true"');
  });

  test("Inter stays the Latin face — no Montserrat or new global font in the chrome", () => {
    for (const file of CHROME) {
      const source = read(file);
      expect(source).not.toContain("--font-bm-montserrat");
      expect(source).not.toContain("next/font");
    }
  });
});

describe("dimensions the rest of the site depends on", () => {
  test("header height stays 64px mobile / 76px desktop", () => {
    expect(read(NAVBAR)).toContain('className="flex h-16 items-center justify-between gap-3 lg:h-[76px]"');
  });

  test("the mobile menu still opens right under the 64px header", () => {
    expect(read(NAVBAR)).toMatch(/"fixed inset-x-0 bottom-0 top-16 z-40 /);
  });

  test("course and lesson sidebars still clear the header", () => {
    expect(read("src/components/courses/course-details.tsx")).toContain("lg:sticky lg:top-24");
    expect(read("src/app/learn/[slug]/[lessonId]/page.tsx")).toContain("lg:sticky lg:top-24");
  });

  test("mobile touch targets are at least 44px in the menu and footer", () => {
    const navbar = read(NAVBAR);
    expect(navbar).toMatch(/aria-label="عرض الدورات الفرعية"\s*className="flex h-11 w-11/);
    expect(navbar).toMatch(/href=\{phoneHref\}\s*className="flex min-h-11/);
    expect(read(FOOTER)).toContain('const footerLink = "inline-flex min-h-11 items-center');
    expect(read(ACCOUNT)).toContain("inline-flex min-h-11 items-center");
  });

  test("the desktop courses chevron is painted above its positioned link (WCAG 2.5.8)", () => {
    // The courses link is `relative` for its active underline and the chevron overlaps it by
    // -ms-1, so the chevron must be positioned too or the link covers 4px of its 24px target.
    expect(read(NAVBAR)).toMatch(/aria-label="فتح قائمة الدورات الفرعية"[\s\S]{0,80}className="relative -ms-1 /);
  });
});

describe("menu behaviour is unchanged", () => {
  const navbar = read(NAVBAR);

  test("dialog semantics and state wiring", () => {
    expect(navbar).toContain('aria-controls="mobile-menu"');
    expect(navbar).toContain("aria-expanded={mobileOpen}");
    expect(navbar).toContain("inert={!mobileOpen}");
    expect(navbar).toContain("aria-hidden={!mobileOpen}");
    expect(navbar).toContain('aria-current={isActive(link.href) ? "page" : undefined}');
    expect(navbar).toContain("aria-expanded={coursesOpen}");
    expect(navbar).toContain("aria-expanded={mobileCoursesOpen}");
  });

  test("Escape closes and restores focus; Tab is trapped", () => {
    expect(navbar).toContain('if (event.key === "Escape")');
    expect(navbar).toContain("menuButtonRef.current?.focus();");
    expect(navbar).toContain('if (event.key !== "Tab") return;');
    expect(navbar).toContain("last.focus();");
    expect(navbar).toContain("first.focus();");
  });

  test("body scroll lock still follows the menu", () => {
    expect(navbar).toContain('document.body.style.overflow = mobileOpen ? "hidden" : "";');
  });
});

describe("scope: no chrome on landing or admin, no coupling to payments or tracking", () => {
  test("ChromeGate hides the site chrome on every /lp and /admin route", () => {
    for (const path of ["/lp", "/lp/mobile-content", "/lp/mobile-content/success", "/lp/photography-basics", "/lp/photography-basics/success", "/admin", "/admin/login", "/admin/settings/footer"]) {
      expect(isChromelessPath(path)).toBe(true);
    }
    for (const path of ["/", "/contact", "/courses", "/courses/x", "/payment/return", "/account", "/community"]) {
      expect(isChromelessPath(path)).toBe(false);
    }
  });

  test("the chrome imports nothing from payments, campaigns or ad tracking", () => {
    for (const file of CHROME) {
      const source = read(file);
      expect(source).not.toMatch(/lib\/(landing|payments|moyasar|workshops)|meta-pixel|fbq|components\/landing/);
    }
  });
});
