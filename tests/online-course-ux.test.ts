/**
 * تجربة الدورة الأونلاين — الباني والمنهج والمشغّل.
 *
 * ما يُختبر هنا صنفان لا يُخلطان:
 *  • منطق خالص (`moveItem`, `courseReadiness`) يُستورد ويُشغَّل فعلًا.
 *  • عقود واجهة وأمان تُقرأ من المصدر، لأنها وعود لا يكشف خلفها تشغيلٌ
 *    واحد: «لا معرّف فيديو في مكوّن عميل» تُنتهك بسطر واحد يمر بكل اختبار
 *    سلوكي، ولا يظهر أثرها إلا حين يقرأ أحدهم HTML الصفحة.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { moveItem } from "../src/lib/learning/reorder";
import { courseReadiness, lessonStatus, moduleStatus, STATUS_LABEL } from "../src/lib/learning/readiness";

const read = (path: string) => readFileSync(path, "utf8");
/* بلا تعليقات: تعليق يشرح ما هو ممنوع يحتوي نصّ الممنوع نفسه. */
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const BUILDER = "src/components/admin/learning/course-content-manager.tsx";
const FORM = "src/components/admin/learning/lesson-form.tsx";
const PREVIEW = "src/app/admin/(dashboard)/courses/[id]/content/preview/[lessonId]/page.tsx";
const LESSON = "src/app/learn/[slug]/[lessonId]/page.tsx";
const OUTLINE = "src/components/learn/course-outline.tsx";
const PLAYER = "src/components/learn/lesson-player.tsx";
const CURRICULUM = "src/components/learning/course-curriculum.tsx";
const DETAILS = "src/components/courses/course-details.tsx";
const COURSE_PAGE = "src/app/courses/[slug]/page.tsx";

/* ───────────────────────────── الترتيب ───────────────────────────── */

