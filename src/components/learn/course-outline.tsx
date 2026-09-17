/**
 * فهرس الدورة داخل صفحة الدرس.
 *
 * يُبنى على الخادم من المحتوى المنشور وحده، ولا يحمل إلا ما يُعرض: عنوانًا
 * ومدة وحالة قفل. لا معرّف فيديو ولا رابط موقّع — الرابط يُبنى عند فتح
 * الدرس نفسه، لكل درس على حدة، بعد فحص الإذن من جديد.
 *
 * القفل هنا **عرضٌ لا حراسة**: الحارس هو `decideLessonAccess` في صفحة
 * الدرس، ويُنفَّذ عند كل طلب سواء ظهر القفل أم لا.
 */

import Link from "next/link";
import { CirclePlay, FileText, Lock, PlayCircle } from "lucide-react";

import { formatLessonDuration } from "@/lib/learning/format";
import { cn } from "@/lib/utils";
import type { ModuleSummary } from "@/lib/learning/content";

export function CourseOutline({
  modules,
  courseSlug,
  currentLessonId,
  unlocked,
}: {
  modules: ModuleSummary[];
  courseSlug: string;
  currentLessonId: string;
  /** هل يملك المشاهد وصولًا كاملًا — يقرره الخادم لا هذا المكوّن. */
  unlocked: boolean;
}) {
  if (modules.length === 0) return null;

  return (
    <nav aria-label="محتوى الدورة" className="space-y-4">
      {modules.map((module, index) => (
        <section key={module.id} className="overflow-hidden rounded-xl border border-charcoal-200 bg-white">
          <h2 className="flex items-baseline gap-2 border-b border-charcoal-100 bg-surface px-4 py-3 text-sm font-bold text-charcoal-900">
            <span aria-hidden="true" className="num-ltr text-charcoal-400">
              {index + 1}.
            </span>
            {module.title}
          </h2>
          <ul className="divide-y divide-charcoal-100">
            {module.lessons.map((lesson) => {
              const current = lesson.id === currentLessonId;
              const open = unlocked || lesson.freePreview;
              const Icon = lesson.lessonType === "text" ? FileText : open ? CirclePlay : Lock;
              const content = (
                <>
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 shrink-0",
                      current ? "text-brand-700" : open ? "text-brand-500" : "text-charcoal-300",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                  {!open ? (
                    <span className="shrink-0 text-[11px] text-charcoal-400">مقفل</span>
                  ) : lesson.freePreview && !unlocked ? (
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      مجاني
                    </span>
                  ) : null}
                  {lesson.durationSeconds > 0 ? (
                    <span className="num-ltr shrink-0 text-xs text-charcoal-400">
                      {formatLessonDuration(lesson.durationSeconds)}
                    </span>
                  ) : null}
                </>
              );

              const base = "flex min-h-11 items-center gap-2.5 px-4 py-2.5 text-sm";
              if (!open) {
                return (
                  <li key={lesson.id} className={cn(base, "text-charcoal-400")}>
                    {content}
                  </li>
                );
              }
              return (
                <li key={lesson.id}>
                  <Link
                    href={`/learn/${courseSlug}/${lesson.id}`}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      base,
                      "transition-colors",
                      current
                        ? "border-e-2 border-brand-600 bg-brand-50/70 font-semibold text-brand-800"
                        : "text-charcoal-700 hover:bg-surface",
                    )}
                  >
                    {content}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {!unlocked ? (
        <p className="flex items-start gap-2 rounded-xl border border-charcoal-200 bg-surface px-4 py-3 text-xs leading-relaxed text-charcoal-600">
          <PlayCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          الدروس المقفلة تُفتح بعد التسجيل في الدورة.
        </p>
      ) : null}
    </nav>
  );
}
