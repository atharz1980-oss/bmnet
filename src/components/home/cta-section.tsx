import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { WhatsAppIcon } from "@/components/shared/social-icons";
import { siteConfig } from "@/data/site";
import type { CtaContent } from "@/data/admin/types";

interface CtaSectionProps {
  /** محتوى CTA من جسر الإدارة عند توفره — غائب = النصوص الرسمية المعتمدة للهوية */
  content?: CtaContent;
  /** رابط واتساب مشتق من إعدادات التواصل */
  whatsappHref?: string;
}

/**
 * القسم 8 — الدعوة الختامية للعلامة (Final Brand CTA)
 * رسالة ختامية واثقة وغير عدوانية تسويقياً تعزز قيم المنظومة الأربع: تعلم — أنشئ — صوّر — تواصل
 */
export function CtaSection({ content, whatsappHref }: CtaSectionProps) {
  const secondary = content?.secondaryCta;
  const secondaryHref = secondary?.url || whatsappHref || siteConfig.whatsappLink;
  const isWhatsApp = secondaryHref.startsWith("https://wa.me/");

  return (
    <section
      aria-labelledby="brand-cta-title"
      className="relative overflow-hidden bg-charcoal-950 py-20 text-white sm:py-24 lg:py-28"
    >
      {/* توهج لوني خافت يعكس هوية بيت المصور */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-600/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 start-1/4 h-60 w-60 rounded-full bg-white/5 blur-3xl"
      />

      <Container className="relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          {/* الشعار التحريري الخفيف */}
          <p className="inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-wider text-brand-400">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            تعلّم — أنشئ — صوّر — تواصل
          </p>

          <h2
            id="brand-cta-title"
            className="mt-4 text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl"
          >
            {content?.title || "بيت المصور: منظومة تصنع الصورة وتلهم المبدعين"}
          </h2>

          <p className="mt-4 text-base leading-relaxed text-charcoal-300 sm:text-lg">
            {content?.description ||
              "سواء كنت تسعى لتطوير مهاراتك عبر الأكاديمية، أو زيارة استوديوهاتنا المجهزة، أو استكشاف آفاق الإنتاج وصناعة المحتوى، أو الانضمام لمجتمع المبدعين — نبدأ معك خطوتك القادمة."}
          </p>

          {/* زرا الإجراءات — بحد أقصى خياران */}
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
              <Link href={content?.primaryCta.url || "/courses"}>
                {content?.primaryCta.text || "استكشف الدورات والبرامج"}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 gap-2 border-white/25 bg-transparent px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              {isWhatsApp ? (
                <a href={secondaryHref} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-4 w-4" />
                  {secondary?.text || "تواصل عبر واتساب"}
                </a>
              ) : (
                <Link href={secondaryHref || "/contact"}>
                  {secondary?.text || "تواصل مع فريقنا"}
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                </Link>
              )}
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
