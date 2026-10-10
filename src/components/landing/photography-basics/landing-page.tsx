/**
 * صفحة الهبوط «ورشة أساسيات التصوير الفوتوغرافي» — Server Component.
 *
 * على نمط صفحة الجوال (ألوان، خطوط، بطاقات) بلا مشاركة حالتها: الدفع هنا عبر
 * workshop_orders بخيار كامل أو عربون. لا Navbar ولا Footer للموقع (ChromeGate
 * يستثني /lp). لا تواريخ ولا عدّاد: الموعد «خلال أكتوبر 2026».
 */

import Image from "next/image";
import { ArrowDown, CalendarDays, Check, Clock, Lock, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { WhatsAppIcon } from "@/components/shared/social-icons";
import { CTA_ZONE_ATTR } from "@/components/landing/mobile-content/anchors";
import { TrackingSettingsButton } from "@/components/landing/mobile-content/tracking-consent";
import { cn } from "@/lib/utils";
import {
  PHOTOGRAPHY_BOOKING_ANCHOR,
  PHOTOGRAPHY_CURRICULUM_ANCHOR,
  PHOTOGRAPHY_IMAGE,
  photographyCancellationPolicy,
  photographyCurriculum,
  photographyFaq,
  photographyOffer,
  photographyPaymentOptions,
  photographyPricing,
  photographyWorkshop,
} from "@/data/landing/photography-basics";

import { PhotographyCheckoutForm } from "./checkout-form";
import { PhotographyStickyCta } from "./sticky-cta";

const zone = { [CTA_ZONE_ATTR]: "" };

const focusRing =
  "outline-none focus-visible:ring-[3px] focus-visible:ring-brand-400/70 focus-visible:ring-offset-2";

const FACTS = [
  { icon: Users, label: "نوع الورشة", value: photographyWorkshop.mode },
  { icon: MapPin, label: "المكان", value: photographyWorkshop.location },
  { icon: CalendarDays, label: "الموعد", value: photographyWorkshop.dateLabel },
  { icon: Clock, label: "المدة", value: photographyWorkshop.duration },
] as const;

export function PhotographyBasicsLanding({
  checkoutReady,
  whatsappHref,
}: {
  checkoutReady: boolean;
  whatsappHref: string | null;
}) {
  return (
    <div data-lp-root="photography-basics" className="overflow-x-clip bg-white text-charcoal-900">
      <HeroSection whatsappHref={whatsappHref} />
      <FactsStrip />
      <CurriculumSection />
      <PricingSection checkoutReady={checkoutReady} whatsappHref={whatsappHref} />
      <CancellationSection />
      <FaqSection />
      <FinalCta whatsappHref={whatsappHref} />
      <LandingFooter />
      <PhotographyStickyCta />
    </div>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function HeroSection({ whatsappHref }: { whatsappHref: string | null }) {
  return (
    <section aria-labelledby="lp-title" className="relative bg-charcoal-950 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(60%_60%_at_80%_0%,rgba(217,38,50,0.18),transparent_70%)]"
      />
      <Container className="relative">
        <div className="flex items-center justify-between py-5 sm:py-6">
          <Logo variant="master" mode="light-on-dark" height={34} priority alt="بيت المصور" />
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-charcoal-200">
            ورشة {photographyWorkshop.mode} — جدة
          </span>
        </div>

        <div className="grid gap-10 pb-14 pt-6 sm:pb-20 lg:grid-cols-12 lg:items-center lg:gap-12 lg:pb-24 lg:pt-10">
          <div className="lg:col-span-7">
            <div data-hero-intro className="text-center sm:text-start">
              <p className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-brand-500/40 bg-brand-600/10 px-3.5 py-1.5 text-xs font-medium leading-relaxed text-brand-100 sm:text-sm">
                <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-400" />
                {photographyWorkshop.location}
              </p>
              <h1 id="lp-title" className="type-display text-balance text-white">
                {photographyWorkshop.title}
              </h1>
              <p className="mt-4 text-lg font-medium leading-relaxed text-brand-100 sm:text-xl">
                {photographyWorkshop.description}
              </p>
            </div>

            <div
              data-national-day-offer
              className="mt-7 max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
            >
              <p className="inline-block max-w-full text-balance rounded-xl border border-[#1F9D55]/45 bg-[#006C35]/25 px-3.5 py-2 text-[13px] font-semibold leading-relaxed text-[#9BE3B8] sm:text-sm">
                {photographyOffer.badge}
              </p>

              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
                <p className="flex items-baseline gap-2">
                  <span className="sr-only">السعر الحالي:</span>
                  <span className="type-price text-6xl leading-none text-white sm:text-7xl">
                    {photographyPricing.currentSar}
                  </span>
                  <span className="text-xl font-bold text-white sm:text-2xl">ريال</span>
                </p>
                <p className="pb-1.5 text-lg text-charcoal-400">
                  <span className="sr-only">بدلًا من السعر السابق:</span>
                  <del className="decoration-brand-500 decoration-2">{photographyPricing.previousSar} ريال</del>
                </p>
              </div>

              <p className="mt-3 text-base font-semibold leading-relaxed text-[#9BE3B8]">
                وفّر {photographyOffer.savingSar} ريال — أو احجز مقعدك بعربون {photographyPricing.depositSar} ريال فقط.
              </p>

              <div {...zone} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={`#${PHOTOGRAPHY_BOOKING_ANCHOR}`}
                  className={cn(
                    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-base font-semibold text-white shadow-lg shadow-brand-900/30 transition-colors hover:bg-brand-700 focus-visible:ring-offset-charcoal-950",
                    focusRing,
                  )}
                >
                  احجز مقعدك الآن
                </a>
                <a
                  href={`#${PHOTOGRAPHY_CURRICULUM_ANCHOR}`}
                  className={cn(
                    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10 focus-visible:ring-offset-charcoal-950",
                    focusRing,
                  )}
                >
                  شاهد المحتوى
                  <ArrowDown aria-hidden="true" className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-3 text-xs text-charcoal-400">{photographyOffer.vatNote}</p>
            </div>

            <p className="mt-7 flex items-start gap-2 text-sm leading-relaxed text-charcoal-200 sm:text-base">
              <CalendarDays aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
              {photographyWorkshop.dateLabel} — {photographyWorkshop.duration}. {photographyWorkshop.dateNote}
            </p>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                data-lp-whatsapp
                className={cn(
                  "mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-charcoal-200 underline decoration-white/30 underline-offset-4 hover:text-white focus-visible:ring-offset-charcoal-950",
                  focusRing,
                )}
              >
                <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                استفسر عبر واتساب
                <span className="sr-only">(يفتح في نافذة جديدة)</span>
              </a>
            )}
          </div>

          <div className="lg:col-span-5">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 lg:aspect-[4/3]">
              <Image
                src={PHOTOGRAPHY_IMAGE}
                alt="كاميرا احترافية — ورشة أساسيات التصوير الفوتوغرافي"
                fill
                preload
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────────── Facts ───────────────────────────── */

function FactsStrip() {
  return (
    <section aria-label="ملخص الورشة" className="border-y border-charcoal-100 bg-surface">
      <Container>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 py-6 lg:grid-cols-4">
          {FACTS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-sm">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex flex-col-reverse">
                <dd className="text-sm font-bold leading-relaxed text-charcoal-950 sm:text-base">{value}</dd>
                <dt className="text-xs text-charcoal-500">{label}</dt>
              </div>
            </div>
          ))}
        </dl>
        <p className="pb-5 text-center">
          <a
            href={photographyWorkshop.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-lp-map
            className={cn(
              "inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800",
              focusRing,
            )}
          >
            <MapPin aria-hidden="true" className="h-4 w-4" />
            موقع الأكاديمية على الخريطة
            <span className="sr-only">(يفتح خرائط Google في نافذة جديدة)</span>
          </a>
        </p>
      </Container>
    </section>
  );
}

/* ───────────────────────────── Shared heading ───────────────────────────── */

function SectionHeading({ id, title, description, tone = "light" }: { id: string; title: string; description?: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
      <h2 id={id} className={cn("type-h1", dark ? "text-white" : "text-charcoal-950")}>
        {title}
      </h2>
      {description && <p className={cn("type-body mt-3", dark ? "text-charcoal-300" : "text-charcoal-600")}>{description}</p>}
    </div>
  );
}

/* ───────────────────────────── Curriculum ───────────────────────────── */

function CurriculumSection() {
  return (
    <section id={PHOTOGRAPHY_CURRICULUM_ANCHOR} aria-labelledby="lp-curriculum" className="scroll-mt-4 py-16 sm:py-24">
      <Container>
        <SectionHeading
          id="lp-curriculum"
          title="محتوى الورشة"
          description={`${photographyWorkshop.duration} حضورية تأخذك من أساس الصورة إلى التحكم الكامل في الكاميرا.`}
        />
        <ol className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 sm:gap-6">
          {photographyCurriculum.map((day, index) => (
            <li key={day.day} data-curriculum-day className="overflow-hidden rounded-2xl border border-charcoal-200 bg-white shadow-sm">
              <div className="flex items-center gap-4 border-b border-charcoal-100 bg-surface p-5">
                <span aria-hidden="true" className="font-latin text-4xl font-bold leading-none text-brand-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-charcoal-500">{day.day}</p>
                  <h3 className="type-h3 text-charcoal-950">{day.title}</h3>
                </div>
              </div>
              <ul className="space-y-3 p-5">
                {day.topics.map((topic) => (
                  <li key={topic} className="flex gap-3 text-[0.95rem] leading-relaxed text-charcoal-800">
                    <Sparkles aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                    {topic}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* ───────────────────────────── Pricing ───────────────────────────── */

function PricingSection({ checkoutReady, whatsappHref }: { checkoutReady: boolean; whatsappHref: string | null }) {
  return (
    <section id={PHOTOGRAPHY_BOOKING_ANCHOR} aria-labelledby="lp-pricing" className="scroll-mt-4 bg-surface py-16 sm:py-24">
      <Container>
        <SectionHeading id="lp-pricing" title="احجز مقعدك" description={photographyOffer.name} />

        <div className="mx-auto max-w-xl">
          <div {...zone} className="overflow-hidden rounded-3xl border border-charcoal-200 bg-white shadow-xl shadow-charcoal-900/5">
            <div className="bg-charcoal-950 p-6 text-white sm:p-8">
              <span className="inline-flex rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                خصم {photographyOffer.discountPercent}%
              </span>
              <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-2">
                <p>
                  <span className="block text-sm text-charcoal-400">السعر الحالي</span>
                  <span className="type-price text-5xl text-white sm:text-6xl">{photographyPricing.currentSar}</span>
                  <span className="ms-2 text-lg font-semibold text-charcoal-200">ر.س</span>
                </p>
                <p className="pb-2">
                  <span className="block text-sm text-charcoal-400">السعر السابق</span>
                  <del className="type-price text-xl text-charcoal-400 decoration-brand-500 decoration-2">
                    {photographyPricing.previousSar} ر.س
                  </del>
                </p>
              </div>
              <p className="mt-4 inline-flex rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-brand-100">
                توفر: {photographyOffer.savingSar} ريال
              </p>
              <p className="mt-3 text-xs text-charcoal-400">{photographyOffer.vatNote}.</p>
            </div>

            <div className="p-6 sm:p-8">
              {checkoutReady ? (
                <>
                  <h3 className="mb-4 text-base font-bold text-charcoal-950">بيانات الحجز — بدون إنشاء حساب</h3>
                  <PhotographyCheckoutForm />
                </>
              ) : (
                <div data-lp-checkout="unavailable" className="space-y-3 text-center">
                  <ul className="space-y-2 text-start text-sm text-charcoal-700">
                    {(["full", "deposit"] as const).map((option) => (
                      <li key={option}>
                        <span className="font-bold text-charcoal-950">{photographyPaymentOptions[option].title}:</span>{" "}
                        {photographyPaymentOptions[option].amountLabel} — {photographyPaymentOptions[option].note}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm leading-relaxed text-charcoal-600">
                    الدفع الإلكتروني غير متاح مؤقتًا.{whatsappHref ? " تواصل معنا عبر واتساب لإتمام حجزك." : ""}
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="mx-auto mt-6 flex max-w-md items-start justify-center gap-2 text-center text-sm leading-relaxed text-charcoal-600">
            <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              يتم الدفع عبر صفحة دفع آمنة ومشفّرة (ميسّر).
              <br />
              لا نطلب أي بيانات بطاقة على هذا الموقع.
            </span>
          </p>

          {whatsappHref && (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-charcoal-200 bg-white p-6 text-center">
              <h3 className="text-lg font-bold text-charcoal-950">عندك استفسار قبل الحجز؟</h3>
              <WhatsappLink href={whatsappHref} label="تواصل عبر واتساب" />
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

function WhatsappLink({ href, label, tone = "light" }: { href: string; label: string; tone?: "light" | "dark" }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-lp-whatsapp
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-6 text-base font-semibold transition-colors",
        tone === "dark"
          ? "border-white/20 text-white hover:bg-white/10 focus-visible:ring-offset-charcoal-950"
          : "border-charcoal-300 bg-white text-charcoal-900 hover:bg-charcoal-50",
        focusRing,
      )}
    >
      <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
      {label}
      <span className="sr-only">(يفتح في نافذة جديدة)</span>
    </a>
  );
}

/* ───────────────────────────── Cancellation ───────────────────────────── */

function CancellationSection() {
  return (
    <section aria-labelledby="lp-cancellation" className="py-16 sm:py-20">
      <Container>
        <SectionHeading id="lp-cancellation" title="سياسة الإلغاء" />
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
          {photographyCancellationPolicy.map((item) => (
            <div key={item.title} className="rounded-2xl border border-charcoal-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-bold text-charcoal-950">
                <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-600" />
                {item.title}
              </h3>
              <p className="type-body mt-3 text-charcoal-700">{item.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────────── FAQ ───────────────────────────── */

function FaqSection() {
  return (
    <section aria-labelledby="lp-faq" className="border-t border-charcoal-100 bg-surface py-16 sm:py-24">
      <Container>
        <SectionHeading id="lp-faq" title="الأسئلة الشائعة" />
        <div className="mx-auto max-w-3xl space-y-3">
          {photographyFaq.map((item) => (
            <details key={item.question} className="group rounded-xl border border-charcoal-200 bg-white open:shadow-sm">
              <summary
                className={cn(
                  "flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-base font-semibold text-charcoal-950 [&::-webkit-details-marker]:hidden",
                  focusRing,
                  "focus-visible:ring-offset-white",
                )}
              >
                {item.question}
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-charcoal-200 text-lg leading-none text-charcoal-500 transition-transform group-open:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </summary>
              <p className="type-body px-5 pb-5 text-charcoal-700">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────────── Final CTA ───────────────────────────── */

function FinalCta({ whatsappHref }: { whatsappHref: string | null }) {
  return (
    <section aria-labelledby="lp-final" className="bg-charcoal-950 py-16 text-white sm:py-20">
      <Container>
        <div {...zone} className="mx-auto max-w-2xl text-center">
          <h2 id="lp-final" className="type-h1 text-white">
            ابدأ رحلتك في التصوير
          </h2>
          <p className="type-body mt-4 text-charcoal-300 sm:text-lg">
            {photographyPricing.currentSar} ريال بدلًا من {photographyPricing.previousSar} ريال — ادفع كاملًا أو بعربون{" "}
            {photographyPricing.depositSar} ريال.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={`#${PHOTOGRAPHY_BOOKING_ANCHOR}`}
              className={cn(
                "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-base font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:ring-offset-charcoal-950",
                focusRing,
              )}
            >
              <Check aria-hidden="true" className="h-5 w-5" />
              احجز مقعدك الآن
            </a>
            {whatsappHref && <WhatsappLink href={whatsappHref} label="تواصل عبر واتساب" tone="dark" />}
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────────── Footer ───────────────────────────── */

function LandingFooter() {
  return (
    <footer {...zone} className="border-t border-white/10 bg-charcoal-950 py-8 text-center text-charcoal-400">
      <Container className="space-y-2 text-sm leading-relaxed">
        <p className="font-medium text-charcoal-300">© 2026 أكاديمية بيت المصور — جميع الحقوق محفوظة</p>
        <p>{photographyWorkshop.location}</p>
        <p>المدفوعات عبر منصة ميسّر (Moyasar)</p>
        <TrackingSettingsButton />
      </Container>
    </footer>
  );
}
