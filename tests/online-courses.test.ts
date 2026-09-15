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
    /* ولا لأي جدول من الثلاثة: المنح كله بالأعمدة. */
    expect(sql).not.toMatch(/grant select on table public\.course_(modules|lessons|enrollments)/);
    const start = sql.indexOf("id, module_id, title, description, lesson_type");
    const grant = sql.slice(start, sql.indexOf(") on table public.course_lessons", start));
    expect(grant).toContain("title");
    expect(grant).toContain("duration_seconds");
    expect(grant).not.toContain("video_id");
  });

  test("RLS gates rows at all three levels on top of the column grant", () => {
    expect(sql).toContain("alter table public.course_lessons enable row level security");
    const policy = sql.slice(
      sql.indexOf("create policy public_course_lessons_select"),
      sql.indexOf("-- منح بالعمود عمدًا"),
    );
    /* الدرس منشور، ووحدته منشورة، ودورته منشورة — الثلاثة معًا. */
    expect(policy).toContain("published");
    expect(policy).toContain("parent.published");
    expect(policy).toContain("publish_status = 'published'");
    const modulePolicy = sql.slice(
      sql.indexOf("create policy public_course_modules_select"),
      sql.indexOf("grant select (id, course_id"),
    );
    expect(modulePolicy).toContain("published");
    expect(modulePolicy).toContain("publish_status = 'published'");
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
    /* fail closed: بلا إعداد موقّع لا مشغّل — ولا embed غير موقّع بديلًا. */
    expect(player).toContain("config && context.lesson.video_id");
    expect(player).not.toContain("iframe.mediadelivery.net");
    /* صفحة درس تُخزَّن = رابط موقّع يُخدَم لغير صاحبه. */
    expect(player).toContain('export const dynamic = "force-dynamic"');
    expect(player).toContain("export const revalidate = 0");
  });
});

