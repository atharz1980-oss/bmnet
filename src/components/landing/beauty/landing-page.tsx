"use client";

/**
 * BEAUTY WORKSHOP — ورشة البيوتي بحلّتها الجديدة
 * فن تصوير البيوتي الاحترافي: فوتوغرافي · فيديو · ريتاتش · ذكاء اصطناعي
 *
 * ورشة حضورية في جدة — 24-26 ديسمبر 2026
 * RTL — Arabic only — Self-contained styling via beauty.css
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import useEmblaCarousel from "embla-carousel-react";
import { BEAUTY_CHECKOUT_ENABLED } from "@/data/landing/beauty";
import { BeautyCheckoutForm } from "./checkout-form";
import "./beauty.css";

/* ════════════════════════════════════════
   STATIC DATA
════════════════════════════════════════ */

const WHAT_IS_NEW = [
  "يوم كامل لتصوير البيوتي الفوتوغرافي.",
  "يوم كامل لتصوير فيديو البيوتي.",
  "يوم للريتاتش يجمع التقنيات الاحترافية وأدوات الذكاء الاصطناعي.",
  "شرح وتطبيق عملي على مودل أجنبية خلال أول يومين.",
  "توفير الكاميرات والعدسات ومعدات التصوير لكل متدرب للاستخدام أثناء أيام الورشة.",
  "بونصات تساعدك تكمّل التطبيق بعد انتهاء التدريب.",
];

const GALLERY_ITEMS = [
  {
    src: "/images/landing/beauty/gallery/gallery-01.jpg",
    title: "بورتريه الورود والتاج التحريري",
    alt: "تصوير بيوتي احترافي — تاج الورود وإضاءة ناعمة",
    tag: "إضاءة البيوتي الناعمة",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-02.jpg",
    title: "إضاءة الظلال الحادة والمجوهرات",
    alt: "تصوير بيوتي احترافي — ظلال حادة ولمعان المكياج",
    tag: "الظلال والانعكاسات",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-03.jpg",
    title: "مكياج العيون اللوني والزهور",
    alt: "تصوير بيوتي تحريري — مكياج عيون فني متناسق",
    tag: "مكياج تحريري",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-04.jpg",
    title: "إبراز تفاصيل البشرة والمظهر الرطب",
    alt: "تصوير بيوتي — ملمس البشرة الطبيعي وقطرات الماء",
    tag: "ملمس البشرة والريتاتش",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-05.jpg",
    title: "زوايا الوجه والهايلايتر البرونزي",
    alt: "تصوير بيوتي — إبراز ملامح الوجه والوجنتين",
    tag: "زوايا الوجه والإضاءة",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-06.jpg",
    title: "الشعر الكيرلي والإضاءة الدافئة",
    alt: "تصوير بيوتي — تناغم الإضاءة مع الشعر الكيرلي",
    tag: "التباين والضوء الحاد",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-07.jpg",
    title: "الظل الدرامي وشعاع الضوء",
    alt: "تصوير بيوتي — توزيع درامي للضوء وشق الظل",
    tag: "سينمائية البيوتي",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-08.jpg",
    title: "مكياج متناسق وتوزيع فلاشات متوازن",
    alt: "تصوير بيوتي في الاستوديو — ملامح متناسقة",
    tag: "توزيع الفلاشات",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-09.jpg",
    title: "البوب الكلاسيكي ولون الآيشادو الفاقع",
    alt: "تصوير بيوتي — آيشادو فاقع وشعر قصير",
    tag: "تناسق الألوان",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-10.jpg",
    title: "الظل المائل وتدرجات الملمس",
    alt: "تصوير بيوتي تحريري — زاوية إضاءة غير تقليدية",
    tag: "مسار الضوء",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-11.jpg",
    title: "النقاء الطبيعي وبشرة البورسلين",
    alt: "تصوير بيوتي ناعم — High Key وإضاءة متساوية",
    tag: "High-Key بيوتي",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-12.jpg",
    title: "مكياج الجليتر والشفاه اللامعة",
    alt: "تصوير بيوتي دقيق — تفاصيل الجليتر والرموش",
    tag: "تفاصيل المكياج",
  },
  {
    src: "/images/landing/beauty/gallery/gallery-13.jpg",
    title: "المظهر الرطب والتفاصيل المقربة",
    alt: "تصوير بيوتي ماكرو — مظهر مائي وريتاتش فائق",
    tag: "ريتاتش احترافي",
  },
];

const OUTCOMES = [
  { num: "01", title: "فهم أوضح للإضاءة والبشرة", body: "فهم أوضح لتأثير الإضاءة على البشرة والمكياج وكيف تُبرز كل تفصيلة بالطريقة الصحيحة." },
  { num: "02", title: "تصوير ثابت وفيديو احترافي", body: "تطوير مهاراتك في التصوير الثابت والفيديو من خلال تطبيق عملي مكثف بمعدات احترافية." },
  { num: "03", title: "خطوات عمل منظمة", body: "ترتيب خطوات عملك من تجهيز الإضاءة إلى الصورة النهائية في تسلسل واضح وقابل للتطبيق." },
  { num: "04", title: "ريتاتش بوعي وتحكّم", body: "استخدام الريتاتش والذكاء الاصطناعي بوعي وتحكّم مع الحفاظ على طبيعية البشرة وتفاصيلها." },
  { num: "05", title: "تطبيق فعلي على مودل", body: "فرصة التصوير الحقيقي على مودل أجنبية خلال يومين كاملين في بيئة استوديو احترافية." },
];

