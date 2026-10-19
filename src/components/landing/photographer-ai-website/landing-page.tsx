import type { LandingCheckout, LandingPricing } from "@/lib/landing/checkout";
import { HeroSection } from "./hero-section";
import { ProblemSolutionSection } from "./problem-solution-section";
import { WhatStudentsBuildSection } from "./what-students-build-section";
import { MashaelShowcaseSection } from "./mashael-showcase-section";
import { CurriculumSection } from "./curriculum-section";
import { TargetAudienceSection } from "./target-audience-section";
import { BeforeAfterSection } from "./before-after-section";
import { IncludedSection } from "./included-section";
import { PricingSection } from "./pricing-section";
import { FaqSection } from "./faq-section";
import { FinalCtaSection } from "./final-cta-section";
import { LandingFooter } from "./landing-footer";
import { StickyCta } from "./sticky-cta";

export interface PhotographerAiLandingProps {
  checkout: LandingCheckout;
  pricing: LandingPricing | null;
  contact: {
    whatsappHref: string | null;
    instagramHref: string | null;
  };
}

export function PhotographerAiLanding({
  checkout,
  pricing,
  contact,
}: PhotographerAiLandingProps) {
  const isCheckoutReady = checkout.status === "ready" && pricing !== null && pricing.currentSar > 0;
  const pricingSar = pricing?.currentSar ?? null;
  const previousPriceSar = pricing?.previousSar ?? null;

  return (
    <div
      data-lp-root="photographer-ai-website"
      dir="rtl"
      lang="ar"
      className="min-h-screen overflow-x-clip bg-charcoal-950 font-sans text-white antialiased selection:bg-amber-500 selection:text-charcoal-950"
    >
      <HeroSection pricingSar={pricingSar} isCheckoutReady={isCheckoutReady} />
      <ProblemSolutionSection />
      <WhatStudentsBuildSection />
      <MashaelShowcaseSection />
      <CurriculumSection />
      <TargetAudienceSection />
      <BeforeAfterSection />
      <IncludedSection />
      <PricingSection
        pricingSar={pricingSar}
        previousPriceSar={previousPriceSar}
        isCheckoutReady={isCheckoutReady}
      />
      <FaqSection />
      <FinalCtaSection pricingSar={pricingSar} isCheckoutReady={isCheckoutReady} />
      <LandingFooter whatsappHref={contact.whatsappHref} instagramHref={contact.instagramHref} />
      <StickyCta pricingSar={pricingSar} isCheckoutReady={isCheckoutReady} />
    </div>
  );
}