describe("reordering moves an item, it does not swap neighbours", () => {
  const ids = ["a", "b", "c", "d"];

  test("a lesson dragged to the top lands at the top", () => {
    expect(moveItem(ids, 3, 0)).toEqual(["d", "a", "b", "c"]);
  });

  test("and the rest keep their order behind it", () => {
    expect(moveItem(ids, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  test("one step is the same operation the buttons perform", () => {
    expect(moveItem(ids, 1, 0)).toEqual(["b", "a", "c", "d"]);
    expect(moveItem(ids, 1, 2)).toEqual(["a", "c", "b", "d"]);
  });

  test("a drop outside the list changes nothing", () => {
    expect(moveItem(ids, 0, -1)).toEqual(ids);
    expect(moveItem(ids, 0, 9)).toEqual(ids);
    expect(moveItem(ids, -1, 0)).toEqual(ids);
    expect(moveItem(ids, 2, 2)).toEqual(ids);
  });

  test("it never loses or duplicates an id", () => {
    for (let from = 0; from < ids.length; from += 1) {
      for (let to = 0; to < ids.length; to += 1) {
        const next = moveItem(ids, from, to);
        expect([...next].sort()).toEqual([...ids].sort());
      }
    }
  });

  test("the source list is not mutated", () => {
    const original = [...ids];
    moveItem(ids, 0, 3);
    expect(ids).toEqual(original);
  });
});

/* ──────────────────────────── الجاهزية ──────────────────────────── */

const baseCourse = {
  courseName: "دورة",
  hasImage: true,
  price: 500,
  requestQuote: false,
  isFree: false,
  coursePublished: true,
};
const videoLesson = {
  published: true,
  freePreview: false,
  lessonType: "video" as const,
  hasVideo: true,
  durationSeconds: 600,
};

describe("readiness guides the editor without inventing rules", () => {
  test("a complete course reaches full marks", () => {
    const report = courseReadiness({
      ...baseCourse,
      modules: [{ published: true, lessons: [videoLesson, { ...videoLesson, freePreview: true }] }],
    });
    expect(report.percent).toBe(100);
    expect(report.blockers).toEqual([]);
  });

  test("an empty course names what is missing instead of scoring it", () => {
    const report = courseReadiness({ ...baseCourse, courseName: "", hasImage: false, modules: [] });
    expect(report.percent).toBeLessThan(50);
    expect(report.blockers).toContain("لا وحدات في الدورة.");
  });

  test("a draft module blocks the student even when its lessons are published", () => {
    const report = courseReadiness({ ...baseCourse, modules: [{ published: false, lessons: [videoLesson] }] });
    expect(report.blockers).toContain("كل الوحدات مسودة، فلا يظهر شيء للطالب.");
  });

  test("warnings never count against the percentage", () => {
    const withFree = courseReadiness({
      ...baseCourse,
      modules: [{ published: true, lessons: [{ ...videoLesson, freePreview: true }] }],
    });
    const withDrafts = courseReadiness({
      ...baseCourse,
      modules: [
        {
          published: true,
          lessons: [{ ...videoLesson, freePreview: true }, { ...videoLesson, published: false }],
        },
      ],
    });
    /* درس مسودة إضافي تحذير لا نقص — فالنسبة لا تتحرك. */
    expect(withDrafts.percent).toBe(withFree.percent);
    expect(withDrafts.items.some((item) => item.tone === "warn" && item.id === "drafts")).toBe(true);
  });

  test("a free course and a quote-only course both settle the price item", () => {
    for (const patch of [{ isFree: true, price: 0 }, { requestQuote: true, price: 0 }]) {
      const report = courseReadiness({
        ...baseCourse,
        ...patch,
        modules: [{ published: true, lessons: [videoLesson] }],
      });
      expect(report.items.find((item) => item.id === "price")?.tone).toBe("done");
    }
  });

  test("a video lesson with no video is a warning, never a green tick", () => {
    const report = courseReadiness({
      ...baseCourse,
      modules: [{ published: true, lessons: [{ ...videoLesson, published: false, hasVideo: false }] }],
    });
    expect(report.items.some((item) => item.id === "videoless" && item.tone === "warn")).toBe(true);
  });
});

describe("status labels match what the database would accept", () => {
  test("a video lesson with no video is a draft, not ready to publish", () => {
    expect(lessonStatus({ published: false, lessonType: "video", hasVideo: false })).toBe("draft");
    expect(lessonStatus({ published: false, lessonType: "video", hasVideo: true })).toBe("ready");
    /* درس نصي لا يحتاج فيديو — القاعدة لا تشترطه عليه. */
    expect(lessonStatus({ published: false, lessonType: "text", hasVideo: false })).toBe("ready");
    expect(lessonStatus({ published: true, lessonType: "video", hasVideo: true })).toBe("published");
  });

  test("a module is only ready when something inside it is publishable", () => {
    expect(moduleStatus({ published: false, lessons: [] })).toBe("draft");
    expect(moduleStatus({ published: false, lessons: [{ published: true }] })).toBe("ready");
    expect(moduleStatus({ published: true, lessons: [] })).toBe("published");
  });

  test("every status has an Arabic label", () => {
    expect(Object.keys(STATUS_LABEL).sort()).toEqual(["draft", "published", "ready"]);
  });
});

/* ───────────────────────────── الباني ───────────────────────────── */

describe("the course builder is a builder, not a form dump", () => {
  const builder = read(BUILDER);

  test("it opens with the summary the editor needs", () => {
    for (const label of ["عدد الوحدات", "عدد الدروس", "إجمالي المدة", "دروس مجانية"]) {
      expect(builder).toContain(label);
    }
  });

  test("an empty course is invited to start, not shown an empty list", () => {
    expect(builder).toContain("ابدأ ببناء محتوى دورتك");
    expect(builder).toContain("أنشئ الوحدة الأولى، ثم أضف الدروس إليها.");
    expect(builder).toContain("إنشاء الوحدة الأولى");
  });

  test("adding a lesson opens the dedicated form, it does not inline a second copy", () => {
    expect(builder).toContain("إضافة درس");
    expect(builder).toContain("<LessonForm");
    expect(builder).toContain("DialogContent");
    /* حقول الفيديو تعيش في النموذج وحده. */
    expect(builder).not.toContain('label="Bunny Video ID"');
  });

  test("reordering works without a mouse", () => {
    expect(builder).toContain("aria-label={`تقديم ${label}`}");
    expect(builder).toContain("aria-label={`تأخير ${label}`}");
    /* والسحب إضافة فوقها، لا بديل عنها. */
    expect(builder).toContain("onDragStart");
    expect(builder).toContain("onDrop");
  });

  test("destructive actions ask first", () => {
    expect(builder).toContain("ConfirmDialog");
    expect(builder).toContain("هل تريد حذف هذا الدرس؟");
    expect(builder).toContain("سيُحذف معها كل دروسها. لا يمكن التراجع.");
  });

  test("a failed action says so instead of passing silently", () => {
    expect(builder).toContain('title: "لم يكتمل الإجراء"');
    expect(builder).toContain('variant: "destructive"');
  });

  test("every action is disabled while one is in flight, and the wait is announced", () => {
    expect(builder).toContain("const disabled = !canEdit || pending;");
    expect(builder).toContain("جارٍ الحفظ…");
    expect(builder).toContain('role="status"');
  });

  test("each mutation reports what happened in words", () => {
    for (const message of ["تم إنشاء الوحدة", "تم حفظ الدرس", "تم تغيير ترتيب", "تم نشر الوحدة", "تم إلغاء النشر"]) {
      expect(builder).toContain(message);
    }
  });

  test("the readiness panel is guidance, and is announced as a progress bar", () => {
    expect(builder).toContain("جاهزية الدورة");
    expect(builder).toContain('role="progressbar"');
    expect(builder).toContain("aria-valuenow={report.percent}");
  });
});

/* ─────────────────── المعاينة: خادمية ومحروسة ─────────────────── */

describe("admin preview is server-side and permission-checked", () => {
  const preview = read(PREVIEW);
  const builder = read(BUILDER);

  test("it lives under /admin and gates on the courses permission", () => {
    expect(PREVIEW.startsWith("src/app/admin/")).toBe(true);
    expect(preview).toContain('requirePermission("courses", "view")');
  });

  test("no public bypass parameter exists anywhere in the flow", () => {
    for (const source of [code(PREVIEW), code(BUILDER), code(LESSON), code(OUTLINE), code(CURRICULUM)]) {
      for (const bypass of ["?admin=true", "?preview=true", "admin=true", "preview=true", "bypass"]) {
        expect(source).not.toContain(bypass);
      }
    }
  });

  test("it refuses a lesson that belongs to another course", () => {
    expect(preview).toContain("context.courseId !== id");
    expect(preview).toContain("notFound()");
  });

  test("it describes visibility with the real decision function", () => {
    expect(preview).toContain("decideLessonAccess");
    expect(preview).toContain('from "@/lib/learning/access"');
  });

  test("it signs playback the same way and fails closed", () => {
    expect(preview).toContain("bunnyConfig()");
    expect(preview).toContain("playbackUrl(context.lesson.video_id, config)");
    expect(preview).toContain("config && context.lesson.video_id");
  });

  test("it is never cached and never indexed", () => {
    expect(preview).toContain('export const dynamic = "force-dynamic"');
    expect(preview).toContain("robots: { index: false, follow: false }");
  });

  test("the student route keeps its own gate — preview adds no exception to it", () => {
    const lesson = read(LESSON);
    expect(lesson).toContain("decideLessonAccess");
    expect(lesson).not.toContain("requirePermission");
    expect(lesson).not.toContain("isAdmin");
  });
});

/* ─────────────── لا معرّف فيديو ولا مفتاح في المتصفح ─────────────── */

describe("no video identifier and no key reach the browser", () => {
  const clientSources = [BUILDER, FORM, OUTLINE, CURRICULUM, DETAILS, PLAYER];

  test("no client-facing component names the stored column or the keys", () => {
    for (const path of clientSources) {
      const source = read(path);
      expect(source).not.toContain("video_id");
      expect(source).not.toContain("BUNNY_STREAM_TOKEN_KEY");
      expect(source).not.toContain("BUNNY_STREAM_LIBRARY_ID");
      expect(source).not.toContain("NEXT_PUBLIC_BUNNY");
    }
  });

  test("no client component imports the signing module", () => {
    for (const path of clientSources) {
      expect(read(path)).not.toContain("@/lib/learning/bunny");
    }
  });

  test("the player receives a finished url, never an id to build one from", () => {
    const player = read(PLAYER);
    expect(player).toContain("source: string | null");
    expect(code(PLAYER)).not.toContain("videoId");
    /* غياب الرابط يعني لا مشغّل — لا إطار غير موقّع. */
    expect(player).toContain("لا يُعرض الفيديو بلا");
  });

  test("the outline carries only what it shows", () => {
    const outline = read(OUTLINE);
    expect(outline).toContain("ModuleSummary");
    expect(outline).not.toContain("playbackUrl");
  });
});

/* ───────────────────── صفحة الدورة العامة ───────────────────── */

describe("the public online course page sells the course honestly", () => {
  const curriculum = read(CURRICULUM);
  const details = read(DETAILS);
  const page = read(COURSE_PAGE);

  test("the curriculum collapses with native details, so it works before hydration", () => {
    expect(curriculum).toContain("<details");
    expect(curriculum).toContain("open={index === 0}");
    expect(curriculum).not.toContain("useState");
  });

  test("it shows the numbers a buyer asks for", () => {
    for (const label of ["الوحدات", "الدروس", "مدة المحتوى", "دروس مجانية"]) {
      expect(curriculum).toContain(label);
    }
  });

  test("free lessons are playable from it and the rest are visibly locked", () => {
    expect(curriculum).toContain("lesson.freePreview ? (");
    expect(curriculum).toContain("معاينة مجانية");
    expect(curriculum).toContain("Lock");
  });

  test("only published content is read for the public page", () => {
    expect(page).toContain("publishedOnly: true");
  });

  test("an online course is not described with dates and a place it does not have", () => {
    expect(details).toContain('const isOnline = course.category === "online"');
    expect(details).toContain("{!isOnline && course.upcomingSessions.length > 0 && (");
    expect(details).toContain("أونلاين في أي وقت");
  });

  test("the online call to action matches the product", () => {
    expect(details).toContain("سجّل في الدورة");
    expect(details).toContain("بوابة الدفع قريباً");
  });
});

/* ─────────────────────── تجربة الطالب ─────────────────────── */

describe("the student player is a course, not a single page", () => {
  const lesson = read(LESSON);

  test("the outline travels with the lesson on every screen size", () => {
    expect(lesson).toContain("<CourseOutline");
    expect(lesson).toContain("lg:hidden");
    expect(lesson).toContain("hidden lg:sticky");
  });

  test("the outline lists published content only", () => {
    expect(lesson).toContain("loadCourseContent(context.courseId, { publishedOnly: true })");
  });

  test("position and neighbours are shown, so the student knows where they are", () => {
    expect(lesson).toContain("الدرس {position + 1} من {ordered.length}");
    expect(lesson).toContain("const previous =");
    expect(lesson).toContain("const next =");
  });

  test("a free preview invites, and does not pretend the rest is open", () => {
    expect(lesson).toContain("const unlocked = enrollmentGrantsAccess(enrollment);");
    expect(lesson).toContain('decision.reason === "free-preview"');
    expect(lesson).toContain("سجّل في الدورة");
  });

  test("a locked lesson explains itself with the reason the decision gave", () => {
    expect(lesson).toContain("lockedMessage(decision.reason)");
  });

  test("the page stays uncached and unindexed", () => {
    expect(lesson).toContain('export const dynamic = "force-dynamic"');
    expect(lesson).toContain("export const revalidate = 0");
    expect(lesson).toContain("robots: { index: false, follow: false }");
  });

  test("the access gate keeps its order: publication, then preview, then enrolment", () => {
    const access = read("src/lib/learning/access.ts");
    const draft = access.indexOf('coursePublished) return { outcome: "not-found"');
    const preview = access.indexOf('facts.freePreview) return { outcome: "allow"');
    const enrol = access.indexOf("enrollmentGrantsAccess(facts.enrollment");
    expect(draft).toBeGreaterThan(-1);
    expect(draft).toBeLessThan(preview);
    expect(preview).toBeLessThan(enrol);
  });
});

/* ──────────────────── النص الغني في الدرس ──────────────────── */

describe("rich lesson text is rendered through the escaping renderer only", () => {
  test("the one place that injects html uses the safe renderer", () => {
    const player = read(PLAYER);
    expect(player).toContain("renderLessonHtml");
    expect(player).toContain("dangerouslySetInnerHTML");
  });

  test("no other learning surface injects html", () => {
    for (const path of [BUILDER, FORM, OUTLINE, CURRICULUM, LESSON, PREVIEW]) {
      expect(read(path)).not.toContain("dangerouslySetInnerHTML");
    }
  });
});

/* ───────────────────────── الهاتف أولًا ───────────────────────── */

describe("touch targets and layout hold on a phone", () => {
  test("interactive rows keep a 44px target until the pointer is precise", () => {
    for (const path of [BUILDER, FORM, OUTLINE, CURRICULUM, LESSON]) {
      const source = read(path);
      const rows = source.split("min-h-11").length - 1;
      expect(rows).toBeGreaterThan(0);
    }
  });

  test("the builder stacks its summary two-up on the narrowest screens", () => {
    expect(read(BUILDER)).toContain("grid-cols-2 gap-3 sm:grid-cols-4");
  });

  test("the lesson page gives the outline its own column only when there is room", () => {
    expect(read(LESSON)).toContain("lg:grid-cols-3");
  });

  test("long titles truncate instead of pushing the row sideways", () => {
    expect(read(OUTLINE)).toContain("truncate");
    expect(read(BUILDER)).toContain("truncate");
  });
});
