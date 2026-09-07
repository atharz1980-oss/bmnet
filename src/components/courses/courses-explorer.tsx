"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/shared/container";
import { CourseCard } from "@/components/courses/course-card";
import { categories } from "@/data/categories";
import { getPublishedCourses } from "@/data/courses";
import { usePublicCms } from "@/context/public-cms";
import { cn } from "@/lib/utils";

/** قائمة الدورات مع فلترة حسب الفئة (واجهة فقط — البيانات محلية) */
export function CoursesExplorer({ initialCategory }: { initialCategory?: string }) {
  /* Checkpoint 7: دورات الـ CMS بعد الترطيب — وإلا دورات Phase 1 الثابتة */
  const { view } = usePublicCms();
  const allCourses = view?.courses ?? getPublishedCourses();
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory ?? "all");

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? allCourses
        : allCourses.filter((course) => course.category === activeCategory),
    [activeCategory, allCourses]
  );

  const tabs = [
    { id: "all", name: "جميع الدورات", count: allCourses.length },
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      count: allCourses.filter((course) => course.category === category.id).length,
    })),
  ];

  return (
    <Container className="py-12 sm:py-16 lg:py-20">
      {/* أزرار الفلترة */}
      <div
        role="group"
        aria-label="فلترة الدورات حسب الفئة"
        className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeCategory === tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              activeCategory === tab.id
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-charcoal-200 bg-white text-charcoal-600 hover:border-charcoal-400 hover:text-charcoal-900"
            )}
          >
            {tab.name}
            <span className={cn("ms-1.5 text-xs", activeCategory === tab.id ? "text-white/70" : "text-charcoal-400")}>
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* النتائج */}
      {filtered.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <p className="mt-12 rounded-xl border border-dashed border-charcoal-300 p-10 text-center text-charcoal-500">
          لا توجد دورات منشورة في هذه الفئة حالياً — جرّب فئة أخرى أو تواصل معنا.
        </p>
      )}
    </Container>
  );
}
