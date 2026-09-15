/**
 * معرّفات أطفال الدورة تأتي من القاعدة لا من المحرر.
 *
 * المحرر يولّد معرّفات مؤقتة للمواعيد وأيام المنهج (`session-…`, `day-…`)
 * والقاعدة تعطيها UUID عند الحفظ. كان المخزن يُرقَّع بالمُدخَل بعد الحفظ
 * لا يُسحب من القاعدة، فيبقى المؤقت فيه وتعرضه قوائم أخرى — واختيار موعد
 * للصفحة الرئيسية كان يُرسله إلى عمود `uuid` فيفشل الحفظ كله بخطأ
 * Postgres خام: `invalid input syntax for type uuid: "session-…"`.
 * وقع على الإنتاج.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const STORE = "src/context/admin-store.tsx";
const ACTIONS = "src/app/admin/actions/content.ts";

/** جسم دالة في المخزن، من اسمها حتى نهاية تعريفها. */
function storeMutation(name: string): string {
  const source = read(STORE);
  const start = source.indexOf(`      ${name}: (`);
  expect(start).toBeGreaterThan(-1);
  const rest = source.slice(start);
  /* كل دالة تنتهي بإغلاق run: أول `\n        }),` هو حدّها، لا التالي. */
  const end = rest.indexOf("\n        }),");
  expect(end).toBeGreaterThan(0);
  return rest.slice(0, end);
}

describe("saving a course refreshes ids from the database", () => {
  /* الأربعة تمر بـupdateCourseAction/createCourseAction وتمس الأطفال. */
  const MUTATIONS = ["addCourse", "updateCourse", "updateCurriculum", "updateSessions"];

  test("each one refetches instead of patching with the submitted input", () => {
    for (const name of MUTATIONS) {
      const body = storeMutation(name);
      expect(body).toContain("await refreshFromDb()");
    }
  });

  test("none of them writes course rows into the store from the client payload", () => {
    for (const name of MUTATIONS) {
      const body = storeMutation(name);
      /* الترقيع المحلي هو ما أبقى المعرّف المؤقت. */
      expect(body).not.toContain("setData(");
    }
  });

  test("the editor still generates temporary ids — the database is what resolves them", () => {
    /* لو توقف المحرر عن توليدها فالحارس أعلاه يفقد معناه، لا العكس. */
    const sessions = read("src/components/admin/courses/editor/sessions-tab.tsx");
    expect(sessions).toContain("`session-${");
    const helpers = read("src/components/admin/courses/editor/editor-helpers.ts");
    expect(helpers).toContain("makeEditorId");
  });
});

describe("the homepage save refuses a stale client id", () => {
  const source = read(ACTIONS);

  test("it validates the upcoming course and session before writing", () => {
    const upcoming = source.slice(source.indexOf("staleUpcoming"), source.indexOf("homepage_upcoming_course"));
    expect(upcoming).toContain("isUuid");
    expect(source).toContain("اختيار الدورة القادمة قديم في هذه الصفحة");
  });

  test("and the featured course ids too — same column type", () => {
    expect(source).toContain("content.featuredCourses.manualCourseIds.some((id) => !isUuid(id))");
    expect(source).toContain("اختيار الدورات المميزة قديم في هذه الصفحة");
  });

  test("the check runs before the write, not after the error", () => {
    const guard = source.indexOf("staleUpcoming");
    const write = source.indexOf('svc.from("homepage_upcoming_course").upsert');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(write);
  });

  test("isUuid accepts a real id and rejects an editor one", () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(re.test("235ab496-cd1e-4995-a651-0fc54c23e455")).toBe(true);
    expect(re.test("session-mu2k59qy-s06wxe")).toBe(false);
    expect(re.test("day-mu2k59qy-abc123")).toBe(false);
    expect(re.test("")).toBe(false);
  });
});
