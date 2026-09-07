import type { Metadata } from "next";
import { getCourseBySlug, getPublishedCourses } from "@/data/courses";
import { CourseDetails } from "@/components/courses/course-details";

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
  const course = getCourseBySlug(slug);
  if (!course) return { title: "دورة غير موجودة" };
  return {
    title: course.name,
    description: course.shortDescription,
  };
}

export default async function CourseDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  /* Checkpoint 7: الدورة الثابتة للـ SSR — والعميل يستبدلها من الـ CMS بعد الترطيب */
  return <CourseDetails slug={slug} initialCourse={getCourseBySlug(slug)} />;
}
