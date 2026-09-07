"use client";

/**
 * PathDetails — جسم صفحة المسار (Checkpoint 7 — D-45)
 * ------------------------------------------------------
 * SSR بالمسار الثابت، وبعد الترطيب مسار الـ CMS بتسعيره المشتق.
 * مسار غير منشور/محذوف في الـ CMS → واجهة غير متاحة بلا كسر.
 */
import Image from "next/image";
import Link from "next/link";
import { BadgePercent, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { CourseCard } from "@/components/courses/course-card";
import { learningPaths, getPathPricing } from "@/data/paths";
import { getCourseBySlug } from "@/data/courses";
import { usePublicCms } from "@/context/public-cms";
import { formatNumber, formatPercent } from "@/lib/format";
import type { Course, LearningPath } from "@/types";

function PathUnavailable() {
  return (
    <Container className="py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
        هذا المسار غير متاح حالياً
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-charcoal-500">
        ربما حُدِّثت المسارات أو أُوقف هذا المسار مؤقتاً — استعرض المسارات المتاحة.
      </p>
      <Button asChild size="lg" className="mt-8 h-12 px-8 text-base font-semibold">
        <Link href="/paths">استعرض المسارات</Link>
      </Button>
    </Container>
  );
}

interface PathPricingView {
  originalTotal: number;
  discountValue: number;
  finalPrice: number;
}

function resolveStatic(
  slug: string,
): { path: LearningPath; courses: Course[]; pricing: PathPricingView } | undefined {
  const path = learningPaths.find((p) => p.slug === slug);
  if (!path) return undefined;
  const courses = path.courseSlugs
    .map((s) => getCourseBySlug(s))
    .filter((course): course is Course => Boolean(course));
  const pricing = getPathPricing(path);
  return {
    path,
    courses,
    pricing: {
      originalTotal: pricing.totalPrice,
      discountValue: pricing.totalPrice - pricing.finalPrice,
      finalPrice: pricing.finalPrice,
    },
  };
}

export function PathDetails({ slug }: { slug: string }) {
  const { view, hydrated } = usePublicCms();

  const cmsEntry = view?.paths.find((entry) => entry.path.slug === slug);
  const entry = cmsEntry
    ? {
        path: cmsEntry.path,
        courses: cmsEntry.courses,
        pricing: {
          originalTotal: cmsEntry.pricing.originalTotal,
          discountValue: cmsEntry.pricing.discountValue,
          finalPrice: cmsEntry.pricing.finalPrice,
        } as PathPricingView,
      }
    : resolveStatic(slug);

  if (!entry) {
    if (!hydrated) {
      return (
        <Container className="flex min-h-64 items-center justify-center py-24 text-charcoal-300">
          <span className="sr-only">جارٍ تحميل بيانات المسار…</span>
        </Container>
      );
    }
    return <PathUnavailable />;
  }

  const { path, courses, pricing } = entry;
  const pathCourses = courses;

  return (
    <>
      <header className="relative overflow-hidden bg-charcoal-950 text-white">
        <div className="absolute inset-0">
          <Image
            src={path.image}
            alt={path.imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-35"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/70 to-charcoal-950/40" />
        </div>
        <Container className="relative py-14 sm:py-20">
          <nav aria-label="مسار التنقل" className="mb-5 text-sm text-charcoal-300">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link href="/" className="transition-colors hover:text-white">الرئيسية</Link></li>
              <li aria-hidden="true" className="text-charcoal-500">/</li>
              <li><Link href="/paths" className="transition-colors hover:text-white">المسارات</Link></li>
              <li aria-hidden="true" className="text-charcoal-500">/</li>
              <li aria-current="page" className="font-medium text-brand-400">{path.name}</li>
            </ol>
          </nav>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {path.name}
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-charcoal-200">{path.description}</p>
        </Container>
      </header>

      <Container className="py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div>
              <h2 className="text-xl font-bold text-charcoal-900">دورات المسار</h2>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-500">
                تُدرس دورات المسار بالترتيب المعروض، ويمكنك الاطلاع على تفاصيل كل دورة على حدة:
              </p>
            </div>
            {pathCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-charcoal-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-bold text-charcoal-900">
                <BadgePercent aria-hidden="true" className="h-4 w-4 text-brand-500" />
                تسعير المسار
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {pathCourses.map((course) => (
                  <li key={course.id} className="flex items-center justify-between gap-2 text-charcoal-600">
                    <span className="line-clamp-1">{course.name}</span>
                    <span className="num-ltr shrink-0">{formatNumber(course.price)} ريال</span>
                  </li>
                ))}
                <li className="flex items-center justify-between border-t border-charcoal-100 pt-2.5 font-semibold text-charcoal-900">
                  <span>المجموع</span>
                  <span className="num-ltr">{formatNumber(pricing.originalTotal)} ريال</span>
                </li>
                <li className="flex items-center justify-between font-semibold text-brand-600">
                  <span>خصم المسار ({formatPercent(path.discountPercent)})</span>
                  <span className="num-ltr">- {formatNumber(pricing.discountValue)} ريال</span>
                </li>
                <li className="flex items-center justify-between border-t border-charcoal-100 pt-2.5 text-base font-bold text-charcoal-900">
                  <span>الإجمالي بعد الخصم</span>
                  <span className="num-ltr">{formatNumber(pricing.finalPrice)} ريال</span>
                </li>
              </ul>
              <Button asChild size="lg" className="mt-6 h-12 w-full text-base font-semibold">
                <Link href="/contact">استفسر عن المسار</Link>
              </Button>
              <p className="mt-3 text-center text-xs text-charcoal-400">
                التسجيل بالمسار يشمل كل دوراته — الأسعار تجريبية حالياً
              </p>
            </div>

            <div className="rounded-2xl border border-charcoal-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-charcoal-900">ما يميز المسار</h2>
              <ul className="mt-4 space-y-2.5 text-sm text-charcoal-600">
                {[
                  `تسلسل تدريبي مدروس على ${path.durationWeeks} أسابيع`,
                  "خصم المسار أقل من تسجيل كل دورة على حدة",
                  "متابعة تقدم بين الدورات من فريق المركز",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