describe("access is decided per request", () => {
  test("the player decides access before it builds a url", () => {
    const player = read(PLAYER);
    const decide = player.indexOf("decideLessonAccess");
    const build = player.indexOf("playbackUrl(");
    expect(decide).toBeGreaterThan(-1);
    expect(decide).toBeLessThan(build);
    /* والمسودة تخرج بـ404 قبل أن يُبنى أي رابط. */
    expect(player.indexOf('decision.outcome === "not-found"')).toBeLessThan(build);
  });

  test("the decision lives in one pure place, not scattered in the page", () => {
    const player = read(PLAYER);
    /* لا حكم وصول مكتوب يدويًا في الصفحة يلتف حول الدالة. */
    expect(player).not.toContain("free_preview ||");
    expect(player).not.toContain("hasCourseAccess");
    expect(read("src/lib/learning/access.ts")).toContain("export function decideLessonAccess");
  });

  test("a guest is sent to login and returns to the same lesson", () => {
    expect(read(PLAYER)).toContain("communityLoginHref(lessonPath)");
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
    const exported = source.match(/export async function \w+/g) ?? [];
    const gates = source.split('requirePermission("courses", "edit")').length - 1;
    /* لكل إجراء مُصدَّر بوابته — لا استثناء. */
    expect(gates).toBe(exported.length);
    expect(gates).toBeGreaterThanOrEqual(11);
    const sql = read(MIGRATION);
    expect(sql).toContain("revoke all on public.course_modules, public.course_lessons, public.course_enrollments\n  from public, anon, authenticated;");
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*to (anon|authenticated)/);
  });

  test("publishing a video lesson without a video is refused in code and in the schema", () => {
    expect(read(ACTIONS)).toContain("لا يمكن نشر درس فيديو بلا فيديو");
    /* طبقتان: الإجراء يرد بالعربية، والقاعدة ترفض أيًّا كان الكاتب. */
    expect(read(MIGRATION)).toContain("course_lessons_published_video_required");
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

describe("the schema carries the guarantees the code assumes", () => {
  const sql = read(MIGRATION);

  test("enrollment has an explicit status with the five states", () => {
    expect(sql).toContain("status text not null default 'active'");
    for (const state of ["pending", "active", "cancelled", "expired", "refunded"]) {
      expect(sql).toContain(`'${state}'`);
    }
    /* الفهرس الذي تستعلمه لوحة الإدارة وتحقق الوصول. */
    expect(sql).toContain("(course_id, status)");
  });

  test("deleting a course cannot erase who was enrolled in it", () => {
    const enrollments = sql.slice(
      sql.indexOf("create table public.course_enrollments"),
      sql.indexOf("create index idx_course_enrollments_user"),
    );
    expect(enrollments).toContain("references public.courses(id) on delete restrict");
    expect(enrollments).not.toContain("references public.courses(id) on delete cascade");
  });

  test("content still cascades — it is content, not history", () => {
    expect(sql).toContain("module_id uuid not null references public.course_modules(id) on delete cascade");
    expect(sql).toContain("course_id uuid not null references public.courses(id) on delete cascade");
  });

  test("a new module starts as a draft", () => {
    const modules = sql.slice(
      sql.indexOf("create table public.course_modules"),
      sql.indexOf("create index idx_course_modules_course"),
    );
    expect(modules).toContain("published boolean not null default false");
  });

  test("the video id must be a real Bunny GUID, in the database and in code", () => {
    expect(sql).toContain("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
    const bunny = read(BUNNY);
    expect(bunny).toContain("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
  });

  test("the video requirement is scoped to video lessons, not all future ones", () => {
    /* درس نصي أو ملف لاحقًا يجب أن يُنشر بلا فيديو. */
    expect(sql).toContain("lesson_type text not null default 'video'");
    expect(sql).toContain("check (not published or lesson_type <> 'video' or video_id <> '')");
  });

  test("the auth bridge is reachable by service_role only", () => {
    for (const fn of ["admin_user_id_by_email", "admin_emails_for_users"]) {
      expect(sql).toContain(`create or replace function public.${fn}`);
      expect(sql).toMatch(new RegExp(`revoke all on function public\.${fn}[^;]*from public, anon, authenticated;`));
      expect(sql).toMatch(new RegExp(`grant execute on function public\.${fn}[^;]*to service_role;`));
      expect(sql).not.toMatch(new RegExp(`grant execute on function public\.${fn}[^;]*to (anon|authenticated)`));
    }
    /* SECURITY DEFINER لازمة للوصول إلى schema المصادقة — بمسار مثبّت. */
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
  });

  test("the operational Bunny requirement is recorded where it is enforced", () => {
    expect(sql).toContain("Embed View Token Authentication");
    expect(sql).toContain("CDN Token Authentication");
    expect(read(BUNNY)).toContain("Embed View Token Authentication");
  });
});

describe("admin operations stay bounded", () => {
  const actions = read(ACTIONS);

  test("student lookup goes through an indexed query, not a user dump", () => {
    expect(actions).toContain('svc.rpc("admin_user_id_by_email"');
    expect(actions).not.toContain("listUsers");
    expect(read("src/app/admin/(dashboard)/courses/[id]/content/page.tsx")).not.toContain("listUsers");
  });

  test("ordering is sequential, never a clock remainder", () => {
    /* التعليق يذكر النمط القديم ليشرح سبب تركه؛ الممنوع هو الكود. */
    const code = actions.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toContain("Date.now()");
    expect(actions).toContain("nextModuleOrder");
    expect(actions).toContain("nextLessonOrder");
    expect(actions).toContain("reorderModulesAction");
    expect(actions).toContain("reorderLessonsAction");
    const manager = read("src/components/admin/learning/course-content-manager.tsx");
    expect(manager).not.toContain("Date.now()");
  });

  test("a purchase record cannot be deleted, only re-stated", () => {
    expect(actions).toContain("لا يُحذف تسجيل ناتج عن شراء");
    expect(actions).toContain("setEnrollmentStatusAction");
  });

  test("a manual grant is active; a purchase will start pending", () => {
    const grant = actions.slice(actions.indexOf("export async function grantEnrollmentAction"));
    expect(grant).toContain('status: "active"');
    expect(grant).toContain('source: "manual"');
  });
});

describe("toggling a flag never touches the stored video", () => {
  const actions = read(ACTIONS);
  const manager = read("src/components/admin/learning/course-content-manager.tsx");

  test("the toggle payload carries no videoId at all", () => {
    const toggles = manager.slice(manager.indexOf("function LessonToggles"));
    const save = toggles.slice(toggles.indexOf("updateLessonAction("), toggles.indexOf('"حُدّث الدرس"'));
    /* إرسال "" كان يمحو الفيديو من القاعدة بضغطة عَلَم — علة حقيقية وقعت. */
    expect(save).not.toContain("videoId");
  });

  test("and the action treats an absent videoId as no change", () => {
    expect(actions).toContain("videoId: z.string().trim().max(64).optional()");
    expect(actions).toContain(
      "parsed.data.videoId === undefined ? base : { ...base, video_id: parsed.data.videoId }",
    );
  });

  test("an explicit empty string still clears it — the two cases stay distinct", () => {
    const validate = actions.slice(actions.indexOf("function validateVideo"), actions.indexOf("function touched"));
    expect(validate).toContain("incoming === undefined ? stored : incoming");
  });

  test("publishing validates against the stored video, not the omitted one", () => {
    const update = actions.slice(actions.indexOf("export async function updateLessonAction"));
    const read_first = update.indexOf('.select("video_id")');
    const validate = update.indexOf("validateVideo(");
    expect(read_first).toBeGreaterThan(-1);
    expect(read_first).toBeLessThan(validate);
  });
});
