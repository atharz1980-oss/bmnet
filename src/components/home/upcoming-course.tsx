import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { images } from "@/data/images";
import { getUpcomingCourse } from "@/data/courses";
import { formatDate } from "@/lib/format";
import { coursePriceDisplay } from "@/lib/courses/commercial";
import { cn } from "@/lib/utils";
import type { Course, CourseSession } from "@/types";

interface UpcomingCourseProps {
  /** Checkpoint 7: زوج (دورة + موعد) من جسر بيانات الإدارة — غائب = الاشتقاق الثابت */
  data?: { course: Course; session: CourseSession } | null;
}

/** قسم "الدورة القادمة" — بارز مع تفاصيل الجلسة القريبة */
export function UpcomingCourse({ data }: UpcomingCourseProps) {
  /* null صريح من الـ CMS = لا دورة قادمة معلنة → القسم لا يُعرض */
  if (data === null) return null;
  // بيانات العرض: الدورة القادمة (أساسيات التصوير افتراضياً)
  const fallback = getUpcomingCourse();
  const course = data?.course ?? fallback;
  const session = data?.session ?? course?.upcomingSessions[0];
  if (!course) return null;
  const imageSrc = data ? course.image : images.upcomingCourse.src;
  const price = coursePriceDisplay(course);

  return (
    <section aria-labelledby="upcoming-course-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeading
          eyebrow="لا تفوّت الفرصة"
          title="الدورة القادمة"
          description="أقرب دورة انطلاقها قريب — المقاعد محدودة والأماكن تُحجز بالترتيب."
        />

        <Reveal className="mt-10 lg:mt-12">
          <div className="grid overflow-hidden rounded-2xl border border-charcoal-200/80 bg-white shadow-sm lg:grid-cols-5">
            {/* صورة الدورة.

                ملصقات الورش التي يرفعها المالك مربّعة (1:1) وصور الدورات
                المرفقة عريضة (‎16:9‎)، وعمود الصورة يأخذ ارتفاعه من عمود
                النص فتتغير نسبته مع العرض. `object-cover` كان يقصّ الفارق:
                ‎34%‎ من ارتفاع الملصق على هاتف بعرض 375 و‎18%‎ من عرضه عند
                1024 — والمقصوص هو شريطا الهوية أعلى الملصق وأسفله.
                `object-contain` يمنع القص، ونسخة مموّهة تملأ ما يفيض بدل
                شريط رمادي. النسختان بنفس `src` و`sizes` فالطلب واحد. */}
            <div className="relative aspect-square overflow-hidden bg-charcoal-100 sm:aspect-[4/3] lg:col-span-2 lg:aspect-auto lg:min-h-full">
              <Image
                src={imageSrc}
                alt=""
                aria-hidden="true"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="scale-110 object-cover blur-2xl"
              />
              <Image
                src={imageSrc}
                alt={course.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-contain"
              />
            </div>

            {/* التفاصيل */}
            <div className="flex flex-col p-6 sm:p-8 lg:col-span-3 lg:p-10">
              <p className="text-sm font-semibold text-brand-600">
                {session ? `تبدأ ${formatDate(session.startDate)}` : "المواعيد تُعلن قريباً"}
              </p>
              <h3
                id="upcoming-course-title"
                className="mt-2 text-2xl font-bold tracking-tight text-charcoal-900 sm:text-3xl"
              >
                {course.name}
              </h3>
              <p className="mt-3 max-w-xl leading-relaxed text-charcoal-500">
                {course.shortDescription}
              </p>

              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-charcoal-400">
                    <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-brand-500" />
                    المدة
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-charcoal-900">
                    {course.durationDays} أيام
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-charcoal-400">
                    <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-brand-500" />
                    التوقيت
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-charcoal-900">
                    {session?.time ?? "يُحدد لاحقاً"}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-charcoal-400">
                    <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-brand-500" />
                    المكان
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-charcoal-900">{course.location}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-charcoal-400">
                    <Users aria-hidden="true" className="h-3.5 w-3.5 text-brand-500" />
                    السعر
                  </dt>
                  <dd
                    className={cn(
                      "mt-1 text-sm font-bold",
                      price.tone === "free" ? "text-emerald-700" : "text-charcoal-900",
                    )}
                  >
                    {price.label}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 flex flex-col items-stretch gap-3 border-t border-charcoal-100 pt-6 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
                  <Link href={`/courses/${course.slug}`}>احجز مقعدك</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="h-12 gap-1.5 px-5 text-base font-semibold text-charcoal-700 hover:bg-charcoal-100"
                >
                  <Link href={`/courses/${course.slug}`}>
                    تفاصيل الدورة
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </Button>
                {session && session.seatsLeft > 0 ? (
                  <p className="text-sm text-charcoal-400 sm:ms-auto">
                    <span className="font-bold text-brand-600">{session.seatsLeft}</span>{" "}
                    مقاعد متبقية من {session.seatsTotal}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
