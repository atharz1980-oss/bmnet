import { Award, Check, FileCheck, Gift, Info, Laptop, Wrench } from "lucide-react";
import { Container } from "@/components/shared/container";
import { toolsDisclosure, whatIsIncluded } from "@/data/landing/photographer-ai-website";

export function IncludedSection() {
  return (
    <section aria-labelledby="included-heading" className="relative bg-charcoal-950 py-16 sm:py-24 text-white border-t border-white/5">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
            <Gift className="h-4 w-4" />
            <span>الحقيبة التدريبية والمخرجات</span>
          </div>
          <h2 id="included-heading" className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            {whatIsIncluded.heading}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-charcoal-300">
            {whatIsIncluded.subheading}
          </p>
        </div>

        {/* شبكة محتويات الحقيبة الـ 11 */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {whatIsIncluded.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-charcoal-900/60 p-5 backdrop-blur-sm transition-all hover:border-amber-500/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">{item.title}</h3>
                <p className="mt-1 text-xs text-charcoal-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* إيضاح الأدوات والاشتراكات — الشفافية التامة */}
        <div className="mt-16 rounded-3xl border border-white/10 bg-charcoal-900/80 p-6 sm:p-10 backdrop-blur-md">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{toolsDisclosure.title}</h3>
              <p className="text-xs text-charcoal-400">{toolsDisclosure.note}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {toolsDisclosure.tools.map((tool, idx) => (
              <div key={idx} className="rounded-2xl border border-white/5 bg-charcoal-950/70 p-5">
                <div className="font-mono text-base font-bold text-amber-400">{tool.name}</div>
                <div className="mt-1 text-xs font-medium text-white">{tool.role}</div>
                <p className="mt-2 text-xs leading-relaxed text-charcoal-400">{tool.access}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3 text-xs text-charcoal-300">
            <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {toolsDisclosure.clarification}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
