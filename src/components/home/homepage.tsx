"use client";

/**
 * HomePage — منسّق أقسام الرئيسية (Checkpoint 7 — D-45)
 * -----------------------------------------------------
 * قبل الترطيب/للزائر العام: يرسم الأقسام التسعة بلا props (الثابتة)
 * → مطابق SSR بايت-بايت. بعد الترطيب مع مخزن إدارة: يرسمها بترتيب
 * sections وenabled وكل المحتوى المشتق من الجسر.
 */
import { Fragment, type ReactNode } from "react";
import { usePublicCms } from "@/context/public-cms";

import { Hero } from "./hero";
import { StatsBar } from "./stats-bar";
import { UpcomingCourse } from "./upcoming-course";
import { CourseCategories } from "./course-categories";
import { FeaturedCourses } from "./featured-courses";
import { WhyUs } from "./why-us";
import { OrgsBand } from "./orgs-band";
import { Testimonials } from "./testimonials";
import { CtaSection } from "./cta-section";

export function HomePage() {
  const { view } = usePublicCms();
  const home = view?.homepage;

  /* البيانات الثابتة (null) → الأقسام بلا props كما في Phase 1 تمامًا */
  if (!home) {
    return (
      <>
        <Hero />
        <StatsBar />
        <UpcomingCourse />
        <CourseCategories />
        <FeaturedCourses />
        <WhyUs />
        {/* الاعتمادات وشركاء النجاح — شعارات مؤقتة */}
        <OrgsBand variant="accreditations" />
        <OrgsBand variant="partners" />
        <Testimonials />
        <CtaSection />
      </>
    );
  }

  const propsBySection: Record<string, ReactNode> = {
    hero: <Hero content={home.hero} />,
    statistics: <StatsBar items={home.stats} />,
    "upcoming-course": <UpcomingCourse data={home.upcoming} />,
    "course-categories": <CourseCategories items={home.categories} />,
    "featured-courses": <FeaturedCourses courses={home.featured} />,
    "why-us": <WhyUs content={home.whyUs} />,
    accreditations: <OrgsBand variant="accreditations" items={home.accreditations} />,
    partners: <OrgsBand variant="partners" items={home.partners} />,
    testimonials: <Testimonials content={home.testimonials} />,
    cta: (
      <CtaSection
        content={home.cta}
        whatsappHref={view.settings.whatsappHref}
      />
    ),
  };

  return (
    <>
      {home.sections
        .filter((section) => section.enabled)
        .map((section) => (
          <Fragment key={section.id}>{propsBySection[section.id]}</Fragment>
        ))}
    </>
  );
}
