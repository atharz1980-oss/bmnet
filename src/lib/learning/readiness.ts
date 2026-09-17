/**
 * جاهزية الدورة الأونلاين — إرشاد للمحرر، لا قاعدة أمان.
 *
 * كل بند هنا يقيس ما تراه القاعدة والسياسات أصلًا؛ لا يخترع شرطًا جديدًا
 * ولا يمنع نشرًا تسمح به. الغرض أن يعرف المحرر ما ينقصه قبل أن يكتشفه
 * الطالب — ودرس فيديو بلا فيديو ترفضه القاعدة فعلًا
 * (`course_lessons_published_video_required`)، فالتحذير هنا يسبق الرفض.
 */

export type ReadinessTone = "done" | "todo" | "warn";

export interface ReadinessItem {
  id: string;
  label: string;
  tone: ReadinessTone;
  /** تفصيل يظهر تحت البند حين يفيد. */
  detail?: string;
}

export interface ReadinessInput {
  courseName: string;
  hasImage: boolean;
  /** السعر بالريال — 0 يعني «حسب الطلب» وهو خيار صالح. */
  price: number;
  requestQuote: boolean;
  isFree: boolean;
  coursePublished: boolean;
  modules: Array<{
    published: boolean;
    lessons: Array<{
      published: boolean;
      freePreview: boolean;
      lessonType: "video" | "text";
      hasVideo: boolean;
      durationSeconds: number;
    }>;
  }>;
}

export interface ReadinessReport {
  /** نسبة البنود المكتملة — البنود التحذيرية لا تُحتسب نقصًا. */
  percent: number;
  items: ReadinessItem[];
  /** ما يمنع الطالب من رؤية شيء مفيد فعلًا. */
  blockers: string[];
}

const done = (id: string, label: string, detail?: string): ReadinessItem => ({ id, label, tone: "done", detail });
const todo = (id: string, label: string, detail?: string): ReadinessItem => ({ id, label, tone: "todo", detail });
const warn = (id: string, label: string, detail?: string): ReadinessItem => ({ id, label, tone: "warn", detail });

export function courseReadiness(input: ReadinessInput): ReadinessReport {
  const lessons = input.modules.flatMap((m) => m.lessons);
  const publishedModules = input.modules.filter((m) => m.published);
  const visibleLessons = publishedModules.flatMap((m) => m.lessons).filter((l) => l.published);
  const draftLessons = lessons.filter((l) => !l.published);
  const videoless = lessons.filter((l) => l.lessonType === "video" && !l.hasVideo);
  const withoutDuration = lessons.filter((l) => l.durationSeconds === 0);
  const freeVisible = visibleLessons.filter((l) => l.freePreview);

  const items: ReadinessItem[] = [];

  items.push(input.courseName.trim() ? done("name", "معلومات الدورة") : todo("name", "معلومات الدورة", "أضف اسم الدورة."));
  items.push(input.hasImage ? done("image", "صورة الدورة") : todo("image", "صورة الدورة", "الصورة أول ما يراه الطالب."));

  /* «حسب الطلب» و«مجانية» قراران صالحان، لا نقص. */
  const priceSettled = input.requestQuote || input.isFree || input.price > 0;
  items.push(priceSettled ? done("price", "السعر") : todo("price", "السعر", "حدّد سعرًا، أو اجعلها مجانية أو حسب الطلب."));

  items.push(
    input.modules.length > 0
      ? done("module", "وحدة واحدة على الأقل", `${input.modules.length} وحدة`)
      : todo("module", "وحدة واحدة على الأقل", "ابدأ بإنشاء الوحدة الأولى."),
  );

  items.push(
    visibleLessons.length > 0
      ? done("lesson", "درس منشور يظهر للطالب", `${visibleLessons.length} درسًا`)
      : todo(
          "lesson",
          "درس منشور يظهر للطالب",
          publishedModules.length === 0 && input.modules.length > 0
            ? "كل وحداتك مسودة — انشر وحدة ليظهر محتواها."
            : "انشر درسًا واحدًا على الأقل داخل وحدة منشورة.",
        ),
  );

  items.push(
    freeVisible.length > 0
      ? done("preview", "درس معاينة مجانية", `${freeVisible.length} درسًا`)
      : warn("preview", "لا يوجد درس معاينة مجانية", "درس مفتوح واحد يجعل الطالب يجرّب قبل أن يشترك."),
  );

  /* تحذيرات لا تُحتسب نقصًا في النسبة. */
  if (videoless.length > 0) {
    items.push(warn("videoless", `${videoless.length} درس فيديو بلا فيديو`, "أضف فيديو الدرس قبل النشر."));
  }
  if (draftLessons.length > 0) {
    items.push(warn("drafts", `${draftLessons.length} درسًا في المسودة`, "المسودة لا يراها الطالب."));
  }
  if (withoutDuration.length > 0) {
    items.push(warn("duration", `${withoutDuration.length} درسًا بلا مدة`, "المدة تساعد الطالب على تقدير وقته."));
  }
  if (!input.coursePublished) {
    items.push(warn("course", "الدورة نفسها غير منشورة", "لن تظهر للزائر حتى تُنشر من «معلومات الدورة»."));
  }

  const scored = items.filter((item) => item.tone !== "warn");
  const percent = scored.length === 0 ? 0 : Math.round((scored.filter((i) => i.tone === "done").length / scored.length) * 100);

  const blockers: string[] = [];
  if (input.modules.length === 0) blockers.push("لا وحدات في الدورة.");
  else if (publishedModules.length === 0) blockers.push("كل الوحدات مسودة، فلا يظهر شيء للطالب.");
  else if (visibleLessons.length === 0) blockers.push("لا درس منشور داخل وحدة منشورة.");
  if (!input.coursePublished) blockers.push("الدورة غير منشورة.");

  return { percent, items, blockers };
}

/** حالة الدرس كما تُعرض للمحرر. */
export type ContentStatus = "draft" | "ready" | "published";

export function lessonStatus(lesson: {
  published: boolean;
  lessonType: "video" | "text";
  hasVideo: boolean;
}): ContentStatus {
  if (lesson.published) return "published";
  /* «جاهز للنشر» = لا ينقصه إلا الضغطة. درس فيديو بلا فيديو ترفضه القاعدة. */
  if (lesson.lessonType === "video" && !lesson.hasVideo) return "draft";
  return "ready";
}

export function moduleStatus(module: {
  published: boolean;
  lessons: Array<{ published: boolean }>;
}): ContentStatus {
  if (module.published) return "published";
  return module.lessons.some((l) => l.published) ? "ready" : "draft";
}

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "مسودة",
  ready: "جاهز للنشر",
  published: "منشور",
};
