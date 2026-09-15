import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { EnrollmentFacts, EnrollmentStatus } from "./access";

/**
 * قراءة محتوى الدورة الأونلاين وحقائق الوصول.
 *
 * `video_id` غير ممنوح لـanon ولا authenticated على مستوى العمود في
 * القاعدة، فلا يقرؤه إلا عميل الخدمة هنا — وحتى هنا لا يخرج من الخادم إلا
 * موقَّعًا في رابط تشغيل قصير الأجل.
 *
 * لا قرار وصول في هذا الملف: يجمع الحقائق ويسلّمها لـ`decideLessonAccess`.
 */

export interface LessonSummary {
  id: string;
  title: string;
  description: string;
  lessonType: "video" | "text";
  durationSeconds: number;
  freePreview: boolean;
  published: boolean;
  sortOrder: number;
  /** هل للدرس فيديو أصلًا — لا المعرّف نفسه. */
  hasVideo: boolean;
}

export interface ModuleSummary {
  id: string;
  title: string;
  summary: string;
  published: boolean;
  sortOrder: number;
  lessons: LessonSummary[];
}

export interface CourseContent {
  modules: ModuleSummary[];
  lessonCount: number;
  totalSeconds: number;
}

interface ModuleRow {
  id: string;
  title: string;
  summary: string;
  published: boolean;
  sort_order: number;
}

interface LessonRow {
  id: string;
  module_id: string;
  title: string;
  description: string;
  lesson_type: "video" | "text";
  duration_seconds: number;
  free_preview: boolean;
  published: boolean;
  sort_order: number;
  video_id: string;
}

const LESSON_COLUMNS =
  "id, module_id, title, description, lesson_type, duration_seconds, free_preview, published, sort_order, video_id";

/**
 * المحتوى كاملًا للإدارة، أو المنشور وحده للعرض العام.
 * `publishedOnly` يُسقط الوحدات غير المنشورة كما يُسقط الدروس — المسودة
 * لا تُعرض بأي مستوى.
 */
export async function loadCourseContent(
  courseId: string,
  options: { publishedOnly?: boolean } = {},
): Promise<CourseContent> {
  const svc = getServiceSupabase();
  let moduleQuery = svc
    .from("course_modules")
    .select("id, title, summary, published, sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });
  if (options.publishedOnly) moduleQuery = moduleQuery.eq("published", true);
  const { data: moduleRows, error: moduleError } = await moduleQuery;
  if (moduleError || !moduleRows?.length) return { modules: [], lessonCount: 0, totalSeconds: 0 };

  const modules = moduleRows as ModuleRow[];
  let lessonQuery = svc
    .from("course_lessons")
    .select(LESSON_COLUMNS)
    .in("module_id", modules.map((row) => row.id))
    .order("sort_order", { ascending: true });
  if (options.publishedOnly) lessonQuery = lessonQuery.eq("published", true);
  const { data: lessonRows } = await lessonQuery;
  const lessons = (lessonRows ?? []) as LessonRow[];

  let lessonCount = 0;
  let totalSeconds = 0;
  const shaped = modules.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    published: row.published,
    sortOrder: row.sort_order,
    lessons: lessons
      .filter((lesson) => lesson.module_id === row.id)
      .map((lesson) => {
        lessonCount += 1;
        totalSeconds += lesson.duration_seconds;
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          lessonType: lesson.lesson_type,
          durationSeconds: lesson.duration_seconds,
          freePreview: lesson.free_preview,
          published: lesson.published,
          sortOrder: lesson.sort_order,
          /* المعرّف نفسه لا يغادر الخادم. */
          hasVideo: lesson.video_id !== "",
        };
      }),
  }));
  return { modules: shaped, lessonCount, totalSeconds };
}

export interface LessonContext {
  lesson: LessonRow;
  modulePublished: boolean;
  courseId: string;
  courseSlug: string;
  courseName: string;
  coursePublished: boolean;
}

/** الدرس وسياقه، أو null إن لم يوجد. لا يقرر الوصول — يجمع الحقائق فقط. */
export async function loadLessonContext(lessonId: string): Promise<LessonContext | null> {
  const { data, error } = await getServiceSupabase()
    .from("course_lessons")
    .select(
      `${LESSON_COLUMNS}, course_modules!inner(course_id, published, courses!inner(id, slug, name, publish_status))`,
    )
    .eq("id", lessonId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as LessonRow & {
    course_modules: {
      course_id: string;
      published: boolean;
      courses: { id: string; slug: string; name: string; publish_status: string };
    };
  };
  const course = row.course_modules.courses;
  return {
    lesson: row,
    modulePublished: row.course_modules.published,
    courseId: course.id,
    courseSlug: course.slug,
    courseName: course.name,
    coursePublished: course.publish_status === "published",
  };
}

/**
 * تسجيل هذا المستخدم في هذه الدورة، أو null.
 * لا يحكم بشيء — `decideLessonAccess` هو من يقرأ الحالة ويقرر.
 */
export async function loadEnrollment(
  userId: string | null,
  courseId: string,
): Promise<EnrollmentFacts | null> {
  if (!userId) return null;
  const { data, error } = await getServiceSupabase()
    .from("course_enrollments")
    .select("status, expires_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error || !data) return null;
  return { status: data.status as EnrollmentStatus, expiresAt: data.expires_at };
}
