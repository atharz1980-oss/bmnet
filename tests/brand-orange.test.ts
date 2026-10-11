/**
 * المرحلة B3 — البرتقالي الرسمي بدل الأحمر القديم في كل الموقع، مع فصل ألوان الحالات.
 *
 * الحراسة هنا على ما ينكسر بصمت عند تغيير لوحة الألوان المركزية:
 *  1. المصدر — globals.css يحمل قيم ملف الهوية نفسها التي في brand-tokens.ts، وكل رموز shadcn تشير إليها.
 *  2. الفصل — الأحمر القديم باقٍ في سلم danger وحده، ولا تستعمل رسائل الخطأ أو الحذف أو فشل الدفع سلم brand.
 *  3. التباين — لا نص أبيض على تعبئة برتقالية، والنص البرتقالي على الفاتح من درجة 700 فأغمق.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { brandTokens } from "../src/components/brand/brand-tokens";

const read = (path: string) => readFileSync(path, "utf8");
const GLOBALS = read("src/app/globals.css");
const ROOT_BLOCK = GLOBALS.slice(GLOBALS.indexOf(":root {"), GLOBALS.indexOf(".dark,"));
const DARK_BLOCK = GLOBALS.slice(GLOBALS.indexOf(".dark,"), GLOBALS.indexOf("@layer base"));
const cssVar = (block: string, name: string) => block.match(new RegExp(`\\s${name}:\\s*([^;]+);`))?.[1].trim();

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
const SOURCES = walk("src").map((path) => ({ path: path.replaceAll("\\", "/"), lines: read(path).split("\n") }));

/* WCAG 2.x relative luminance contrast */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("one orange, from the brand file", () => {
  test("the scale's 600 and the ink are the official values used by the chrome tokens", () => {
    const tokens = brandTokens as Record<string, string>;
    expect(cssVar(ROOT_BLOCK, "--brand-600")).toBe(tokens["--bm-orange"]);
    expect(cssVar(ROOT_BLOCK, "--brand-ink")).toBe(tokens["--bm-ink"]);
  });

  test("shadcn roles point at the brand scale instead of repeating a hex", () => {
    for (const block of [ROOT_BLOCK, DARK_BLOCK]) {
      for (const name of ["--primary", "--accent", "--ring"]) expect(cssVar(block, name)).toBe("var(--brand-600)");
      for (const name of ["--primary-foreground", "--accent-foreground"]) expect(cssVar(block, name)).toBe("var(--brand-ink)");
    }
    for (const name of ["--chart-1", "--sidebar-primary", "--sidebar-ring"]) expect(cssVar(ROOT_BLOCK, name)).toBe("var(--brand-600)");
    expect(cssVar(ROOT_BLOCK, "--sidebar-primary-foreground")).toBe("var(--brand-ink)");
  });

  test("the old red survives only as the danger scale; destructive stays red", () => {
    expect(cssVar(ROOT_BLOCK, "--danger-600")).toBe("#D92632");
    expect(cssVar(ROOT_BLOCK, "--destructive")).toBe("#DC2626");
    expect(GLOBALS).toContain("--color-danger-700: var(--danger-700);");
    for (const { path, lines } of SOURCES) {
      lines.forEach((line, i) => {
        if (/#d92632|217,\s*38,\s*50/i.test(line) && !/^\s*--danger-600:/.test(line)) {
          throw new Error(`old brand red at ${path}:${i + 1}`);
        }
      });
    }
  });
});

