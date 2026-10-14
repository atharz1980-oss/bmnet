/**
 * C06 — شريط الموافقة المدمج على الجوال: تغيير الشكل والنص المعتمد فقط.
 *
 * الحراسة هنا على:
 *  1. النص المعتمد حرفيًا، والإفصاح عن إعادة عرض الإعلانات باقٍ.
 *  2. «رفض» و«موافق» متساويان (القاعدة نفسها، 44px) — الرفض ليس أصعب.
 *  3. المنطق (القبول والرفض والتخزين والتنحي فوق الحجز) مطابق حرفيًا لـ main المنشور،
 *     ومكوّن الموافقة لم يتغير (أُضيفت قيمة العرض إلى مساعدات الـ Pixel في A/B).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const FILE = "src/components/landing/mobile-content/tracking-consent.tsx";
const source = readFileSync(FILE, "utf8");
const git = (...args: string[]) => Bun.spawnSync(["git", ...args]).stdout.toString();
const published = git("show", `origin/main:${FILE}`);
/** كل ما قبل JSX: الاستيرادات والمنطق والحسابات — عدا ثابت تنسيق الأزرار وتعليقه (شكل لا منطق) */
const logic = (text: string) =>
  text
    .slice(0, text.indexOf("  if (!visible) return null;"))
    .replace(/\r\n/g, "\n")
    .replace(/(?:\/\*[^\n]*\*\/\n)?const button =\n\s*"[^"]*";\n/, "const button = <styles>;\n");
/** قاعدة الأزرار المشتركة */
const base = source.match(/const button =\s*"([^"]+)"/)?.[1].split(/\s+/) ?? [];

describe("approved copy", () => {
  test("the disclosure is exactly the approved sentence, with the privacy link", () => {
    expect(source).toContain("نستخدم Meta لقياس حملاتنا وإعادة عرض إعلاناتنا، بموافقتك فقط.");
    expect(source).toContain('href="/policies/privacy"');
    expect(source).toContain("سياسة الخصوصية");
    expect(source).not.toContain("فيسبوك وإنستغرام");
  });

  test("retargeting stays disclosed and the choice labels are unchanged", () => {
    expect(source).toContain("إعادة عرض إعلاناتنا");
    expect(source).toMatch(/>\s*رفض\s*</);
    expect(source).toMatch(/>\s*موافق\s*</);
    expect(source).toContain('aria-label="تفضيلات التتبع الإعلاني"');
  });
});

describe("compact, equal choices", () => {
  test("both buttons share one base: at least 44px tall, same padding, weight and border", () => {
    for (const cls of ["min-h-11", "min-w-[4.5rem]", "flex-1", "border", "px-4", "text-sm", "font-semibold", "min-[360px]:flex-none"]) expect(base).toContain(cls);
    expect(source).toContain("className={`${button} border-white/25 text-white hover:bg-white/10`}");
    expect(source).toContain("className={`${button} bg-brand-600 text-brand-ink hover:bg-brand-500 border-transparent`}");
  });

  test("the card is small and stacks under 360px, one row from 360px", () => {
    expect(source).toContain("mx-auto flex max-w-md flex-col gap-2.5 rounded-2xl");
    expect(source).toContain("min-[360px]:flex-row min-[360px]:items-center");
    expect(source).toContain("text-[13px] leading-5");
  });
});

describe("behaviour is unchanged", () => {
  test("all logic above the markup is byte-identical to the published main", () => {
    expect(published.length).toBeGreaterThan(0);
    expect(logic(source)).toContain("const button = <styles>;");
    expect(logic(source)).toBe(logic(published));
  });

  test("accept, reject, the keep-clear rule and the reopen focus are wired as before", () => {
    expect(source).toContain('onClick={() => setConsent("denied")}');
    expect(source).toContain('onClick={() => setConsent("granted")}');
    expect(source).toContain("hidden={typing || (covering && !reopened)}");
    expect(source).toContain("style={{ bottom: offset }}");
    expect(source).toContain("ref={firstButton}");
    expect(source.match(/setConsent\(/g)?.length).toBe(2);
  });

  test("only the pricing helpers change; the consent wrapper stays untouched", () => {
    /* A/B أضاف قيمة العرض إلى meta-pixel.ts وpixel-events.tsx — مسموح؛
       أما مكوّن الموافقة (meta-pixel.tsx) فلا يتغير. */
    expect(git("diff", "--name-only", "origin/main", "--", "src/components/landing/mobile-content/meta-pixel.tsx").trim()).toBe("");
    const allowed = git(
      "diff", "--name-only", "origin/main", "--",
      "src/lib/landing/meta-pixel.ts",
      "src/components/landing/mobile-content/pixel-events.tsx",
    )
      .split("\n")
      .filter(Boolean)
      .sort();
    expect(allowed).toEqual([
      "src/components/landing/mobile-content/pixel-events.tsx",
      "src/lib/landing/meta-pixel.ts",
    ]);
  });
});
