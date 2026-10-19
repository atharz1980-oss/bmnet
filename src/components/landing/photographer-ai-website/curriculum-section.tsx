import { Calendar, ChevronLeft, Sparkles, Target } from "lucide-react";
import { Container } from "@/components/shared/container";
import { curriculum } from "@/data/landing/photographer-ai-website";
import { CURRICULUM_ANCHOR, REGISTRATION_ANCHOR } from "./anchors";

export function CurriculumSection() {
  return (
    <section
      id={CURRICULUM_ANCHOR}
      aria-labelledby="curriculum-heading"
      className="relative bg-charcoal-900 py-16 sm:py-24 text-white border-t border-white/5 scroll-mt-12"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
            <Calendar className="h-4 w-4" />
            <span>خطة التدريب التفصيلية (3 أيام — 9 ساعات)</span>
          </div>
          <h2
            id="curriculum-heading"
            className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight"
          >
            {curriculum.heading}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-charcoal-300">
            {curriculum.subheading}
          </p>
        </div>

        {/* بطاقات الأيام الثلاثة بتسلسل بصري أنيق */}
        <div className="mt-12 space-y-6 max-w-4xl mx-auto">
          {curriculum.days.map((day, idx) => (
            <div
              key={idx}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-charcoal-950/80 p-6 sm:p-8 backdrop-blur-sm transition-all hover:border-amber-500/40 shadow-xl"
            >
              {/* شريط اليوم والعنوان */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 items-center justify-center rounded-xl bg-amber-500/20 px-3 font-mono text-sm font-bold text-amber-400">
                    {day.dayNumber}
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {day.title}
                  </h3>
                </div>
                <span className="text-xs text-charcoal-400">
                  3 ساعات تدريب وتطبيق عملي مباشر
                </span>
              </div>

              {/* قائمة المحاور التدريبية بأحجام خطوط مريحة للقراءة */}
              <div className="mt-5">
                <div className="text-xs font-semibold text-charcoal-400 mb-3">
                  محاور وتطبيقات الجلسة:
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {day.topics.map((topic, topicIdx) => (
                    <li
                      key={topicIdx}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-charcoal-200"
                    >
                      <ChevronLeft className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* المخرج العملي اليومي */}
              <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                <Target className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold text-amber-300">مخرج الجلسة: </span>
                  <span className="text-charcoal-100">{day.outcome}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* زر اتخاذ الإجراء بعد المنهج (CTA #4) */}
        <div className="mt-12 text-center">
          <a
            href={`#${REGISTRATION_ANCHOR}`}
            className="inline-flex h-12 sm:h-13 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-8 text-base font-bold text-charcoal-950 shadow-lg shadow-amber-500/25 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950"
          >
            <span>احجز مقعدك وابدأ بناء موقعك</span>
            <ChevronLeft className="h-4 w-4" />
          </a>
        </div>
      </Container>
    </section>
  );
}
