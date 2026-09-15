import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service";

/**
 * قراءة محتوى الدورة الأونلاين والتحقق من الوصول.
 *
 * `video_id` غير ممنوح لـanon ولا authenticated على مستوى العمود في
 * القاعدة، فلا يقرؤه إلا عميل الخدمة هنا — وحتى هنا لا يخرج من الخادم إلا
 * موقَّعًا في رابط تشغيل قصير الأجل.
 */

export interface LessonSummary {
  id: string;
  title: string;
  description: string;
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
  sort_order: number;
}

interface LessonRow {
  id: string;
  module_id: string;
  title: string;
  description: string;
  duration_seconds: number;
  free_preview: boolean;
  published: boolean;
  sort_order: number;
  video_id: string;
}

/** المحتوى كاملًا للإدارة (منشور وغير منشور)، أو المنشور وحده للعرض. */
export async function loadCourseContent(
  courseId: string,
  options: { publishedOnly?: boolean } = {},
): Promise<CourseContent> {
  const svc = getServiceSupabase();
  const { data: moduleRows, error: moduleError } = await svc
    .from("course_modules")
    .select("id, title, summary, sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });
  if (moduleError || !moduleRows?.length) return { modules: [], lessonCount: 0, totalSeconds: 0 };

  const modules = moduleRows as ModuleRow[];
  let lessonQuery = svc
    .from("course_lessons")
    .select("id, module_id, title, description, duration_seconds, free_preview, published, sort_order, video_id")
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

export interface LessonAccess {
  lesson: LessonRow;
  courseId: string;
  courseSlug: string;
  courseName: string;
  coursePublished: boolean;
}

/** الدرس وسياقه، أو null إن لم يوجد. لا يقرر الوصول — يجمع الحقائق فقط. */
export async function loadLessonContext(lessonId: string): Promise<LessonAccess | null> {
  const svc = getServiceSupabase();
  const { data, error } = await svc
    .from("course_lessons")
    .select(
      "id, module_id, title, description, duration_seconds, free_preview, published, sort_order, video_id, course_modules!inner(course_id, courses!inner(id, slug, name, publish_status))",
    )
    .eq("id", lessonId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as LessonRow & {
    course_modules: { course_id: string; courses: { id: string; slug: string; name: string; publish_status: string } };
  };
  const course = row.course_modules.courses;
  return {
    lesson: row,
    courseId: course.id,
    courseSlug: course.slug,
    courseName: course.name,
    coursePublished: course.publish_status === "published",
  };
}

/**
 * هل يملك هذا المستخدم وصولًا فعّالًا لهذه الدورة الآن؟
 *
 * التسجيل المنتهي ليس وصولًا. وغياب المستخدم ليس خطأً — زائر ببساطة.
 */
export async function hasCourseAccess(
  userId: string | null,
  courseId: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await getServiceSupabase()
    .from("course_enrollments")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error || !data) return false;
  if (data.expires_at === null) return true;
  return new Date(data.expires_at).getTime() > now.getTime();
}
