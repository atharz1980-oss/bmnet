import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { images } from "@/data/images";
import type { HeroContent } from "@/data/admin/types";

interface HeroProps {
  /** Checkpoint 7: محتوى CMS — غائب = النصوص الثابتة (SSR مطابق) */
  content?: HeroContent;
}

/** القسم الافتتاحي — صورة قوية مع عنوان واضح وCTA مزدوج */
export function Hero({ content }: HeroProps) {
  const title = content?.title ?? "من الشغف إلى الاحتراف";
  /* الحفاظ على تمييز «إلى …» بالأحمر كما في التصميم الأصلي عند توفرها */
  const titleParts = title.includes(" إلى ")
    ? title.split(" إلى ")
    : null;

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-charcoal-950 text-white">
      {/* الخلفية */}
      <div className="absolute inset-0">
        <Image
          src={content?.image ?? images.hero.src}
          alt={content?.imageAlt ?? images.hero.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* طبقة تعتيم لقراءة النص العربي فوق الصورة */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-l from-charcoal-950/95 via-charcoal-950/70 to-charcoal-950/30"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-charcoal-950/20" />
      </div>

      <Container className="relative">
        <div className="flex min-h-[540px] items-center py-20 sm:min-h-[600px] sm:py-24 lg:min-h-[640px]">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-charcoal-100 backdrop-blur">
              <Camera aria-hidden="true" className="h-4 w-4 text-brand-400" />
              مركز تدريب التصوير وصناعة المحتوى – جدة
            </p>

            <h1 id="hero-title" className="text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
              {titleParts ? (
                <>
                  {titleParts[0]}
                  <span className="text-brand-400"> إلى {titleParts.slice(1).join(" إلى ")}</span>
                </>
              ) : (
                title
              )}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-charcoal-200 sm:text-lg">
              {content?.description ??
                "دورات تدريبية متخصصة في التصوير الفوتوغرافي والفيديو وصناعة المحتوى، يقدمها مدربون محترفون بأسلوب عملي يأخذك من الأساسيات إلى مستوى الاحتراف."}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-12 px-7 text-base font-semibold">
                <Link href={content?.primaryCta.url ?? "/courses"}>
                  {content?.primaryCta.text ?? "احجز دورتك الآن"}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 gap-1.5 border-white/25 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={content?.secondaryCta.url ?? "/courses"}>
                  {content?.secondaryCta.text ?? "استكشف الدورات"}
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
