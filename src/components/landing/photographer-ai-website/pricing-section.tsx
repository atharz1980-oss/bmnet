import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { Container } from "@/components/shared/container";
import { pricingContent } from "@/data/landing/photographer-ai-website";
import { PRICING_ANCHOR } from "./anchors";
import { RegistrationForm } from "./registration-form";

export function PricingSection({
  pricingSar,
  previousPriceSar,
  isCheckoutReady,
}: {
  pricingSar: number | null;
  previousPriceSar: number | null;
  isCheckoutReady: boolean;
}) {
  return (
    <section
      id={PRICING_ANCHOR}
      aria-labelledby="pricing-heading"
      className="relative bg-charcoal-900 py-16 sm:py-24 text-white border-t border-white/5 scroll-mt-12"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
            <Sparkles className="h-4 w-4" />
            <span>رسوم الانضمام والاستثمار</span>
          </div>
          <h2
            id="pricing-heading"
            className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight"
          >
            {pricingContent.heading}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-charcoal-200">
            {pricingContent.supportingNote}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
          {/* تفاصيل ما يشمله الحجز */}
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-charcoal-950/80 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-4">
              ماذا يشمل تسجيلك في الدورة؟
            </h3>

            {/* عرض السعر المعتمد وتاريخ الانطلاق */}
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <span className="text-xs text-amber-300 font-semibold block">
                رسوم الاستثمار في الدورة
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">
                  {pricingSar ?? pricingContent.priceSar}
                </span>
                <span className="text-base font-bold text-amber-400">
                  ريال سعودي
                </span>
              </div>
              {previousPriceSar && previousPriceSar > (pricingSar ?? pricingContent.priceSar) && (
                <div className="mt-1 text-xs text-charcoal-400 line-through">
                  السعر السابق: {previousPriceSar} ريال
                </div>
              )}
              <div className="mt-2 text-xs text-charcoal-300 leading-relaxed">
                السعر شامل ضريبة القيمة المضافة، وحضور الورشة بالكامل، وحقيبة المواد وشهادة الحضور.
              </div>
              <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs">
                <span className="text-amber-200">موعد الانطلاق:</span>
                <span className="font-bold text-white">15 نوفمبر 2026 (مباشر أونلاين)</span>
              </div>
            </div>

            <ul className="mt-6 space-y-3.5 text-xs sm:text-sm text-charcoal-300">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>3 أيام تدريب تفاعلي مباشر (9 ساعات تطبيقية).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>إتاحة تسجيلات الجلسات للمراجعة والتطبيق الذاتي.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>ماستر برومبت للمصورين وقوالب الأوامر النصية الجاهزة.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>قوائم فحص معرض الأعمال وإطلاق الموقع واختبار الحجوزات.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>شهادة حضور من بيت المصور.</span>
              </li>
            </ul>

            <div className="mt-6 pt-4 border-t border-white/10 text-xs text-charcoal-400">
              لا يشمل التدريب تكاليف الاشتراكات الشهرية للأدوات الخارجية أو شراء النطاقات الخاصة.
            </div>
          </div>

          {/* نموذج التسجيل وحجز المقعد */}
          <div className="lg:col-span-7">
            <RegistrationForm
              pricingSar={pricingSar}
              isCheckoutReady={isCheckoutReady}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
