/**
 * منهج الدورة الأونلاين في صفحتها العامة — قائمة قابلة للطي.
 *
 * يُعرض للجميع: العناوين والمدد هي التسويق نفسه. لكن لا معرّف فيديو يصل
 * المتصفح — العمود غير ممنوح لـanon في القاعدة أصلًا، وهذا المكوّن لا
 * يستقبل إلا `hasVideo`.
 *
 * الطي بـ`<details>` الأصلي لا بحالة React: يعمل قبل الترطيب وبعده، وبلوحة
 * المفاتيح وقارئ الشاشة بلا كود، ولا يضيف جافاسكربت إلى صفحة عامة تُخبّأ
 * على الحافة.
 */

import Link from "next/link";
import { ChevronDown, CirclePlay, FileText, Lock, PlayCircle } from "lucide-react";

import { formatLessonDuration, formatTotalDuration } from "@/lib/learning/format";
import type { ModuleSummary } from "@/lib/learning/content";

export function CourseCurriculum({
  modules,
  courseSlug,
  lessonCount,
  totalSeconds,
}: {
  modules: ModuleSummary[];
  courseSlug: string;
  lessonCount: number;
  totalSeconds: number;
}) {
  if (modules.length === 0 || lessonCount === 0) return null;
  const freeCount = modules.flatMap((module) => module.lessons).filter((lesson) => lesson.freePreview).length;

  return (
    <section aria-labelledby="course-curriculum-title">
      <h2 id="course-curriculum-title" className="sr-only">
        محتوى الدورة
      </h2>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="الوحدات" value={String(modules.length)} />
        <Fact label="الدروس" value={String(lessonCount)} />
        <Fact label="مدة المحتوى" value={totalSeconds > 0 ? formatTotalDuration(totalSeconds) : "—"} />
        <Fact label="دروس مجانية" value={String(freeCount)} />
      </dl>

      <ol className="mt-5 space-y-3">
        {modules.map((module, index) => (
          <li key={module.id}>
            <details
              open={index === 0}
              className="group overflow-hidden rounded-xl border border-charcoal-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-charcoal-50 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="num-ltr flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-charcoal-100 text-sm font-bold text-charcoal-500 group-open:bg-brand-600 group-open:text-white"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-charcoal-900">{module.title}</span>
                    <span className="num-ltr mt-0.5 block text-xs text-charcoal-400">
                      {module.lessons.length} درسًا
                      {moduleSeconds(module) > 0 ? ` · ${formatTotalDuration(moduleSeconds(module))}` : ""}
                    </span>
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-charcoal-400 transition-transform group-open:rotate-180"
                />
              </summary>

              {module.summary ? (
                <p className="border-t border-charcoal-100 bg-surface px-4 py-3 text-xs leading-relaxed text-charcoal-500 sm:px-5">
                  {module.summary}
                </p>
              ) : null}

              <ul className="divide-y divide-charcoal-100 border-t border-charcoal-100">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    {lesson.freePreview ? (
                      <Link
                        href={`/learn/${courseSlug}/${lesson.id}`}
                        className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface sm:px-5"
                      >
                        <CirclePlay aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />
                        <span className="min-w-0 flex-1 text-sm text-charcoal-800">{lesson.title}</span>
                        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                          معاينة مجانية
                        </span>
                        <Duration seconds={lesson.durationSeconds} />
                      </Link>
                    ) : (
                      <div className="flex min-h-11 items-center gap-3 px-4 py-3 sm:px-5">
                        {lesson.lessonType === "text" ? (
                          <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-charcoal-300" />
                        ) : (
                          <Lock aria-hidden="true" className="h-4 w-4 shrink-0 text-charcoal-300" />
                        )}
                        <span className="min-w-0 flex-1 text-sm text-charcoal-600">{lesson.title}</span>
                        <Duration seconds={lesson.durationSeconds} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-charcoal-500">
        <PlayCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
        دروس الدورة تُشاهَد أونلاين في أي وقت بعد التسجيل فيها. دروس المعاينة مفتوحة للجميع بلا حساب.
      </p>
    </section>
  );
}

function moduleSeconds(module: ModuleSummary): number {
  return module.lessons.reduce((sum, lesson) => sum + lesson.durationSeconds, 0);
}

function Duration({ seconds }: { seconds: number }) {
  if (seconds <= 0) return null;
  return <span className="num-ltr shrink-0 text-xs text-charcoal-400">{formatLessonDuration(seconds)}</span>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-charcoal-200 bg-white p-3 text-center">
      <dt className="text-xs text-charcoal-500">{label}</dt>
      <dd className="num-ltr mt-1 text-base font-bold text-charcoal-900">{value}</dd>
    </div>
  );
}