describe("contrast", () => {
  test("ink on the orange (and its hover), 700 text on white and on brand-50 pass AA", () => {
    const v = (name: string) => cssVar(ROOT_BLOCK, name)!;
    expect(contrast(v("--brand-ink"), v("--brand-600"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v("--brand-ink"), v("--brand-500"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v("--brand-700"), "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v("--brand-700"), v("--brand-50"))).toBeGreaterThanOrEqual(4.5);
    /* لماذا لا نص أبيض: الأبيض على البرتقالي الرسمي يفشل */
    expect(contrast("#FFFFFF", v("--brand-600"))).toBeLessThan(4.5);
  });

  test("no white text on an orange fill, and no darker hover under ink text", () => {
    for (const { path, lines } of SOURCES) {
      lines.forEach((line, i) => {
        /* كل سلسلة فئات وحدها: فرعا الشرط الثلاثي يحملان خلفيتين مختلفتين */
        for (const [, classes] of line.matchAll(/["'`]([^"'`]*)["'`]/g)) {
          if (!/(^|[\s:])bg-(brand-(500|600)|primary)(?![/\w-])/.test(classes)) continue;
          const where = `${path}:${i + 1}`;
          expect({ where, white: /(?<![-\w:])text-white\b/.test(classes) }).toEqual({ where, white: false });
          if (/text-brand-ink/.test(classes)) expect({ where, hover: /hover:bg-brand-(700|800)/.test(classes) }).toEqual({ where, hover: false });
        }
      });
    }
  });

  test("axe regressions from B3 stay fixed: campaign step numbers and the active filter count", () => {
    /* الأرقام 01–05: 600 على الأبيض 3.57:1 ← 700 بنسبة 5.50:1 */
    expect(read("src/components/landing/mobile-content/landing-page.tsx")).toContain(
      'className="font-latin text-sm font-bold tracking-wider text-brand-700"',
    );
    /* عدد الفلتر النشط: أبيض 70% على البرتقالي 2.46:1 ← فحمي صلب 4.72:1 */
    const explorer = read("src/components/courses/courses-explorer.tsx");
    expect(explorer).toContain('activeCategory === tab.id ? "text-brand-ink" : "text-charcoal-400"');
    expect(explorer).not.toContain("text-white/");
  });

  test("the course category badge on the dark course hero is ink on the official orange (was inherited white, 3.58:1)", () => {
    expect(read("src/components/courses/course-details.tsx")).toContain(
      '<span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-brand-ink">',
    );
  });

  test("the shared link button and section eyebrow use readable orange", () => {
    expect(read("src/components/ui/button.tsx")).toContain('link: "text-brand-700 underline-offset-4 hover:underline"');
    expect(read("src/components/shared/section-heading.tsx")).toContain('dark ? "text-brand-600" : "text-brand-700"');
  });
});

describe("CTA buttons: official orange with ink (dark-orange experiment withdrawn)", () => {
  const CTA_LINES: [string, string][] = [
    ["src/app/lp/mobile-content/success/page.tsx", "justify-center rounded-xl bg-brand-600"],
    ["src/app/lp/photography-basics/(campaign)/success/page.tsx", "justify-center rounded-xl bg-brand-600"],
    ["src/components/landing/mobile-content/checkout-cta.tsx", "shadow-brand-900/30"],
    ["src/components/landing/mobile-content/guest-checkout-form.tsx", "shadow-brand-900/30"],
    ["src/components/landing/mobile-content/tracking-consent.tsx", "${button} bg-brand-600"],
    ["src/components/landing/photography-basics/sticky-cta.tsx", "rounded-xl bg-brand-600"],
    ["src/components/landing/photography-basics/balance-form.tsx", "rounded-xl bg-brand-600"],
    ["src/components/landing/photography-basics/checkout-form.tsx", "rounded-xl bg-brand-600"],
  ];

  test("no button-only colour tokens exist anywhere — the experiment cannot come back silently", () => {
    expect(GLOBALS).not.toContain("--button-primary");
    for (const { path, lines } of SOURCES) {
      lines.forEach((line, i) => {
        if (/button-primary/.test(line)) throw new Error(`dark-button token at ${path}:${i + 1}`);
      });
    }
  });

  test("the shared Button primary/default and the header CTA are the official orange with ink", () => {
    const button = read("src/components/ui/button.tsx");
    expect(button.match(/"bg-primary text-primary-foreground shadow-xs hover:bg-primary\/90 active:scale-\[0\.99\]"/g)?.length).toBe(2);
    expect(cssVar(ROOT_BLOCK, "--primary")).toBe("var(--brand-600)");
    expect(cssVar(ROOT_BLOCK, "--primary-foreground")).toBe("var(--brand-ink)");
    const cta = read("src/components/layout/navbar.tsx").match(/const ctaClass =\s*"([^"]+)"/)?.[1].split(/\s+/) ?? [];
    expect(cta).toContain("bg-[var(--bm-orange)]");
    expect(cta).toContain("text-[var(--bm-ink)]");
  });

  test("hand-written campaign CTAs are orange with ink and a lighter hover, never dark orange with white", () => {
    for (const [file, marker] of CTA_LINES) {
      const line = read(file).split("\n").find((l) => l.includes(marker) && /bg-brand-600/.test(l)) ?? "";
      expect({ file, line: /(?<![\w:-])bg-brand-600\b/.test(line) && /(?<![\w:-])text-brand-ink\b/.test(line) }).toEqual({ file, line: true });
      expect({ file, dark: /(?<![\w:-])bg-brand-(700|800)\b|text-white\b/.test(line) }).toEqual({ file, dark: false });
    }
    expect(read("src/components/landing/photography-basics/landing-page.tsx").match(/rounded-xl bg-brand-600 px-6 text-base font-semibold text-brand-ink[^"]*hover:bg-brand-500/g)?.length).toBe(2);
    expect(read("src/components/admin/preview/home-preview.tsx").match(/rounded-lg bg-brand-600 px-8 text-(base|sm) font-semibold text-brand-ink/g)?.length).toBe(3);
  });

  test("non-button orange fills (badges, numbered dots, filter chips) stay #E65A2E with ink", () => {
    const campaign = read("src/components/landing/mobile-content/landing-page.tsx");
    expect(campaign).toContain('className="inline-flex rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-brand-ink">عرض خاص</span>');
    expect(read("src/components/courses/courses-explorer.tsx")).toContain('"border-brand-600 bg-brand-600 text-brand-ink"');
    expect(read("src/components/paths/paths-view.tsx")).toContain("bg-brand-600 text-xs text-brand-ink");
    expect(read("src/components/courses/course-tabs.tsx")).toContain('isOpen ? "bg-brand-600 text-brand-ink"');
  });
});

describe("status colours are not the brand", () => {
  test("no alert or field error uses the brand scale", () => {
    for (const { path, lines } of SOURCES) {
      lines.forEach((line, i) => {
        if (/role="alert"|-error`\}/.test(line) && /\bbrand-\d/.test(line)) throw new Error(`alert on brand scale at ${path}:${i + 1}`);
      });
    }
  });

  test("checkout, balance and booking errors keep the red, form logic untouched", () => {
    for (const file of [
      "src/components/landing/mobile-content/guest-checkout-form.tsx",
      "src/components/landing/photography-basics/checkout-form.tsx",
    ]) {
      const source = read(file);
      expect(source).toContain('error ? "border-danger-600" : "border-charcoal-300"');
      expect(source).toContain('className="mt-1.5 text-sm text-danger-700"');
      expect(source).toContain('role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm leading-relaxed text-danger-800"');
    }
    expect(read("src/components/landing/photography-basics/balance-form.tsx")).toContain("bg-danger-50");
    expect(read("src/components/courses/enroll-card.tsx")).toContain("bg-danger-50");
  });

  test("a failed payment outcome stays red on both campaign success pages", () => {
    for (const file of ["src/app/lp/mobile-content/success/page.tsx", "src/app/lp/photography-basics/(campaign)/success/page.tsx"]) {
      expect(read(file)).toContain('<XCircle aria-hidden="true" className="h-12 w-12 text-danger-600" />');
    }
  });

  test("admin delete and remove actions are danger, not brand", () => {
    for (const { path, lines } of SOURCES) {
      if (!path.includes("/admin/")) continue;
      lines.forEach((line, i) => {
        const label = lines.slice(Math.max(0, i - 3), i + 4).join(" ");
        const isDelete = /aria-label=\{`(حذف|إزالة)/.test(label) && /className="[^"]*hover:bg-/.test(line);
        if (isDelete && /\bbrand-\d/.test(line)) throw new Error(`delete action on brand scale at ${path}:${i + 1}`);
      });
    }
  });
});