const DAYS = [
  {
    num: "1", label: "اليوم الأول", date: "24 ديسمبر", title: "تصوير البيوتي الفوتوغرافي",
    subtitle: "BEAUTY PHOTOGRAPHY", duration: "4 ساعات · تدريب حضوري", isActive: true,
    items: ["إضاءة البيوتي وتوزيعاتها.", "اختيار العدسات وزوايا التصوير.", "التحكم في الظلال والانعكاسات.", "إبراز تفاصيل البشرة والمكياج.", "شرح وتطبيق عملي على مودل أجنبية."],
    outcome: "تقدر تبني إعداد إضاءة بيوتي احترافي وتلتقط تفاصيل البشرة والمكياج بدقة وتحكّم كامل.",
  },
  {
    num: "2", label: "اليوم الثاني", date: "25 ديسمبر", title: "تصوير فيديو البيوتي",
    subtitle: "BEAUTY VIDEO", duration: "4 ساعات · تدريب حضوري", isActive: false,
    items: ["تجهيز الإضاءة المناسبة للفيديو.", "تكوين اللقطات وحركة الكاميرا.", "تصوير تفاصيل المكياج ومنتجات التجميل.", "بناء تسلسل بصري لفيديو بيوتي إعلاني.", "شرح وتطبيق عملي على مودل أجنبية."],
    outcome: "تعرف كيف تحوّل جمال الصورة الثابتة إلى حركة سلسة وتبني مقطع فيديو بيوتي احترافي من الصفر.",
  },
  {
    num: "3", label: "اليوم الثالث", date: "26 ديسمبر", title: "الريتاتش الاحترافي والذكاء الاصطناعي",
    subtitle: "RETOUCH & AI", duration: "4 ساعات · تدريب حضوري", isActive: false,
    items: ["معالجة الصور وتصحيح الألوان.", "تنقيح البشرة والحفاظ على ملمسها وتفاصيلها.", "تقنيات Dodge & Burn و Frequency Separation.", "توظيف أدوات الذكاء الاصطناعي في خطوات الريتاتش.", "مراجعة نتائج الـ AI وتصحيحها للحفاظ على ملامح الوجه والتفاصيل."],
    outcome: "تطوّر صورك النهائية بريتاتش احترافي يحافظ على طبيعية البشرة، وتوظّف أدوات الذكاء الاصطناعي بوعي ومتحكّم.",
  },
];

const BONUSES = [
  { title: "3 ساعات إيجار استوديو مجانًا", body: "مساحة إضافية لتطبيق ما تعلّمته وتجربة أفكارك بعد الورشة." },
  { title: "معدات التصوير متوفرة", body: "الكاميرات والعدسات وجميع معدات التصوير متوفرة لكل متدرب للاستخدام خلال أيام الورشة." },
  { title: "تطبيق عملي لمدة يومين", body: "شرح وتطبيق على مودل أجنبية في يوم التصوير الفوتوغرافي ويوم الفيديو." },
  { title: "جروب متابعة بعد الورشة", body: "للمتابعة ومشاركة التطبيقات والأسئلة بعد انتهاء الأيام التدريبية." },
];

const AUDIENCE = [
  { title: "مصور بورتريه / بيوتي", body: "تصور البورتريه أو البيوتي وتريد ترقية مستواك في الإضاءة والفيديو والريتاتش الاحترافي." },
  { title: "مالك استوديو", body: "تدير استوديو وتريد إضافة خدمة البيوتي الاحترافي بالفيديو والصورة كخدمة مميزة لعملائك." },
  { title: "فنان بصري / مدير إبداعي", body: "تعمل في صناعة المحتوى وتريد فهم كامل لمنظومة تصوير البيوتي من الإضاءة إلى الريتاتش." },
  { title: "متحمس جاد للتطور", body: "لديك أساسيات التصوير وجاد في تطوير مهاراتك في الاستوديو عبر تدريب عملي مكثف." },
];

const INCLUSIONS = [
  "الأيام التدريبية الثلاثة الحضورية (12 ساعة إجمالًا)",
  "استخدام معدات التصوير الكاملة خلال أيام الورشة",
  "التطبيق العملي على مودل أجنبية خلال أول يومين",
  "3 ساعات إيجار استوديو مجانًا بعد الورشة",
  "جروب متابعة بعد انتهاء الأيام التدريبية",
];

const FAQS = [
  { q: "هل الورشة مناسبة للمبتدئين؟", a: "يُفضّل الإلمام بأساسيات التصوير للاستفادة بشكل أكبر من الشرح والتطبيق." },
  { q: "هل أحتاج إحضار كاميرا أو عدسات؟", a: "الكاميرات والعدسات ومعدات التصوير متوفرة لكل متدرب للاستخدام خلال أيام الورشة." },
  { q: "هل يوجد تطبيق على مودل؟", a: "نعم، الشرح والتطبيق العملي على مودل أجنبية خلال أول يومين: يوم الفوتوغرافي ويوم الفيديو." },
  { q: "هل الريتاتش يشمل الذكاء الاصطناعي؟", a: "نعم، اليوم الثالث يجمع تقنيات الريتاتش الاحترافي واستخدام أدوات AI، مع مراجعة النتائج والحفاظ على تفاصيل البشرة." },
  { q: "هل أحتاج لابتوب؟", a: "يُفضّل إحضار لابتوب لتطبيقات اليوم الثالث. تُوضَّح البرامج والأدوات المطلوبة قبل الورشة." },
  { q: "كيف أستخدم ساعات الاستوديو المجانية؟", a: "يشمل الاشتراك 3 ساعات إيجار استوديو مجانًا. تُوضَّح آلية الحجز ومدة صلاحية البونص والتجهيزات المشمولة قبل التسجيل." },
  { q: "هل توجد متابعة بعد الورشة؟", a: "نعم، من خلال جروب مخصص للمتابعة بعد انتهاء الورشة." },
];

const CheckIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#E65A2E" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

/* ════════════════════════════════════════
   COMPONENT
════════════════════════════════════════ */

export function BeautyLanding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeLightbox, setActiveLightbox] = useState<{ src: string; title: string; tag: string } | null>(null);

  /* Carousel State */
  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: "rtl",
    align: "start",
    loop: true,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  /* Keydown for Lightbox ESC */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveLightbox(null);
      }
    };
    if (activeLightbox) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeLightbox]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Dynamic Year
    root.querySelectorAll(".js-year").forEach((el) => { el.textContent = String(new Date().getFullYear()); });

    // Reveal animation
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("active"); obs.unobserve(e.target); } }),
        { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
      );
      root.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    } else {
      root.querySelectorAll(".reveal").forEach((el) => el.classList.add("active"));
    }

    // Mobile Menu
    const btn = root.querySelector("#bb-menu-btn");
    const menu = root.querySelector("#bb-menu");
    const ico = root.querySelector("#bb-ico-open");
    const icx = root.querySelector("#bb-ico-close");
    if (btn && menu) {
      const toggle = () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        menu.classList.toggle("hidden");
        ico?.classList.toggle("hidden");
        icx?.classList.toggle("hidden");
      };
      btn.addEventListener("click", toggle);
      menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { menu.classList.add("hidden"); ico?.classList.remove("hidden"); icx?.classList.add("hidden"); btn.setAttribute("aria-expanded", "false"); }));
    }

    // Hide sticky bar when pricing visible
    const pricing = root.querySelector("#pricing");
    const bar = root.querySelector("#bb-sticky") as HTMLElement | null;
    if (pricing && bar && "IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => entries.forEach((e) => { bar.style.transform = e.isIntersecting ? "translateY(100%)" : ""; }),
        { threshold: 0.1 }
      ).observe(pricing);
    }
  }, []);

  /* ── Shared inline styles ── */
  const S = {
    brand: { color: "#E65A2E" } as React.CSSProperties,
    brandBg: { backgroundColor: "#E65A2E", color: "#fff" } as React.CSSProperties,
    dark: { color: "#0E0E12" } as React.CSSProperties,
    muted: { color: "#808090" } as React.CSSProperties,
    white: { color: "#fff" } as React.CSSProperties,
    surface: { backgroundColor: "#FAFAFC" } as React.CSSProperties,
    card: { backgroundColor: "#fff", border: "1px solid #E6E6EC" } as React.CSSProperties,
    border: { borderColor: "#E6E6EC" } as React.CSSProperties,
    brandBorder2: { border: "2px solid #E65A2E" } as React.CSSProperties,
    dimCard: { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" } as React.CSSProperties,
  };

  return (
    <div ref={containerRef} className="beauty-page scroll-smooth" lang="ar" dir="rtl">

    {/* ══ HEADER ══════════════════════════════════════════════ */}
    <header className="sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: "rgba(255,255,255,0.96)", borderBottom: "1px solid #E6E6EC" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3" style={{ height: "64px" }}>

        <Link href="/" className="flex items-center gap-3 shrink-0 focus:outline-none rounded-lg" aria-label="بيت المصور – الصفحة الرئيسية">
          <Logo variant="master" mode="dark-on-light" height={34} priority className="hidden sm:inline-flex" alt="بيت المصور" />
          <Logo variant="master" mode="dark-on-light" height={28} priority className="inline-flex sm:hidden" alt="بيت المصور" />
        </Link>

        <nav className="hidden xl:flex items-center gap-7 text-sm font-medium" aria-label="Primary" style={S.dark}>
          {[["#what-is-new","الجديد"],["#gallery","المعرض"],["#curriculum","المنهج"],["#bonuses","البونصات"],["#instructor","المدرب"],["#faq","الأسئلة الشائعة"]].map(([href, label]) => (
            <a key={href} href={href} className="py-2 transition-colors hover:opacity-70">{label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a href="#pricing" className="hidden md:inline-flex items-center justify-center text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-all whitespace-nowrap" style={{ ...S.brandBg, minHeight: "44px" }}>
            <span className="hidden lg:inline">احجز مقعدك · 1,260 ريال</span>
            <span className="lg:hidden">1,260 ريال</span>
          </a>
          <button id="bb-menu-btn" aria-label="تبديل قائمة التنقل" aria-expanded="false" className="xl:hidden p-2 focus:outline-none rounded-lg flex items-center justify-center" style={{ minHeight: "44px", minWidth: "44px", ...S.dark }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path id="bb-ico-open" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              <path id="bb-ico-close" className="hidden" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div id="bb-menu" className="hidden xl:hidden px-5 py-4" style={{ backgroundColor: "#fff", borderBottom: "1px solid #E6E6EC" }}>
        {[["#what-is-new","الجديد"],["#gallery","المعرض"],["#curriculum","المنهج"],["#bonuses","البونصات"],["#instructor","المدرب"],["#faq","الأسئلة الشائعة"]].map(([href, label]) => (
          <a key={href} href={href} className="block text-base font-medium py-3" style={{ ...S.dark, borderBottom: "1px solid #E6E6EC" }}>{label}</a>
        ))}
        <div className="pt-4 mt-2">
          <a href="#pricing" className="flex w-full items-center justify-center text-white font-bold text-base py-4 rounded-xl transition-all" style={{ ...S.brandBg, minHeight: "52px" }}>احجز مقعدك · 1,260 ريال</a>
        </div>
      </div>
    </header>

    <main>

      {/* ══ 1. HERO ════════════════════════════════════════════ */}
      <section id="hero" style={{ backgroundColor: "#000", overflow: "hidden" }}>
        <div className="relative w-full" style={{ aspectRatio: "4/5", maxHeight: "92vh" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/landing/beauty/beauty-hero.jpg"
            alt="بورتريه بيوتي احترافي — ورشة بيت المصور"
            className="w-full h-full object-cover object-center"
            loading="eager"
            decoding="async"
            width="800"
            height="1000"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)" }} />

          {/* Top badge */}
          <div className="absolute top-5 inset-x-4 sm:inset-x-6 flex justify-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}>
              <span className="w-2 h-2 rounded-full lp-pulse flex-shrink-0" style={{ backgroundColor: "#E65A2E" }} />
              <span>بيت المصوّر يقدّم · ورشة حضورية في جدة</span>
            </div>
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 md:p-14 max-w-3xl">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest mb-2" style={{ color: "#E65A2E" }}>
              فوتوغرافي · فيديو · ريتاتش · ذكاء اصطناعي
            </p>
            <h1 className="font-black leading-tight mb-4" style={{ color: "#fff", fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              ورشة البيوتي<br />
              <span style={{ color: "#E65A2E" }}>بحلّتها الجديدة</span>
            </h1>
            <p className="text-base sm:text-lg leading-relaxed mb-6 max-w-xl" style={{ color: "rgba(255,255,255,0.8)" }}>
              تجربة تجمع صناعة الصورة والحركة والمعالجة في ورشة واحدة. تعلّم كيف تُبرز تفاصيل البشرة والمكياج وتنتج صورًا وفيديوهات بيوتي برؤية احترافية.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 mb-7">
              {[["3 أيام","24–26 ديسمبر 2026"],["12 ساعة","مدة تدريبية"],["جدة","بيت المصوّر"]].map(([v, l], i) => (
                <React.Fragment key={l}>
                  {i > 0 && <div style={{ borderRight: "1px solid rgba(255,255,255,0.2)", alignSelf: "stretch" }} />}
                  <div>
                    <p className="font-black text-xl sm:text-2xl" style={S.white}>{v}</p>
                    <p className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>{l}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* CTA */}
            <a href="#pricing" className="inline-flex items-center justify-center font-bold text-lg px-8 py-4 rounded-xl transition-all gap-2.5" style={{ ...S.brandBg, minHeight: "56px", boxShadow: "0 8px 30px rgba(230,90,46,0.4)" }}>
              احجز مقعدك الآن
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.4)" }}>مع المدرب أحمد زغلول · بيت المصوّر — جدة</p>
          </div>
        </div>
      </section>

      {/* ══ 2. WHAT IS NEW ══════════════════════════════════════ */}
      <section id="what-is-new" aria-labelledby="new-heading" style={{ ...S.surface, borderTop: "1px solid #E6E6EC", borderBottom: "1px solid #E6E6EC", padding: "64px 0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto reveal" style={{ marginBottom: "48px" }}>
            <span className="text-xs uppercase tracking-widest font-semibold" style={S.brand}>الجديد هذه المرة</span>
            <h2 id="new-heading" className="text-3xl sm:text-4xl font-bold mt-2" style={S.dark}>إيه الجديد في الورشة؟</h2>
            <p className="text-base mt-3 leading-relaxed" style={S.muted}>نسخة محدّثة ومطوّرة تجمع ثلاثة مجالات في ورشة واحدة مكثفة وعملية.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 reveal">
            {WHAT_IS_NEW.map((item, i) => (
              <div key={i} className="p-5 sm:p-6 rounded-2xl flex items-start gap-3.5" style={S.card}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(230,90,46,0.1)", border: "1px solid rgba(230,90,46,0.2)" }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="#E65A2E" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                </span>
                <p className="text-sm sm:text-base leading-relaxed font-medium" style={S.dark}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3. PHOTOGRAPHY SHOWCASE / GALLERY SLIDER ════════════ */}
      <section id="gallery" aria-labelledby="gallery-heading" style={{ backgroundColor: "#fff", padding: "64px 0", borderBottom: "1px solid #E6E6EC" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-10 reveal">
            <div>
              <span className="text-xs uppercase tracking-widest font-semibold" style={S.brand}>نماذج الأعمال</span>
              <h2 id="gallery-heading" className="text-3xl sm:text-4xl font-bold mt-2" style={S.dark}>معرض الأعمال الاحترافية</h2>
              <p className="text-base mt-2 max-w-xl leading-relaxed" style={S.muted}>
                نماذج من صور البيوتي التي ستتعلم تنفيذها وتصويرها ومعالجتها بنفسك خلال أيام الورشة.
              </p>
            </div>

            {/* Arrows */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={scrollPrev}
                aria-label="الصورة السابقة"
                className="w-11 h-11 rounded-full border flex items-center justify-center transition-all shadow-sm active:scale-95"
                style={{ backgroundColor: "#fff", borderColor: "#E6E6EC", color: "#0E0E12" }}
              >
                <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={scrollNext}
                aria-label="الصورة التالية"
                className="w-11 h-11 rounded-full border flex items-center justify-center transition-all shadow-sm active:scale-95"
                style={{ backgroundColor: "#fff", borderColor: "#E6E6EC", color: "#0E0E12" }}
              >
                <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Carousel Viewport */}
          <div className="overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0" ref={emblaRef}>
            <div className="flex -ms-4 sm:-ms-5 touch-pan-y">
              {GALLERY_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  className="basis-[84%] sm:basis-[52%] md:basis-[42%] lg:basis-[31%] shrink-0 ps-4 sm:ps-5 select-none"
                >
                  <div
                    className="gallery-item group relative aspect-[4/5] overflow-hidden rounded-2xl cursor-pointer shadow-md hover:shadow-xl transition-all duration-300"
                    style={{ backgroundColor: "#0A0A0C", border: "1px solid #E6E6EC" }}
                    role="button"
                    tabIndex={0}
                    aria-label={`تكبير الصورة: ${item.title}`}
                    onClick={() => setActiveLightbox(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveLightbox(item);
                      }
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.src}
                      alt={item.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      loading="lazy"
                      decoding="async"
                      width="800"
                      height="1000"
                    />

                    {/* Gradient Overlay for Caption */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 sm:p-5 flex flex-col justify-end pointer-events-none">
                      <span className="text-[11px] font-bold tracking-wider uppercase mb-1" style={{ color: "#E65A2E" }}>
                        {item.tag}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                    </div>

                    {/* Expand icon pill */}
                    <div className="absolute top-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <div className="bg-black/60 backdrop-blur-md rounded-full p-2 text-white shadow-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Indicators & Counter */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="شرائح المعرض">
              {GALLERY_ITEMS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollTo(idx)}
                  aria-label={`الانتقال إلى صورة ${idx + 1}`}
                  aria-selected={selectedIndex === idx}
                  role="tab"
                  className={`h-2 rounded-full transition-all duration-300 ${
                    selectedIndex === idx
                      ? "w-8 bg-[#E65A2E]"
                      : "w-2 bg-neutral-300 hover:bg-neutral-400"
                  }`}
                />
              ))}
            </div>
            <div className="text-xs flex items-center gap-2" style={S.muted}>
              <span>صورة {selectedIndex + 1} من {GALLERY_ITEMS.length}</span>
              <span>·</span>
              <span>اضغط على أي صورة لتكبيرها</span>
            </div>
          </div>

        </div>
      </section>

      {/* ══ LIGHTBOX MODAL ══════════════════════════════════════ */}
      {activeLightbox && (
        <div
          id="lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="تكبير الصورة"
          onClick={() => setActiveLightbox(null)}
        >
          <button
            id="lightbox-close"
            type="button"
            className="absolute top-4 end-4 md:top-6 md:end-6 min-w-11 min-h-11 flex items-center justify-center text-white/70 hover:text-white p-2 text-3xl leading-none transition-colors"
            aria-label="إغلاق العرض"
            onClick={(e) => {
              e.stopPropagation();
              setActiveLightbox(null);
            }}
          >
            &times;
          </button>
          <div
            className="max-w-4xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeLightbox.src}
              alt={activeLightbox.title}
              className="max-h-[78vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
            <div className="mt-4 text-center">
              <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: "#E65A2E" }}>
                {activeLightbox.tag}
              </span>
              <p className="text-white text-base font-semibold mt-1">
                {activeLightbox.title}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══ 4. OUTCOMES ══════════════════════════════════════════ */}
      <section id="outcomes" aria-labelledby="outcomes-heading" style={{ ...S.surface, padding: "64px 0", borderBottom: "1px solid #E6E6EC" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto reveal" style={{ marginBottom: "56px" }}>
            <span className="text-xs uppercase tracking-widest font-semibold" style={S.brand}>ما الذي ستكتسبه</span>
            <h2 id="outcomes-heading" className="text-3xl sm:text-4xl font-bold mt-2" style={S.dark}>هتستفيد بإيه؟</h2>
            <p className="text-base mt-3 leading-relaxed" style={S.muted}>خمس مهارات محورية تنتقل بأعمالك من المستوى المقبول إلى الاحترافي الكامل.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {OUTCOMES.map((item) => (
              <div key={item.num} className="p-6 sm:p-7 rounded-2xl reveal" style={S.card}>
                <span className="block text-xs font-semibold tracking-widest mb-3" style={S.brand}>{item.num}</span>
                <h3 className="text-lg font-bold mb-2" style={S.dark}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={S.muted}>{item.body}</p>
              </div>
            ))}
            {/* Highlight card */}
            <div className="p-6 sm:p-7 rounded-2xl flex flex-col justify-between reveal" style={{ ...S.card, border: "2px solid rgba(230,90,46,0.3)" }}>
              <div>
                <span className="text-xs uppercase tracking-widest font-semibold" style={S.brand}>استوديو حضوري</span>
                <h3 className="text-lg font-bold mt-2 mb-2" style={S.dark}>تصوير مودل حقيقية</h3>
                <p className="text-sm leading-relaxed" style={S.muted}>شاهد وطبّق على مودل أجنبية خلال أول يومين في بيئة استوديو احترافية مجهّزة بالكامل.</p>
              </div>
              <a href="#curriculum" className="mt-5 inline-flex items-center text-sm font-semibold transition-colors gap-1.5" style={{ ...S.brand, minHeight: "44px" }}>
                عرض تفاصيل المنهج
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 5. CURRICULUM ════════════════════════════════════════ */}
      <section id="curriculum" aria-labelledby="curriculum-heading" style={{ backgroundColor: "#fff", padding: "72px 0", borderBottom: "1px solid #E6E6EC" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center reveal" style={{ marginBottom: "56px" }}>
            <span className="text-xs uppercase tracking-widest font-semibold" style={S.brand}>خطة المحتوى التفصيلية — 12 ساعة</span>
            <h2 id="curriculum-heading" className="text-3xl sm:text-4xl font-bold mt-2" style={S.dark}>منهج الورشة</h2>
            <p className="text-base mt-4 leading-relaxed max-w-xl mx-auto" style={S.muted}>كل يوم تدريبي مدته 4 ساعات يجمع بين الشرح النظري والتطبيق العملي المباشر.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {DAYS.map((day) => (
              <details key={day.num} className="group rounded-2xl overflow-hidden reveal" style={{ ...S.card, backgroundColor: "#FAFAFC" }} open={day.isActive}>
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none" style={{ listStyle: "none" }}>
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider flex-shrink-0"
                      style={day.num === "3" ? { backgroundColor: "#E65A2E", color: "#fff" } : { backgroundColor: "#0E0E12", color: "#fff" }}>
                      {day.label}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold" style={S.dark}>{day.title}</h3>
                      <p className="text-xs mt-0.5" style={S.muted}>{day.date} · {day.duration}</p>
                    </div>
                  </div>
                  <svg className="accordion-icon w-5 h-5 flex-shrink-0" fill="none" stroke="#E65A2E" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6" style={{ borderTop: "1px solid #E6E6EC" }}>
                  <div className="mt-4 mb-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider" style={{ color: "#E65A2E", backgroundColor: "rgba(230,90,46,0.08)" }}>{day.subtitle}</span>
                  </div>
                  <ul style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {day.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: "#E65A2E" }} />
                        <span className="text-sm leading-relaxed" style={S.muted}>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6E6EC" }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: "#E65A2E" }} />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed" style={S.dark}>
                      <strong className="font-bold me-1.5" style={S.brand}>النتيجة:</strong>
                      {day.outcome}
                    </p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 6. BONUSES ══════════════════════════════════════════ */}
      <section id="bonuses" aria-labelledby="bonuses-heading" style={{ ...S.surface, padding: "64px 0", borderBottom: "1px solid #E6E6EC" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto reveal" style={{ marginBottom: "48px" }}>
            <span className="text-xs uppercase tracking-widest font-semibold" style={S.brand}>مشمول مع الاشتراك</span>
            <h2 id="bonuses-heading" className="text-3xl sm:text-4xl font-bold mt-2" style={S.dark}>بونصات وتجهيزات مشمولة</h2>
            <p className="text-base mt-3 leading-relaxed" style={S.muted}>كل ما تحتاجه داخل الورشة وبعدها جاهز ومشمول في اشتراكك.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 reveal">
            {BONUSES.map((b, i) => (
              <div key={i} className="rounded-2xl p-6 flex flex-col gap-3" style={S.card}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(230,90,46,0.08)", border: "1px solid rgba(230,90,46,0.15)" }}>
                  <svg className="w-6 h-6" fill="none" stroke="#E65A2E" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-bold text-base" style={S.dark}>{b.title}</h3>
                <p className="text-sm leading-relaxed" style={S.muted}>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 7. AUDIENCE ══════════════════════════════════════════ */}
      <section id="audience" aria-labelledby="audience-heading" style={{ backgroundColor: "#fff", padding: "72px 0", borderBottom: "1px solid #E6E6EC" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center reveal" style={{ marginBottom: "48px" }}>
            <span className="text-xs uppercase tracking-widest font-semibold" style={S.brand}>لمن هذه الورشة</span>
            <h2 id="audience-heading" className="text-3xl sm:text-4xl font-bold mt-2" style={S.dark}>هذه الورشة مصمّمة لك إذا كنت…</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 reveal">
            {AUDIENCE.map((a, i) => (
              <div key={i} className="rounded-2xl p-6" style={S.card}>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="#E65A2E" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <div>
                    <h3 className="font-bold text-base mb-1" style={S.dark}>{a.title}</h3>
                    <p className="text-sm leading-relaxed" style={S.muted}>{a.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 8. INSTRUCTOR ════════════════════════════════════════ */}
      <section id="instructor" aria-labelledby="instructor-heading" style={{ backgroundColor: "#0A0A0C", padding: "72px 0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

            {/* Image */}
            <div className="reveal">
              <div className="relative rounded-2xl overflow-hidden max-w-sm mx-auto lg:max-w-none" style={{ aspectRatio: "4/5", backgroundColor: "#18181E", border: "1px solid rgba(255,255,255,0.08)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/instructors/ahmed-zaghloul.jpg" alt="المدرب أحمد زغلول — مصور تجاري وبورتريه"
                  className="w-full h-full object-cover object-bottom" loading="eager" decoding="async" width="961" height="808" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }} />
                <div className="absolute inset-x-5 bottom-5">
                  <span className="text-xs uppercase tracking-widest font-bold" style={S.brand}>المدرب</span>
                  <h3 className="text-2xl font-bold mt-1" style={S.white}>أحمد زغلول</h3>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>مصور تجاري وبورتريه</p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="reveal" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <span className="text-xs uppercase tracking-widest font-semibold" style={S.brand}>المدرب</span>
                <h2 id="instructor-heading" className="text-3xl sm:text-4xl font-bold mt-2" style={S.white}>أحمد زغلول</h2>
                <a href="https://www.instagram.com/zaghloulphotographer/" target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.04)", color: "#fff" }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#E65A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                  <span dir="ltr">@zaghloulphotographer</span>
                </a>
              </div>

              <p className="text-lg font-semibold leading-relaxed" style={S.white}>أكثر من 10 سنوات خبرة في الفنون البصرية</p>
              <p className="text-base leading-relaxed" style={{ color: "#9CA3AF" }}>يقدّم لك منهجًا يجمع تصوير البيوتي الفوتوغرافي والفيديو والريتاتش، مع شرح وتطبيق عملي خلال أيام الورشة. تعاون خلال مسيرته مع جهات حكومية وشركات محلية وعالمية.</p>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[["5000+","متدرب"],["100+","ورشة ودورة"],["10+","سنوات خبرة"],["100+","مشروع تجاري"]].map(([v, l]) => (
                  <div key={l} className="rounded-xl p-3 text-center sm:text-start" style={S.dimCard}>
                    <span className="block text-xl sm:text-2xl font-black" style={S.white}>{v}</span>
                    <span className="text-xs font-medium" style={{ color: "#9CA3AF" }}>{l}</span>
                  </div>
                ))}
              </div>

              {/* Partners */}
              <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "#9CA3AF" }}>من الجهات التي تشرفنا بالتعاون معها</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center">
                  {[{src:"/images/Sony-01.png",alt:"Sony Logo",extra:"scale-[1.35]"},{src:"/images/nanlite-logo_brandlogos.net_jey7u.png",alt:"Nanlite Logo",extra:""},{src:"/images/Neom.png",alt:"NEOM Logo",extra:"scale-95"},{src:"/images/ubt_logo-26009518.png",alt:"UBT Logo",extra:""}].map((p) => (
                    <div key={p.alt} className="lp-partner-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} alt={p.alt} className={`max-h-7 max-w-[82%] object-contain opacity-80 hover:opacity-100 transition-all ${p.extra}`} style={{ filter: "brightness(0) invert(1)" }} />
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2.5 text-center sm:text-start" style={{ color: "rgba(156,163,175,0.6)" }}>تعاونات سابقة لبيت المصور؛ لا تعني رعاية هذه الورشة.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 9. PRICING ════════════════════════════════════════════ */}
      <section id="pricing" aria-labelledby="pricing-heading" style={{ ...S.surface, borderTop: "1px solid #E6E6EC", borderBottom: "1px solid #E6E6EC", padding: "72px 0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center reveal" style={{ marginBottom: "48px" }}>
            <span className="text-xs uppercase tracking-widest font-semibold" style={S.brand}>الأسعار</span>
            <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold mt-2" style={S.dark}>احجز مقعدك في الورشة</h2>
            <p className="text-base mt-3 max-w-xl mx-auto leading-relaxed" style={S.muted}>ورشة متكاملة مع وصول كامل لجميع أيام التدريب والمعدات والبونصات.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">

            {/* Left: Inclusions + Tiers */}
            <div className="reveal" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Inclusions */}
              <div className="rounded-2xl p-6" style={S.card}>
                <h3 className="font-bold text-base mb-4" style={S.dark}>مشمول في جميع مراحل التسجيل</h3>
                {INCLUSIONS.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm mb-3" style={S.dark}>
                    <CheckIcon />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Tier 1 — Active */}
              <div className="rounded-2xl p-5" style={{ ...S.card, ...S.brandBorder2 }}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide" style={{ backgroundColor: "#E65A2E", color: "#fff" }}>متاح الآن</span>
                  <span className="text-xs" style={S.muted}>المرحلة الأولى</span>
                </div>
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-bold" style={S.dark}>مرحلة جمعة المصورين</h3>
                    <p className="text-xs mt-0.5" style={S.muted}>أول 5 مقاعد · خصم 30% · توفير 540 ريال</p>
                  </div>
                  <div className="text-left">
                    <span className="text-2xl sm:text-3xl font-black" style={S.dark}>1,260 <span className="text-base font-semibold">ريال</span></span>
                    <p className="text-xs line-through" style={S.muted}>بدلًا من 1,800 ريال</p>
                  </div>
                </div>
              </div>

              {/* Tier 2 */}
              <div className="rounded-2xl p-4 opacity-70" style={S.card}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide" style={{ ...S.muted, backgroundColor: "#F3F3F6", border: "1px solid #E6E6EC" }}>قادمة</span>
                      <span className="text-xs" style={S.muted}>المرحلة الثانية</span>
                    </div>
                    <h3 className="text-base font-bold" style={S.dark}>مرحلة الحجز المبكر</h3>
                    <p className="text-xs mt-0.5" style={S.muted}>المشتركون 6–10 · خصم 25% · توفير 450 ريال</p>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold" style={S.muted}>1,350 <span className="text-sm font-semibold">ريال</span></span>
                </div>
              </div>

              {/* Tier 3 */}
              <div className="rounded-2xl p-4 opacity-50" style={S.card}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide" style={{ ...S.muted, backgroundColor: "#F3F3F6", border: "1px solid #E6E6EC" }}>قادمة</span>
                      <span className="text-xs" style={S.muted}>المرحلة الثالثة</span>
                    </div>
                    <h3 className="text-base font-bold" style={S.dark}>السعر الأساسي</h3>
                    <p className="text-xs mt-0.5" style={S.muted}>بعد المشترك العاشر</p>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold" style={S.muted}>1,800 <span className="text-sm font-semibold">ريال</span></span>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3.5 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm font-medium" style={{ backgroundColor: "rgba(230,90,46,0.05)", border: "1px solid rgba(230,90,46,0.2)", ...S.dark }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#E65A2E" }} />
                <span>العرض مخصص لأول 5 مقاعد، ثم يرتفع السعر إلى 1,350 ريال بعد المشترك الخامس.</span>
              </div>
            </div>

            {/* Right: Form */}
            <div className="reveal">
              <div className="rounded-2xl p-6 sm:p-8" style={{ ...S.card, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ marginBottom: "24px" }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs uppercase font-semibold tracking-widest" style={S.brand}>تسجيل فوري</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase" style={{ backgroundColor: "rgba(230,90,46,0.1)", color: "#E65A2E" }}>المرحلة الأولى نشطة</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-2">
                    <span className="text-3xl sm:text-4xl font-black" style={S.dark}>1,260 ريال</span>
                    <span className="text-sm line-through" style={S.muted}>1,800 ريال</span>
                  </div>
                  <p className="text-xs mt-1" style={S.muted}>خصم جمعة المصورين · أول 5 مقاعد فقط</p>
                  <div className="mt-3 p-3 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-medium" style={{ backgroundColor: "rgba(230,90,46,0.05)", border: "1px solid rgba(230,90,46,0.2)", ...S.dark }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#E65A2E" }} />
                    <span>بعد اكتمال أول 5 مقاعد، سيرتفع السعر إلى 1,350 ريال.</span>
                  </div>
                </div>
                <BeautyCheckoutForm checkoutEnabled={BEAUTY_CHECKOUT_ENABLED} />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ 10. FAQ ══════════════════════════════════════════════ */}
      <section id="faq" aria-labelledby="faq-heading" style={{ backgroundColor: "#fff", padding: "72px 0" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center reveal" style={{ marginBottom: "48px" }}>
            <span className="text-xs uppercase tracking-widest font-semibold" style={S.brand}>لديك أسئلة؟</span>
            <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold mt-2" style={S.dark}>الأسئلة الشائعة</h2>
          </div>
          <div className="reveal" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {FAQS.map((faq, i) => (
              <details key={i} className="group rounded-2xl overflow-hidden" style={{ ...S.card, backgroundColor: "#FAFAFC" }} open={i === 0}>
                <summary className="flex items-center justify-between gap-4 px-5 py-5 cursor-pointer" style={{ listStyle: "none" }}>
                  <span className="font-bold text-base" style={S.dark}>{faq.q}</span>
                  <svg className="accordion-icon w-5 h-5 flex-shrink-0" fill="none" stroke="#E65A2E" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5" style={{ borderTop: "1px solid #E6E6EC" }}>
                  <p className="text-sm leading-relaxed mt-4" style={S.muted}>{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 11. FINAL CTA ════════════════════════════════════════ */}
      <section aria-labelledby="final-cta" style={{ ...S.surface, borderTop: "1px solid #E6E6EC", padding: "72px 0" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center reveal">
          <span className="text-xs uppercase tracking-widest font-semibold mb-2 block" style={S.brand}>باب التسجيل مفتوح</span>
          <h2 id="final-cta" className="font-black leading-tight" style={{ ...S.dark, fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>
            ابدأ رحلتك مع البيوتي بحلّته الجديدة
          </h2>
          <p className="text-base md:text-lg max-w-xl mx-auto mt-4 leading-relaxed" style={S.muted}>
            انضم إلى ورشة تجمع الصورة والحركة والمعالجة في 3 أيام مكثفة وعملية.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#pricing" className="inline-flex w-full sm:w-auto items-center justify-center font-bold text-lg px-10 py-4 rounded-xl transition-all gap-2.5" style={{ ...S.brandBg, minHeight: "56px" }}>
              احجز مقعدك · جمعة المصورين 1,260 ريال
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
          </div>
          <p className="text-xs sm:text-sm mt-5" style={S.muted}>ورشة البيوتي الاحترافي · 24–26 ديسمبر 2026 · بيت المصوّر — جدة</p>
        </div>
      </section>

    </main>

    {/* ══ FOOTER ═══════════════════════════════════════════════ */}
    <footer id="footer" style={{ backgroundColor: "#0A0A0C", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "40px 0" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-7" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <a href="#hero" className="flex items-center gap-2" style={{ minHeight: "44px" }}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 lp-pulse" style={{ backgroundColor: "#E65A2E" }} />
              <span className="font-black text-base sm:text-lg tracking-wider uppercase" style={S.white}>ورشة البيوتي الاحترافي</span>
            </a>
            <p className="text-xs mt-1 me-4" style={{ color: "#9CA3AF" }}>ورشة حضورية في جدة · 24–26 ديسمبر 2026 · بيت المصوّر</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm" style={{ color: "#9CA3AF" }} aria-label="Footer">
            {[["#what-is-new","الجديد"],["#gallery","المعرض"],["#curriculum","المنهج"],["#bonuses","البونصات"],["#pricing","الأسعار"],["#faq","الأسئلة الشائعة"]].map(([href,label]) => (
              <a key={href} href={href} className="transition-colors hover:text-white" style={{ minHeight: "44px", display: "flex", alignItems: "center" }}>{label}</a>
            ))}
          </nav>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-center sm:text-start" style={{ color: "#6B7280" }}>
            © <span className="js-year">{new Date().getFullYear()}</span> ورشة البيوتي الاحترافي / بيت المصوّر. جميع الحقوق محفوظة.
          </p>
          <a href="https://wa.me/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold transition-all rounded-full px-4 py-2"
            style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.15)", minHeight: "36px" }}>
            <svg className="w-4 h-4" fill="#E65A2E" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            دعم واتساب
          </a>
        </div>
      </div>
    </footer>

    {/* ══ STICKY MOBILE BAR ════════════════════════════════════ */}
    <div id="bb-sticky" className="fixed bottom-0 inset-x-0 z-40 md:hidden backdrop-blur-md px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.96)", borderTop: "1px solid #E6E6EC", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
      <a href="#pricing" className="flex w-full items-center justify-center font-bold text-base py-3.5 rounded-xl transition-all gap-2" style={{ ...S.brandBg, minHeight: "52px" }}>
        احجز مقعدك الآن · 1,260 ريال
      </a>
    </div>

    {/* ══ ATTRIBUTION ══════════════════════════════════════════ */}
    <div className="fixed bottom-4 start-4 z-30 hidden md:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs" style={{ backgroundColor: "rgba(10,10,12,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(156,163,175,0.6)" }}>
      <span>⚡</span><span>صُنع بواسطة استوديو بيت المصوّر</span>
    </div>

    </div>
  );
}
