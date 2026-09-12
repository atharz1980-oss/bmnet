/**
 * عقد RLS للمجتمع — تأكيدات نصية على ملفات SQL المُودعة.
 * لا قاعدة بيانات هنا: هذه حراسة انحدار للعيوب المصححة في
 * 20260912140000_community_rls_corrections.sql، ولا تُغني عن اختبار حي
 * بحسابين على قاعدة فعلية.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";
const files = readdirSync(DIR).filter((name) => name.endsWith(".sql")).sort();
const sql = files.map((name) => readFileSync(join(DIR, name), "utf8")).join("\n");

/** آخر تعريف يفوز في Postgres، فالتأكيد يجب أن يقع عليه لا على الأول. */
function lastDefinition(marker: string): string {
  const index = sql.lastIndexOf(marker);
  expect(index).toBeGreaterThan(-1);
  const body = sql.slice(index);
  const end = body.indexOf("$$;");
  return end === -1 ? body : body.slice(0, end);
}

/** نص السياسة كما ستُطبَّق: آخر create policy يحمل هذا الاسم. */
function lastPolicy(name: string): string {
  const index = sql.lastIndexOf(`create policy ${name}`);
  expect(index).toBeGreaterThan(-1);
  const body = sql.slice(index);
  const end = body.indexOf(";");
  return end === -1 ? body : body.slice(0, end);
}

describe("community block helper", () => {
  const definition = lastDefinition("create or replace function private.community_block_between");

  test("no longer refuses a member interacting with their own content", () => {
    /* الشرط a <> b كان يمنع الإعجاب بالمنشور الذاتي والرد على تعليقاته. */
    expect(definition).not.toMatch(/a\s*<>\s*b/);
  });

  test("still refuses interaction in either direction of a block", () => {
    expect(definition).toContain("blk.blocker_id = a and blk.blocked_id = b");
    expect(definition).toContain("blk.blocker_id = b and blk.blocked_id = a");
    expect(definition).toContain("not exists");
  });

  test("self follow stays blocked by its own guards, not by the helper", () => {
    expect(sql).toContain("constraint no_self_follow check (follower_id <> following_id)");
    expect(lastPolicy("community_follows_insert_own")).toContain("follower_id <> following_id");
  });
});

describe("notification writes", () => {
  test("members may update only the read column", () => {
    const revoke = sql.lastIndexOf("revoke update on public.community_notifications from authenticated");
    const grant = sql.lastIndexOf("grant update (read_at) on public.community_notifications to authenticated");
    expect(revoke).toBeGreaterThan(-1);
    expect(grant).toBeGreaterThan(revoke);
  });

  test("no member insert policy exists — triggers own creation", () => {
    expect(sql).not.toMatch(/create policy \w+\s+on public\.community_notifications for insert/);
  });
});

describe("media rows stay inside the owner storage folder", () => {
  for (const policy of ["community_post_media_update_own", "community_portfolio_media_update_own"]) {
    test(`${policy} keeps the ownership condition its insert policy enforces`, () => {
      const body = lastPolicy(policy);
      const check = body.slice(body.indexOf("with check"));
      expect(check).toContain("storage_path like 'community/'");
      expect(check).toContain("(select auth.uid())::text");
    });
  }

  for (const policy of ["community_post_media_write_own", "community_portfolio_media_insert_own"]) {
    test(`${policy} still constrains the storage path`, () => {
      expect(lastPolicy(policy)).toContain("storage_path like 'community/'");
    });
  }
});

describe("corrective migration hygiene", () => {
  const corrective = readFileSync(join(DIR, "20260912140000_community_rls_corrections.sql"), "utf8");

  test("changes no table and destroys no data", () => {
    for (const forbidden of [/create table/i, /drop table/i, /truncate/i, /delete from/i, /alter table \w+ drop/i]) {
      expect(corrective).not.toMatch(forbidden);
    }
  });

  test("runs as one transaction", () => {
    expect(corrective.trimStart().startsWith("--") || corrective.includes("begin;")).toBe(true);
    expect(corrective).toContain("begin;");
    expect(corrective.trimEnd().endsWith("commit;")).toBe(true);
  });
});
