import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { images } from "@/data/images";
import type { HeroContent } from "@/data/admin/types";

interface HeroProps {
  /** محتوى CMS عند توفره — غائب = النصوص الرسمية المعتمدة للهوية */
  content?: HeroContent;
}

const ecosystemPillars = [
  { label: "الأكاديمية التدريبية", labelEn: "Academy", href: "/courses" },
  { label: "الإنتاج وصناعة المحتوى", labelEn: "Production", href: "/contact" },
  { label: "الاستوديوهات المجهزة", labelEn: "Studios", href: "/contact" },
  { label: "مجتمع المصورين", labelEn: "Community", href: "/community" },
];

/**
 * القسم 1 — الافتتاحية التحريرية (Hero)
 * يقدم بيت المصور كمنظومة سعودية متكاملة للتصوير وصناعة المحتوى
 */
export function Hero({ content }: HeroProps) {
  const defaultTitle = "منظومة متكاملة للتصوير وصناعة المحتوى";
  const title = content?.title || defaultTitle;

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-charcoal-950 text-white"
    >
      {/* خلفية تصوير حقيقية من استوديوهات بيت المصور */}
      <div className="absolute inset-0">
        <Image
          src={content?.image || images.hero.src}
          alt={content?.imageAlt || images.hero.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* طبقات تعتيم سينمائية لضمان قراءة التايبوغرافي العربي بوضوح WCAG AA */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-l from-charcoal-950/95 via-charcoal-950/80 to-charcoal-950/45"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-transparent to-charcoal-950/30"
        />
      </div>

      <Container className="relative">
        <div className="flex min-h-[560px] items-center py-20 sm:min-h-[620px] sm:py-24 lg:min-h-[680px]">
          <div className="max-w-2xl">
            {/* الشارة التحريرية العلوية */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-charcoal-950/60 px-4 py-1.5 text-xs font-medium text-charcoal-100 backdrop-blur sm:text-sm">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-brand-400" />
              <span>بيت المصور · جدة — المنظومة الإبداعية</span>
            </div>

            {/* العنوان الرئيسي الوحيد H1 */}
            <h1
              id="hero-title"
              className="text-3xl font-bold leading-[1.2] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
            >
              {title === defaultTitle ? (
                <>
                  بيت المصور:{" "}
                  <span className="text-brand-400">منظومة للتصوير</span> وصناعة المحتوى
                </>
              ) : (
                title
              )}
            </h1>

            {/* النص الداعم */}
            <p className="mt-5 max-w-xl text-base leading-relaxed text-charcoal-200 sm:text-lg">
              {content?.description ||
                "التعليم الاحترافي، والإنتاج وصناعة المحتوى، والاستوديوهات المجهزة، ومجتمع المبدعين في المملكة العربية السعودية — نصنع الصورة ونمكّن صانعها."}
            </p>

            {/* زرا الإجراءات الرئيسيان — حد أقصى خياران مرئيان */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-12 px-7 text-base font-semibold">
                <Link href={content?.primaryCta.url || "#ecosystem"}>
                  {content?.primaryCta.text || "استكشف خدمات بيت المصور"}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 gap-1.5 border-white/25 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={content?.secondaryCta.url || "/courses"}>
                  {content?.secondaryCta.text || "استكشف الدورات"}
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* شريط الأركان الأربعة المصغر لتعريف الزائر بالمنظومة فوراً */}
            <div className="mt-12 border-t border-white/10 pt-6">
              <p className="font-mono text-[11px] font-semibold tracking-wider text-charcoal-300">
                ركائز المنظومة / ECOSYSTEM
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ecosystemPillars.map((p) => (
                  <Link
                    key={p.labelEn}
                    href={p.href}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-charcoal-200 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
                  >
                    <span>{p.label}</span>
                    <span className="font-mono text-[10px] text-charcoal-300">
                      ({p.labelEn})
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
