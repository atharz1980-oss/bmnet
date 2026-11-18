import { describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

mock.module("server-only", () => ({}));

const { isChromelessPath } = await import("@/components/layout/chrome-gate");
const {
  BEAUTY_CHECKOUT_ENABLED,
  BEAUTY_FORM_ANCHOR,
  BEAUTY_HONEYPOT_FIELD,
  BEAUTY_METADATA_AR,
  BEAUTY_PATH,
  BEAUTY_PRICING,
  BEAUTY_SLUG,
} = await import("@/data/landing/beauty");
const { metadata: beautyMetadata } = await import("@/app/lp/beauty/page");
const { workshopCatalog } = await import("@/lib/workshops/catalog");

const ROOT = resolve(".");

describe("BEAUTY Landing Page: Architecture & Routing", () => {
  test("route exists as an App Router page", () => {
    const pagePath = resolve(ROOT, "src/app/lp/beauty/page.tsx");
    expect(existsSync(pagePath)).toBe(true);
  });

  test("layout exists and follows campaign architecture with MetaPixel and TrackingConsent", () => {
    const layoutPath = resolve(ROOT, "src/app/lp/beauty/layout.tsx");
    expect(existsSync(layoutPath)).toBe(true);
    const content = readFileSync(layoutPath, "utf8");
    expect(content).toContain("MetaPixel");
    expect(content).toContain("TrackingConsent");
  });

  test("success route exists as an App Router page with receipt verification", () => {
    const successPath = resolve(ROOT, "src/app/lp/beauty/success/page.tsx");
    expect(existsSync(successPath)).toBe(true);
    const content = readFileSync(successPath, "utf8");
    expect(content).toContain("loadWorkshopReceipt");
    expect(content).toContain("BEAUTY_SLUG");
  });

  test("landing page is strictly unlisted: noindex, follow", () => {
    expect(beautyMetadata.robots).toEqual({
      index: false,
      follow: true,
    });
    expect(beautyMetadata.alternates?.canonical).toBe(BEAUTY_PATH);
  });

  test("ChromeGate hides the site Navbar and Footer on /lp/beauty and success page", () => {
    expect(isChromelessPath("/lp/beauty")).toBe(true);
    expect(isChromelessPath("/lp/beauty/")).toBe(true);
    expect(isChromelessPath("/lp/beauty/success")).toBe(true);
  });

  test("excluded from sitemap.ts", () => {
    const sitemapSource = readFileSync(resolve(ROOT, "src/app/sitemap.ts"), "utf8");
    expect(sitemapSource).not.toContain("/lp/beauty");
  });

  test("not listed on homepage or navigation", () => {
    const navbarSource = readFileSync(resolve(ROOT, "src/components/layout/navbar.tsx"), "utf8");
    const footerSource = readFileSync(resolve(ROOT, "src/components/layout/footer.tsx"), "utf8");
    expect(navbarSource).not.toContain("/lp/beauty");
    expect(footerSource).not.toContain("/lp/beauty");
  });
});

describe("BEAUTY Landing Page: Content & Pricing", () => {
  test("pricing preserves approved 1260 SAR rate and checkout integrity", () => {
    expect(BEAUTY_PRICING.tier1Sar).toBe(1260);

    const componentSource = readFileSync(
      resolve(ROOT, "src/components/landing/beauty/landing-page.tsx"),
      "utf8"
    );
    expect(componentSource).toContain("1,260");
  });

  test("workshop catalog defines beauty with 1260 SAR VAT inclusive and full payment only", () => {
    const def = workshopCatalog(BEAUTY_SLUG);
    expect(def).not.toBeNull();
    expect(def?.slug).toBe(BEAUTY_SLUG);
    expect(def?.priceSar).toBe(1260);
    expect(def?.depositSar).toBe(1260);
    expect(def?.checkoutEnabled).toBe(true);
  });

  test("approved Moyasar guest checkout form and fields are preserved", () => {
    expect(BEAUTY_SLUG).toBe("beauty");
    expect(BEAUTY_CHECKOUT_ENABLED).toBe(true);
    expect(BEAUTY_FORM_ANCHOR).toBe("beauty-checkout");
    expect(BEAUTY_HONEYPOT_FIELD).toBe("website");

    const formSource = readFileSync(
      resolve(ROOT, "src/components/landing/beauty/checkout-form.tsx"),
      "utf8"
    );
    expect(formSource).toContain('name={field.key}');
    expect(formSource).toContain('key: "name"');
    expect(formSource).toContain('key: "email"');
    expect(formSource).toContain('key: "phone"');
    expect(formSource).toContain("BEAUTY_HONEYPOT_FIELD");
    expect(formSource).toContain("startBeautyCheckoutAction");
    expect(formSource).toContain("data-lp-beauty-form");

    const landingSource = readFileSync(
      resolve(ROOT, "src/components/landing/beauty/landing-page.tsx"),
      "utf8"
    );
    expect(landingSource).toContain("BeautyCheckoutForm");
  });
});
