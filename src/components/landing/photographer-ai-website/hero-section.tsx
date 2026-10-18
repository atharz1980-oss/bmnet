import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Calendar, Check, Clock, Laptop, Sparkles, Video } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { hero, trustHighlights } from "@/data/landing/photographer-ai-website";
import { CURRICULUM_ANCHOR, REGISTRATION_ANCHOR } from "./anchors";

export function HeroSection({
  pricingSar,
  isCheckoutReady,
}: {
  pricingSar: number | null;
  isCheckoutReady: boolean;
}) {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-charcoal-950 text-white pt-6 pb-16 lg:pb-24">
      {/* خلفية جمالية خافتة مستوحاة من إضاءة الاستوديو */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(217,119,6,0.15),rgba(255,255,255,0))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(10,10,12,0.8)_100%)]"
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
        <div className="mx-auto max-w-4xl text-center">
          {/* الشارة العلوية */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-amber-300 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>{hero.eyebrow}</span>
          </div>

          {/* العنوان الرئيسي والفرعي */}
          <h1 id="hero-title" className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white">
            {hero.title}
            <span className="block mt-2 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              {hero.subtitle}
            </span>
          </h1>

          {/* الوصف المعتمد */}
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-charcoal-300">
            {hero.description}
          </p>

          {/* أبرز مميزات التدريب */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-charcoal-200">
            {hero.highlights.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm"
              >
                <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>{item}</span>
              </span>
            ))}
          </div>

          {/* أزرار الإجراء الرئيسية */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`#${REGISTRATION_ANCHOR}`}
              className="inline-flex h-12 w-full sm:w-auto min-w-[200px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 text-base font-bold text-charcoal-950 shadow-xl shadow-amber-950/40 transition-all hover:from-amber-400 hover:to-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950"
            >
              <span>
                {isCheckoutReady && pricingSar ? `احجز مقعدك الآن (${pricingSar} ر.س)` : hero.primaryCta}
              </span>
            </a>
            <a
              href={`#${CURRICULUM_ANCHOR}`}
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/20 bg-charcoal-900/60 px-6 text-base font-medium text-charcoal-200 backdrop-blur-sm transition-colors hover:bg-charcoal-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-950"
            >
              <span>{hero.secondaryCta}</span>
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* نموذج مرئي فوتوغرافي متطور للموقع على الشاشة والجوال */}
        <div className="mt-14 sm:mt-18 lg:mt-20">
          <div className="relative mx-auto max-w-5xl rounded-2xl border border-white/15 bg-charcoal-900/90 p-2 shadow-2xl shadow-black/80 backdrop-blur-md sm:p-4">
            {/* شريط متصفح سطح المكتب */}
            <div className="flex items-center justify-between border-b border-white/10 px-3 pb-3 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-2 rounded-full bg-charcoal-950/80 px-4 py-1 text-xs text-charcoal-400 font-mono" dir="ltr">
                <span className="text-emerald-400">https://</span>
                <span className="text-charcoal-200">yourname-photo.com</span>
              </div>
              <div className="w-12" />
            </div>

            {/* محاكاة واجهة موقع المصور الحقيقية */}
            <div className="relative mt-2 overflow-hidden rounded-xl bg-charcoal-950 text-white">
              {/* شريط الموقع المصغر */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2 font-bold tracking-wider text-sm sm:text-base">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>AL-SHARIF PHOTOGRAPHY</span>
                </div>
                <div className="hidden sm:flex items-center gap-5 text-xs text-charcoal-300">
                  <span className="text-amber-400 font-medium">الرئيسية</span>
                  <span>معرض الأعمال</span>
                  <span>عن المصور</span>
                  <span>باقات التصوير</span>
                </div>
                <div className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-charcoal-950">
                  طلب حجز جلسة
                </div>
              </div>

              {/* بطاقة بصرية هيدر الموقع المحاكى */}
              <div className="relative h-64 sm:h-96 w-full">
                <Image
                  src="/images/course-portrait.jpg"
                  alt="معاينة لموقع محفظة أعمال مصور فوتوغرافي محترف"
                  fill
                  className="object-cover object-top opacity-85"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/40 to-transparent" />
                <div className="absolute bottom-6 right-6 left-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="inline-block rounded bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 backdrop-blur-sm">
                      معرض 2026 الحصري
                    </span>
                    <h3 className="mt-1 text-xl sm:text-2xl font-bold text-white">
                      أحمد الشريف — مصور بورتريه ومناسبات
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-charcoal-300 max-w-lg">
                      توثيق اللحظات بأسلوب سينمائي يبرز التفاصيل والمشاعر.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
                      تصفح الألبومات (120+ عمل)
                    </span>
                  </div>
                </div>
              </div>

              {/* شبكة مصغرة لأقسام المعرض المحاكى */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-charcoal-900/60 border-t border-white/10">
                <div className="relative h-24 rounded-lg overflow-hidden border border-white/10 group">
                  <Image src="/images/course-fundamentals.jpg" alt="أعمال تصوير متنوعة" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 p-2 flex items-end">
                    <span className="text-[11px] font-bold text-white">جلسات الأفراد</span>
                  </div>
                </div>
                <div className="relative h-24 rounded-lg overflow-hidden border border-white/10 group">
                  <Image src="/images/course-products.jpg" alt="تصوير منتجات تجارية" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 p-2 flex items-end">
                    <span className="text-[11px] font-bold text-white">تصوير المنتجات</span>
                  </div>
                </div>
                <div className="relative h-24 rounded-lg overflow-hidden border border-white/10 group">
                  <Image src="/images/course-lighting.jpg" alt="جلسات استوديو إضاءة" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 p-2 flex items-end">
                    <span className="text-[11px] font-bold text-white">تصوير الأطعمة</span>
                  </div>
                </div>
                <div className="relative h-24 rounded-lg overflow-hidden border border-white/10 group">
                  <Image src="/images/about-studio.jpg" alt="جلسات تصوير الاستوديو" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 p-2 flex items-end">
                    <span className="text-[11px] font-bold text-white">تغطية الفعاليات</span>
                  </div>
                </div>
              </div>
            </div>

            {/* معاينة شاشة الجوال العائمة في الركن */}
            <div className="absolute -bottom-6 -left-2 sm:-left-6 hidden md:block w-48 sm:w-56 rounded-2xl border-2 border-white/20 bg-charcoal-950 p-1.5 shadow-2xl shadow-black">
              <div className="relative h-64 rounded-xl overflow-hidden bg-charcoal-900 border border-white/10">
                <Image
                  src="/images/course-portrait.jpg"
                  alt="نسخة متجاوبة لموقع المصور على الهاتف المحمول"
                  fill
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/30 to-transparent" />
                <div className="absolute top-2 left-2 right-2 flex justify-between items-center text-[9px] font-mono text-white/80">
                  <span>9:41</span>
                  <span>5G 100%</span>
                </div>
                <div className="absolute bottom-3 left-2 right-2 text-center">
                  <span className="block text-[10px] font-bold text-white">أحمد الشريف | مصور</span>
                  <span className="mt-1 inline-block w-full rounded bg-amber-500 py-1 text-[10px] font-bold text-charcoal-950">
                    طلب حجز جلسة
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* شريط الثقة السريع */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 border-t border-white/10 pt-10">
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
