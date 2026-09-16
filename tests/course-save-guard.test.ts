/**
 * زر «حفظ الدورة» يحرس نفسه ضد الضغط المتكرر.
 *
 * الحفظ رحلة طويلة: إنشاء على الخادم ثم سحب بيانات اللوحة كاملة. المحرر
 * كان لا يعطّل الزر ولا يغيّر نصّه، فتبقى الشاشة ساكنة ثوانيَ ويظن المستخدم
 * أن الزر لا يعمل فيضغط ثانيةً وثالثة.
 *
 * وكل ضغطة تنجح: `createCourseAction` يمرّر الـslug على `uniqueCourseSlug`
 * الذي يفضّ التكرار صامتًا إلى `-2` و`-3`… فلا تفشل ولا تُنبِّه. والتحقق
 * في المتصفح يقارن بقائمة لم تُحدَّث بعد، فيمر هو الآخر.
 *
 * وقع على الإنتاج: خمس عشرة دورة مكرّرة بالاسم نفسه في إحدى وثلاثين ثانية
 * — ضغطة كل ثانيتين.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const EDITOR = "src/components/admin/courses/editor/course-editor.tsx";
const STORE = "src/context/admin-store.tsx";
const ACTIONS = "src/app/admin/actions/content.ts";

describe("a second click cannot start a second save", () => {
  const source = read(EDITOR);

  test("the handler refuses to re-enter while a save is in flight", () => {
    const handler = source.slice(source.indexOf("async function handleSave()"), source.indexOf("function handleCancel()"));
    expect(handler).toContain("if (!draft || saving) return;");
  });

  test("and the button is disabled, so the second click never happens", () => {
    expect(source).toContain("<Button disabled={saving} onClick={handleSave}>");
  });

  test("the button says what it is doing — silence is what invited the retry", () => {
    expect(source).toContain('{saving ? "جارٍ الحفظ…" : "حفظ الدورة"}');
  });

  test("cancel is locked too — leaving mid-save loses the result", () => {
    expect(source).toContain('<Button variant="outline" disabled={saving} onClick={handleCancel}>');
  });

  test("the flag comes from the store, not a local copy that can drift", () => {
    expect(source).toContain("const { data, hydrated, saving } = useAdminState();");
    /* المخزن يرفعها حول كل طفرة عبر `run`. */
    const store = read(STORE);
    expect(store).toContain("setSaving(true)");
    expect(store).toContain("setSaving(false)");
    expect(store).toContain("saving,");
  });
});

describe("why a repeated click used to succeed instead of failing", () => {
  test("the server resolves a duplicate slug silently on create", () => {
    /* سلوك مقصود لـ«تكرار الدورة» — لكنه يعني أن الضغط المتكرر لا يُردّ،
       فالحارس في الواجهة هو ما يمنع التكرار لا رفضٌ من الخادم. */
    const actions = read(ACTIONS);
    expect(actions).toContain("const slug = await uniqueCourseSlug(svc, sanitizeSlug(input.slug));");
    const fn = actions.slice(actions.indexOf("async function uniqueCourseSlug"), actions.indexOf("async function uniquePathSlug"));
    expect(fn).toContain("candidate = `${desired}-${suffix++}`");
  });

  test("and the browser-side uniqueness check reads a list refreshed only after the save", () => {
    const store = read(STORE);
    const add = store.slice(store.indexOf("addCourse: (input) =>"), store.indexOf("updateCourse: (id, patch) =>"));
    /* السحب بعد النتيجة — فنافذة بين الضغطتين تقرأ قائمة قديمة. */
    expect(add).toContain("if (result.ok) await refreshFromDb();");
  });
});
