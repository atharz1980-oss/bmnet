/**
 * الدورات الأونلاين — المرحلة الأولى: المحتوى والوصول.
 *
 * الخطر المحدد هنا واحد: أن يتسرّب معرّف فيديو Bunny إلى المتصفح. من ملكه
 * شاهد الدرس بلا تسجيل ولا دفع. الدفاع ثلاث طبقات لا واحدة — RLS، ومنع
 * على مستوى العمود في القاعدة، ورابط تشغيل موقّع ينتهي. هذه الاختبارات
 * تحرس الثلاث.
 *
 * والحدّ الثاني: ألا يمس هذا العمل `save_course_atomic` — المعاملة التي
 * أُغلق بها HIGH بعد أن محا نمطها بيانات دورة على الإنتاج.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";

import { formatLessonDuration, formatTotalDuration } from "../src/lib/learning/format";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const MIGRATION = "supabase/migrations/20260915150000_online_course_content.sql";
const ACTIONS = "src/app/admin/actions/learning.ts";
const BUNNY = "src/lib/learning/bunny.ts";
const CONTENT = "src/lib/learning/content.ts";
const PLAYER = "src/app/learn/[slug]/[lessonId]/page.tsx";
const LIST = "src/components/learning/course-content-list.tsx";

describe("the video id never reaches the browser", () => {
  const sql = read(MIGRATION);

  test("anon and authenticated are granted columns, never the whole lessons table", () => {
    /* `grant select on table` يمنح كل عمود حاضر ومستقبلي — بما فيه video_id. */
    expect(sql).not.toMatch(/grant select on table public\.course_lessons to anon/);
    const grant = sql.slice(sql.indexOf("grant select ("), sql.indexOf("to anon, authenticated;", sql.indexOf("grant select (")));
    expect(grant).toContain("title");
    expect(grant).toContain("duration_seconds");
    expect(grant).not.toContain("video_id");
  });

  test("RLS still gates the rows on top of the column grant", () => {
    expect(sql).toContain("alter table public.course_lessons enable row level security");
    expect(sql).toContain("create policy public_course_lessons_select");
    /* الدرس غير المنشور لا يُقرأ، ولا درس في دورة غير منشورة. */
    const policy = sql.slice(sql.indexOf("create policy public_course_lessons_select"), sql.indexOf("grant select ("));
    expect(policy).toContain("published");
    expect(policy).toContain("publish_status = 'published'");
  });

  test("the server shape exposes whether a video exists, not which one", () => {
    const source = read(CONTENT);
    expect(source).toContain("hasVideo");
    /* لو ظهر video_id في الشكل المُعاد لسافر إلى العميل مع أول تمرير. */
    const shape = source.slice(source.indexOf("export interface LessonSummary"), source.indexOf("export interface ModuleSummary"));
    expect(shape).not.toContain("videoId");
    expect(shape).not.toContain("video_id");
  });

  test("the public content list renders no video identifier", () => {
    const source = read(LIST);
    expect(source).not.toContain("video_id");
    expect(source).not.toContain("videoId");
  });
});

describe("playback urls are signed and short-lived", () => {
  const source = read(BUNNY);

  test("the module is server-only", () => {
    expect(source).toContain('import "server-only"');
  });

  test("a url carries a token and an expiry", () => {
    expect(source).toContain("playbackToken");
    expect(source).toContain('url.searchParams.set("token"');
    expect(source).toContain('url.searchParams.set("expires"');
  });

  test("a missing or malformed configuration yields null, never a broken url", () => {
    expect(source).toContain("): BunnyConfig | null");
    expect(source).toContain("return null");
  });

  test("the player refuses to render without both a config and a video", () => {
    const player = read(PLAYER);
    expect(player).toContain("config && context.lesson.video_id");
    /* صفحة درس تُخزَّن = رابط موقّع يُخدَم لغير صاحبه. */
    expect(player).toContain('export const dynamic = "force-dynamic"');
    expect(player).toContain("export const revalidate = 0");
  });
});

describe("access is decided per request", () => {
  test("the player checks entitlement before it builds a url", () => {
    const player = read(PLAYER);
    const check = player.indexOf("hasCourseAccess");
    const build = player.indexOf("playbackUrl(");
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(build);
  });

  test("an expired enrollment is not access", () => {
    const source = read(CONTENT);
    const body = source.slice(source.indexOf("export async function hasCourseAccess"));
    expect(body).toContain("expires_at === null");
    expect(body).toContain("getTime() > now.getTime()");
  });

  test("a guest is sent to login and returns to the same lesson", () => {
    const player = read(PLAYER);
    expect(player).toContain("communityLoginHref(lessonPath)");
  });

  test("a free preview lesson opens without an enrollment", () => {
    expect(read(PLAYER)).toContain("context.lesson.free_preview ||");
  });

  test("/learn refreshes the session but does not guard it", () => {
    /* بلا تجديد، عضو تصفّح ساعة يُعامل كزائر رغم رمز تحديث صالح. */
    const middleware = read("src/middleware.ts");
    expect(middleware).toContain('"/learn/:path*"');
    expect(middleware).not.toContain('pathname.startsWith("/learn")');
  });

  test("crawlers are kept out of the protected area", () => {
    expect(read("public/robots.txt")).toContain("Disallow: /learn");
  });
});

describe("the module stays out of the atomic course save", () => {
  /* التعليقات تشرح سبب الفصل وتذكر الاسم؛ الممنوع هو الاستدعاء. */
  const stripSqlComments = (sql: string) => sql.replace(/^\s*--.*$/gm, "");
  const stripTsComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  test("its actions never call save_course_atomic", () => {
    expect(stripTsComments(read(ACTIONS))).not.toContain("save_course_atomic");
  });

  test("and it neither alters courses nor drops anything", () => {
    expect(existsSync(MIGRATION)).toBe(true);
    const sql = stripSqlComments(read(MIGRATION));
    expect(sql).not.toContain("save_course_atomic");
    expect(sql).not.toContain("alter table public.courses");
    expect(sql).not.toMatch(/drop/i);
    /* إضافة محضة: ثلاثة جداول جديدة ولا مساس بقائم. */
    expect(sql.match(/create table public\.\w+/g)).toEqual([
      "create table public.course_modules",
      "create table public.course_lessons",
      "create table public.course_enrollments",
    ]);
  });

  test("every write is gated and no browser role may write", () => {
    const source = read(ACTIONS);
    const gates = source.split('requirePermission("courses", "edit")').length - 1;
    /* ثمانية إجراءات كتابة، لكل واحد بوابته. */
    expect(gates).toBe(8);
    const sql = read(MIGRATION);
    expect(sql).toContain("revoke all on public.course_modules, public.course_lessons, public.course_enrollments\n  from public, anon, authenticated;");
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*to (anon|authenticated)/);
  });

  test("publishing a lesson without a video is refused at the source", () => {
    expect(read(ACTIONS)).toContain("لا يمكن نشر درس بلا فيديو");
  });
});

describe("durations read naturally in Arabic", () => {
  test("lesson durations", () => {
    expect(formatLessonDuration(0)).toBe("");
    expect(formatLessonDuration(90)).toBe("2 د");
    expect(formatLessonDuration(3600)).toBe("1 س");
    expect(formatLessonDuration(5400)).toBe("1 س 30 د");
  });

  test("course totals", () => {
    expect(formatTotalDuration(0)).toBe("");
    expect(formatTotalDuration(1800)).toBe("30 دقيقة");
    expect(formatTotalDuration(7200)).toBe("2 ساعة");
    expect(formatTotalDuration(9000)).toBe("2.5 ساعة");
  });
});
