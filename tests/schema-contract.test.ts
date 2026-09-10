import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const sql = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql"))
  .sort().map((f) => readFileSync(join("supabase/migrations", f), "utf8")).join("\n");
const tables = new Set([...sql.matchAll(/create table(?: if not exists)? public\.(\w+)/gi)].map((m) => m[1]));
const communityTables = [...tables].filter((name) => name.startsWith("community_"));
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory()
    ? sources(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []);
}

describe("checked-in SQL and application contract", () => {
  test("every literal database table query names a table in existing migrations", () => {
    const errors: string[] = [];
    let checked = 0;
    for (const file of sources("src")) {
      const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
      function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
          && node.expression.name.text === "from" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
          if (!node.expression.expression.getText(source).endsWith(".storage")) {
            checked++;
            if (!tables.has(node.arguments[0].text)) errors.push(`${file}: ${node.arguments[0].text}`);
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
    expect(checked).toBeGreaterThan(100);
    expect(errors).toEqual([]);
  });
  test("all twelve Community tables retain RLS", () => {
    expect(communityTables).toHaveLength(12);
    for (const table of communityTables) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    }
  });
  test("notification actor disambiguation matches the actual SQL foreign key", () => {
    const start = sql.indexOf("create table if not exists public.community_notifications");
    const definition = sql.slice(start, sql.indexOf("create index", start));
    expect(definition).toMatch(/actor_id uuid references public\.community_profiles\(user_id\)/);
    expect(definition).toMatch(/user_id uuid not null references public\.community_profiles\(user_id\)/);
  });
});
