/**
 * اكتمال قوائم التعدادات.
 * الأنواع تُمحى وقت التشغيل، فـDB_ENUMS قوائم فعلية. التمرير بالنوع يمنع
 * القيمة المخترعة، لكنه لا يكشف قيمة ناقصة — وهذه وظيفة هذا الاختبار:
 * يقارن كل قائمة بتعريفها في src/types/database.ts المولّد من القاعدة.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { DB_ENUMS, dbEnumOr, isDbEnum, toDbEnum, type DbEnumName } from "../src/lib/cms/enums";

const source = readFileSync("src/types/database.ts", "utf8");

/** كتلة Enums في الملف المولّد → اسم التعداد ← قيمه. */
function generatedEnums(): Map<string, string[]> {
  const start = source.indexOf("    Enums: {");
  const end = source.indexOf("    CompositeTypes: {", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const body = source.slice(start + "    Enums: {".length, end);

  const found = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of body.split("\n")) {
    const header = line.match(/^\s{6}(\w+):\s*(.*)$/);
    if (header) {
      current = header[1];
      found.set(current, [...header[2].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
      continue;
    }
    const continuation = line.match(/^\s*\|\s*"([^"]+)"\s*$/);
    if (continuation && current) found.get(current)!.push(continuation[1]);
  }
  return found;
}

const GENERATED = generatedEnums();

describe("generated enum parsing", () => {
  test("the generated file yields a usable enum map", () => {
    expect(GENERATED.size).toBeGreaterThan(15);
    expect(GENERATED.get("course_level")).toEqual([
      "beginner", "intermediate", "advanced", "all-levels",
    ]);
    expect(GENERATED.get("social_platform")?.length).toBe(14);
  });
});

describe("DB_ENUMS matches the database contract", () => {
  for (const name of Object.keys(DB_ENUMS) as DbEnumName[]) {
    test(`${name} lists exactly the values the database defines`, () => {
      const generated = GENERATED.get(name);
      expect(generated).toBeDefined();
      /* الترتيب غير ملزم؛ المجموعة هي العقد. المقارنة نصية لأن القائمة
         المولّدة تُقرأ من ملف فتصل string[] لا الاتحاد الحرفي. */
      const declared: string[] = [...DB_ENUMS[name]];
      expect(declared.sort()).toEqual([...generated!].sort());
    });
  }
});

describe("enum guards", () => {
  test("accepts every declared value and rejects anything else", () => {
    for (const value of DB_ENUMS.request_status) expect(isDbEnum("request_status", value)).toBe(true);
    expect(isDbEnum("request_status", "cancelled")).toBe(false);
    expect(isDbEnum("request_status", "")).toBe(false);
    expect(isDbEnum("request_status", null)).toBe(false);
    expect(isDbEnum("request_status", 3)).toBe(false);
  });

  test("toDbEnum returns null rather than a wrong value", () => {
    expect(toDbEnum("payment_provider", "moyasar")).toBe("moyasar");
    expect(toDbEnum("payment_provider", "stripe")).toBeNull();
    expect(toDbEnum("payment_provider", undefined)).toBeNull();
  });

  test("dbEnumOr falls back only for invalid input", () => {
    expect(dbEnumOr("course_operational_status", "full", "coming-soon")).toBe("full");
    expect(dbEnumOr("course_operational_status", "unknown", "coming-soon")).toBe("coming-soon");
  });

  test("no enum list is empty or holds duplicates", () => {
    for (const name of Object.keys(DB_ENUMS) as DbEnumName[]) {
      const list = DB_ENUMS[name];
      expect(list.length).toBeGreaterThan(0);
      expect(new Set(list).size).toBe(list.length);
    }
  });
});
