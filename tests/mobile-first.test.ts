/**
 * الهاتف أولًا.
 *
 * قياس على 20 صفحة × 10 عروض (320→1440): صفر فيض أفقي، لكن 37 عنصرًا
 * تفاعليًا كان أصغر من 40px على الهاتف — أصلها مقاسات نظام التصميم
 * المدمجة (h-9 = 36px، sm = 32px، icon = 36px). القاعدة هنا: المقاس
 * اللمسي هو الأساس، والمدمج يعود من `lg:` لأن اللوحي جهاز لمسي أيضًا.
 *
 * ومعه علة RTL حقيقية: إبهام المفتاح كان يتحرك بـ`translate-x` المادي،
 * فيخرج من مساره 13px يمينًا في الحالة المفعّلة بدل أن يزحف إلى طرفه.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const UI = "src/components/ui";

describe("controls are thumb-sized before they are compact", () => {
  test("every button size starts at 44px and shrinks only from lg", () => {
    const source = read(`${UI}/button.tsx`);
    const sizes = source.slice(source.indexOf("      size: {"), source.indexOf("    },\n    defaultVariants"));
    for (const [name, base, compact] of [
      ["default", "h-11", "lg:h-9"],
      ["sm", "h-11", "lg:h-8"],
      ["lg", "h-12", "lg:h-10"],
      ["icon", "size-11", "lg:size-9"],
    ]) {
      const line = sizes.split("\n").find((l) => l.trimStart().startsWith(`${name}:`)) ?? "";
      expect(line).toContain(base);
      expect(line).toContain(compact);
    }
    /* المقاس المدمج وحده يعني هدفًا 36px على الهاتف. */
    expect(sizes).not.toMatch(/(default|sm|lg|icon):\s*"h-9|"size-9"/);
  });

  test("text fields too — and their font stays 16px until lg", () => {
    /* أقل من 16px يجعل iOS يكبّر الصفحة عند التركيز، على الهاتف واللوحي. */
    for (const file of ["input.tsx", "textarea.tsx"]) {
      const source = read(join(UI, file));
      expect(source).toContain("lg:text-sm");
      expect(source).not.toContain("md:text-sm");
    }
    expect(read(`${UI}/input.tsx`)).toContain("h-11");
    expect(read(`${UI}/input.tsx`)).toContain("lg:h-9");
  });

  test("the select trigger and the editor tabs as well", () => {
    const select = read(`${UI}/select.tsx`);
    expect(select).toContain("data-[size=default]:h-11");
    expect(select).toContain("lg:data-[size=default]:h-9");
    const tabs = read(`${UI}/tabs.tsx`);
    expect(tabs).toContain("h-12");
    expect(tabs).toContain("lg:h-9");
  });

  test("native selects carry the 16px font on touch widths", () => {
    /* هذه خارج نظام التصميم، فلا يحميها إصلاح Input. */
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name).split("\\").join("/");
        if (entry.isDirectory()) { walk(full); continue; }
        if (!/\.tsx$/.test(entry.name)) continue;
        const source = read(full);
        if (!source.includes("<select")) continue;
        if (!source.includes("text-base") || !source.includes("lg:text-sm")) offenders.push(full);
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });
});

describe("the switch respects reading direction", () => {
  const source = read(`${UI}/switch.tsx`);

  test("the thumb moves along the inline axis, not a physical one", () => {
    expect(source).toContain("data-[state=checked]:start-[calc(100%-1rem)]");
    expect(source).toContain("data-[state=unchecked]:start-0");
    /* translate-x موجب يدفع يمينًا في الاتجاهين — وفي RTL يعني خارج المسار. */
    expect(source).not.toContain("data-[state=checked]:translate-x-");
  });

  test("the track positions the thumb and widens its touch area on touch screens", () => {
    expect(source).toContain("relative inline-flex");
    expect(source).toContain("before:-inset-x-2");
    expect(source).toContain("before:-inset-y-3.5");
    expect(source).toContain("lg:before:hidden");
  });
});

describe("direction stays logical outside the primitives", () => {
  const PHYSICAL = /^(?:ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r)-[a-z0-9./%[-]/;
  /* admin-shell يعاكس زر إغلاق Sheet عمدًا وموثّق في مكانه. */
  const ALLOWED = new Set(["src/components/admin/layout/admin-shell.tsx"]);

  test("no application component reaches for left/right", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name).split("\\").join("/");
        if (entry.isDirectory()) { if (full !== UI) walk(full); continue; }
        if (!/\.tsx$/.test(entry.name) || ALLOWED.has(full)) continue;
        /* الفئات وحدها تهم — لا أسماء الدوال ولا النص العربي. */
        const classes = [...read(full).matchAll(/className=(?:"([^"]*)"|\{[^}]*"([^"]*)"[^}]*\})/g)]
          .flatMap((m) => (m[1] ?? m[2] ?? "").split(/\s+/));
        if (classes.some((c) => PHYSICAL.test(c.replace(/^[a-z-]+:/, "")))) offenders.push(full);
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });

  test("the toast lands on the inline end, and its close gap is logical", () => {
    const source = read(`${UI}/toast.tsx`);
    expect(source).toContain("sm:end-0");
    expect(source).not.toContain("sm:right-0");
    expect(source).toContain("pe-6");
    /* space-x يوزّع الهوامش ماديًا؛ gap لا يعرف اتجاهًا. */
    expect(source).not.toContain("space-x-2");
  });
});
