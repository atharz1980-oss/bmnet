"use client";

/**
 * CourseDetails — جسم صفحة الدورة (Checkpoint 7 — D-45)
 * -------------------------------------------------------
 * موّرد من صفحة الخادم بدورة Phase 1 (SSR كامل للروابط الثابتة)
 * وبعد الترطيب يستبدل من جسر بيانات الإدارة:
 * - المسودة/المحذوفة في الـ CMS → واجهة «غير متاحة» (لا صفحة مكسورة).
 * - دورة أنشأها المالك (slug جديد) → تُعرض من الـ CMS بعد الترطيب.
 * - الروابط الديناميكية غير المعروفة → واجهة غير متاحة بعد اكتمال التحميل.
 */
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Clock3,
  GraduationCap,
  Hourglass,
  MapPin,
  MonitorPlay,
  PlayCircle,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { CourseTabs } from "@/components/courses/course-tabs";
import { CourseCard } from "@/components/courses/course-card";
import { getCategoryName } from "@/data/categories";
import { courses as staticCourses, getCourseBySlug } from "@/data/courses";
import { siteConfig } from "@/data/site";
import { usePublicCms } from "@/context/public-cms";
import { WhatsAppIcon } from "@/components/shared/social-icons";
import { formatDateWithWeekday, formatPrice } from "@/lib/format";
import { formatTotalDuration } from "@/lib/learning/format";
import { EnrollCard, type EnrollMode } from "@/components/courses/enroll-card";
import type { Provider } from "@/lib/payments/settings";
import type { Course } from "@/types";

const levelLabels: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
  "all-levels": "جميع المستويات",
};

function CourseUnavailable({ slug }: { slug: string }) {
  return (
    <Container className="py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
        هذه الدورة غير متاحة حالياً
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-charcoal-500">
        ربما حُدِّثت قائمة الدورات أو أُوقفت هذه الدورة مؤقتاً —
        استعرض الدورات المتاحة أو تواصل معنا لمعرفة البدائل.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
          <Link href="/courses">استعرض الدورات</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base font-semibold">
          <Link href="/contact">تواصل معنا</Link>
        </Button>
      </div>
      <p className="sr-only">معرّف الدورة المطلوب: {slug}</p>
    </Container>
  );
}

/** أرقام محتوى الدورة الأونلاين — تُقرأ على الخادم وتُمرَّر جاهزة. */
export interface OnlineFacts {
  moduleCount: number;
  lessonCount: number;
  totalSeconds: number;
  freeCount: number;
}

/** الحالة التجارية كما قرأها الخادم — لا تُشتق في المتصفح. */
export interface EnrollmentOffer {
  courseId: string;
  mode: EnrollMode;
  providers: Provider[];
}

