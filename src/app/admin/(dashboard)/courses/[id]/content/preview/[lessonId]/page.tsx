import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Eye } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { LessonBody, LessonVideo } from "@/components/learn/lesson-player";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/admin/session";
import { decideLessonAccess } from "@/lib/learning/access";
import { bunnyConfig, playbackUrl } from "@/lib/learning/bunny";
import { loadCourseContent, loadLessonContext } from "@/lib/learning/content";
import { formatLessonDuration } from "@/lib/learning/format";

/**
 * المعاينة الإدارية للدرس.
 *
 * هذا هو «معاينة كطالب» — ولذلك يعيش داخل `/admin` خلف
 * `requirePermission`، **لا** كمعامل في رابط عام. لا `?preview=true` ولا
 * `?admin=true`: معامل كهذا يصير مفتاحًا عامًّا لكل محتوى مدفوع بمجرد أن
 * يُكتشف، ولا يمكن سحبه بعد انتشاره.
 *
 * مسار الطالب `/learn/[slug]/[lessonId]` لم يُمسّ: قراره لا يزال
 * `decideLessonAccess` وحده، ولا استثناء فيه لإداري.
 *
 * الفيديو هنا يُوقَّع بالمفتاح نفسه وللمدة نفسها؛ لا معرّف فيديو يصل
 * المتصفح، ولا رابط غير موقّع يُعرض عند غياب الإعداد.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "معاينة الدرس",
  robots: { index: false, follow: false },
};

/** ما يراه الطالب من هذا الدرس — مشتق من قرار الوصول نفسه لا من قاعدة موازية. */
function studentVisibility(facts: {
  coursePublished: boolean;
  modulePublished: boolean;
  lessonPublished: boolean;
  freePreview: boolean;
}): { tone: "open" | "gated" | "hidden"; text: string } {
  /* عضو مسجّل تسجيلًا فعّالًا — أوسع حال ممكن. ما يُحجب عنه يُحجب عن الجميع. */
  const decision = decideLessonAccess({
    ...facts,
    viewerId: "preview",
    enrollment: { status: "active", expiresAt: null },
  });
  if (decision.outcome === "not-found") {
    if (decision.reason === "course-draft") {
      return { tone: "hidden", text: "الدورة نفسها غير منشورة — لا يصل الطالب إلى هذا الدرس." };
    }
    if (decision.reason === "module-draft") {
      return { tone: "hidden", text: "وحدة هذا الدرس مسودة — لا يراها الطالب ولا دروسها." };
    }
    return { tone: "hidden", text: "هذا الدرس مسودة — لا يراه الطالب بعد." };
  }
  if (decision.outcome === "allow" && decision.reason === "free-preview") {
    return { tone: "open", text: "درس معاينة مجانية — مفتوح لكل زائر بلا تسجيل." };
  }
  return { tone: "gated", text: "منشور — يفتحه المسجّلون تسجيلًا فعّالًا وحدهم." };
}

export default async function AdminLessonPreviewPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const gate = await requirePermission("courses", "view");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const { id, lessonId } = await params;
  const context = await loadLessonContext(lessonId);
  /* الدرس غير موجود، أو لا ينتمي لهذه الدورة (معرّف مُبدَّل يدويًا). */
  if (!context || context.courseId !== id) notFound();

  const visibility = studentVisibility({
    coursePublished: context.coursePublished,
    modulePublished: context.modulePublished,
    lessonPublished: context.lesson.published,
    freePreview: context.lesson.free_preview,
  });

  /* Fail closed هنا أيضًا: بلا إعداد موقّع لا مشغّل. */
  const config = bunnyConfig();
  const source =
    context.lesson.lesson_type === "video" && config && context.lesson.video_id
      ? playbackUrl(context.lesson.video_id, config)
      : null;

  /* المحتوى كاملًا — المعاينة تشمل المسودات، وهي خلف الصلاحية. */
  const { modules } = await loadCourseContent(context.courseId);
  const ordered = modules.flatMap((module) => module.lessons);
  const position = ordered.findIndex((lesson) => lesson.id === lessonId);
  const previous = position > 0 ? ordered[position - 1] : undefined;
  const next = position >= 0 ? ordered[position + 1] : undefined;
  const previewHref = (target: string) => `/admin/courses/${id}/content/preview/${target}`;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href={`/admin/courses/${id}/content`}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-brand-700 hover:underline lg:min-h-0"
      >
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
        عودة إلى محتوى الدورة
      </Link>

      <AdminPageHeader title="معاينة كطالب" description={context.courseName}>
        {visibility.tone !== "hidden" ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/learn/${context.courseSlug}/${lessonId}`} target="_blank" rel="noreferrer">
              فتح الرابط العام
            </Link>
          </Button>
        ) : null}
      </AdminPageHeader>

      <p
        role="status"
        className={
          visibility.tone === "open"
            ? "flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-900"
            : visibility.tone === "gated"
              ? "flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800"
              : "flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900"
        }
      >
        <Eye aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          {visibility.text} هذه معاينة إدارية داخل لوحة التحكم، ولا تغيّر شيئًا مما يراه الطالب.
        </span>
      </p>

      <div className="mx-auto w-full max-w-3xl">
        <h2 className="text-xl font-bold tracking-tight text-charcoal-900 sm:text-2xl">
          {context.lesson.title}
        </h2>
        {context.lesson.duration_seconds > 0 ? (
          <p className="num-ltr mt-1 text-sm text-charcoal-400">
            {formatLessonDuration(context.lesson.duration_seconds)}
          </p>
        ) : null}

        <div className="mt-5">
          {context.lesson.lesson_type === "video" ? (
            <>
              <LessonVideo source={source} title={context.lesson.title} />
              {context.lesson.description ? (
                <p className="mt-5 max-w-2xl leading-relaxed text-charcoal-600">
                  {context.lesson.description}
                </p>
              ) : null}
            </>
          ) : (
            <LessonBody source={context.lesson.description} />
          )}
        </div>

        {previous || next ? (
          <nav
            aria-label="التنقل بين الدروس"
            className="mt-8 flex flex-col gap-2 border-t border-charcoal-100 pt-5 sm:flex-row sm:justify-between"
          >
            {previous ? (
              <Button asChild variant="outline" className="justify-start">
                <Link href={previewHref(previous.id)}>السابق: {previous.title}</Link>
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button asChild variant="outline" className="justify-start">
                <Link href={previewHref(next.id)}>التالي: {next.title}</Link>
              </Button>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
