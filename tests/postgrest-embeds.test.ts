/**
 * وضوح علاقات PostgREST داخل select.
 *
 * علة إنتاج وقعت فعلًا: خلاصة المجتمع كتبت `community_profiles!inner` بلا
 * تسمية المفتاح، وبين الجدولين ثلاث علاقات (المفتاح المباشر author_id،
 * وعلاقتان many-to-many عبر الإعجابات والمحفوظات). رفض PostgREST التخمين
 * بـPGRST201 فبقيت الصفحة تعرض «تعذر تحميل الخلاصة» لكل زائر.
 *
 * لا يلتقط TypeScript هذا الصنف: النص داخل select سلسلة عادية. هنا نستخرج
 * العلاقات من Relationships في العقد المولّد، ونلزم كل تضمين لجدول تتعدد
 * علاقاته بتسمية المفتاح صراحة.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const database = readFileSync("src/types/database.ts", "utf8");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );
}

/**
 * الجداول التي يجب تسمية مفتاح تضمينها.
 * community_profiles هو الحالة الحقيقية: تشير إليه جداول كثيرة، وتنشأ مسارات
 * many-to-many عبر الإعجابات والمحفوظات لا تظهر في علاقات الجدول الأب، فيتعذر
 * حساب الالتباس ثابتًا. التسمية الصريحة تُغني عن الحساب وتصمد أمام أي علاقة
 * تُضاف لاحقًا. تضمينات الجداول الأبناء (وسائط، إعجابات، تعليقات) بمفتاح واحد
 * لكل منها فتُترك على صيغتها المختصرة.
 */
const MUST_NAME_FK = ["community_profiles"];

describe("generated relationships parse", () => {
  test("the contract shows community_profiles is a target of many relationships", () => {
    const inbound = [...database.matchAll(/referencedRelation:\s*"community_profiles"/g)].length;
    expect(inbound).toBeGreaterThan(1);
  });
});

describe("embedded relations name their foreign key", () => {
  /** `alias:table` داخل select — مع أو بلا تسمية مفتاح بعده. */
  const EMBED = /(\w+)\s*:\s*(\w+)(!\w+)?(!inner|!left)?\s*\(/g;

  const offenders: string[] = [];
  let embedsChecked = 0;

  for (const file of sources("src")) {
    const text = readFileSync(file, "utf8");
    /* نصوص select وحدها: قوالب تحتوي أقواسًا وأسماء أعمدة. */
    for (const selectCall of text.matchAll(/\.select\(\s*`([^`]*)`/g)) {
      const body = selectCall[1];
      for (const embed of body.matchAll(EMBED)) {
        const [, alias, table, fkey] = embed;
        if (!MUST_NAME_FK.includes(table)) continue;
        embedsChecked++;
        /* المفتاح المسمّى ينتهي بـ_fkey؛ !inner وحده لا يرفع الالتباس. */
        if (!fkey || !fkey.endsWith("_fkey")) {
          offenders.push(`${file}: ${alias}:${table}${fkey ?? ""} — بلا تسمية مفتاح`);
        }
      }
    }
  }

  test("every community_profiles embed is disambiguated", () => {
    expect(embedsChecked).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  test("the community feed embed names the author foreign key", () => {
    const feed = readFileSync("src/lib/community/loaders.ts", "utf8");
    expect(feed).toContain("community_profiles!community_posts_author_id_fkey!inner");
    /* الصيغة الملتبسة التي أسقطت الخلاصة في الإنتاج. */
    expect(feed).not.toContain("community_profiles!inner");
  });
});
