import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { communityLoginHref } from "@/lib/community/auth-links";
import { getCommunityViewerId } from "@/lib/community/member";
import { bunnyConfig, playbackUrl } from "@/lib/learning/bunny";
import { hasCourseAccess, loadCourseContent, loadLessonContext } from "@/lib/learning/content";
import { formatLessonDuration } from "@/lib/learning/format";

/* درس محمي: لا تخزين ولا توليد ساكن — الإذن يُفحص عند كل طلب. */
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
  /* الدرس غير موجود، أو لا ينتمي لهذا المسار، أو دورته غير منشورة. */
  if (!context || context.courseSlug !== slug || !context.coursePublished) notFound();
  if (!context.lesson.published && !context.lesson.free_preview) notFound();

  const lessonPath = `/learn/${slug}/${lessonId}`;
  const viewerId = await getCommunityViewerId();
  const entitled =
    context.lesson.free_preview || (await hasCourseAccess(viewerId, context.courseId));

  if (!entitled) {
    /* زائر بلا حساب: نرسله للدخول ويعود إلى الدرس نفسه. */
    if (!viewerId) redirect(communityLoginHref(lessonPath));
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-charcoal-200 bg-white p-6 text-center sm:p-8">
          <Lock aria-hidden="true" className="mx-auto h-8 w-8 text-charcoal-300" />
          <h1 className="mt-4 text-xl font-bold text-charcoal-900">هذا الدرس لمن سجّل في الدورة</h1>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-500">
            لم يُفتح لك محتوى «{context.courseName}» بعد. راجع صفحة الدورة أو تواصل معنا لإتمام
            التسجيل.
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

  const config = bunnyConfig();
  const source =
    config && context.lesson.video_id ? playbackUrl(context.lesson.video_id, config) : null;

  const { modules } = await loadCourseContent(context.courseId, { publishedOnly: true });
  const ordered = modules.flatMap((module) => module.lessons);
  const position = ordered.findIndex((lesson) => lesson.id === lessonId);
  const next = position >= 0 ? ordered[position + 1] : undefined;

  return (
    <Container className="py-8 sm:py-12">
      <Link
        href={`/courses/${slug}`}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-brand-700 hover:underline lg:min-h-0"
      >
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
        {context.courseName}
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-charcoal-900 sm:text-3xl">
        {context.lesson.title}
      </h1>
      {context.lesson.duration_seconds > 0 ? (
        <p className="num-ltr mt-1 text-sm text-charcoal-400">
          {formatLessonDuration(context.lesson.duration_seconds)}
        </p>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-charcoal-200 bg-charcoal-950">
        {source ? (
          <div className="relative aspect-video">
            <iframe
              src={source}
              title={context.lesson.title}
              loading="lazy"
              allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ) : (
          <p className="p-8 text-center text-sm leading-relaxed text-charcoal-300" role="status">
            لم يُربط فيديو هذا الدرس بعد، أو لم يُضبط إعداد البث على الخادم.
          </p>
        )}
      </div>

      {context.lesson.description ? (
        <p className="mt-5 max-w-2xl leading-relaxed text-charcoal-600">
          {context.lesson.description}
        </p>
      ) : null}

      {next ? (
        <div className="mt-8 border-t border-charcoal-100 pt-6">
          <p className="text-xs text-charcoal-400">الدرس التالي</p>
          <Link
            href={`/learn/${slug}/${next.id}`}
            className="mt-1 flex min-h-11 items-center text-base font-semibold text-charcoal-900 hover:text-brand-700 lg:min-h-0"
          >
            {next.title}
          </Link>
        </div>
      ) : null}
    </Container>
  );
}
