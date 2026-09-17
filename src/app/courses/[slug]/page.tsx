import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCourseBySlug, getPublishedCourses } from "@/data/courses";
import { loadPublicView } from "@/lib/cms/public-loader";
import { CourseDetails } from "@/components/courses/course-details";
import { CourseCurriculum } from "@/components/learning/course-curriculum";
import { loadCourseContent } from "@/lib/learning/content";
import { siteConfig } from "@/data/site";

/** توليد صفحات ثابتة لكل دورة منشورة (Phase 1 — SSR كامل لمحركات البحث) */
export function generateStaticParams() {
  return getPublishedCourses().map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  /* مصدر الحقيقة أولًا: اسم الدورة من عرض القاعدة (يشمل المعدّل حيًا) */
  const view = await loadPublicView();
  const cmsCourse = view?.courses.find((course) => course.slug === slug);
  if (cmsCourse) {
    return {
      title: cmsCourse.name,
      description: cmsCourse.shortDescription,
      alternates: { canonical: `/courses/${slug}` },
      openGraph: {
        title: cmsCourse.name,
        description: cmsCourse.shortDescription,
        url: `/courses/${slug}`,
        images: [{ url: cmsCourse.image }],
      },
    };
  }
  const staticCourse = getCourseBySlug(slug);
  if (staticCourse) {
    return {
      title: staticCourse.name,
      description: staticCourse.shortDescription,
      alternates: { canonical: `/courses/${slug}` },
      openGraph: {
        title: staticCourse.name,
        description: staticCourse.shortDescription,
        url: `/courses/${slug}`,
        images: [{ url: staticCourse.image }],
      },
    };
  }
  return { title: "دورة غير موجودة" };
}

export default async function CourseDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  /* D-93: العرض العام هو مصدر الحقيقة — دورة غائبة عن العرض العام (مسودة
     أو مخفية) → 404 حقيقي حتى لو وُجدت في الـSeed الثابت، وإلا فلا يمكن
     إلغاء نشر دورة مزروعة أصلًا. view=null (تعذر قراءة القاعدة) → نتسامح
     مع الـSeed (D-86) بدل كسر الصفحة عند الزائر. */
  const staticCourse = getCourseBySlug(slug);
  const view = await loadPublicView();
  const cmsCourse = view?.courses.find((course) => course.slug === slug);
  if (view && !cmsCourse) notFound();
  const course = cmsCourse ?? staticCourse;

  /* منهج الدورة الأونلاين يُقرأ على الخادم مرة واحدة: معرّفات الفيديو لا
     تمر بالمتصفح، والأرقام نفسها تغذّي المنهج وبطاقة التسجيل معًا. */
  const content =
    course && course.category === "online"
      ? await loadCourseContent(course.id, { publishedOnly: true })
      : null;
  const hasCurriculum = content !== null && content.lessonCount > 0;

  return (
    <CourseDetails
      slug={slug}
      initialCourse={course}
      onlineFacts={
        hasCurriculum
          ? {
              moduleCount: content.modules.length,
              lessonCount: content.lessonCount,
              totalSeconds: content.totalSeconds,
              freeCount: content.modules
                .flatMap((module) => module.lessons)
                .filter((lesson) => lesson.freePreview).length,
            }
          : null
      }
      curriculumSlot={
        hasCurriculum ? (
          <CourseCurriculum
            modules={content.modules}
            courseSlug={slug}
            lessonCount={content.lessonCount}
            totalSeconds={content.totalSeconds}
          />
        ) : null
      }
    />
  );
}
