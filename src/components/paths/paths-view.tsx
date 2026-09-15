"use client";

/**
 * PathsView — قائمة المسارات (Checkpoint 7 — D-45)
 * ---------------------------------------------------
 * SSR ببيانات Phase 1 الثابتة، وبعد الترطيب تُستبدل بمسارات الـ CMS
 * بتسعير مشتق لحظيًا (تغيير سعر دورة ينعكس تلقائيًا — لا يُخزَّن نهائيًا).
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgePercent, BookOpen, CalendarRange, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { learningPaths, getPathPricing as staticPricing } from "@/data/paths";
import { getCourseBySlug } from "@/data/courses";
import { usePublicCms } from "@/context/public-cms";
import { formatNumber, formatPercent, formatPrice } from "@/lib/format";
import type { Course } from "@/types";

const levelLabels: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
  "all-levels": "جميع المستويات",
};

export function PathsView() {
  const { view } = usePublicCms();
  /* الثابت = مسارات Phase 1 بحل دوراتها وتسعيرها المحسوب، والـ CMS = مشتق من الجسر */
  const entries = view
    ? view.paths.map((entry) => ({
        path: entry.path,
        courses: entry.courses,
        pricing: entry.pricing,
      }))
    : learningPaths.map((path) => {
        const courses = path.courseSlugs
          .map((slug) => getCourseBySlug(slug))
          .filter((course): course is Course => Boolean(course));
        const p = staticPricing(path);
        return {
          path,
          courses,
          pricing: {
            originalTotal: p.totalPrice,
            discountPercent: path.discountPercent,
            discountValue: p.totalPrice - p.finalPrice,
            finalPrice: p.finalPrice,
          },
        };
      });

  return (
    <Container className="py-12 sm:py-16 lg:py-20">
      <div className="space-y-10 lg:space-y-14">
        {entries.map(({ path, courses, pricing }, index) => (
            <Reveal key={path.id}>
              <article className="grid overflow-hidden rounded-2xl border border-charcoal-200/80 bg-white shadow-sm lg:grid-cols-2">
                {/* الصورة */}
                <div className="relative min-h-60 bg-charcoal-100 lg:min-h-full">
                  <Image
                    src={path.image}
                    alt={path.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    priority={index === 0}
                  />
                  <Badge className="absolute start-4 top-4 border-0 bg-brand-600 text-xs text-white">
                    مسار {index + 1}
                  </Badge>
                </div>

                {/* التفاصيل */}
                <div className="flex flex-col p-6 sm:p-8 lg:p-10">
                  <p className="text-sm font-semibold text-brand-600">{levelLabels[path.level]}</p>
                  <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-charcoal-900">
                    {path.name}
                  </h2>
                  <p className="mt-3 leading-relaxed text-charcoal-500">{path.description}</p>

                  {/* بيانات المسار */}
                  <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
                    <div className="flex flex-col rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-3">
                      <Layers aria-hidden="true" className="mx-auto h-4 w-4 text-brand-500" />
                      <dt className="order-2 mt-1.5 text-xs text-charcoal-400">دورات</dt>
                      <dd className="order-1 mt-1.5 text-base font-bold text-charcoal-900">
                        {courses.length}
                      </dd>
                    </div>
                    <div className="flex flex-col rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-3">
                      <CalendarRange aria-hidden="true" className="mx-auto h-4 w-4 text-brand-500" />
                      <dt className="order-2 mt-1.5 text-xs text-charcoal-400">أسابيع</dt>
                      <dd className="order-1 mt-1.5 text-base font-bold text-charcoal-900">
                        {path.durationWeeks}
                      </dd>
                    </div>
                    <div className="flex flex-col rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-3">
                      <BadgePercent aria-hidden="true" className="mx-auto h-4 w-4 text-brand-500" />
                      <dt className="order-2 mt-1.5 text-xs text-charcoal-400">خصم المسار</dt>
                      <dd className="order-1 mt-1.5 text-base font-bold text-brand-600">
                        {formatPercent(path.discountPercent)}
                      </dd>
                    </div>
                  </dl>

                  {/* الدورات المكوّنة للمسار */}
                  <ul className="mt-6 space-y-2.5">
                    {courses.map((course, i) => (
                      <li key={course.slug} className="flex min-h-11 items-center gap-3 text-sm lg:min-h-0">
                        <span
                          aria-hidden="true"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-charcoal-900 text-[11px] font-bold text-white"
                        >
                          {i + 1}
                        </span>
                        <Link
                          href={`/courses/${course.slug}`}
                          className="flex min-h-11 items-center font-medium text-charcoal-700 transition-colors hover:text-brand-600 lg:min-h-0"
                        >
                          {course.name}
                        </Link>
                        <span className="num-ltr ms-auto text-charcoal-400">
                          {formatNumber(course.price)} ريال
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* التسعير */}
                  <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-charcoal-100 pt-6">
                    <div>
                      <p className="text-sm text-charcoal-400">
                        <span className="num-ltr">{formatNumber(pricing.originalTotal)}</span> ريال{" "}
                        <span className="line-through">بشكل منفصل</span>
                      </p>
                      <p className="mt-0.5 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-charcoal-900">
                          {formatPrice(pricing.finalPrice)}
                        </span>
                        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600">
                          وفّر {formatNumber(pricing.discountValue)} ريال
                        </span>
                      </p>
                    </div>
                    <Button asChild size="lg" className="h-12 px-7 text-base font-semibold">
                      <Link href={`/paths/${path.slug}`}>
                        تفاصيل المسار
                        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
      </div>

      {/* ملاحظة توضيحية */}
      <Reveal className="mt-12 flex items-start gap-3 rounded-xl border border-dashed border-charcoal-300 bg-white p-5 text-sm leading-relaxed text-charcoal-500">
        <BookOpen aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
        <p>
          الأسعار المعروضة مجموع مباشر لأسعار الدورات مع خصم المسار (بيانات تجريبية حالياً).
          يسري الخصم عند التسجيل بكامل دورات المسار، ويمكنك التواصل معنا لتفاصيل نظام السداد.
        </p>
      </Reveal>
    </Container>
  );
}
