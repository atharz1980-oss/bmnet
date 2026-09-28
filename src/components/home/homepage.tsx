"use client";

/**
 * HomePage — منسّق أقسام الرئيسية لمنظومة بيت المصور (Phase 3)
 * -------------------------------------------------------------
 * يرسم تجربة متكاملة تعبّر عن المنظومة الإبداعية بأركانها الأربعة:
 * الأكاديمية (Academy)، الإنتاج (Production)، الاستوديوهات (Studios)، والمجتمع (Community).
 *
 * يحافظ بايت-بايت على التوافق مع جسر بيانات الـ CMS (usePublicCms)
 * وعلى عدم تعديل أي منطق تجاري محمي.
 */
import { Fragment, type ReactNode } from "react";
import { usePublicCms } from "@/context/public-cms";

import { Hero } from "./hero";
import { CreativeHouse } from "./creative-house";
import { StatsBar } from "./stats-bar";
import { VisualShowcase } from "./visual-showcase";
import { UpcomingCourse } from "./upcoming-course";
import { FeaturedCourses } from "./featured-courses";
import { StudiosSection } from "./studios-section";
import { ProductionSection } from "./production-section";
import { CommunitySection } from "./community-section";
import { WhyUs } from "./why-us";
import { OrgsBand } from "./orgs-band";
import { Testimonials } from "./testimonials";
import { CtaSection } from "./cta-section";

export function HomePage() {
  const { view } = usePublicCms();
  const home = view?.homepage;

  /* البيانات الثابتة (null) — تدفق تحريري فوتوغرافي متكامل متطابق مع SSR */
  if (!home) {
    return (
      <>
        {/* 1. الافتتاحية التحريرية */}
        <Hero />
        {/* 2. المنظومة الإبداعية — الأركان الأربعة */}
        <CreativeHouse />
        {/* شريط الإحصائيات الواقعي */}
        <StatsBar />
        {/* 3. المعرض البصري — قصة الحرفة */}
        <VisualShowcase />
        {/* الدورة القادمة القريبة (إن وُجدت) */}
        <UpcomingCourse />
        {/* 4. الأكاديمية التدريبية — الدورات المميزة */}
        <FeaturedCourses />
        {/* 5. الاستوديوهات والتجهيزات */}
        <StudiosSection />
        {/* 6. الإنتاج وصناعة المحتوى التجاري */}
        <ProductionSection />
        {/* 7. مجتمع المصورين وصنّاع المحتوى */}
        <CommunitySection />
        {/* معايير الجودة والتدريب */}
        <WhyUs />
        {/* الاعتمادات وشركاء النجاح */}
        <OrgsBand variant="accreditations" />
        <OrgsBand variant="partners" />
        {/* آراء المتدربين الحقيقية */}
        <Testimonials />
        {/* 8. الدعوة الختامية للعلامة */}
        <CtaSection />
      </>
    );
  }

  /* عند توفر بيانات الـ CMS من قاعدة البيانات */
  const propsBySection: Record<string, ReactNode> = {
    hero: <Hero content={home.hero} />,
    "course-categories": <CreativeHouse items={home.categories} />,
    statistics: <StatsBar items={home.stats} />,
    "upcoming-course": <UpcomingCourse data={home.upcoming} />,
    "featured-courses": (
      <>
        <VisualShowcase />
        <FeaturedCourses courses={home.featured} />
      </>
    ),
    "why-us": (
      <>
        <StudiosSection />
        <ProductionSection />
        <CommunitySection />
        <WhyUs content={home.whyUs} />
      </>
    ),
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
