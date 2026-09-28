import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { CourseCard } from "@/components/courses/course-card";
import { getFeaturedCourses } from "@/data/courses";
import type { Course } from "@/types";

interface FeaturedCoursesProps {
  /** الدورات المميزة الممررة من الـ CMS أو الاستعلام الثابت */
  courses?: Course[];
}

/**
 * القسم 4 — الأكاديمية / الدورات المميزة (Academy)
 * يعرض الدورات التدريبية المعتمدة مع الحفاظ الكامل على منطق التسعير والمقاعد
 */
export function FeaturedCourses({ courses: items }: FeaturedCoursesProps) {
  const featured = (items ?? getFeaturedCourses())
    .filter((course) => course.category !== "private")
    .slice(0, 6);

  return (
    <section aria-labelledby="featured-courses-title" className="py-16 sm:py-20 lg:py-28">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            align="start"
            titleId="featured-courses-title"
            eyebrow="الأكاديمية التدريبية / ACADEMY"
            title="دورات وبرامج بيت المصور"
            description="برامج تدريبية متخصصة في التصوير الفوتوغرافي وصناعة المحتوى بالجوال والفيديو، يقدمها مدربون ممارسون بتطبيق عملي مكثف."
          />
          <Reveal delay={100}>
            <Button asChild variant="outline" size="lg" className="shrink-0 gap-1.5">
              <Link href="/courses">
                جميع الدورات
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {featured.map((course, index) => (
            <Reveal key={course.id} delay={(index % 3) * 80}>
              <CourseCard course={course} priority={index < 3} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
