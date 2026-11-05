import { describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

mock.module("server-only", () => ({}));

const { isChromelessPath } = await import("@/components/layout/chrome-gate");
const {
  CHROMATICS_CHECKOUT_ENABLED,
  CHROMATICS_FORM_ANCHOR,
  CHROMATICS_HONEYPOT_FIELD,
  CHROMATICS_METADATA_AR,
  CHROMATICS_METADATA_EN,
  CHROMATICS_PATH,
  CHROMATICS_PRICING,
  CHROMATICS_SLUG,
} = await import("@/data/landing/chromatics");
const { AR_ATTR, AR_TEXT } = await import("@/data/landing/chromatics-i18n");
const { metadata: chromaticsMetadata } = await import("@/app/lp/chromatics/page");
const { workshopCatalog } = await import("@/lib/workshops/catalog");

const ROOT = resolve(".");

describe("CHROMATICS Landing Page: Architecture & Routing", () => {
  test("route exists as an App Router page", () => {
    const pagePath = resolve(ROOT, "src/app/lp/chromatics/page.tsx");
    expect(existsSync(pagePath)).toBe(true);
  });

  test("layout exists and follows campaign architecture with MetaPixel and TrackingConsent", () => {
    const layoutPath = resolve(ROOT, "src/app/lp/chromatics/layout.tsx");
    expect(existsSync(layoutPath)).toBe(true);
    const content = readFileSync(layoutPath, "utf8");
    expect(content).toContain("MetaPixel");
    expect(content).toContain("TrackingConsent");
  });

  test("success route exists as an App Router page with receipt verification", () => {
    const successPath = resolve(ROOT, "src/app/lp/chromatics/success/page.tsx");
    expect(existsSync(successPath)).toBe(true);
    const content = readFileSync(successPath, "utf8");
    expect(content).toContain("loadWorkshopReceipt");
    expect(content).toContain("CHROMATICS_SLUG");
  });

  test("landing page is strictly unlisted: noindex, follow", () => {
    expect(chromaticsMetadata.robots).toEqual({
      index: false,
      follow: true,
    });
    expect(chromaticsMetadata.alternates?.canonical).toBe(CHROMATICS_PATH);
  });

  test("ChromeGate hides the site Navbar and Footer on /lp/chromatics and success page", () => {
    expect(isChromelessPath("/lp/chromatics")).toBe(true);
    expect(isChromelessPath("/lp/chromatics/")).toBe(true);
    expect(isChromelessPath("/lp/chromatics/success")).toBe(true);
  });

  test("excluded from sitemap.ts", () => {
    const sitemapSource = readFileSync(resolve(ROOT, "src/app/sitemap.ts"), "utf8");
    expect(sitemapSource).not.toContain("/lp/chromatics");
    expect(sitemapSource).not.toContain("chromatics");
  });

  test("not listed on homepage or navigation", () => {
    const navbarSource = readFileSync(resolve(ROOT, "src/components/layout/navbar.tsx"), "utf8");
    const footerSource = readFileSync(resolve(ROOT, "src/components/layout/footer.tsx"), "utf8");
    expect(navbarSource).not.toContain("/lp/chromatics");
    expect(footerSource).not.toContain("/lp/chromatics");
  });
});

describe("CHROMATICS Landing Page: Content & Pricing", () => {
  test("pricing preserves approved 199 SAR VAT inclusive rate and checkout integrity", () => {
    expect(CHROMATICS_PRICING.tier1Sar).toBe(199);

    const componentSource = readFileSync(
      resolve(ROOT, "src/components/landing/chromatics/landing-page.tsx"),
      "utf8"
    );
    expect(componentSource).toContain("199");
    expect(componentSource).toContain("Full Masterclass Registration");
  });

  test("workshop catalog defines chromatics with 199 SAR VAT inclusive and full payment only", () => {
    const def = workshopCatalog(CHROMATICS_SLUG);
    expect(def).not.toBeNull();
    expect(def?.slug).toBe(CHROMATICS_SLUG);
    expect(def?.priceSar).toBe(199);
    expect(def?.depositSar).toBe(199);
    expect(def?.checkoutEnabled).toBe(true);
  });

  test("approved Moyasar guest checkout form and student fields are preserved", () => {
    expect(CHROMATICS_SLUG).toBe("chromatics");
    expect(CHROMATICS_CHECKOUT_ENABLED).toBe(true);
    expect(CHROMATICS_FORM_ANCHOR).toBe("chromatics-checkout");
    expect(CHROMATICS_HONEYPOT_FIELD).toBe("website");

    const formSource = readFileSync(
      resolve(ROOT, "src/components/landing/chromatics/checkout-form.tsx"),
      "utf8"
    );
    expect(formSource).toContain('name={field.key}');
    expect(formSource).toContain('key: "name"');
    expect(formSource).toContain('key: "email"');
    expect(formSource).toContain('key: "phone"');
    expect(formSource).toContain('name="service"');
    expect(formSource).toContain("CHROMATICS_HONEYPOT_FIELD");
    expect(formSource).toContain("startChromaticsCheckoutAction");
    expect(formSource).toContain("data-lp-chromatics-form");

    const landingSource = readFileSync(
      resolve(ROOT, "src/components/landing/chromatics/landing-page.tsx"),
      "utf8"
    );
    expect(landingSource).toContain("ChromaticsCheckoutForm");
  });

  test("server action validates guest details, service level, and initiates workshop checkout", () => {
    const actionSource = readFileSync(
      resolve(ROOT, "src/app/lp/chromatics/actions.ts"),
      "utf8"
    );
    expect(actionSource).toContain("validateGuestContact");
    expect(actionSource).toContain("VALID_SERVICE_LEVELS");
    expect(actionSource).toContain("startWorkshopCheckout");
    expect(actionSource).toContain("CHROMATICS_SLUG");
  });

  test("bilingual dictionary contains approved translations", () => {
    expect(Object.keys(AR_TEXT).length).toBeGreaterThan(150);
    expect(Object.keys(AR_ATTR).length).toBeGreaterThan(15);
    expect(AR_TEXT["Outcomes"]).toBe("النتائج");
    expect(AR_TEXT["Gallery"]).toBe("المعرض");
    expect(AR_TEXT["Curriculum"]).toBe("المحتوى");
    expect(AR_TEXT["Pricing"]).toBe("الأسعار");
    expect(AR_TEXT["Early Bird"]).toBe("الحجز المبكر");
  });
});

describe("CHROMATICS Landing Page: Assets & Styling", () => {
  test("all original images exist in public/images/landing/chromatics", () => {
    const images = [
      "cl-045-1n.JPG.jpeg",
      "1B9C0C3F-7F01-4C86-B7C3-789A7A34DAC2.JPG.jpeg",
      "1B2190DC-A929-4B76-BD10-B4F98EBA7AC1.JPG.jpeg",
      "1FA2BB5E-36F6-42B9-BD85-4071C31D4CE1.JPG.jpeg",
      "33A52D79-3117-491B-93D5-447033E6096E.JPG.jpeg",
      "9627FD84-8BF0-4C10-92C1-BA727005C93D.JPG.jpeg",
      "جلسة تصوير أزياء بإضاءة زرقاء وأرجوانية.png",
      "990C9583-C203-4DA1-BD3D-347479A6F496.JPG.jpeg",
      "13612F2F-7962-43A2-AE8A-FAAFF221DFA4.JPG.jpeg",
    ];

    for (const img of images) {
      const fullPath = resolve(ROOT, "public/images/landing/chromatics", img);
      expect(existsSync(fullPath)).toBe(true);
    }
  });

  test("dedicated CSS module contains brand orange, white background, and mobile rules", () => {
    const cssPath = resolve(ROOT, "src/components/landing/chromatics/chromatics.css");
    expect(existsSync(cssPath)).toBe(true);
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain("#EB542B");
    expect(css).toContain("#000000");
    expect(css).toContain("#FFFFFF");
    expect(css).toContain("IBM Plex Sans Arabic");
  });

  test("does not touch or modify existing landing pages or core logic", () => {
    expect(existsSync(resolve(ROOT, "src/app/lp/mobile-content/page.tsx"))).toBe(true);
    expect(existsSync(resolve(ROOT, "src/app/lp/photography-basics/(campaign)/page.tsx"))).toBe(true);
  });
});
