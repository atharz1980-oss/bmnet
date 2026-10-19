import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck2,
  Clock,
  Coins,
  Eye,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Container } from "@/components/shared/container";
import {
  problemSection,
  solutionValue,
} from "@/data/landing/photographer-ai-website";
import { REGISTRATION_ANCHOR } from "./anchors";

const benefitIcons = [Eye, CalendarCheck2, Clock, Coins];

export function ProblemSolutionSection() {
  return (
    <section
      aria-labelledby="problem-heading"
      className="relative bg-charcoal-900 py-16 sm:py-24 text-white border-t border-white/5"
    >
      <Container>
        {/* ============================================================== */}
        {/* 1. قسم المشكلة: هل أعمالك الاحترافية معروضة بالشكل الذي تستحقه؟ */}
        {/* ============================================================== */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-semibold text-rose-300">
            <ShieldAlert className="h-4 w-4" />
            <span>تحديات يواجهها كل مصور محترف</span>
          </div>

          <h2
            id="problem-heading"
            className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight"
          >
            {problemSection.heading}
          </h2>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-charcoal-300">
            {problemSection.intro}
          </p>
        </div>

        {/* بطاقات التحديات الستة */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {problemSection.problems.map((problem, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl border border-white/10 bg-charcoal-950/70 p-6 backdrop-blur-sm transition-all hover:border-rose-500/40 hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base sm:text-lg font-bold text-white">
                {problem.title}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-charcoal-300">
                {problem.desc}
              </p>
            </div>
          ))}
        </div>

        {/* عبارة الختام لقسم المشكلة */}
        <div className="mt-8 text-center">
          <div className="inline-block rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-3 text-sm sm:text-base font-bold text-amber-200 backdrop-blur-sm shadow-md">
            ✦ {problemSection.quote}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. قسم الحل والقيمة التجارية: خلّي موقعك يشتغل لصالحك           */}
        {/* ============================================================== */}
        <div className="mt-20 sm:mt-28 rounded-3xl border border-amber-500/30 bg-gradient-to-b from-charcoal-950 via-charcoal-900 to-charcoal-950 p-7 sm:p-12 lg:p-14 shadow-2xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-4 py-1 text-xs font-bold text-amber-300">
              <Sparkles className="h-4 w-4" />
              <span>الحل الذكي والقيمة المضافة لعلامتك</span>
            </div>

            <h3 className="mt-5 text-2xl sm:text-4xl font-extrabold text-white leading-tight">
              {solutionValue.heading}
            </h3>

            <p className="mt-4 text-base sm:text-lg leading-relaxed text-charcoal-200">
              {solutionValue.description}
            </p>
          </div>

          {/* الفوائد الأربع العملية */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {solutionValue.benefits.map((benefit, idx) => {
              const Icon = benefitIcons[idx % benefitIcons.length];
              return (
                <div
                  key={benefit.number}
                  className="rounded-2xl border border-white/10 bg-charcoal-900/80 p-6 backdrop-blur-sm transition-all hover:border-amber-400/40 hover:-translate-y-1 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs font-bold text-charcoal-500">
                      {benefit.number}
                    </span>
                  </div>
                  <h4 className="mt-4 text-base font-bold text-white">
                    {benefit.title}
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-charcoal-300 leading-relaxed">
                    {benefit.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* زر اتخاذ الإجراء للقسم (CTA #2) */}
          <div className="mt-10 sm:mt-12 text-center">
            <a
              href={`#${REGISTRATION_ANCHOR}`}
              className="inline-flex h-12 sm:h-13 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 text-base font-bold text-charcoal-950 shadow-lg shadow-amber-500/25 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950"
            >
              <span>{solutionValue.ctaText}</span>
              <ArrowLeft className="h-4 w-4" />
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
