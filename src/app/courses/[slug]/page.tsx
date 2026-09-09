import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCourseBySlug, getPublishedCourses } from "@/data/courses";
import { loadPublicView } from "@/lib/cms/public-loader";
import { CourseDetails } from "@/components/courses/course-details";
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
  const staticCourse = getCourseBySlug(slug);
  if (staticCourse) {
    return {
      title: staticCourse.name,
      description: staticCourse.shortDescription,
      alternates: { canonical: `/courses/${slug}` },
    };
  }
  /* دورة أُنشئت لاحقًا في الـCMS: العنوان من عرض القاعدة العامة (anon) */
  const view = await loadPublicView();
  const cmsCourse = view?.courses.find((course) => course.slug === slug);
  if (!cmsCourse) return { title: "دورة غير موجودة" };
  return {
    title: cmsCourse.name,
    description: cmsCourse.shortDescription,
    alternates: { canonical: `/courses/${slug}` },
  };
}

export default async function CourseDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  /* Checkpoint 7: الدورة الثابتة للـ SSR — والعميل يستبدلها من الـ CMS بعد الترطيب */
  const staticCourse = getCourseBySlug(slug);
  if (staticCourse) {
    return <CourseDetails slug={slug} initialCourse={staticCourse} />;
  }
  /* slug غير موجود في البيانات الثابتة: دورة أُنشئت من لوحة الإدارة تُعرض،
     والمجهول تمامًا → 404 حقيقي (لا soft-404 بعنوان «غير موجودة» بحالة 200).
     فشل جلب العرض العام (view = null) → نعرض الهيكل المتسامح كالمعتاد (D-86). */
  const view = await loadPublicView();
  if (view) {
    const cmsCourse = view.courses.find((course) => course.slug === slug);
    if (!cmsCourse) notFound();
    return <CourseDetails slug={slug} initialCourse={cmsCourse} />;
  }
  return <CourseDetails slug={slug} initialCourse={staticCourse} />;
}
