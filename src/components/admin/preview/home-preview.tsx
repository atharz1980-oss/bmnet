"use client";

/**
 * HomePreview — معاينة إدارية للصفحة الرئيسية (المهمة #14)
 * ----------------------------------------------------------
 * تعكس بيانات Homepage CMS من Admin Store في نفس الجلسة، وتحترم:
 *  - ترتيب الأقسام (مصفوفة sections هو المصدر — Business 2)
 *  - Enabled/Disabled (القسم المعطّل لا يظهر — Business 3)
 *  - التقييمات المخفية لا تظهر (Business 4)
 *  - الوضع التلقائي للتقييمات يستخدم المميزة فقط (Business 6)
 *
 * ليست نسخة Pixel-perfect من `/` العامة — لكنها بنفس لغة التصميم
 * (Container/SectionHeading/tokens). الموقع العام لا يقرأ المخزن.
 */
import Link from "next/link";
import {
  ArrowLeft,
  CircleAlert,
  Clock3,
  MapPin,
  Star,
  Users,
} from "lucide-react";

import type { AdminCourse, AdminData } from "@/data/admin/types";
import {
  getHomepageFeaturedCourses,
  getHomepageTestimonials,
  getHomepageUpcoming,
  getSessionRemainingSeats,
} from "@/data/admin/selectors";
import { formatDate, formatNumber } from "@/lib/format";
import { courseCommercialState, coursePriceDisplay } from "@/lib/courses/commercial";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { PlaceholderLogo } from "@/components/shared/placeholder-logo";
import { whyUsIcon } from "@/components/admin/homepage/why-us-icons";

/** خريطة معرّفات الأقسام إلى عرضها */
function PreviewSection({
  id,
  data,
  children,
}: {
  id: string;
  data: AdminData;
  children: React.ReactNode;
}) {
  const section = data.homepage.sections.find((entry) => entry.id === id);
  if (!section || !section.enabled) return null;
  return <>{children}</>;
}

