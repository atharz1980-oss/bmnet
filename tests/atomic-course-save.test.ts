/**
 * حفظ الدورة معاملة واحدة.
 *
 * كان الحفظ ثلاث كتابات عبر PostgREST — تحديث، ثم حذف كل الأطفال، ثم
 * إدراج البديل — كلٌّ في معاملتها. أي فشل بعد الحذف يترك الدورة بلا منهج
 * ولا مواعيد بلا رجعة. وقع فعلًا على الإنتاج ومُحيت بيانات دورة.
 *
 * الحراسة هنا على ألا يعود النمط، وعلى أن تبقى الدالة أقل صلاحية ممكنة.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const ACTIONS = "src/app/admin/actions/content.ts";
const MIGRATION = "supabase/migrations/20260914090000_atomic_course_save.sql";
const RPC = "save_course_atomic";

describe("the save goes through one transaction", () => {
  test("the migration exists and defines the function", () => {
    expect(existsSync(MIGRATION)).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toContain(`create or replace function public.${RPC}`);
    expect(sql).toContain("language plpgsql");
  });

  test("both create and update call it — no second write path survives", () => {
    const source = read(ACTIONS);
    const create = source.slice(source.indexOf("export async function createCourseAction"), source.indexOf("export async function updateCourseAction"));
    const update = source.slice(source.indexOf("export async function updateCourseAction"), source.indexOf("export async function setCourseStatusAction"));
    for (const [name, body] of [["create", create], ["update", update]]) {
      expect(body).toContain("saveCourseAtomic(");
      /* لا كتابة مباشرة على الدورة أو أطفالها خارج الدالة. */
      expect(body).not.toMatch(/\.from\("courses"\)\s*\.(insert|update|delete)/);
      expect(body).not.toContain('from("course_sessions")');
      expect(body).not.toContain('from("course_curriculum_days")');
      void name;
    }
    expect(source).toContain(`svc.rpc("${RPC}"`);
  });

  test("the delete-then-insert helper is gone entirely", () => {
    const source = read(ACTIONS);
    expect(source).not.toContain("writeCourseChildren");
    /* ولا في أي ملف آخر. */
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name).replace(/\\/g, "/");
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name) && read(full).includes("writeCourseChildren")) offenders.push(full);
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });

  test("no course child table is deleted from application code any more", () => {
    const source = read(ACTIONS);
    for (const table of ["course_sessions", "course_curriculum_days", "course_curriculum_items"]) {
      expect(source).not.toMatch(new RegExp(`from\\("${table}"\\)\\s*\\.delete`));
    }
  });
});

describe("the function stays least-privilege", () => {
  const sql = read(MIGRATION);

  test("it is SECURITY INVOKER — no definer escalation", () => {
    expect(sql).not.toContain("security definer");
    expect(sql).toContain("set search_path to ''");
  });

  test("EXECUTE is granted to service_role only", () => {
    expect(sql).toContain(`grant execute on function public.${RPC}`);
    expect(sql).toMatch(/grant execute on function public\.save_course_atomic\([^)]*\) to service_role;/);
    for (const role of ["anon", "authenticated", "public"]) {
      expect(sql).toContain(`revoke all on function public.${RPC}(uuid, jsonb, jsonb, jsonb) from ${role};`);
    }
    expect(sql).not.toMatch(/grant execute on function public\.save_course_atomic\([^)]*\) to (anon|authenticated|public)/);
  });

  test("it still checks permission in-body for any future grant", () => {
    expect(sql).toContain("private.has_permission('courses'::public.admin_module, 'edit'::public.permission_action)");
    expect(sql).toContain("42501");
  });

  test("it takes a row lock before writing — concurrent saves serialise", () => {
    const body = sql.slice(sql.indexOf("if p_course_id is null then"));
    expect(body).toContain("for update");
    const lock = body.indexOf("for update");
    const firstWrite = body.indexOf("update public.courses");
    expect(lock).toBeLessThan(firstWrite);
  });

  test("it does not swallow errors — an exception must reach the caller", () => {
    /* EXCEPTION يفتح معاملة فرعية ويبتلع الفشل، فينهار الضمان. */
    expect(sql).not.toMatch(/^\s*exception\s+when/im);
  });

  test("children are matched by id rather than wiped — identity survives", () => {
    /* homepage_upcoming_course.manual_session_id مفتاح بـSET NULL: إفناء
       هوية المواعيد كان يفكّ تثبيت الرئيسية صامتًا في كل حفظ. */
    expect(sql).toContain("v_kept_sessions");
    expect(sql).toContain("v_kept_days");
    expect(sql).toContain("v_kept_items");
    expect(sql).toContain("update public.course_sessions");
    expect(sql).toContain("update public.course_curriculum_days");
    expect(sql).toMatch(/delete from public\.course_sessions[\s\S]{0,160}not \(s\.id = any\(v_kept_sessions\)\)/);
  });
});

describe("the payload keeps the admin interface unchanged", () => {
  const source = read(ACTIONS);

  test("CourseInput is still the action's input type", () => {
    expect(source).toContain("export async function updateCourseAction(\n  courseId: string,\n  input: CourseInput,\n)");
    expect(source).toContain("export async function createCourseAction(input: CourseInput)");
  });

  test("children are mapped to column names in typed TypeScript, not in SQL", () => {
    expect(source).toContain("function curriculumPayload(");
    expect(source).toContain("function sessionsPayload(");
    expect(source).toContain("capacity: session.seats");
    expect(source).toContain("registered_count: session.registered");
  });

  test("the authorization gate in front of the action is untouched", () => {
    expect(source).toContain('requirePermission("courses", "edit")');
    expect(source).toContain('requirePermission("courses", "create")');
    expect(source).toContain("checkPublication(");
    expect(source).toContain("validateCourseInput(input)");
  });

  test("the generated types know the function", () => {
    expect(read("src/types/database.ts")).toContain(RPC);
  });

  test("a live proof script exists and is gated", () => {
    const live = read("supabase/tests/atomic_course_save.mjs");
    expect(live).toContain("BMNET_ATOMIC_TEST");
    /* الإثبات على دورة مؤقتة لا على دورة حقيقية. */
    expect(live).toContain("bmnet-atomic-");
    expect(live).toContain("registered_count: 999");
  });
});
