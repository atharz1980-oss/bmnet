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

describe("a policy without a grant is unreachable", () => {
  /**
   * علة وقعت فعلًا: social_links أُنشئ بخمس سياسات لـanon وauthenticated
   * وبلا أي GRANT. في Postgres يُرفض الدور بـ42501 قبل تقييم السياسة، فبقي
   * الجدول محجوبًا عن الزائر رغم سياسة القراءة العامة — وصامتًا لأن المحمّل
   * يعامله كجدول اختياري فيعيد قائمة فارغة.
   *
   * الحارس يقرأ الأدوار من كل سياسة ويطالب بمنح مقابل. النسخة الأولى منه
   * مرّت فارغة لأن تعبيرها افترض سطرًا واحدًا؛ لذلك يؤكد أولًا أنه عثر على
   * سياسات فعلًا قبل أن يحكم.
   */
  const POLICY = /create policy\s+\w+\s+on\s+public\.(\w+)\s*\n?\s*for\s+(select|insert|update|delete)\s+to\s+([a-z_,\s]+?)(?:\s+using|\s+with check|\s*;)/gi;

  function grantedRoles(table: string, action: string): string {
    const grants = [...sql.matchAll(
      new RegExp(String.raw`grant\s+([^;]*?)\s+on\s+(?:table\s+)?public\.${table}\b[^;]*?\s+to\s+([^;]+);`, "gi"),
    )];
    return grants
      .filter((g) => g[1].toLowerCase().includes(action) || g[1].toLowerCase().includes("all"))
      .map((g) => g[2])
      .join(" ");
  }

  /* الجداول المُنشأة بترحيلات مكتوبة يدويًا؛ جداول cp_c تُنشأ بحلقات DO
     فلا يراها التحليل النصي، وهي خارج نطاق هذا الحارس. */
  const HAND_WRITTEN = ["social_links", "commerce_settings", "payment_credentials"];

  const found = [...sql.matchAll(POLICY)]
    .map((m) => ({ table: m[1], action: m[2].toLowerCase(), roles: m[3].replace(/\s+/g, " ").trim() }))
    .filter((p) => HAND_WRITTEN.includes(p.table));

  test("the scan actually finds policies (guards against a vacuous test)", () => {
    expect(found.length).toBeGreaterThanOrEqual(5);
    expect(found.some((p) => p.table === "social_links" && p.roles.includes("anon"))).toBe(true);
  });

  test("every role named in a policy has a matching table grant", () => {
    const unreachable = found.flatMap((p) =>
      p.roles
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r === "anon" || r === "authenticated")
        .filter((role) => !grantedRoles(p.table, p.action).includes(role))
        .map((role) => `${p.table}.${p.action} → ${role} بلا grant`),
    );
    expect(unreachable).toEqual([]);
  });

  test("social_links carries the grants its policies need", () => {
    expect(sql).toMatch(/grant select on public\.social_links to anon, authenticated/);
    expect(sql).toMatch(/grant insert, update, delete on public\.social_links to authenticated/);
  });
});
