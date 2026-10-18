import { AlertCircle, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { Container } from "@/components/shared/container";
import { problemSolution } from "@/data/landing/photographer-ai-website";

export function ProblemSolutionSection() {
  return (
    <section aria-labelledby="problem-heading" className="relative bg-charcoal-900 py-16 sm:py-24 text-white">
      <Container>
        {/* قسم المشكلة */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-semibold text-rose-300">
            <ShieldAlert className="h-4 w-4" />
            <span>تحديات يواجهها كل مصور</span>
          </div>
          <h2 id="problem-heading" className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            {problemSolution.heading}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-charcoal-300">
            إنستغرام منصة رائعة للتفاعل، ولكن الاعتماد عليها وحدها يضع عقبات حقيقية أمام تحويل المتابعين إلى عملاء فعليين:
          </p>
        </div>

        {/* بطاقات التحديات الخمسة */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {problemSolution.problems.map((problem, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl border border-white/10 bg-charcoal-950/70 p-6 backdrop-blur-sm transition-all hover:border-rose-500/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">{problem.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-300">{problem.desc}</p>
            </div>
          ))}

          {/* بطاقة التلخيص */}
          <div className="flex flex-col justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-charcoal-950 p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">النتيجة الحتمية</div>
            <p className="mt-2 text-base font-semibold text-charcoal-100 leading-relaxed">
              تضيع استفسارات العملاء المحتملين وتتشتت أعمالك القيمة بين آلاف المنشورات اليومية.
            </p>
          </div>
        </div>

        {/* جسر الانتقال إلى الحل */}
        <div className="mt-16 sm:mt-20 overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-charcoal-950 via-charcoal-900 to-charcoal-950 p-8 sm:p-12 text-center shadow-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/20 px-4 py-1 text-xs font-bold text-amber-300">
            <Sparkles className="h-4 w-4" />
            <span>الحل الذكي لعلامتك</span>
          </div>
          <h3 className="mt-5 text-2xl sm:text-4xl font-extrabold text-white">
            {problemSolution.transitionHeading}
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-charcoal-300">
            {problemSolution.transitionDesc}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-charcoal-200">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-1.5 border border-white/10">
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
              <span>أصل رقمي ملك لك بالكامل</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-1.5 border border-white/10">
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
              <span>تجربة حجز منظمة لعملائك</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-1.5 border border-white/10">
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
              <span>إدارة وتحديث ذاتي بدون برمجة</span>
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
