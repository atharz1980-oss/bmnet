import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Check, Sparkles } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { hero, trustHighlights } from "@/data/landing/photographer-ai-website";
import { MASHAEL_MOCKUP_ANCHOR, REGISTRATION_ANCHOR } from "./anchors";

export function HeroSection({
  pricingSar,
  isCheckoutReady,
}: {
  pricingSar: number | null;
  isCheckoutReady: boolean;
}) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-charcoal-950 text-white pt-6 pb-16 lg:pb-24"
    >
      {/* خلفية جمالية خافتة مستوحاة من إضاءة الاستوديو الفاخرة */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(217,119,6,0.18),rgba(255,255,255,0))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(10,10,12,0.85)_100%)]"
      />

      {/* شريط الشعار العلوي */}
      <div className="relative border-b border-white/5 pb-5">
        <Container>
          <div className="flex items-center justify-between">
            <Link
              href="/lp/photographer-ai-website"
              className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950 rounded-lg"
              aria-label="بيت المصور — الصفحة الرئيسية للدورة"
            >
              <Logo className="h-9 w-auto text-white" />
            </Link>
            <div className="flex items-center gap-2 text-xs text-charcoal-400">
              <span className="hidden sm:inline">أكاديمية بيت المصور</span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-amber-300">تدريب مباشر أونلاين</span>
            </div>
          </div>
        </Container>
      </div>

      <Container className="relative pt-10 sm:pt-14 lg:pt-16">
        {/* شبكة الـ Hero: عمودان على الشاشات الكبيرة وترتيب رأسي مدروس على الجوال */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
          {/* الجانب الأيمن (النصوص والأزرار في RTL) */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6 sm:space-y-7 text-right">
            {/* الشارة العلوية (Eyebrow Badge) */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-amber-200 backdrop-blur-md shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{hero.eyebrow}</span>
            </div>

            {/* العنوان الرئيسي والعنوان الفرعي الداعم */}
            <div className="space-y-3">
              <h1
                id="hero-title"
                className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-[2.65rem] xl:text-5xl text-white leading-[1.25] sm:leading-[1.2]"
              >
                {hero.title}
              </h1>
              <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text text-transparent leading-relaxed">
                {hero.subtitle}
              </p>
            </div>

            {/* النص الوصفي المعتمد */}
            <p className="text-base sm:text-lg leading-relaxed text-charcoal-200/90 max-w-2xl">
              {hero.description}
            </p>

            {/* العبارة التحفيزية */}
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-3 sm:p-3.5 text-xs sm:text-sm font-semibold text-amber-200 backdrop-blur-sm">
              <span className="text-amber-400 font-bold me-1.5">✦</span>
              <span>{hero.motivationCallout}</span>
            </div>

            {/* أزرار اتخاذ الإجراء (CTAs) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <a
                href={`#${REGISTRATION_ANCHOR}`}
                className="inline-flex h-12 sm:h-13 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-7 text-base font-bold text-charcoal-950 shadow-lg shadow-amber-500/25 transition-all duration-200 hover:brightness-110 hover:shadow-amber-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950"
              >
                <span>
                  {isCheckoutReady && pricingSar ? `احجز مقعدك الآن (${pricingSar} ر.س)` : hero.primaryCta}
                </span>
              </a>
              <a
                href={`#${MASHAEL_MOCKUP_ANCHOR}`}
                className="inline-flex h-12 sm:h-13 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm sm:text-base font-medium text-charcoal-100 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-amber-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950"
              >
                <span>{hero.secondaryCta}</span>
                <ArrowDown className="h-4 w-4 text-amber-400 shrink-0" />
              </a>
            </div>

            {/* بطاقات الإبراز السريع على الشاشات الكبيرة */}
            <div className="hidden lg:flex flex-wrap items-center gap-2 pt-2 text-xs sm:text-sm text-charcoal-200">
              {hero.highlights.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-charcoal-900/60 px-3 py-1.5 backdrop-blur-sm text-charcoal-200"
                >
                  <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>

          {/* الجانب الأيسر (الصورة الرئيسية المؤطرة الفاخرة) */}
          <div className="lg:col-span-6 xl:col-span-5 w-full">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* توهج خافت ثلاثي الأبعاد خلف الصورة */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-2 sm:-inset-4 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-amber-400/10 to-transparent blur-2xl"
              />

              {/* البطاقة الحاضنة الفاخرة */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 bg-charcoal-900/80 p-2 sm:p-2.5 shadow-2xl shadow-black/80 ring-1 ring-white/10 backdrop-blur-md">
                {/* شريط متصفح مصغر أنيق */}
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-charcoal-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500/80" />
                    <span className="h-2 w-2 rounded-full bg-amber-500/80" />
                    <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                  </div>
                  <div
                    className="flex items-center gap-2 rounded-full bg-charcoal-950/80 px-3 py-0.5 font-mono text-[11px] text-charcoal-300"
                    dir="ltr"
                  >
                    <span className="text-emerald-400">https://</span>
                    <span>mashael-photo.com</span>
                  </div>
                  <span className="text-[10px] rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 font-medium">
                    مشروع الدورة
                  </span>
                </div>

                {/* الصورة بنسبة 16:9 بدون أي قص للوجه أو الشاشات */}
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-charcoal-950">
                  <Image
                    src="/images/landing/photographer-ai-website/hero.webp"
                    alt="صمّم موقعك الاحترافي باستخدام الذكاء الاصطناعي — نموذج موقع المصورة السعودية"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 560px"
                    priority
                    className="object-cover object-center"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal-950/30 via-transparent to-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* بطاقات الإبراز السريع على الجوال (تظهر أسفل الصورة مباشرة للحفاظ على الترتيب المطلوب) */}
        <div className="mt-8 flex lg:hidden flex-wrap items-center justify-center gap-2 text-xs text-charcoal-200">
          {hero.highlights.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-charcoal-900/60 px-3 py-1.5 backdrop-blur-sm"
            >
              <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{item}</span>
            </span>
          ))}
        </div>

        {/* شريط الثقة السريع */}
        <div className="mt-14 sm:mt-18 lg:mt-20 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 border-t border-white/10 pt-10">
          {trustHighlights.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-white/5 bg-charcoal-900/40 p-3.5 text-center backdrop-blur-sm"
            >
              <div className="text-base font-bold text-amber-300">{item.label}</div>
              <div className="mt-1 text-xs text-charcoal-400">{item.desc}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