export function HomePreview({ data }: { data: AdminData }) {
  const homepage = data.homepage;
  /* ترتيب الأقسام = ترتيب المصفوفة نفسها (Business 2) */
  const orderedIds = homepage.sections.map((section) => section.id);

  const upcoming = getHomepageUpcoming(homepage.upcomingCourse, data);
  const featuredCourses = getHomepageFeaturedCourses(
    homepage.featuredCourses.mode,
    homepage.featuredCourses.manualCourseIds,
    data.courses,
  );
  const shownTestimonials = getHomepageTestimonials(
    homepage.testimonials.mode,
    homepage.testimonials.manualIds,
    data.testimonials,
  );

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8" dir="rtl">
      {/* شريط توضيحي — خاص بالمعاينة الإدارية */}
      <div className="border-b border-brand-200 bg-brand-50 px-4 py-2.5 text-center text-xs font-medium text-brand-700 sm:px-6">
        معاينة إدارية تعكس بيانات لوحة التحكم — الموقع العام <span className="font-latin">/</span> لا يرتبط بالمخزن في هذه المرحلة.
      </div>

      <div className="bg-white">
        {orderedIds.map((id) => (
          <PreviewSection key={id} id={id} data={data}>
            {id === "hero" ? <HeroPreview data={data} /> : null}
            {id === "statistics" ? <StatisticsPreview data={data} /> : null}
            {id === "upcoming-course" ? (
              <UpcomingPreview
                course={upcoming.course}
                session={upcoming.session}
                warning={upcoming.warning}
              />
            ) : null}
            {id === "course-categories" ? <CategoriesPreview data={data} /> : null}
            {id === "featured-courses" ? <FeaturedPreview courses={featuredCourses} /> : null}
            {id === "why-us" ? <WhyUsPreview data={data} /> : null}
            {id === "accreditations" ? <OrgsPreview data={data} kind="accreditations" /> : null}
            {id === "partners" ? <OrgsPreview data={data} kind="partners" /> : null}
            {id === "testimonials" ? (
              <TestimonialsPreview data={data} testimonials={shownTestimonials} />
            ) : null}
            {id === "cta" ? <CtaPreview data={data} /> : null}
          </PreviewSection>
        ))}

        {/* إن كان كل شيء معطّلًا — رسالة توضيحية */}
        {homepage.sections.every((section) => !section.enabled) ? (
          <Container className="py-24 text-center">
            <p className="text-sm text-muted-foreground">
              كل الأقسام معطّلة حاليًا — فعّل قسمًا واحدًا على الأقل من{" "}
              <Link href="/admin/content/home" className="font-medium text-brand-700 underline-offset-4 hover:underline">
                محرر الصفحة الرئيسية
              </Link>
              .
            </p>
          </Container>
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function HeroPreview({ data }: { data: AdminData }) {
  const hero = data.homepage.hero;
  return (
    <section aria-label="معاينة القسم الافتتاحي" className="bg-charcoal-950 text-white">
      <Container className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
        <div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {hero.title}
          </h2>
          <p className="mt-5 max-w-lg leading-relaxed text-charcoal-300">
            {hero.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="inline-flex h-12 items-center rounded-lg bg-brand-600 px-8 text-base font-semibold text-white">
              {hero.primaryCta.text}
            </span>
            {hero.secondaryCta.text ? (
              <span className="inline-flex h-12 items-center rounded-lg border border-charcoal-700 px-6 text-base font-semibold text-charcoal-200">
                {hero.secondaryCta.text}
              </span>
            ) : null}
          </div>
        </div>
        <div className="relative min-h-64 overflow-hidden rounded-2xl bg-charcoal-900 lg:min-h-80">
          {hero.image ? (
            <img
              src={hero.image}
              alt={hero.imageAlt}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────── الإحصائيات ─────────────────────────── */

function StatisticsPreview({ data }: { data: AdminData }) {
  const stats = data.homepage.statistics.filter((stat) => stat.enabled);
  if (stats.length === 0) return null;
  return (
    <section aria-label="معاينة شريط الإحصائيات" className="bg-white">
      <Container className="-mt-0 py-10">
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-charcoal-800 bg-charcoal-800 lg:grid-cols-4">
          {stats.map((stat) => (
            <li key={stat.id} className="flex flex-col items-center gap-1.5 bg-charcoal-950 px-4 py-6 text-center sm:py-8">
              <p className="text-2xl font-bold text-white sm:text-3xl">
                <span className="num-ltr" dir="ltr">
                  {stat.prefix ?? ""}
                  {formatNumber(stat.value)}
                  {stat.suffix ?? ""}
                </span>
              </p>
              <p className="text-sm text-charcoal-300">{stat.label}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ─────────────────────────── الدورة القادمة ─────────────────────────── */

function UpcomingPreview({
  course,
  session,
  warning,
}: {
  course?: AdminData["courses"][number];
  session?: AdminData["courses"][number]["sessions"][number];
  warning?: string;
}) {
  if (!course) {
    return (
      <section aria-label="معاينة الدورة القادمة" className="py-16">
        <Container>
          <SectionHeading eyebrow="لا تفوّت الفرصة" title="الدورة القادمة" />
          <p className="mx-auto mt-6 max-w-md rounded-xl border border-dashed border-charcoal-200 p-6 text-center text-sm text-muted-foreground">
            لا توجد مواعيد متاحة حاليًا في المخزن — سيظهر أقرب موعد تلقائيًا عند إضافته.
          </p>
        </Container>
      </section>
    );
  }

  const seatsLeft = session ? getSessionRemainingSeats(session) : 0;

  return (
    <section aria-label="معاينة الدورة القادمة" className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="لا تفوّت الفرصة"
          title="الدورة القادمة"
          description="أقرب دورة انطلاقها قريب — المقاعد محدودة."
        />

        {warning ? (
          <p role="alert" className="mx-auto mt-6 flex max-w-2xl items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs leading-relaxed text-brand-700">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {warning}
          </p>
        ) : null}

        <div className="mx-auto mt-10 grid max-w-4xl overflow-hidden rounded-2xl border border-charcoal-200/80 bg-white lg:grid-cols-5">
          {/* تطابق العرضَ الحي: لا قص، ونسخة مموّهة خلف الملصق — انظر
              upcoming-course.tsx. */}
          <div className="relative aspect-square overflow-hidden bg-charcoal-100 sm:aspect-[4/3] lg:col-span-2 lg:aspect-auto lg:min-h-full">
            {course.images.main ? (
              <>
                <img
                  src={course.images.main}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
                />
                <img
                  src={course.images.main}
                  alt={course.images.alt}
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </>
            ) : null}
          </div>
          <div className="flex flex-col p-6 sm:p-8 lg:col-span-3">
            <p className="text-sm font-semibold text-brand-600">
              {session ? `تبدأ ${formatDate(session.startDate)}` : "المواعيد تُعلن قريبًا"}
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-charcoal-900">
              {course.name}
            </h3>
            <p className="mt-3 leading-relaxed text-charcoal-500">{course.excerpt}</p>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-charcoal-400">
                  <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-brand-500" />
                  المدة
                </dt>
                <dd className="mt-1 text-sm font-bold text-charcoal-900">
                  {formatNumber(course.duration.days)} أيام
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-charcoal-400">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-brand-500" />
                  المكان
                </dt>
                <dd className="mt-1 truncate text-sm font-bold text-charcoal-900">
                  {session?.location ?? course.name}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-charcoal-400">
                  <Users aria-hidden="true" className="h-3.5 w-3.5 text-brand-500" />
                  السعر
                </dt>
                <dd className="mt-1 text-sm font-bold text-charcoal-900">
                  {previewPrice(course, session?.price).label}
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-charcoal-100 pt-6">
              <span className="inline-flex h-11 items-center rounded-lg bg-brand-600 px-8 text-sm font-semibold text-white">
                احجز مقعدك
              </span>
              {session && seatsLeft > 0 ? (
                <p className="text-sm text-charcoal-400">
                  <span className="font-bold text-brand-600 num-ltr">{formatNumber(seatsLeft)}</span>{" "}
                  مقاعد متبقية من <span className="num-ltr">{formatNumber(session.seats)}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────── الفئات ─────────────────────────── */

function CategoriesPreview({ data }: { data: AdminData }) {
  const categories = data.homepage.categories.filter((category) => category.enabled);
  if (categories.length === 0) return null;
  return (
    <section aria-label="معاينة فئات الدورات" className="bg-surface py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow="أنواع التدريب" title="اختر ما يناسبك" />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.categoryId} className="overflow-hidden rounded-xl border border-charcoal-200/80 bg-white">
              <div className="relative aspect-video bg-charcoal-100">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.imageAlt ?? category.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-charcoal-900">{category.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-charcoal-500">
                  {category.shortDescription}
                </p>
                {category.ctaLabel ? (
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                    {category.ctaLabel}
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ─────────────────────────── الدورات المميزة ─────────────────────────── */

function FeaturedPreview({ courses }: { courses: AdminData["courses"] }) {
  if (courses.length === 0) {
    return (
      <section aria-label="معاينة الدورات المميزة" className="py-16">
        <Container>
          <SectionHeading eyebrow="الدورات" title="الدورات المميزة" />
          <p className="mx-auto mt-6 max-w-md rounded-xl border border-dashed border-charcoal-200 p-6 text-center text-sm text-muted-foreground">
            لا توجد دورات مميزة في هذا الوضع — علّم دورة «مميزة» أو اختر دورات يدويًا من المحرر.
          </p>
        </Container>
      </section>
    );
  }
  return (
    <section aria-label="معاينة الدورات المميزة" className="py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow="الدورات" title="الدورات المميزة" />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id} className="overflow-hidden rounded-xl border border-charcoal-200/80 bg-white">
              <div className="relative aspect-video bg-charcoal-100">
                {course.images.main ? (
                  <img
                    src={course.images.main}
                    alt={course.images.alt}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold text-brand-600">{course.type}</p>
                <h3 className="mt-1 text-base font-bold text-charcoal-900">{course.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-charcoal-500">{course.excerpt}</p>
                <p className="mt-3 text-sm font-bold text-charcoal-900">
                  {previewPrice(course).label}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ─────────────────────────── لماذا نحن ─────────────────────────── */

function WhyUsPreview({ data }: { data: AdminData }) {
  const { whyUs } = data.homepage;
  const items = whyUs.items.filter((item) => item.enabled);
  if (items.length === 0) return null;
  return (
    <section aria-label="معاينة لماذا نحن" className="bg-surface py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="لماذا نحن"
          title={whyUs.title}
          description={whyUs.description}
        />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = whyUsIcon(item.iconKey);
            return (
              <li key={item.id} className="rounded-xl border border-charcoal-200/80 bg-white p-6">
                {Icon ? (
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                ) : null}
                <h3 className="mt-4 text-base font-bold text-charcoal-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{item.description}</p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/* ─────────────────── الاعتمادات / الشركاء ─────────────────── */

function OrgsPreview({ data, kind }: { data: AdminData; kind: "accreditations" | "partners" }) {
  const orgs = data.homepage[kind].filter((org) => org.visible).sort((a, b) => a.order - b.order);
  if (orgs.length === 0) return null;
  const isAccreditations = kind === "accreditations";
  return (
    <section
      aria-label={isAccreditations ? "معاينة الاعتمادات" : "معاينة الشركاء"}
      className={isAccreditations ? "py-16" : "bg-surface py-16"}
    >
      <Container>
        <SectionHeading
          eyebrow={isAccreditations ? "ثقة رسمية" : "شراكات"}
          title={isAccreditations ? "اعتماداتنا" : "شركاء النجاح"}
        />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {orgs.map((org) => (
            <li key={org.id}>
              {org.logo ? (
                <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-charcoal-200 bg-white p-3">
                  <img src={org.logo} alt={org.name} className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <PlaceholderLogo name={org.name} />
              )}
              {!isAccreditations && org.description ? (
                <p className="mt-2 text-center text-xs leading-relaxed text-charcoal-400">
                  {org.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ─────────────────────────── التقييمات ─────────────────────────── */

function TestimonialsPreview({
  data,
  testimonials,
}: {
  data: AdminData;
  testimonials: AdminData["testimonials"];
}) {
  const settings = data.homepage.testimonials;
  if (testimonials.length === 0) return null;
  return (
    <section aria-label="معاينة التقييمات" className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="آراء المتدربين"
          title={settings.title}
          description={settings.description}
        />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <li key={testimonial.id} className="flex h-full flex-col rounded-xl border border-charcoal-200/80 bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-0.5" aria-label={`التقييم ${testimonial.rating} من 5`}>
                  {Array.from({ length: 5 }, (_, starIndex) => (
                    <Star
                      key={starIndex}
                      aria-hidden="true"
                      className={
                        starIndex < testimonial.rating
                          ? "h-4 w-4 fill-amber-400 text-amber-400"
                          : "h-4 w-4 text-charcoal-200"
                      }
                    />
                  ))}
                </span>
                <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-medium text-charcoal-500">
                  {testimonial.source === "google" ? "Google" : "تقييم مباشر"}
                </span>
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-charcoal-600">
                <p>“{testimonial.review}”</p>
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-charcoal-100 pt-4">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-charcoal-900 text-sm font-bold text-white"
                >
                  {testimonial.name.trim().charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-bold text-charcoal-900">{testimonial.name}</p>
                  {testimonial.role ? (
                    <p className="text-xs text-charcoal-400">{testimonial.role}</p>
                  ) : null}
                </div>
              </figcaption>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ─────────────────────────── CTA ─────────────────────────── */

function CtaPreview({ data }: { data: AdminData }) {
  const cta = data.homepage.cta;
  return (
    <section aria-label="معاينة دعوة الإجراء" className="relative overflow-hidden bg-charcoal-950 py-16 text-white sm:py-20">
      {cta.backgroundImage ? (
        <img
          src={cta.backgroundImage}
          alt={cta.backgroundImageAlt ?? ""}
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
      ) : null}
      <Container className="relative text-center">
        <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          {cta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-charcoal-300">
          {cta.description}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <span className="inline-flex h-12 items-center rounded-lg bg-brand-600 px-8 text-base font-semibold text-white">
            {cta.primaryCta.text}
          </span>
          {cta.secondaryCta.text ? (
            <span className="inline-flex h-12 items-center rounded-lg border border-charcoal-700 px-6 text-base font-semibold text-charcoal-200">
              {cta.secondaryCta.text}
            </span>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

/* سهم الرجوع للمحرر — يُستخدم في صفحة المعاينة */
export function BackToEditorLink() {
  return (
    <Link
      href="/admin/content/home"
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-charcoal-700 hover:bg-surface"
    >
      <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
      رجوع إلى المحرر
    </Link>
  );
}

/**
 * وسم السعر في المعاينة = وسم السعر عند الزائر.
 * المعاينة تَعِد بأنها تُري ما سيُنشر، فلا تُشتق وسمًا خاصًا بها.
 */
function previewPrice(course: AdminCourse, sessionPrice?: number) {
  return coursePriceDisplay({
    commercial: courseCommercialState({
      category: course.type,
      isFree: course.pricing.isFree,
      requestQuote: course.pricing.requestQuote,
      price: course.pricing.price,
    }),
    price: sessionPrice ?? course.pricing.price,
  });
}
