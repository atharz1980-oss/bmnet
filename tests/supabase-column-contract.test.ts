/**
 * عقد الأعمدة بين الكود وملفات SQL.
 * لا توجد أنواع Database مولّدة من Supabase، فاسم عمود خاطئ يمر من
 * TypeScript ولا يظهر إلا كخطأ وقت التشغيل. هذا الاختبار يسد تلك الفجوة
 * ثابتًا: كل اسم عمود حرفي في مرشّحات الاستعلام يجب أن يوجد في الجدول
 * الذي ناداه .from في السلسلة نفسها.
 *
 * لا يغني عن الأنواع المولّدة: لا يفحص الأنواع ولا الاستعلامات المركّبة
 * ولا العلاقات المضمّنة داخل select.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const MIGRATIONS = "supabase/migrations";
const sql = readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(join(MIGRATIONS, name), "utf8"))
  .join("\n");

/** بنود الجدول تُفصل بفواصل على العمق صفر؛ القيود ليست أعمدة. */
const TABLE_LEVEL_KEYWORDS = new Set([
  "constraint", "primary", "unique", "check", "foreign", "exclude", "like",
]);

function addColumn(target: Set<string>, clause: string): void {
  const cleaned = clause.split("\n").map((line) => line.replace(/--.*$/, "")).join("\n").trim();
  const first = cleaned.split(/\s+/)[0]?.toLowerCase();
  if (!first || TABLE_LEVEL_KEYWORDS.has(first)) return;
  if (/^[a-z_][a-z0-9_]*$/.test(first)) target.add(first);
}

function parseColumns(): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();
  const header = /create table (?:if not exists )?public\.(\w+)\s*\(/gi;
  let match: RegExpExecArray | null;
  while ((match = header.exec(sql))) {
    let index = header.lastIndex;
    let depth = 1;
    while (index < sql.length && depth > 0) {
      if (sql[index] === "(") depth++;
      else if (sql[index] === ")") depth--;
      index++;
    }
    const body = sql.slice(header.lastIndex, index - 1);
    const target = tables.get(match[1]) ?? new Set<string>();
    let nesting = 0;
    let clause = "";
    for (const char of body) {
      if (char === "(") nesting++;
      else if (char === ")") nesting--;
      if (char === "," && nesting === 0) {
        addColumn(target, clause);
        clause = "";
      } else clause += char;
    }
    addColumn(target, clause);
    tables.set(match[1], target);
  }
  for (const added of sql.matchAll(/alter table (?:only )?public\.(\w+)\s+add column (?:if not exists )?(\w+)/gi)) {
    const target = tables.get(added[1]) ?? new Set<string>();
    target.add(added[2]);
    tables.set(added[1], target);
  }
  return tables;
}

const TABLES = parseColumns();

const FILTERS = new Set([
  "eq", "neq", "gt", "gte", "lt", "lte", "is", "in", "like", "ilike", "order", "contains", "overlaps",
]);

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );
}

/** أقرب .from في السلسلة نفسها؛ استدعاءات التخزين ليست جداول. */
function tableOfChain(node: ts.Node, source: ts.SourceFile): string | null {
  let current: ts.Node | null = node;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.name.text === "from" &&
      current.arguments[0] &&
      ts.isStringLiteral(current.arguments[0])
    ) {
      if (current.expression.expression.getText(source).endsWith(".storage")) return null;
      return current.arguments[0].text;
    }
    current = ts.isCallExpression(current)
      ? current.expression
      : ts.isPropertyAccessExpression(current)
        ? current.expression
        : null;
  }
  return null;
}

interface Reference {
  file: string;
  table: string;
  column: string;
  method: string;
}

function collectReferences(): Reference[] {
  const found: Reference[] = [];
  for (const file of sources("src")) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        FILTERS.has(node.expression.name.text) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const column = node.arguments[0].text;
        /* أسماء بسيطة فقط: مسارات json والعلاقات المضمّنة خارج النطاق. */
        if (/^[a-z_][a-z0-9_]*$/.test(column)) {
          const table = tableOfChain(node.expression.expression, source);
          if (table && TABLES.has(table)) {
            found.push({ file, table, column, method: node.expression.name.text });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}

describe("supabase column contract", () => {
  test("the migrations parse into a usable column map", () => {
    expect(TABLES.size).toBeGreaterThan(40);
    const posts = TABLES.get("community_posts");
    expect(posts).toBeDefined();
    /* عدم الخلط بين الأعمدة والقيود: author_id عمود، no_self_follow ليس كذلك. */
    expect(posts?.has("author_id")).toBe(true);
    expect(posts?.has("status")).toBe(true);
    expect(posts?.has("auther_id")).toBe(false);
    expect(TABLES.get("community_follows")?.has("no_self_follow")).toBe(false);
    expect(TABLES.get("community_notifications")?.has("read_at")).toBe(true);
  });

  test("every literal filter column exists in the table its chain queries", () => {
    const references = collectReferences();
    expect(references.length).toBeGreaterThan(100);
    const unknown = references
      .filter((reference) => !TABLES.get(reference.table)?.has(reference.column))
      .map((reference) => `${reference.file}: ${reference.table}.${reference.column} in .${reference.method}()`);
    expect(unknown).toEqual([]);
  });

  test("new payment and social tables are covered by the same contract", () => {
    expect(TABLES.get("commerce_settings")?.has("vat_number")).toBe(true);
    expect(TABLES.get("commerce_settings")?.has("national_short_address")).toBe(true);
    expect(TABLES.get("payment_credentials")?.has("encrypted_payload")).toBe(true);
    expect(TABLES.get("social_links")?.has("platform")).toBe(true);
  });
});
