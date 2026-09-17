/**
 * وسم السعر العام — دورة واحدة، وسم واحد.
 *
 * العلة التي يحرسها هذا الملف: الوسم كان يُشتق من الرقم (`formatPrice(0)`
 * ⇒ «حسب الطلب») بينما «مجانية» تُعرض من مصدر آخر، فظهر الوسمان معًا على
 * دورة مجانية منشورة. الحارس هنا يمنع عودة أي تناقض، ويمنع أن تعيد واجهة
 * جديدة اشتقاق السعر بنفسها.
 */

import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";

mock.module("server-only", () => ({}));

import { courseCommercialState, coursePriceDisplay } from "../src/lib/courses/commercial";

const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const QUOTE = "حسب الطلب";
const FREE = "مجانية";

const display = (spec: { category?: string; isFree?: boolean; requestQuote?: boolean; price?: number }) => {
  const course = {
    category: spec.category ?? "in-person-individuals",
    isFree: spec.isFree ?? false,
    requestQuote: spec.requestQuote ?? false,
    price: spec.price ?? 1000,
  };
  return coursePriceDisplay({ commercial: courseCommercialState(course), price: course.price });
};

/* ───────────────── 1. المجانية ───────────────── */

describe("a free course says free, and never says on-request", () => {
  test("the flag decides, not the number", () => {
    const result = display({ isFree: true, price: 0 });
    expect(result.label).toBe(FREE);
    expect(result.label).not.toBe(QUOTE);
    expect(result.note).toBeNull();
    expect(result.tone).toBe("free");
  });

  test("a free course carrying a leftover price is still free", () => {
    /* سعر قديم بقي في الصف بعد رفع علَم المجانية لا يجعلها مدفوعة. */
    expect(display({ isFree: true, price: 1000 }).label).toBe(FREE);
  });

  test("free online and free in-person read the same", () => {
    for (const category of ["online", "in-person-individuals", "private"]) {
      expect(display({ category, isFree: true, price: 0 }).label).toBe(FREE);
    }
  });
});

/* ───────────────── 2. المدفوعة ───────────────── */

describe("a paid course shows its price, and neither other label", () => {
  test("the price is the label, with the tax line beneath it", () => {
    const result = display({ price: 1000 });
    expect(result.label).toBe("1,000 ريال");
    expect(result.label).not.toBe(FREE);
    expect(result.label).not.toBe(QUOTE);
    expect(result.note).toBe("شامل ضريبة القيمة المضافة");
    expect(result.tone).toBe("price");
  });

  test("the displayed number is the VAT-inclusive price as stored", () => {
    /* لا حساب ضريبة هنا: السعر المخزَّن شامل أصلًا، والوسم يعرضه كما هو. */
    expect(display({ price: 1800 }).label).toBe("1,800 ريال");
    expect(display({ price: 450 }).label).toBe("450 ريال");
  });
});

/* ───────────────── 3. الشركات ───────────────── */

describe("corporate and request-quote ask for contact, not payment", () => {
  test("the corporate category alone is enough", () => {
    const result = display({ category: "in-person-corporates", price: 5000 });
    expect(result.label).toBe(QUOTE);
    expect(result.tone).toBe("quote");
  });

  test("the request-quote flag alone is enough", () => {
    expect(display({ requestQuote: true, price: 5000 }).label).toBe(QUOTE);
  });

  test("a corporate course never reads as free, whatever its flags say", () => {
    /* الشركات تسبق المجانية في السلّم — وإلا صار «مجانية» على برنامج بعقد. */
    expect(display({ category: "in-person-corporates", isFree: true, price: 0 }).label).toBe(QUOTE);
  });

  test("an unpriced normal course asks for contact, it is not a gift", () => {
    expect(display({ price: 0 }).label).toBe(QUOTE);
    expect(display({ price: 0 }).label).not.toBe(FREE);
  });
});

/* ───────────────── 4. لا وسمين متناقضين ───────────────── */

