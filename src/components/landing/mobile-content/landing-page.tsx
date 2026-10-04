/**
 * صفحة الهبوط «احتراف صناعة المحتوى بالجوال» — Server Component.
 *
 * صفحة بيع مستقلة: لا Navbar ولا Footer للموقع (ChromeGate يستثني /lp)،
 * ولا روابط حساب أو مجتمع. الأجزاء التفاعلية الوحيدة: العداد، وزر الدفع
 * (رابط إلى تدفق الشراء القائم)، والشريط الثابت على الجوال.
 */

import Image from "next/image";
import {
  ArrowDown,
  CalendarDays,
  Check,
  Clock,
  Instagram,
  Lock,
  MonitorPlay,
  Sparkles,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { WhatsAppIcon } from "@/components/shared/social-icons";
import { cn } from "@/lib/utils";
import type { LandingCheckout } from "@/lib/landing/checkout";
import {
  EVENT_START_ISO,
  curriculum,
  faq,
  hero,
  instructor,
  landingFooter,
  nationalDayOffer,
  outcomes,
  paymentMethods,
  pricing,
  pricingSection,
  trustStrip,
  type CurriculumDay,
} from "@/data/landing/mobile-content";

import { BOOKING_ANCHOR, CTA_ZONE_ATTR, CURRICULUM_ANCHOR, OUTCOMES_ANCHOR } from "./anchors";
import { CheckoutCta, CheckoutUnavailableNote } from "./checkout-cta";
import { GuestCheckoutForm } from "./guest-checkout-form";
import { Countdown } from "./countdown";
import { StickyCta } from "./sticky-cta";

const zone = { [CTA_ZONE_ATTR]: "" };
const PAY_LABEL = `ادفع الآن بـ ${pricing.currentSar} ريال`;
const PRICE_LABEL = `${pricing.currentSar} ر.س`;

const focusRing =
  "outline-none focus-visible:ring-[3px] focus-visible:ring-brand-400/70 focus-visible:ring-offset-2";

export interface LandingContact {
  whatsappHref: string | null;
  instagramHref: string | null;
}

export function MobileContentLanding({
  checkout,
  contact,
}: {
  checkout: LandingCheckout;
  contact: LandingContact;
}) {
  return (
    <div data-lp-root="mobile-content" className="overflow-x-clip bg-white text-charcoal-900">
      <HeroSection checkout={checkout} hasWhatsapp={contact.whatsappHref !== null} />
      <TrustStrip />
      <CurriculumSection />
      <OutcomesSection />
      <InstructorSection />
      <PricingSection checkout={checkout} whatsappHref={contact.whatsappHref} />
      <FaqSection />
      <FinalCta checkout={checkout} whatsappHref={contact.whatsappHref} />
      <LandingFooter />
      <StickyCta checkout={checkout} priceLabel={PRICE_LABEL} />
    </div>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function HeroSection({ checkout, hasWhatsapp }: { checkout: LandingCheckout; hasWhatsapp: boolean }) {
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
            ورشة أونلاين
          </span>
        </div>

        <div className="grid gap-10 pb-14 pt-6 sm:pb-20 lg:grid-cols-12 lg:items-center lg:gap-12 lg:pb-24 lg:pt-10">
          <div className="lg:col-span-7">
            {/* على الجوال فقط (أقل من sm): الشارة والعنوان والسطر الفرعي في الوسط. */}
            <div data-hero-intro className="text-center sm:text-start">
              <p className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-brand-500/40 bg-brand-600/10 px-3.5 py-1.5 text-xs font-medium leading-relaxed text-brand-100 sm:text-sm">
                <MonitorPlay aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-400" />
                {hero.eyebrow}
              </p>
              <h1 id="lp-title" className="type-display text-balance text-white">
                {hero.title}
              </h1>
              <p className="mt-4 text-xl font-semibold leading-relaxed text-brand-200 sm:text-2xl">{hero.subtitle}</p>
            </div>

            {/* عرض اليوم الوطني: شارة خضراء مقيدة، ثم 96 ريال أقوى عنصر، ثم 497 مشطوبًا،
                ثم نداء الحجز (نفس سلوك الانتقال إلى نموذج الضيف). لا عدّاد ولا ندرة. */}
            <div
              data-national-day-offer
              className="mt-7 max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
            >
              <p className="inline-block max-w-full text-balance rounded-xl border border-[#1F9D55]/45 bg-[#006C35]/25 px-3.5 py-2 text-[13px] font-semibold leading-relaxed text-[#9BE3B8] sm:text-sm">
                {nationalDayOffer.badge}
              </p>

              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
                <p className="flex items-baseline gap-2">
                  <span className="sr-only">السعر الحالي:</span>
                  <span className="type-price text-6xl leading-none text-white sm:text-7xl">
                    {nationalDayOffer.currentAmount}
                  </span>
                  <span className="text-xl font-bold text-white sm:text-2xl">{nationalDayOffer.currentSuffix}</span>
                </p>
                <p className="pb-1.5 text-lg text-charcoal-400">
                  <span className="sr-only">بدلًا من السعر السابق:</span>
                  <del className="decoration-brand-500 decoration-2">{nationalDayOffer.previousLabel}</del>
                </p>
              </div>

              <p className="mt-3 text-base font-semibold leading-relaxed text-[#9BE3B8]">
                {nationalDayOffer.celebration}
              </p>

              <div {...zone} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <CheckoutCta
                  checkout={checkout}
                  label={nationalDayOffer.cta}
                  formClassName="w-full sm:w-auto"
                  className="w-full"
                />
                <a
                  href={`#${CURRICULUM_ANCHOR}`}
                  className={cn(
                    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10 focus-visible:ring-offset-charcoal-950",
                    focusRing,
                  )}
                >
                  شاهد المحتوى
                  <ArrowDown aria-hidden="true" className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-3 text-xs text-charcoal-400">{nationalDayOffer.vatNote}</p>
              <CheckoutUnavailableNote checkout={checkout} hasWhatsapp={hasWhatsapp} className="mt-2 text-charcoal-300" />
            </div>

            <p className="type-body mt-7 max-w-2xl text-charcoal-200 sm:text-lg sm:leading-8">{hero.description}</p>

            <ul className="mt-7 grid grid-cols-2 gap-x-4 gap-y-3 sm:max-w-lg">
              {hero.benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm font-medium text-charcoal-100 sm:text-base">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600/20 text-brand-300">
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <p className="mt-7 flex items-start gap-2 text-sm leading-relaxed text-charcoal-200 sm:text-base">
              <CalendarDays aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
              {hero.startLabel}
            </p>

            <a
              href={`#${OUTCOMES_ANCHOR}`}
              className={cn(
                "mt-4 inline-flex min-h-11 items-center text-sm font-medium text-charcoal-300 underline decoration-white/30 underline-offset-4 hover:text-white focus-visible:ring-offset-charcoal-950",
                focusRing,
              )}
            >
              اكتشف المزيد
            </a>
          </div>

          <div className="space-y-5 lg:col-span-5">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 lg:aspect-[4/3]">
              <Image
                src="/images/course-mobile.jpg"
                alt="يدان تمسكان جوالًا للتصوير — صناعة المحتوى بالجوال"
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
            <Countdown targetIso={EVENT_START_ISO} />
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────────── Trust strip ───────────────────────────── */

function TrustStrip() {
  return (
    <section aria-label="ملخص الورشة" className="border-y border-charcoal-100 bg-surface">
      <Container>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 py-5 sm:gap-x-10">
          {trustStrip.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm font-semibold text-charcoal-800 sm:text-base">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-600" />
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ───────────────────────────── Shared heading ───────────────────────────── */

function SectionHeading({
  id,
  title,
  subtitle,
  description,
  tone = "light",
}: {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
      <h2 id={id} className={cn("type-h1", dark ? "text-white" : "text-charcoal-950")}>
        {title}
      </h2>
      {subtitle && (
        <p className={cn("mt-3 text-lg font-semibold leading-relaxed", dark ? "text-brand-200" : "text-brand-700")}>
          {subtitle}
        </p>
      )}
      {description && (
        <p className={cn("type-body mt-3", dark ? "text-charcoal-300" : "text-charcoal-600")}>{description}</p>
      )}
    </div>
  );
}

/* ───────────────────────────── Curriculum ───────────────────────────── */

function CurriculumSection() {
  return (
    <section
      id={CURRICULUM_ANCHOR}
      aria-labelledby="lp-curriculum"
      className="scroll-mt-4 py-16 sm:py-24"
    >
      <Container>
        <SectionHeading
          id="lp-curriculum"
          title={curriculum.title}
          subtitle={curriculum.subtitle}
          description={curriculum.description}
        />
        <ol className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
          {curriculum.days.map((day) => (
            <DayCard key={day.number} day={day} />
          ))}
        </ol>
      </Container>
    </section>
  );
}

function DayCard({ day }: { day: CurriculumDay }) {
  const topicsOnly = day.groups.every((group) => group.items.length === 0);
  return (
    <li className="overflow-hidden rounded-2xl border border-charcoal-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-charcoal-100 bg-surface p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-7">
        <span
          aria-hidden="true"
          className="font-latin text-4xl font-bold leading-none text-brand-600 sm:text-5xl"
        >
          {day.number}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="type-h3 text-charcoal-950">{day.date}</h3>
          <p className="mt-1.5 text-base leading-relaxed text-charcoal-700">{day.focus}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-charcoal-200 bg-white px-3 py-1 text-sm font-medium text-charcoal-700">
          <Clock aria-hidden="true" className="h-4 w-4 text-brand-600" />
          {day.time}
        </span>
      </div>

      <div className="p-5 sm:p-7">
        {topicsOnly ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {day.groups.map((group) => (
              <li
                key={group.title}
                className="flex items-center gap-3 rounded-xl border border-charcoal-100 bg-surface px-4 py-4 text-base font-semibold text-charcoal-900"
              >
                <Sparkles aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-600" />
                {group.title}
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {day.groups.map((group, index) => (
              <div key={group.title || index}>
                {group.title && (
                  <h4 className="mb-3 border-s-2 border-brand-600 ps-3 text-base font-bold text-charcoal-950">
                    {group.title}
                  </h4>
                )}
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2 text-[0.95rem] leading-relaxed text-charcoal-700">
                      <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-charcoal-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

/* ───────────────────────────── Outcomes ───────────────────────────── */

function OutcomesSection() {
  return (
    <section
      id={OUTCOMES_ANCHOR}
      aria-labelledby="lp-outcomes"
      className="scroll-mt-4 border-t border-charcoal-100 bg-surface py-16 sm:py-24"
    >
      <Container>
        <SectionHeading id="lp-outcomes" title={outcomes.title} subtitle={outcomes.subtitle} description={outcomes.intro} />
        <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outcomes.items.map((item) => (
            <li key={item.number} className="rounded-2xl border border-charcoal-200 bg-white p-6">
              <span aria-hidden="true" className="font-latin text-sm font-bold tracking-wider text-brand-600">
                {item.number}
              </span>
              <h3 className="type-h3 mt-2 text-charcoal-950">{item.title}</h3>
              <p className="type-body mt-2 text-charcoal-600">{item.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ───────────────────────────── Instructor ───────────────────────────── */

function InstructorSection() {
  return (
    <section aria-labelledby="lp-instructor" className="bg-charcoal-950 py-16 text-white sm:py-24">
      <Container>
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-12 lg:gap-x-14 lg:gap-y-6">
          {/* الصورة أولًا على الجوال؛ وعلى الشاشات الكبيرة فوق الأرقام بجوار النص.
              الإطار بنسبة الصورة الطبيعية ناقص شريط أبيض مدمج بأعلى الملف (12px من 808)،
              مثبتًا على الأسفل: يُخفى الشريط فقط — لا قص للوجه أو الجسد ولا تعديل للملف. */}
          <figure className="relative mx-auto aspect-[961/796] w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-charcoal-900 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:max-w-none">
            <Image
              src={instructor.photo.src}
              alt={instructor.photo.alt}
              fill
              sizes="(min-width: 1024px) 400px, (min-width: 640px) 576px, 100vw"
              className="object-cover object-bottom"
            />
          </figure>

          <div className="lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <h2 id="lp-instructor" className="text-sm font-semibold tracking-wide text-brand-300">
              {instructor.title}
            </h2>
            <p className="type-h1 mt-3 text-white">{instructor.name}</p>
            <a
              href={instructor.instagram.href}
              target="_blank"
              rel="noopener noreferrer"
              data-instructor-instagram
              className={cn(
                "mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:ring-offset-charcoal-950",
                focusRing,
              )}
            >
              <Instagram aria-hidden="true" className="h-4 w-4 text-brand-300" />
              <span dir="ltr" className="font-latin">
                {instructor.instagram.handle}
              </span>
              <span className="sr-only">(حساب {instructor.name} على Instagram — يفتح في نافذة جديدة)</span>
            </a>
            <p className="mt-4 text-lg font-semibold leading-relaxed text-charcoal-100">{instructor.lead}</p>
            <p className="type-body mt-5 text-charcoal-300 sm:text-lg sm:leading-8">{instructor.bio}</p>

            <div className="mt-8">
              <p className="text-sm font-medium text-charcoal-400">عمل مع</p>
              <ul className="mt-3 flex flex-wrap gap-2.5">
                {instructor.workedWith.map((name) => (
                  <li
                    key={name}
                    className="font-latin rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold tracking-wide text-charcoal-100"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 self-start sm:gap-4 lg:col-span-5 lg:col-start-8 lg:row-start-2">
            {instructor.stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col-reverse rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
              >
                <dt className="mt-1 text-sm text-charcoal-300">{stat.label}</dt>
                <dd className="type-price num-ltr text-start text-3xl text-white sm:text-4xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────────── Pricing ───────────────────────────── */

function PricingSection({ checkout, whatsappHref }: { checkout: LandingCheckout; whatsappHref: string | null }) {
  return (
    <section
      id={BOOKING_ANCHOR}
      aria-labelledby="lp-pricing"
      className="scroll-mt-4 py-16 sm:py-24"
    >
      <Container>
        <SectionHeading
          id="lp-pricing"
          title={pricingSection.title}
          subtitle={pricingSection.subtitle}
          description={pricingSection.copy}
        />

        <div className="mx-auto max-w-xl">
          <div {...zone} className="overflow-hidden rounded-3xl border border-charcoal-200 bg-white shadow-xl shadow-charcoal-900/5">
            <div className="bg-charcoal-950 p-6 text-white sm:p-8">
              <span className="inline-flex rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">عرض خاص</span>
              <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-2">
                <p>
                  <span className="block text-sm text-charcoal-400">السعر الحالي</span>
                  <span className="type-price text-5xl text-white sm:text-6xl">{pricing.currentSar}</span>
                  <span className="ms-2 text-lg font-semibold text-charcoal-200">ر.س</span>
                </p>
                <p className="pb-2">
                  <span className="block text-sm text-charcoal-400">السعر السابق</span>
                  <del className="type-price text-xl text-charcoal-400 decoration-brand-500 decoration-2">
                    {pricing.previousSar} ر.س
                  </del>
                </p>
              </div>
              <p className="mt-4 inline-flex rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-brand-100">
                توفر: {pricing.savingSar} ريال
              </p>
              <p className="mt-3 text-xs text-charcoal-400">السعر شامل ضريبة القيمة المضافة.</p>
            </div>

            <div className="p-6 sm:p-8">
              <ul className="flex flex-wrap gap-2">
                {pricingSection.details.map((detail) => (
                  <li
                    key={detail}
                    className="rounded-full border border-charcoal-200 bg-surface px-3 py-1 text-sm font-medium text-charcoal-700"
                  >
                    {detail}
                  </li>
                ))}
              </ul>

              <h3 className="mt-6 text-base font-bold text-charcoal-950">ماذا يشمل؟</h3>
              <ul className="mt-3 space-y-3">
                {pricingSection.included.map((item) => (
                  <li key={item} className="flex gap-3 text-[0.95rem] leading-relaxed text-charcoal-800">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                      <Check aria-hidden="true" className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              {checkout.status === "ready" ? (
                <div className="mt-7 border-t border-charcoal-100 pt-6">
                  <h3 className="mb-4 text-base font-bold text-charcoal-950">احجز مقعدك — بدون إنشاء حساب</h3>
                  <GuestCheckoutForm payLabel={PAY_LABEL} />
                </div>
              ) : (
                <CheckoutCta
                  checkout={checkout}
                  label={PAY_LABEL}
                  formClassName="mt-7"
                  className="w-full whitespace-normal py-3 text-center leading-snug"
                />
              )}
              <CheckoutUnavailableNote
                checkout={checkout}
                hasWhatsapp={whatsappHref !== null}
                className="mt-3 text-center text-charcoal-600"
              />
            </div>
          </div>

          <PaymentTrust />

          {whatsappHref && (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-charcoal-200 bg-surface p-6 text-center">
              <h3 className="text-lg font-bold text-charcoal-950">تفضّل التواصل المباشر؟</h3>
              <WhatsappLink href={whatsappHref} label="سجّل عبر واتساب" />
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

function PaymentTrust() {
  return (
    <div className="mt-8 text-center">
      <h3 className="text-base font-bold text-charcoal-950">طرق الدفع المتاحة</h3>
      <ul className="mt-4 flex flex-wrap justify-center gap-2">
        {paymentMethods.map((method) => (
          <li
            key={method}
            className="min-w-20 rounded-lg border border-charcoal-200 bg-white px-4 py-2 text-sm font-bold text-charcoal-800"
          >
            {method}
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-4 flex max-w-md items-start justify-center gap-2 text-sm leading-relaxed text-charcoal-600">
        <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <span>
          يتم الدفع عبر صفحة دفع آمنة ومشفّرة (ميسّر).
          <br />
          لا نطلب أي بيانات بطاقة على هذا الموقع.
        </span>
      </p>
    </div>
  );
}

function WhatsappLink({ href, label, tone = "light" }: { href: string; label: string; tone?: "light" | "dark" }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
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

/* ───────────────────────────── FAQ ───────────────────────────── */

function FaqSection() {
  return (
    <section aria-labelledby="lp-faq" className="border-t border-charcoal-100 bg-surface py-16 sm:py-24">
      <Container>
        <SectionHeading id="lp-faq" title="الأسئلة الشائعة" />
        <div className="mx-auto max-w-3xl space-y-3">
          {faq.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-charcoal-200 bg-white open:shadow-sm"
            >
              <summary
                className={cn(
                  "flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-base font-semibold text-charcoal-950 [&::-webkit-details-marker]:hidden",
                  focusRing,
                  "focus-visible:ring-offset-white",
                )}
              >
                {item.q}
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-charcoal-200 text-lg leading-none text-charcoal-500 transition-transform group-open:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </summary>
              <p className="type-body px-5 pb-5 text-charcoal-700">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────────── Final CTA ───────────────────────────── */

function FinalCta({ checkout, whatsappHref }: { checkout: LandingCheckout; whatsappHref: string | null }) {
  return (
    <section aria-labelledby="lp-final" className="bg-charcoal-950 py-16 text-white sm:py-20">
      <Container>
        <div {...zone} className="mx-auto max-w-2xl text-center">
          <h2 id="lp-final" className="type-h1 text-white">
            احجز مقعدك الآن
          </h2>
          <FinalCtaCopy payReady={checkout.status === "ready"} hasWhatsapp={whatsappHref !== null} />
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <CheckoutCta checkout={checkout} label={PAY_LABEL} formClassName="w-full sm:w-auto" className="w-full" />
            {whatsappHref && <WhatsappLink href={whatsappHref} label="تواصل عبر واتساب" tone="dark" />}
          </div>
          <CheckoutUnavailableNote
            checkout={checkout}
            hasWhatsapp={whatsappHref !== null}
            className="mt-4 text-charcoal-300"
          />
        </div>
      </Container>
    </section>
  );
}

/** النص المعتمد كاملًا حين تتوفر القناتان؛ ولا يَعِد بقناة غير متاحة. */
function FinalCtaCopy({ payReady, hasWhatsapp }: { payReady: boolean; hasWhatsapp: boolean }) {
  const copy =
    payReady && hasWhatsapp
      ? "ادفع أونلاين خلال أقل من دقيقة، أو تواصل معنا عبر واتساب للتسجيل والتفاصيل."
      : payReady
        ? "ادفع أونلاين خلال أقل من دقيقة."
        : hasWhatsapp
          ? "تواصل معنا عبر واتساب للتسجيل والتفاصيل."
          : null;
  if (!copy) return null;
  return <p className="type-body mt-4 text-charcoal-300 sm:text-lg">{copy}</p>;
}

/* ───────────────────────────── Footer ───────────────────────────── */

function LandingFooter() {
  return (
    <footer {...zone} className="border-t border-white/10 bg-charcoal-950 py-8 text-center text-charcoal-400">
      <Container className="space-y-2 text-sm leading-relaxed">
        <p className="font-medium text-charcoal-300">{landingFooter.copyright}</p>
        {landingFooter.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </Container>
    </footer>
  );
}
