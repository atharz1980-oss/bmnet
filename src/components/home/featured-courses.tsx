import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { CourseCard } from "@/components/courses/course-card";
import { getFeaturedCourses } from "@/data/courses";
import type { Course } from "@/types";

/** الدورات المميزة */
export function FeaturedCourses({ courses: items }: { courses?: Course[] }) {
  const featured = (items ?? getFeaturedCourses())
    .filter((course) => course.category !== "private")
    .slice(0, 6);

  return (
    <section aria-labelledby="featured-courses-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            align="start"
            titleId="featured-courses-title"
            eyebrow="اختيار المتدربين"
            title="دوراتنا المميزة"
            description="أكثر دوراتنا طلباً — برامج عملية بمدة وسعر واضحين، وأقرب مواعيد انطلاق معروضة داخل كل دورة."
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