describe("no surface can show two contradicting labels", () => {
  const cases = [
    { isFree: true, price: 0 },
    { isFree: true, price: 1000 },
    { price: 1000 },
    { price: 0 },
    { category: "in-person-corporates", price: 5000 },
    { requestQuote: true, price: 0 },
    { category: "online", isFree: true, price: 0 },
    { category: "online", price: 450 },
  ];

  test("each state yields exactly one label", () => {
    for (const spec of cases) {
      const { label, note } = display(spec);
      const text = `${label} ${note ?? ""}`;
      const both = text.includes(FREE) && text.includes(QUOTE);
      expect(both).toBe(false);
    }
  });

  test("the tax line appears only where a real price is shown", () => {
    for (const spec of cases) {
      const result = display(spec);
      if (result.note !== null) expect(result.tone).toBe("price");
    }
  });

  test("no public surface formats a course price by itself any more", () => {
    /* كل واجهة تشتق وسمها بنفسها هي تناقض قادم. */
    for (const path of [
      "src/components/courses/course-card.tsx",
      "src/components/courses/course-details.tsx",
      "src/components/home/upcoming-course.tsx",
      "src/components/admin/preview/home-preview.tsx",
    ]) {
      const source = code(path);
      expect(source).toContain("coursePriceDisplay");
      expect(source).not.toMatch(/formatPrice\(\s*(course|session)/);
    }
  });

  test("the detail page no longer prints its own free label", () => {
    const source = code("src/components/courses/course-details.tsx");
    expect(source).not.toContain('enrollment?.mode === "free"');
    expect(source).not.toContain("شامل ضريبة القيمة المضافة");
  });
});

/* ──────────── السلّم واحد على الخادم وفي الواجهة ──────────── */

describe("the label agrees with what the server decided to sell", () => {
  const rows = [
    { category: "in-person-corporates", is_free: false, request_quote: true, price: 5000 },
    { category: "in-person-corporates", is_free: false, request_quote: false, price: 5000 },
    { category: "in-person-individuals", is_free: true, request_quote: false, price: 0 },
    { category: "in-person-individuals", is_free: false, request_quote: false, price: 1000 },
    { category: "online", is_free: false, request_quote: false, price: 450 },
    { category: "online", is_free: false, request_quote: false, price: 0 },
  ];

  test("both ladders reach the same state for every shape", async () => {
    const { commercialMode } = await import("../src/lib/payments/purchase");
    for (const row of rows) {
      const server = commercialMode({ publish_status: "published", ...row });
      const ui = courseCommercialState({
        category: row.category,
        isFree: row.is_free,
        requestQuote: row.request_quote,
        price: row.price,
      });
      expect(ui).toBe(server);
    }
  });

  test("a paid label never appears where the server refuses to sell", async () => {
    const { commercialMode } = await import("../src/lib/payments/purchase");
    for (const row of rows) {
      const server = commercialMode({ publish_status: "published", ...row });
      const label = coursePriceDisplay({
        commercial: courseCommercialState({
          category: row.category,
          isFree: row.is_free,
          requestQuote: row.request_quote,
          price: row.price,
        }),
        price: row.price,
      });
      if (server !== "paid") expect(label.tone).not.toBe("price");
    }
  });
});

/* ──────────── الحالة تصل الواجهة من الجسر لا من التخمين ──────────── */

describe("the state travels with the course, it is not re-derived", () => {
  test("the public type carries it and the bridge fills it", () => {
    expect(read("src/types/index.ts")).toContain("commercial: CourseCommercialState");
    expect(code("src/data/public-bridge.ts")).toContain("commercial: courseCommercialState({");
  });

  test("every static fallback course declares it", () => {
    const source = read("src/data/courses.ts");
    const prices = source.match(/^    price: \d+,$/gm) ?? [];
    const states = source.match(/^    commercial: "/gm) ?? [];
    expect(prices.length).toBeGreaterThan(0);
    expect(states.length).toBe(prices.length);
  });
});
