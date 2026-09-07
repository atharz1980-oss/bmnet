import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { WhatsAppIcon } from "@/components/shared/social-icons";
import { siteConfig } from "@/data/site";
import type { CtaContent } from "@/data/admin/types";

interface CtaSectionProps {
  /** Checkpoint 7: محتوى CTA من جسر الإدارة — غائب = النصوص الثابتة */
  content?: CtaContent;
  /** رابط واتساب مشتق من إعدادات التواصل (الزر الثانوي الافتراضي) */
  whatsappHref?: string;
}

/** قسم الدعوة الأخير قبل التذييل */
export function CtaSection({ content, whatsappHref }: CtaSectionProps) {
  const secondary = content?.secondaryCta;
  const secondaryHref = secondary?.url || whatsappHref || siteConfig.whatsappLink;
  const isWhatsApp = secondaryHref.startsWith("https://wa.me/");

  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden bg-charcoal-950 py-16 text-white sm:py-20">
      {/* عنصر بصري هادئ بدل التدرجات المبالغ فيها */}
      <div
        aria-hidden="true"
        className="absolute -top-24 start-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-600/15 blur-3xl"
      />
      <Container className="relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 id="cta-title" className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl lg:text-4xl">
            {content?.title ?? "جاهز تبدأ رحلتك في عالم التصوير؟"}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-charcoal-300 sm:text-lg">
            {content?.description ??
              "استعرض الدورات واختر ما يناسب مستواك، أو تواصل معنا عبر واتساب وسنساعدك في تحديد أنسب برنامج تدريبي لك."}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
              <Link href={content?.primaryCta.url ?? "/courses"}>
                {content?.primaryCta.text ?? "استكشف الدورات"}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 gap-2 border-white/25 bg-transparent px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              <a href={secondaryHref} target="_blank" rel="noopener noreferrer">
                {isWhatsApp ? <WhatsAppIcon className="h-4 w-4" /> : null}
                {secondary?.text ?? "تواصل عبر واتساب"}
              </a>
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
