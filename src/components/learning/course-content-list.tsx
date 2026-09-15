import Link from "next/link";
import { CirclePlay, Lock, PlayCircle } from "lucide-react";

import { loadCourseContent } from "@/lib/learning/content";
import { formatLessonDuration, formatTotalDuration } from "@/lib/learning/format";

/**
 * فهرس محتوى الدورة الأونلاين في صفحتها العامة.
 *
 * يُعرض للجميع: العناوين والمدد هي التسويق نفسه. لكن لا معرّف فيديو يصل
 * المتصفح — العمود غير ممنوح لـanon في القاعدة أصلًا، وهذا المكوّن يقرأ
 * على الخادم ولا يمرّر إلا ما يُعرض.
 *
 * دورة بلا وحدات لا تعرض شيئًا: القسم يختفي بدل أن يعلن فراغه.
 */
export async function CourseContentList({
  courseId,
  courseSlug,
}: {
  courseId: string;
  courseSlug: string;
}) {
  const { modules, lessonCount, totalSeconds } = await loadCourseContent(courseId, {
    publishedOnly: true,
  });
  if (modules.length === 0 || lessonCount === 0) return null;

  return (
    <section aria-labelledby="course-content-title" className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="course-content-title" className="text-xl font-bold text-charcoal-900">
          محتوى الدورة
        </h2>
        <p className="text-sm text-charcoal-500">
          {modules.length} وحدات · {lessonCount} درسًا
          {totalSeconds > 0 ? ` · ${formatTotalDuration(totalSeconds)}` : ""}
        </p>
      </div>

      <ol className="mt-5 space-y-4">
        {modules.map((module, index) => (
          <li key={module.id} className="overflow-hidden rounded-xl border border-charcoal-200/80 bg-white">
            <div className="border-b border-charcoal-100 bg-surface px-4 py-3 sm:px-5">
              <h3 className="flex items-baseline gap-2 text-sm font-bold text-charcoal-900">
                <span className="num-ltr text-charcoal-400">{index + 1}.</span>
                {module.title}
              </h3>
              {module.summary ? (
                <p className="mt-1 text-xs leading-relaxed text-charcoal-500">{module.summary}</p>
              ) : null}
            </div>
            <ul className="divide-y divide-charcoal-100">
              {module.lessons.map((lesson) => (
                <li key={lesson.id}>
                  {lesson.freePreview ? (
                    <Link
                      href={`/learn/${courseSlug}/${lesson.id}`}
                      className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface sm:px-5 lg:min-h-0"
                    >
                      <CirclePlay aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />
                      <span className="flex-1 text-sm text-charcoal-800">{lesson.title}</span>
                      <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                        معاينة مجانية
                      </span>
                      {lesson.durationSeconds > 0 ? (
                        <span className="num-ltr shrink-0 text-xs text-charcoal-400">
                          {formatLessonDuration(lesson.durationSeconds)}
                        </span>
                      ) : null}
                    </Link>
                  ) : (
                    <div className="flex min-h-11 items-center gap-3 px-4 py-3 sm:px-5 lg:min-h-0">
                      <Lock aria-hidden="true" className="h-4 w-4 shrink-0 text-charcoal-300" />
                      <span className="flex-1 text-sm text-charcoal-600">{lesson.title}</span>
                      {lesson.durationSeconds > 0 ? (
                        <span className="num-ltr shrink-0 text-xs text-charcoal-400">
                          {formatLessonDuration(lesson.durationSeconds)}
                        </span>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex items-center gap-2 text-xs leading-relaxed text-charcoal-500">
        <PlayCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
        دروس الدورة تُشاهَد أونلاين بعد التسجيل فيها. دروس المعاينة مفتوحة للجميع.
      </p>
    </section>
  );
}
