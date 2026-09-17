import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ListVideo, Lock, Unlock } from "lucide-react";

import { Container } from "@/components/shared/container";
import { CourseOutline } from "@/components/learn/course-outline";
import { LessonBody, LessonVideo } from "@/components/learn/lesson-player";
import { Button } from "@/components/ui/button";
import { communityLoginHref } from "@/lib/community/auth-links";
import { getCommunityViewerId } from "@/lib/community/member";
import { decideLessonAccess, enrollmentGrantsAccess, lockedMessage } from "@/lib/learning/access";
import { bunnyConfig, playbackUrl } from "@/lib/learning/bunny";
import { loadCourseContent, loadEnrollment, loadLessonContext } from "@/lib/learning/content";
import { formatLessonDuration } from "@/lib/learning/format";

/* درس محمي: لا تخزين ولا توليد ساكن — الإذن يُفحص عند كل طلب، والرابط
   الموقّع داخل الصفحة يخصّ طالبها وحده. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "مشاهدة الدرس",
  robots: { index: false, follow: false },
};

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const context = await loadLessonContext(lessonId);
  /* الدرس غير موجود، أو لا ينتمي لهذا المسار (معرّف مُبدَّل يدويًا). */
  if (!context || context.courseSlug !== slug) notFound();

  const viewerId = await getCommunityViewerId();
  const enrollment = await loadEnrollment(viewerId, context.courseId);
  const decision = decideLessonAccess({
    coursePublished: context.coursePublished,
    modulePublished: context.modulePublished,
    lessonPublished: context.lesson.published,
    freePreview: context.lesson.free_preview,
    viewerId,
    enrollment,
  });

  /* المسودة غير موجودة من منظور الزائر — لا نكشف أن هناك ما يُنتظر. */
  if (decision.outcome === "not-found") notFound();

  const lessonPath = `/learn/${slug}/${lessonId}`;
  if (decision.outcome === "sign-in") redirect(communityLoginHref(lessonPath));

  if (decision.outcome === "locked") {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-charcoal-200 bg-white p-6 text-center sm:p-8">
          <Lock aria-hidden="true" className="mx-auto h-8 w-8 text-charcoal-300" />
          <h1 className="mt-4 text-xl font-bold text-charcoal-900">هذا الدرس لمن سجّل في الدورة</h1>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-500">
            {lockedMessage(decision.reason)} الدورة: «{context.courseName}».
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href={`/courses/${slug}`}>صفحة الدورة</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">تواصل معنا</Link>
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  /* Fail closed: بلا إعداد موقّع لا مشغّل. لا رجوع إلى embed غير موقّع. */
  const config = bunnyConfig();
  const source =
    context.lesson.lesson_type === "video" && config && context.lesson.video_id
      ? playbackUrl(context.lesson.video_id, config)
      : null;

  /* الفهرس من المنشور وحده — ما لا يراه الطالب لا يُذكر له. */
  const { modules } = await loadCourseContent(context.courseId, { publishedOnly: true });
  const ordered = modules.flatMap((module) => module.lessons);
  const position = ordered.findIndex((lesson) => lesson.id === lessonId);
  const previous = position > 0 ? ordered[position - 1] : undefined;
  const next = position >= 0 ? ordered[position + 1] : undefined;

  /* «مفتوح» يعني تسجيلًا فعّالًا؛ المعاينة المجانية تفتح درسها وحده. */
  const unlocked = enrollmentGrantsAccess(enrollment);
  const previewing = !unlocked && decision.reason === "free-preview";

  const outline = (
    <CourseOutline
      modules={modules}
      courseSlug={slug}
      currentLessonId={lessonId}
      unlocked={unlocked}
    />
  );

  return (
    <Container className="py-6 sm:py-10">
      <Link
        href={`/courses/${slug}`}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-brand-700 hover:underline lg:min-h-0"
      >
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
        {context.courseName}
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          {position >= 0 ? (
            <p className="num-ltr text-xs font-medium text-charcoal-400">
              الدرس {position + 1} من {ordered.length}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-charcoal-900 sm:text-3xl">
            {context.lesson.title}
          </h1>
          <p className="num-ltr mt-1 flex flex-wrap items-center gap-2 text-sm text-charcoal-400">
            {context.lesson.duration_seconds > 0 ? (
              <span>{formatLessonDuration(context.lesson.duration_seconds)}</span>
            ) : null}
            {previewing ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                <Unlock aria-hidden="true" className="h-3 w-3" />
                معاينة مجانية
              </span>
            ) : null}
          </p>

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

          {previewing ? (
            <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5 text-center sm:p-6">
              <h2 className="text-base font-bold text-brand-900">أعجبك الدرس؟ بقية الدورة بانتظارك</h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-brand-800">
                هذا درس معاينة مجاني. التسجيل في «{context.courseName}» يفتح باقي الدروس كاملة.
              </p>
              <Button asChild className="mt-4">
                <Link href={`/courses/${slug}`}>سجّل في الدورة</Link>
              </Button>
            </div>
          ) : null}

          {previous || next ? (
            <nav
              aria-label="التنقل بين الدروس"
              className="mt-8 flex flex-col gap-2 border-t border-charcoal-100 pt-5 sm:flex-row sm:justify-between"
            >
              {previous ? (
                <Button asChild variant="outline" className="justify-start gap-1.5 sm:max-w-[48%]">
                  <Link href={`/learn/${slug}/${previous.id}`}>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="truncate">{previous.title}</span>
                  </Link>
                </Button>
              ) : (
                <span className="hidden sm:block" />
              )}
              {next ? (
                <Button asChild className="justify-start gap-1.5 sm:max-w-[48%]">
                  <Link href={`/learn/${slug}/${next.id}`}>
                    <span className="truncate">{next.title}</span>
                    <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
              ) : null}
            </nav>
          ) : null}
        </div>

        {/* الفهرس: جانبي على الشاشات الكبيرة، ومطويّ تحت المشغّل على الجوال. */}
        <aside className="lg:col-span-1">
          <div className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            {outline}
          </div>
          <details className="group rounded-xl border border-charcoal-200 bg-white lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-charcoal-900 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <ListVideo aria-hidden="true" className="h-4 w-4 text-brand-500" />
                محتوى الدورة
              </span>
              <span className="num-ltr text-xs font-normal text-charcoal-400">
                {ordered.length} درسًا
              </span>
            </summary>
            <div className="border-t border-charcoal-100 p-3">{outline}</div>
          </details>
        </aside>
      </div>
    </Container>
  );
}
