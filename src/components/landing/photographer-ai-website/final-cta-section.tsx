import { ArrowLeft, Sparkles } from "lucide-react";
import { Container } from "@/components/shared/container";
import { finalCta, hero } from "@/data/landing/photographer-ai-website";
import { REGISTRATION_ANCHOR } from "./anchors";

export function FinalCtaSection({
  pricingSar,
  isCheckoutReady,
}: {
  pricingSar: number | null;
  isCheckoutReady: boolean;
}) {
  return (
    <section className="relative overflow-hidden bg-charcoal-900 py-16 sm:py-24 text-white border-t border-white/5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(217,119,6,0.12),transparent)]"
      />
      <Container className="relative">
        <div className="mx-auto max-w-4xl rounded-3xl border border-amber-500/30 bg-gradient-to-b from-charcoal-950 to-charcoal-900 p-8 sm:p-14 text-center shadow-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-xs font-semibold text-amber-300">
            <Sparkles className="h-4 w-4" />
            <span>ابدأ الانطلاقة الصحيحة</span>
          </div>

          <h2 className="mt-5 text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            {finalCta.heading}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-charcoal-300">
            {finalCta.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-charcoal-300">
            <span>3 أيام تدريبية</span>
            <span className="text-amber-500">•</span>
            <span>9 ساعات عملية (3س/يوم)</span>
            <span className="text-amber-500">•</span>
            <span>أونلاين مباشر مع تسجيلات</span>
            <span className="text-amber-500">•</span>
            <span>مشروع تطبيقي وشهادة حضور</span>
            {isCheckoutReady && pricingSar && (
              <>
                <span className="text-amber-500">•</span>
                <span className="font-bold text-amber-300">{pricingSar} ر.س شامل الضريبة</span>
              </>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <a
              href={`#${REGISTRATION_ANCHOR}`}
              className="inline-flex h-13 min-w-[240px] items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-8 text-base sm:text-lg font-bold text-white shadow-xl shadow-red-950/40 transition-all duration-200 hover:bg-[#B91C1C] hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950"
            >
              <span>احجز مقعدك الآن</span>
              <ArrowLeft className="h-5 w-5" />
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