export function CourseDetails({
  slug,
  initialCourse,
  onlineFacts,
  enrollment,
  corporate,
  curriculumSlot,
}: {
  slug: string;
  initialCourse?: Course;
  onlineFacts?: OnlineFacts | null;
  enrollment?: EnrollmentOffer | null;
  /** تدريب شركات: تواصل مباشر لا تسجيل ذاتي ولا دفع. */
  corporate?: boolean;
  /** منهج الدورة الأونلاين — يُبنى على الخادم ويُمرَّر جاهزًا.
      لا يُقرأ هنا شيء من المتصفح: قراءة المسار أو المعاملات داخل مكوّن
      عميل تُعلّق حدود Suspense وقد أوقعت الخلاصة سابقًا. */
  curriculumSlot?: React.ReactNode;
}) {
  const { view, hydrated } = usePublicCms();

  /* بعد اكتمال التحميل: الـ CMS هو المصدر — دوره غير موجودة فيه = غير متاحة */
  const cmsCourse = view?.courses.find((course) => course.slug === slug);
  const course = view ? cmsCourse : (initialCourse ?? getCourseBySlug(slug));

  if (!course) {
    if (!hydrated) {
      /* slug جديد أنشأه المالك — أول رسم قبل قراءة المخزن */
      return (
        <Container className="flex min-h-64 items-center justify-center py-24 text-charcoal-300">
          <span className="sr-only">جارٍ تحميل بيانات الدورة…</span>
        </Container>
      );
    }
    return <CourseUnavailable slug={slug} />;
  }

  /* الدورة الأونلاين تُشاهَد في أي وقت: المواعيد والمكان والأيام لا تصفها،
     فتُستبدل بأرقام محتواها بدل أن تُعرض حقائق لا تنطبق عليها. */
  const isOnline = course.category === "online";
  const whatsappHref = view?.settings.whatsappHref ?? siteConfig.whatsappLink;
  const related = (view?.courses ?? staticCourses)
    .filter((c) => c.published && c.id !== course.id && c.category === course.category)
    .slice(0, 3);

  return (
    <>
      {/* الترويسة */}
      <header className="relative overflow-hidden bg-charcoal-950 text-white">
        <div className="absolute inset-0">
          <Image
            src={course.image}
            alt={course.imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-35"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/70 to-charcoal-950/40"
          />
        </div>

        <Container className="relative py-12 sm:py-16">
          <nav aria-label="مسار التنقل" className="mb-5 text-sm text-charcoal-300">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link href="/" className="transition-colors hover:text-white">الرئيسية</Link></li>
              <li aria-hidden="true" className="text-charcoal-500">/</li>
              <li><Link href="/courses" className="transition-colors hover:text-white">الدورات</Link></li>
              <li aria-hidden="true" className="text-charcoal-500">/</li>
              <li aria-current="page" className="font-medium text-brand-400">{course.name}</li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold">
              {getCategoryName(course.category)}
            </span>
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-charcoal-200">
              المستوى: {levelLabels[course.level]}
            </span>
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {course.name}
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-charcoal-200">{course.shortDescription}</p>
        </Container>
      </header>

      <Container className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
          {/* المحتوى الرئيسي */}
          <div className="lg:col-span-2">
            <CourseTabs course={course} curriculumSlot={isOnline ? curriculumSlot : undefined} />
          </div>

          {/* الشريط الجانبي */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {/* بطاقة الحجز */}
            <div className="rounded-2xl border border-charcoal-200 bg-white p-6 shadow-sm">
              <p className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-charcoal-900">{formatPrice(course.price)}</span>
                {course.price > 0 && (
                  <span className="text-sm text-charcoal-400">
                    {isOnline ? "دفعة واحدة" : `/ ${course.durationDays} أيام`}
                  </span>
                )}
              </p>
              {enrollment?.mode === "paid" ? (
                <p className="mt-1 text-xs text-charcoal-500">شامل ضريبة القيمة المضافة</p>
              ) : null}
              {enrollment?.mode === "free" ? (
                <p className="mt-1 text-sm font-semibold text-emerald-700">مجانية</p>
              ) : null}

              <dl className="mt-5 space-y-3.5 text-sm">
                {isOnline ? (
                  <>
                    {onlineFacts ? (
                      <>
                        <div className="flex items-center gap-2.5">
                          <PlayCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
                          <dt className="text-charcoal-500">الدروس:</dt>
                          <dd className="num-ltr ms-auto font-semibold text-charcoal-900">
                            {onlineFacts.lessonCount} درسًا في {onlineFacts.moduleCount} وحدات
                          </dd>
                        </div>
                        {onlineFacts.totalSeconds > 0 ? (
                          <div className="flex items-center gap-2.5">
                            <Hourglass aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
                            <dt className="text-charcoal-500">مدة المحتوى:</dt>
                            <dd className="num-ltr ms-auto font-semibold text-charcoal-900">
                              {formatTotalDuration(onlineFacts.totalSeconds)}
                            </dd>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    <div className="flex items-center gap-2.5">
                      <MonitorPlay aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
                      <dt className="text-charcoal-500">المشاهدة:</dt>
                      <dd className="ms-auto text-end font-semibold text-charcoal-900">
                        أونلاين في أي وقت — جوال وحاسب
                      </dd>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
                      <dt className="text-charcoal-500">الوصول:</dt>
                      <dd className="ms-auto text-end font-semibold text-charcoal-900">
                        يُفتح بعد التسجيل في الدورة
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
                      <dt className="text-charcoal-500">المدة:</dt>
                      <dd className="ms-auto font-semibold text-charcoal-900">{course.durationDays} أيام</dd>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Hourglass aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
                      <dt className="text-charcoal-500">الساعات التدريبية:</dt>
                      <dd className="ms-auto font-semibold text-charcoal-900">
                        {course.totalHours > 0 ? `${course.totalHours} ساعة` : "مرنة"}
                      </dd>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
                      <dt className="text-charcoal-500">المكان:</dt>
                      <dd className="ms-auto text-end font-semibold text-charcoal-900">{course.location}</dd>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2.5">
                  <BarChart3 aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
                  <dt className="text-charcoal-500">المستوى:</dt>
                  <dd className="ms-auto font-semibold text-charcoal-900">{levelLabels[course.level]}</dd>
                </div>
                <div className="flex items-center gap-2.5">
                  <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
                  <dt className="text-charcoal-500">المدرب:</dt>
                  <dd className="ms-auto text-end font-semibold text-charcoal-900">{course.trainer.name}</dd>
                </div>
              </dl>

              {corporate ? (
                <Button asChild size="lg" className="mt-6 h-12 w-full gap-2 text-base font-semibold">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon className="h-4 w-4" />
                    تواصل معنا عبر واتساب
                  </a>
                </Button>
              ) : enrollment ? (
                <EnrollCard
                  courseId={enrollment.courseId}
                  mode={enrollment.mode}
                  providers={enrollment.providers}
                />
              ) : isOnline ? (
                /* أونلاين بلا وسيلة دفع جاهزة: تبقى كما كانت — لا «اطلب موعدًا»
                   لدورة تُشاهَد في أي وقت. */
                <Button asChild size="lg" className="mt-6 h-12 w-full text-base font-semibold">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                    سجّل في الدورة
                  </a>
                </Button>
              ) : course.upcomingSessions.length > 0 ? (
                <Button asChild size="lg" className="mt-6 h-12 w-full text-base font-semibold">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                    احجز مقعدك الآن
                  </a>
                </Button>
              ) : (
                <Button asChild size="lg" className="mt-6 h-12 w-full text-base font-semibold">
                  <Link href="/contact">اطلب موعداً للدورة</Link>
                </Button>
              )}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="mt-2.5 h-12 w-full gap-2 text-base font-semibold"
              >
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-4 w-4" />
                  استفسار سريع عبر واتساب
                </a>
              </Button>
              <p className="mt-3 text-center text-xs text-charcoal-400">
                {corporate
                  ? "التسجيل للشركات عبر التواصل المباشر"
                  : enrollment
                    ? "للاستفسار قبل التسجيل تواصل معنا عبر واتساب"
                    : "الحجز والاستفسار حالياً عبر واتساب — بوابة الدفع قريباً"}
              </p>
              {isOnline && onlineFacts && onlineFacts.freeCount > 0 ? (
                <p className="num-ltr mt-2 text-center text-xs font-medium text-brand-700">
                  {onlineFacts.freeCount} درسًا للمعاينة المجانية — جرّب قبل التسجيل.
                </p>
              ) : null}
            </div>

            {/* المواعيد القادمة — لا تنطبق على دورة تُشاهَد في أي وقت */}
            {!isOnline && course.upcomingSessions.length > 0 && (
              <div className="rounded-2xl border border-charcoal-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-base font-bold text-charcoal-900">
                  <CalendarDays aria-hidden="true" className="h-4 w-4 text-brand-500" />
                  المواعيد القادمة
                </h2>
                <ul className="mt-4 space-y-3">
                  {course.upcomingSessions.map((session) => (
                    <li
                      key={session.id}
                      className="rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-4 text-sm"
                    >
                      <p className="font-bold text-charcoal-900">
                        {formatDateWithWeekday(session.startDate)}
                        {session.endDate ? ` – ${formatDateWithWeekday(session.endDate)}` : ""}
                      </p>
                      <p className="mt-1 text-charcoal-500">{session.time} · {session.location}</p>
                      <p className="mt-1.5 text-xs font-semibold text-brand-600">
                        {session.seatsLeft > 0
                          ? `متبقي ${session.seatsLeft} مقاعد من ${session.seatsTotal}`
                          : "اكتمل العدد – سجّل بقائمة الانتظار"}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* المدرب */}
            <div className="rounded-2xl border border-charcoal-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-charcoal-900">المدرب</h2>
              <div className="mt-4 flex items-center gap-3.5">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-charcoal-900 text-lg font-bold text-white"
                >
                  {course.trainer.name.trim().charAt(0)}
                </span>
                <div>
                  <p className="font-bold text-charcoal-900">{course.trainer.name}</p>
                  <p className="text-sm text-charcoal-500">{course.trainer.title}</p>
                </div>
              </div>
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-charcoal-50 p-3 text-xs leading-relaxed text-charcoal-500">
                <GraduationCap aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-500" />
                مدرب ممارس في المجال ويشرف على التطبيق العملي داخل الدورة.
              </p>
            </div>
          </aside>
        </div>
      </Container>

      {/* دورات ذات صلة */}
      {related.length > 0 && (
        <section aria-labelledby="related-courses" className="bg-surface py-14 sm:py-16">
          <Container>
            <div className="flex items-end justify-between gap-4">
              <h2 id="related-courses" className="text-xl font-bold tracking-tight text-charcoal-900 sm:text-2xl">
                دورات ذات صلة
              </h2>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-brand-600 hover:bg-brand-50">
                <Link href="/courses">
                  جميع الدورات
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {related.map((relatedCourse) => (
                <CourseCard key={relatedCourse.id} course={relatedCourse} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
