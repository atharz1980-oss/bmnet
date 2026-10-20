import { ArrowLeftRight, Check, X } from "lucide-react";
import { Container } from "@/components/shared/container";
import { beforeAfter } from "@/data/landing/photographer-ai-website";
import { BEFORE_AFTER_ANCHOR } from "./anchors";

export function BeforeAfterSection() {
  return (
    <section
      id={BEFORE_AFTER_ANCHOR}
      aria-labelledby="comparison-heading"
      className="relative bg-charcoal-900 py-16 sm:py-24 text-white border-t border-white/5 scroll-mt-12"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
            <ArrowLeftRight className="h-4 w-4" />
            <span>مقارنة واقعية لتجربة عملك</span>
          </div>
          <h2
            id="comparison-heading"
            className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight"
          >
            {beforeAfter.heading}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-charcoal-300">
            {beforeAfter.subheading}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* عمود قبل الموقع */}
          <div className="rounded-2xl border border-rose-500/20 bg-charcoal-950/90 p-6 sm:p-8 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                <X className="h-4 w-4" />
              </span>
              <h3 className="text-lg font-bold text-rose-300">
                {beforeAfter.before.title}
              </h3>
            </div>
            <ul className="mt-6 space-y-4">
              {beforeAfter.before.items.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 text-xs sm:text-sm text-charcoal-300"
                >
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                    <X className="h-3 w-3" />
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* عمود بعد بناء موقعك */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-charcoal-950 to-charcoal-950/90 p-6 sm:p-8 backdrop-blur-sm shadow-xl ring-1 ring-emerald-500/20">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Check className="h-4 w-4" />
              </span>
              <h3 className="text-lg font-bold text-emerald-300">
                {beforeAfter.after.title}
              </h3>
            </div>
            <ul className="mt-6 space-y-4">
              {beforeAfter.after.items.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 text-xs sm:text-sm text-charcoal-100"
                >
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="leading-relaxed font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* تنبيه المصداقية وعدم المبالغة */}
        <div className="mt-8 text-center text-xs text-charcoal-400 max-w-xl mx-auto">
          امتلاك موقع احترافي يمنحك بنية تنظيمية قوية وثابتة، وتطوير المشاريع والدخل يعتمد على استمرارية جودة عملك واجتهادك.
        </div>
      </Container>
    </section>
  );
}
