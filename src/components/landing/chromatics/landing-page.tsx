"use client";

/**
 * CHROMATICS — Creative Portrait Lighting Masterclass Landing Page
 * صفحة الهبوط المعتمدة: ماستر كلاس إضاءة البورتريه الإبداعية
 * 
 * Reuses approved HTML, CSS, JavaScript, and original images.
 * Pricing tiers: 199 / 249 / 299 SAR
 * Unlisted, Mobile-First, Bilingual AR (RTL) / EN (LTR).
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import useEmblaCarousel from "embla-carousel-react";
import { CHROMATICS_CHECKOUT_ENABLED, CHROMATICS_METADATA_AR, CHROMATICS_METADATA_EN } from "@/data/landing/chromatics";
import { ChromaticsCheckoutForm } from "./checkout-form";
import { AR_ATTR, AR_TEXT } from "@/data/landing/chromatics-i18n";
import "./chromatics.css";

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}


const GALLERY_ITEMS = [
  {
    src: "/images/landing/chromatics/gallery-red-spotlight-beauty.jpg",
    title: "High-Contrast Red Gel Spotlight",
    titleAr: "بقعة ضوء حمراء عالية التباين على الوجه",
    alt: "Beauty portrait with high-contrast red gel spotlight effect on face against high-key backdrop",
    altAr: "بورتريه جمالي مع تأثير إضاءة الجيل الأحمر عالي التباين على الوجه بخلفية بيضاء",
    tagEn: "Studio Lighting",
    tagAr: "إضاءة الاستوديو"
  },
  {
    src: "/images/landing/chromatics/gallery-lighting-setup-diagram.jpg",
    title: "Behind-the-Scenes Flash & Camera Setup Diagram",
    titleAr: "مخطط كواليس توزيع الفلاشات وإعدادات الكاميرا",
    alt: "Behind-the-scenes studio diagram showing flash positions, modifiers, and camera exposure settings",
    altAr: "مخطط كواليس الاستوديو يوضح توزيع الفلاشات والمعدلات وإعدادات التعريض للكاميرا",
    tagEn: "BTS Breakdown",
    tagAr: "كواليس ومخطط"
  },
  {
    src: "/images/landing/chromatics/gallery-editorial-fashion-blue-purple.jpg",
    title: "Creative Gel Harmonies with Deep Blue & Purple",
    titleAr: "تناغم لوني إبداعي بين الأزرق الداكن والبنفسجي",
    alt: "Editorial fashion portrait with harmonious blue and purple color gel scheme",
    altAr: "بورتريه أزياء تحريري بإضاءة جيلات متناسقة بالأزرق والأرجواني",
    tagEn: "Editorial Fashion",
    tagAr: "أزياء تحريرية"
  },
  {
    src: "/images/landing/chromatics/gallery-creative-shadow-separation.jpg",
    title: "Multi-Color Shadow Separation on White Backdrop",
    titleAr: "فصل الظلال ثلاثية الألوان على الخلفية",
    alt: "Full portrait showing primary color shadow separation on backdrop",
    altAr: "بورتريه يوضح فصل الظلال الملونة بالأصفر والأزرق السماوي والوردي على الخلفية",
    tagEn: "Creative Shadows",
    tagAr: "ظلال إبداعية"
  }
];

export function ChromaticsLanding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentLang, setCurrentLang] = useState<"ar" | "en">("ar");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsVideoPlaying(true);
    }
  };
  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: currentLang === "ar" ? "rtl" : "ltr",
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

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit({
        direction: currentLang === "ar" ? "rtl" : "ltr",
        align: "start",
        loop: true,
      });
    }
  }, [currentLang, emblaApi]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Dynamic Year
    const yearEl = root.querySelector("#year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // 1. Intersection Observer for Reveal Animation
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("active");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
      );
      root.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    } else {
      root.querySelectorAll(".reveal").forEach((el) => el.classList.add("active"));
    }

    // 2. Mobile Menu Toggle
    const menuBtn = root.querySelector("#mobile-menu-btn");
    const mobileMenu = root.querySelector("#mobile-menu");
    const iconOpen = root.querySelector("#menu-icon-open");
    const iconClose = root.querySelector("#menu-icon-close");

    if (menuBtn && mobileMenu) {
      const toggleMenu = () => {
        const expanded = menuBtn.getAttribute("aria-expanded") === "true";
        menuBtn.setAttribute("aria-expanded", !expanded ? "true" : "false");
        mobileMenu.classList.toggle("hidden");
        iconOpen?.classList.toggle("hidden");
        iconClose?.classList.toggle("hidden");
      };

      menuBtn.addEventListener("click", toggleMenu);
      mobileMenu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          mobileMenu.classList.add("hidden");
          iconOpen?.classList.remove("hidden");
          iconClose?.classList.add("hidden");
          menuBtn.setAttribute("aria-expanded", "false");
        });
      });
    }

    // 3. Accessible Gallery Lightbox
    const lightbox = root.querySelector("#lightbox") as HTMLElement | null;
    const lightboxImg = root.querySelector("#lightbox-img") as HTMLImageElement | null;
    const lightboxCaption = root.querySelector("#lightbox-caption") as HTMLElement | null;
    const lightboxClose = root.querySelector("#lightbox-close") as HTMLElement | null;

    function openLightbox(src: string | null, title: string | null) {
      if (!lightbox || !lightboxImg) return;
      lightboxImg.src = src || "";
      if (lightboxCaption) lightboxCaption.textContent = title || "";
      lightbox.classList.remove("hidden");
      lightbox.classList.add("flex");
      document.body.style.overflow = "hidden";
      lightboxClose?.focus();
    }

    function closeLightbox() {
      if (!lightbox) return;
      lightbox.classList.add("hidden");
      lightbox.classList.remove("flex");
      document.body.style.overflow = "";
    }

    root.querySelectorAll(".gallery-item").forEach((item) => {
      item.addEventListener("click", () => {
        openLightbox(item.getAttribute("data-src"), item.getAttribute("data-title"));
      });
      item.addEventListener("keydown", (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
          keyEvent.preventDefault();
          openLightbox(item.getAttribute("data-src"), item.getAttribute("data-title"));
        }
      });
    });

    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightbox) {
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) closeLightbox();
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightbox && !lightbox.classList.contains("hidden")) {
        closeLightbox();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // 4. Hide mobile CTA bar when pricing is in view
    const pricingSection = root.querySelector("#pricing");
    const mobileCTABar = root.querySelector("#mobile-cta-bar") as HTMLElement | null;
    if (pricingSection && mobileCTABar && "IntersectionObserver" in window) {
      const pricingObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            mobileCTABar.style.transform = entry.isIntersecting ? "translateY(100%)" : "";
          });
        },
        { threshold: 0.1 }
      );
      pricingObserver.observe(pricingSection);
    }

    // 5. Bilingual i18n DOM Engine
    const textOriginals = new Map<Node, string>();
    const textNodes: Node[] = [];
    const attrOriginals = new Map<Element, Record<string, string>>();
    const ATTRS = ["alt", "placeholder", "aria-label", "data-title", "title"];

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA" || parent.closest("[data-no-translate]")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    while (walker.nextNode()) {
      const node = walker.currentNode;
      textOriginals.set(node, node.nodeValue || "");
      textNodes.push(node);
    }

    root.querySelectorAll("[alt],[placeholder],[aria-label],[data-title],[title]").forEach((el) => {
      const store: Record<string, string> = {};
      ATTRS.forEach((name) => {
        if (el.hasAttribute(name)) store[name] = el.getAttribute(name) || "";
      });
      attrOriginals.set(el, store);
    });

    function applyText(lang: "ar" | "en") {
      textNodes.forEach((node) => {
        const original = textOriginals.get(node) || "";
        if (lang === "en") {
          node.nodeValue = original;
          return;
        }
        const match = original.match(/^(\s*)([\s\S]*?)(\s*)$/);
        if (!match) return;
        const key = norm(original);
        const translated = AR_TEXT[key] || AR_TEXT[key.replace(/·/g, "•")] || AR_TEXT[key.replace(/•/g, "·")];
        if (translated) node.nodeValue = match[1] + translated + match[3];
      });
    }

    function applyAttributes(lang: "ar" | "en") {
      attrOriginals.forEach((store, el) => {
        Object.keys(store).forEach((name) => {
          const original = store[name];
          el.setAttribute(name, lang === "en" ? original : AR_ATTR[norm(original)] || original);
        });
      });
    }

    function applyMeta(lang: "ar" | "en") {
      const isAr = lang === "ar";
      document.title = isAr ? CHROMATICS_METADATA_AR.title : CHROMATICS_METADATA_EN.title;
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) {
        descMeta.setAttribute("content", isAr ? CHROMATICS_METADATA_AR.description : CHROMATICS_METADATA_EN.description);
      }
    }

    function updateButtons(lang: "ar" | "en") {
      root?.querySelectorAll("[data-lang-btn]").forEach((btn) => {
        const active = btn.getAttribute("data-lang-btn") === lang;
        btn.setAttribute("aria-pressed", active ? "true" : "false");
        btn.classList.toggle("is-active", active);
      });
    }

    function applyLanguage(lang: "ar" | "en") {
      setCurrentLang(lang);
      root?.setAttribute("lang", lang);
      root?.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      applyText(lang);
      applyAttributes(lang);
      applyMeta(lang);
      updateButtons(lang);
      root?.querySelectorAll("[data-lp-msg]").forEach((m) => {
        m.textContent = "";
      });
      try {
        localStorage.setItem("chromatics-lang", lang);
      } catch {}
    }

    let initialLang: "ar" | "en" = "ar";
    try {
      const stored = localStorage.getItem("chromatics-lang");
      if (stored === "en" || stored === "ar") initialLang = stored;
    } catch {}
    try {
      const requested = new URLSearchParams(window.location.search).get("lang");
      if (requested === "en" || requested === "ar") initialLang = requested;
    } catch {}

    applyLanguage(initialLang);

    const langBtnListeners: Array<{ btn: Element; handler: () => void }> = [];
    root.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      const targetLang = btn.getAttribute("data-lang-btn") as "ar" | "en";
      const handler = () => applyLanguage(targetLang);
      btn.addEventListener("click", handler);
      langBtnListeners.push({ btn, handler });
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      langBtnListeners.forEach(({ btn, handler }) => btn.removeEventListener("click", handler));
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="chromatics-page scroll-smooth"
      lang={currentLang}
      dir={currentLang === "ar" ? "rtl" : "ltr"}
    >
      

  {/*  ═══════════════════════════════════════════════════
       HEADER — Minimal sticky navigation
  ════════════════════════════════════════════════════════  */}
  <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-3">

      {/*  Logo  */}
      <Link
        href="/"
        className="flex items-center gap-3 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand rounded-lg"
        aria-label="بيت المصور – الصفحة الرئيسية"
      >
        <Logo
          variant="master"
          mode="light-on-dark"
          height={34}
          priority
          className="hidden sm:inline-flex"
          alt="بيت المصور"
        />
        <Logo
          variant="master"
          mode="light-on-dark"
          height={28}
          priority
          className="inline-flex sm:hidden"
          alt="بيت المصور"
        />
      </Link>

      {/*  Desktop Nav  */}
      <nav className="hidden xl:flex items-center gap-7 text-sm font-medium" aria-label="Primary">
        <a href="#outcomes" className="py-2 hover:text-brand transition-colors">Outcomes</a>
        <a href="#gallery" className="py-2 hover:text-brand transition-colors">Gallery</a>
        <a href="#curriculum" className="py-2 hover:text-brand transition-colors">Curriculum</a>
        <a href="#instructor" className="py-2 hover:text-brand transition-colors">Instructor</a>
        <a href="#faq" className="py-2 hover:text-brand transition-colors">FAQ</a>
      </nav>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/*  Language Switch  */}
        <div className="lang-switch" role="group" aria-label="Language / اللغة">
          <button type="button" className="lang-btn" data-lang-btn="ar" aria-pressed="true" title="العربية">ع</button>
          <button type="button" className="lang-btn" data-lang-btn="en" aria-pressed="false" title="English">EN</button>
        </div>

        {/*  Desktop CTA  */}
        <a href="#pricing" className="hidden md:inline-flex items-center justify-center bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-all min-h-[44px] whitespace-nowrap">
          <span className="hidden lg:inline">Reserve Seat · 199 SAR</span>
          <span className="lg:hidden">199 SAR</span>
        </a>

        {/*  Mobile Menu Button  */}
        <button id="mobile-menu-btn" aria-label="Toggle Navigation Menu" aria-expanded="false" className="xl:hidden p-2 text-dark hover:text-brand focus:outline-none rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path id="menu-icon-open" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
            <path id="menu-icon-close" className="hidden" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    {/*  Mobile Drawer  */}
    <div id="mobile-menu" className="hidden xl:hidden bg-white border-b border-border px-5 py-4">
      <a href="#outcomes" className="block text-base font-medium text-dark hover:text-brand py-3 border-b border-border/50">Outcomes</a>
      <a href="#gallery" className="block text-base font-medium text-dark hover:text-brand py-3 border-b border-border/50">Gallery</a>
      <a href="#curriculum" className="block text-base font-medium text-dark hover:text-brand py-3 border-b border-border/50">Curriculum</a>
      <a href="#instructor" className="block text-base font-medium text-dark hover:text-brand py-3 border-b border-border/50">Instructor</a>
      <a href="#faq" className="block text-base font-medium text-dark hover:text-brand py-3">FAQ</a>
      <div className="pt-4 mt-2">
        <a href="#pricing" className="flex w-full items-center justify-center bg-brand hover:bg-brand-dark text-white font-bold text-base py-4 rounded-xl transition-all min-h-[52px]">
          Reserve Seat · 199 SAR
        </a>
      </div>
    </div>
  </header>

  <main>

    {/*  ═══════════════════════════════════════════════════
         1. HERO — Arabic headline, image, CTA above fold
    ════════════════════════════════════════════════════════  */}
    <section id="hero" className="bg-white pt-8 pb-14 sm:pt-12 sm:pb-20 md:pt-16 md:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/*  Top Intro: Eyebrow, Subtitle, and Headline (Centered)  */}
        <div className="text-center max-w-4xl mx-auto space-y-4 sm:space-y-5 reveal">
          {/*  Eyebrow & Subtitle  */}
          <div className="inline-flex flex-col items-center text-center gap-1.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse-slow flex-shrink-0"></span>
              <span className="text-dark">3-Day LIVE Online Portrait Masterclass</span>
            </div>
            <p
              data-no-translate
              className="font-display font-medium text-xs sm:text-sm tracking-wider uppercase text-muted text-center"
            >
              Creative Lighting with Color Gels
            </p>
          </div>

          {/*  Headline: light weight, inline separated by dash  */}
          <h1 className="hero-headline font-display font-light text-dark leading-relaxed text-[13px] min-[360px]:text-[14px] min-[390px]:text-[15.5px] sm:text-xl md:text-2xl lg:text-[2.15rem] tracking-tight text-center">
            <span className="inline-flex items-center whitespace-nowrap">
              <span>Control Light</span>
              <span className="text-muted/40 mx-1.5 sm:mx-3 select-none" aria-hidden="true">-</span>
            </span>
            <span className="inline-flex items-center whitespace-nowrap">
              <span>Understand Color</span>
              <span className="text-muted/40 mx-1.5 sm:mx-3 select-none" aria-hidden="true">-</span>
            </span>
            <span className="inline-block whitespace-nowrap text-brand">Craft Distinct Portraits</span>
          </h1>
        </div>

        {/*  Hero Video Player in its own dedicated container  */}
        <div className="reveal my-8 sm:my-10 max-w-4xl mx-auto">
          <div className="relative aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0A0A0C] border border-border shadow-2xl group">
            <video
              ref={videoRef}
              src="/videos/chromatics-hero-video/chromatics-hero-video.mp4"
              poster="/videos/chromatics-hero-video/poster.jpg"
              preload="none"
              playsInline
              controls={isVideoPlaying}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              onEnded={() => setIsVideoPlaying(false)}
              className="w-full h-full object-cover"
            >
              <source src="/videos/chromatics-hero-video/chromatics-hero-video.mp4" type="video/mp4" />
              Your browser does not support HTML5 video.
            </video>

            {/* Play Button & Gradient Overlay when paused */}
            {!isVideoPlaying && (
              <div
                onClick={handlePlayVideo}
                className="absolute inset-0 bg-black/35 hover:bg-black/25 transition-colors flex items-center justify-center cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label="Play Masterclass Video"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handlePlayVideo();
                  }
                }}
              >
                {/* Glowing & animated circular Play button */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute -inset-4 rounded-full bg-brand/25 video-play-pulse-ring-1 pointer-events-none"></div>
                  <div className="absolute -inset-8 rounded-full bg-brand/15 video-play-pulse-ring-2 pointer-events-none"></div>
                  <div className="video-play-btn-animate w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-brand text-white flex items-center justify-center shadow-2xl shadow-brand/60 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 fill-current translate-x-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Bottom overlay badge */}
                <div className="absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 pointer-events-none">
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 flex items-center gap-2.5 border border-border/50 shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand flex-shrink-0 animate-pulse-slow"></span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-dark uppercase tracking-wider truncate">3-Day LIVE Online Portrait Masterclass</p>
                      <p className="text-[11px] text-muted mt-0.5">By Bayt Al Mosawer · Ahmed Zaghloul</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/*  Hero Bottom Content: Subheadline, Stats, and Pricing CTA  */}
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-7 text-center reveal">
          {/*  Subheadline  */}
          <p className="text-base sm:text-lg md:text-xl text-muted leading-relaxed max-w-2xl mx-auto">
            In 3 live intensive days, master creative portrait lighting using Color Gels and RGB setups. From single light sources up to complex 4-light compositions with real-time model practice.
          </p>

          {/*  Key Benefits / Stats  */}
          <div className="grid grid-cols-3 gap-2 sm:gap-6 py-4 sm:py-5 border-y border-border text-center max-w-2xl mx-auto">
            <div>
              <p className="text-xl sm:text-3xl font-display font-black text-dark">3 Days</p>
              <p className="text-xs sm:text-sm text-muted mt-0.5 font-medium uppercase tracking-wider">Live Workshops</p>
            </div>
            <div>
              <p className="text-xl sm:text-3xl font-display font-black text-dark">9 Hours</p>
              <p className="text-xs sm:text-sm text-muted mt-0.5 font-medium uppercase tracking-wider">Total Duration</p>
            </div>
            <div>
              <p className="text-xl sm:text-3xl font-display font-black text-dark">Live Model</p>
              <p className="text-xs sm:text-sm text-muted mt-0.5 font-medium uppercase tracking-wider">Studio Demos</p>
            </div>
          </div>

          {/*  Price + Primary Orange CTA  */}
          <div className="space-y-3.5 pt-1 flex flex-col items-center">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="text-3xl sm:text-4xl font-display font-black text-dark">199 <span className="text-lg font-bold">SAR</span></span>
              <span className="text-xs font-bold bg-brand/10 text-brand-ink px-3 py-1.5 rounded-full uppercase tracking-wide border border-brand/20">VAT Included</span>
            </div>

            <a href="#pricing" className="flex w-full sm:w-auto sm:inline-flex items-center justify-center bg-brand hover:bg-brand-dark text-white font-bold text-lg px-8 py-4 rounded-xl transition-all min-h-[56px] gap-2.5 shadow-sm">
              Reserve Your Seat Now
              <svg className="w-5 h-5 flex-shrink-0" data-dir-flip fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </a>

            <p className="text-xs sm:text-sm text-muted flex items-center justify-center gap-1.5 pt-1">
              <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              Full recording included. Lifetime access.
            </p>
          </div>
        </div>

      </div>
    </section>

    {/*  ═══════════════════════════════════════════════════
         2. LEARNING OUTCOMES — 4 clean benefits
    ════════════════════════════════════════════════════════  */}
    <section id="outcomes" className="py-14 sm:py-20 md:py-24 bg-surface border-y border-border" aria-labelledby="outcomes-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-16 reveal">
          <span className="text-xs uppercase tracking-widest text-brand font-semibold">What You Will Master</span>
          <h2 id="outcomes-heading" className="text-3xl sm:text-4xl font-display font-bold text-dark mt-2">Transformative Competencies</h2>
          <p className="text-muted text-base mt-3 leading-relaxed">
            Five core technical skills to elevate your portrait studio work from standard commercial lighting to compelling editorial visual art.
          </p>
        </div>

        {/*  1 card per row on mobile, 2 on tablet, 3 on desktop  */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">

          {/*  Skill 1  */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-border reveal">
            <span className="block text-xs font-semibold tracking-widest text-brand mb-3">01</span>
            <h3 className="text-lg font-bold text-dark mb-2">Control Light Quality &amp; Direction</h3>
            <p className="text-muted text-sm leading-relaxed">
              Understand the difference between hard and soft light, the effect of distance on light falloff, and how to use the right modifiers to control your results.
            </p>
          </div>

          {/*  Skill 2  */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-border reveal">
            <span className="block text-xs font-semibold tracking-widest text-brand mb-3">02</span>
            <h3 className="text-lg font-bold text-dark mb-2">Master Color Theory &amp; Gels</h3>
            <p className="text-muted text-sm leading-relaxed">
              Combine complementary color gel pairs and use in-camera White Balance to shift hues dramatically.
            </p>
          </div>

          {/*  Skill 3  */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-border reveal">
            <span className="block text-xs font-semibold tracking-widest text-brand mb-3">03</span>
            <h3 className="text-lg font-bold text-dark mb-2">Eliminate Unwanted Color Spill</h3>
            <p className="text-muted text-sm leading-relaxed">
              Isolate key lights from colored backgrounds. Keep skin tones clean while populating shadows with color.
            </p>
          </div>

          {/*  Skill 4  */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-border reveal">
            <span className="block text-xs font-semibold tracking-widest text-brand mb-3">04</span>
            <h3 className="text-lg font-bold text-dark mb-2">Build 1 to 4-Light Setups</h3>
            <p className="text-muted text-sm leading-relaxed">
              Structured methodology starting with a single strobe and progressing to multi-light schemes.
            </p>
          </div>

          {/*  Skill 5  */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-border reveal">
            <span className="block text-xs font-semibold tracking-widest text-brand mb-3">05</span>
            <h3 className="text-lg font-bold text-dark mb-2">Recreate Any Reference Portrait</h3>
            <p className="text-muted text-sm leading-relaxed">
              Reverse-engineer catchlights, shadow gradients, and modifier positions from any reference photo.
            </p>
          </div>

          {/*  Highlight Card  */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-brand/30 flex flex-col justify-between reveal">
            <div>
              <span className="text-xs uppercase tracking-widest text-brand font-semibold">Live Interactive Studio</span>
              <h3 className="text-lg font-bold text-dark mt-2 mb-2">Real-Time Model Demonstration</h3>
              <p className="text-muted text-sm leading-relaxed">
                Watch light shifts live on a studio model during Day 3, with camera settings displayed in real time.
              </p>
            </div>
            <a href="#curriculum" className="mt-5 inline-flex items-center text-sm font-semibold text-brand hover:text-brand-dark transition-colors gap-1.5 min-h-[44px]">
              View Curriculum Details
              <svg className="w-4 h-4" data-dir-flip fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </a>
          </div>

        </div>
      </div>
    </section>

    {/*  ═══════════════════════════════════════════════════
         3. PHOTOGRAPHY SHOWCASE — Editorial gallery
    ════════════════════════════════════════════════════════  */}
    <section id="gallery" className="py-14 sm:py-20 md:py-24 bg-white" aria-labelledby="gallery-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Gallery Slider Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-10 reveal">
          <div>
            <span className="text-xs uppercase tracking-widest text-brand font-semibold">Work Samples</span>
            <h2 id="gallery-heading" className="text-3xl sm:text-4xl font-display font-bold text-dark mt-2">Photography Showcase</h2>
            <p className="text-muted text-base mt-2 max-w-xl leading-relaxed">
              Real portraits created using the gel and RGB techniques taught in this masterclass.
            </p>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Previous Slide"
              className="w-11 h-11 rounded-full border border-border bg-white hover:bg-brand hover:text-white hover:border-brand text-dark flex items-center justify-center transition-all shadow-sm active:scale-95"
            >
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Next Slide"
              className="w-11 h-11 rounded-full border border-border bg-white hover:bg-brand hover:text-white hover:border-brand text-dark flex items-center justify-center transition-all shadow-sm active:scale-95"
            >
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Embla Carousel Viewport */}
        <div className="overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0" ref={emblaRef}>
          <div className="flex -ms-4 sm:-ms-5 touch-pan-y">
            {GALLERY_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="basis-[84%] sm:basis-[52%] md:basis-[42%] lg:basis-[31%] shrink-0 ps-4 sm:ps-5 select-none"
              >
                <div
                  className="gallery-item group relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-[#0A0A0C] cursor-pointer shadow-md hover:shadow-xl transition-all duration-300"
                  data-src={item.src}
                  data-title={item.title}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open lightbox: ${item.title}`}
                  onClick={() => {
                    const root = containerRef.current;
                    const lightbox = root?.querySelector("#lightbox") as HTMLElement | null;
                    const lightboxImg = root?.querySelector("#lightbox-img") as HTMLImageElement | null;
                    const lightboxCaption = root?.querySelector("#lightbox-caption") as HTMLElement | null;
                    const lightboxClose = root?.querySelector("#lightbox-close") as HTMLElement | null;
                    if (!lightbox || !lightboxImg) return;
                    lightboxImg.src = item.src;
                    lightboxImg.alt = currentLang === "ar" ? item.altAr : item.alt;
                    if (lightboxCaption) lightboxCaption.textContent = currentLang === "ar" ? item.titleAr : item.title;
                    lightbox.classList.remove("hidden");
                    lightbox.classList.add("flex");
                    document.body.style.overflow = "hidden";
                    lightboxClose?.focus();
                  }}
                >
                  <img
                    src={item.src}
                    data-fallback={item.src}
                    alt={currentLang === "ar" ? item.altAr : item.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                    decoding="async"
                    width="1440"
                    height="1800"
                  />
                  {/* Subtle dark gradient overlay on bottom for caption readability */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 sm:p-5 flex flex-col justify-end pointer-events-none">
                    <span className="text-[11px] font-bold text-brand tracking-wider uppercase mb-1">
                      {currentLang === "ar" ? item.tagAr : item.tagEn}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2">
                      {currentLang === "ar" ? item.titleAr : item.title}
                    </h3>
                  </div>

                  {/* Expand icon pill in corner on hover */}
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

        {/* Carousel Pagination Dots & Counter */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Gallery slides">
            {GALLERY_ITEMS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                aria-selected={selectedIndex === idx}
                role="tab"
                className={`h-2 rounded-full transition-all duration-300 ${
                  selectedIndex === idx
                    ? "w-8 bg-brand"
                    : "w-2 bg-neutral-300 hover:bg-neutral-400"
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-muted flex items-center gap-2">
            <span>{currentLang === "ar" ? `صورة ${selectedIndex + 1} من ${GALLERY_ITEMS.length}` : `Slide ${selectedIndex + 1} of ${GALLERY_ITEMS.length}`}</span>
            <span>·</span>
            <span>{currentLang === "ar" ? "اضغط على أي صورة لتكبيرها" : "Click any photo to enlarge"}</span>
          </div>
        </div>

      </div>
    </section>

    {/*  LIGHTBOX MODAL  */}
    <div id="lightbox" className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm hidden items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Image lightbox">
      <button id="lightbox-close" className="absolute top-4 end-4 md:top-6 md:end-6 min-w-11 min-h-11 flex items-center justify-center text-white/70 hover:text-white p-2 text-2xl leading-none" aria-label="Close Lightbox">&times;</button>
      <div className="max-w-4xl w-full flex flex-col items-center">
        <img data-fallback="/images/landing/chromatics/cl-045-1n.JPG.jpeg" decoding="async" loading="eager" id="lightbox-img" src="" alt="Full screen portrait preview" className="max-h-[75vh] w-auto rounded-xl object-contain shadow-2xl" />
        <p id="lightbox-caption" className="text-white text-sm font-medium mt-4 text-center opacity-70"></p>
      </div>
    </div>

    {/*  ═══════════════════════════════════════════════════
         4. COURSE CURRICULUM — 3 accordion days
    ════════════════════════════════════════════════════════  */}
    <section id="curriculum" className="py-16 md:py-24 bg-surface border-y border-border" aria-labelledby="curriculum-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-12 md:mb-16 reveal">
          <span className="text-xs uppercase tracking-widest text-brand font-semibold">Detailed Curriculum · 9 Hours</span>
          <h2 id="curriculum-heading" className="text-3xl sm:text-4xl font-display font-bold text-dark mt-2">Comprehensive Masterclass Curriculum</h2>
          <p className="text-muted text-base mt-4 leading-relaxed max-w-xl mx-auto">
            Each 180-minute live session combines core technical theory, live camera demonstrations, and interactive Q&amp;A.
          </p>
        </div>

        <div className="space-y-4">

          {/*  Day 1  */}
          <details className="group bg-white rounded-2xl border border-border overflow-hidden reveal" open>
            <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none [-webkit-list-style:none] [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-4 min-w-0">
                <span className="px-3 py-1.5 bg-dark text-white text-xs font-bold rounded-lg uppercase tracking-wider flex-shrink-0">Day 1</span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-dark">Master the Light</h3>
                  <p className="text-xs text-muted mt-0.5">Duration: 180 Minutes · Live Session</p>
                </div>
              </div>
              <svg className="accordion-icon w-5 h-5 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-6 pb-6 border-t border-border">
              <div className="mt-4 mb-3">
                <span className="text-xs font-semibold text-brand-ink bg-brand/10 px-3 py-1 rounded-full uppercase tracking-wider">Light Control &amp; Color Fundamentals</span>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">20 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Introduction: Standard vs. Creative Lighting &amp; Portrait Reference Analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">35 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Hard vs. Soft Light: Source Size, Distance, Falloff &amp; Light Direction</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">30 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Color Theory: Color Wheel, Harmonies &amp; Contrast Dynamics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">25 Min</span>
                  <span className="text-sm text-muted leading-relaxed">White Balance, Exposure, Saturation &amp; Gel Impact on Light Intensity</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">55 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Live Hands-on: 3 Distinct Looks with 1 Light Source, Angles &amp; Gel Shifts</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">15 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Q&amp;A &amp; Day 1 Practical Assignment</span>
                </li>
              </ul>
              <div className="mt-5 p-4 rounded-xl bg-surface border border-border flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5"></span>
                <p className="text-xs sm:text-sm text-dark font-medium leading-relaxed">
                  <strong className="text-brand font-bold me-1.5">Outcome:</strong>
                  <span>Understand why colors behave this way and master light control before adding multiple sources.</span>
                </p>
              </div>
            </div>
          </details>

          {/*  Day 2  */}
          <details className="group bg-white rounded-2xl border border-border overflow-hidden reveal">
            <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none [-webkit-list-style:none] [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-4 min-w-0">
                <span className="px-3 py-1.5 bg-dark text-white text-xs font-bold rounded-lg uppercase tracking-wider flex-shrink-0">Day 2</span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-dark">Shape the Color</h3>
                  <p className="text-xs text-muted mt-0.5">Duration: 180 Minutes · Live Session</p>
                </div>
              </div>
              <svg className="accordion-icon w-5 h-5 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-6 pb-6 border-t border-border">
              <div className="mt-4 mb-3">
                <span className="text-xs font-semibold text-brand-ink bg-brand/10 px-3 py-1 rounded-full uppercase tracking-wider">Multi-Light Setups &amp; Color Control</span>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">20 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Quick Review &amp; Student Assignment Critique</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">35 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Key, Fill, Rim &amp; Background Lights: Role &amp; Placement of Each Source</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">35 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Color Spill Control, Background Management, Flags, Grids &amp; Color Separation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">25 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Practical Differences: Color Gels vs. RGB Lights &amp; Seamless Blending</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">50 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Live Hands-on: 3 Creative Setups Using 2 and 3 Light Sources</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">15 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Q&amp;A &amp; Day 2 Practical Assignment</span>
                </li>
              </ul>
              <div className="mt-5 p-4 rounded-xl bg-surface border border-border flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5"></span>
                <p className="text-xs sm:text-sm text-dark font-medium leading-relaxed">
                  <strong className="text-brand font-bold me-1.5">Outcome:</strong>
                  <span>Confidently place each light and choose gel hues while eliminating unwanted color bleeding.</span>
                </p>
              </div>
            </div>
          </details>

          {/*  Day 3  */}
          <details className="group bg-white rounded-2xl border border-border overflow-hidden reveal">
            <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none [-webkit-list-style:none] [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-4 min-w-0">
                <span className="px-3 py-1.5 bg-brand text-white text-xs font-bold rounded-lg uppercase tracking-wider flex-shrink-0">Day 3</span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-dark">Create the Portrait</h3>
                  <p className="text-xs text-muted mt-0.5">Duration: 180 Minutes · Live Session</p>
                </div>
              </div>
              <svg className="accordion-icon w-5 h-5 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-6 pb-6 border-t border-border">
              <div className="mt-4 mb-3">
                <span className="text-xs font-semibold text-brand-ink bg-brand/10 px-3 py-1 rounded-full uppercase tracking-wider">Advanced Creative Lighting &amp; Final Shoot</span>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">20 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Reference Portrait Analysis &amp; Constructing an Actionable Lighting Plan</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">35 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Optical Snoot, Fresnel, Stripbox &amp; Managing Softboxes in Gel Lighting</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">30 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Camera Settings, Skin Tone Preservation &amp; Blending Hard with Soft Light</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">60 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Live Model Shoot: 4-Light Setup Shifting Looks from Beauty to Cinematic</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">20 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Image Selection &amp; Color Grading Workflow in Lightroom</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand/10 text-brand-ink border border-brand/20 shrink-0 mt-0.5">15 Min</span>
                  <span className="text-sm text-muted leading-relaxed">Final Q&amp;A, Comprehensive Review &amp; Post-Course Practice Roadmap</span>
                </li>
              </ul>
              <div className="mt-5 p-4 rounded-xl bg-surface border border-border flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5"></span>
                <p className="text-xs sm:text-sm text-dark font-medium leading-relaxed">
                  <strong className="text-brand font-bold me-1.5">Outcome:</strong>
                  <span>Reverse-engineer any reference portrait and construct a similar lighting setup with your available gear.</span>
                </p>
              </div>
            </div>
          </details>

        </div>
      </div>
    </section>

    {/*  ═══════════════════════════════════════════════════
         6. TARGET AUDIENCE
    ════════════════════════════════════════════════════════  */}
    <section id="audience" className="py-16 md:py-24 bg-surface border-y border-border" aria-labelledby="audience-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-12 reveal">
          <span className="text-xs uppercase tracking-widest text-brand font-semibold">Who Is This For</span>
          <h2 id="audience-heading" className="text-3xl sm:text-4xl font-display font-bold text-dark mt-2">This Masterclass Is Right for You If…</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 reveal">

          <div className="bg-white rounded-2xl border border-border p-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              <div>
                <h3 className="font-bold text-dark text-base mb-1">Portrait Photographer</h3>
                <p className="text-sm text-muted leading-relaxed">You shoot portraits commercially or creatively and want to add color gel mastery to your studio capabilities.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              <div>
                <h3 className="font-bold text-dark text-base mb-1">Studio Owner</h3>
                <p className="text-sm text-muted leading-relaxed">You run a photography studio and want to offer distinctive creative lighting as a premium service to clients.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              <div>
                <h3 className="font-bold text-dark text-base mb-1">Visual Artist / Creative Director</h3>
                <p className="text-sm text-muted leading-relaxed">You work with photography as part of visual storytelling and want to understand and direct studio lighting with intention.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
              <div>
                <h3 className="font-bold text-dark text-base mb-1">Enthusiast Ready to Invest</h3>
                <p className="text-sm text-muted leading-relaxed">You have basic photography knowledge and are serious about developing advanced studio skills through structured, live instruction.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    {/*  ═══════════════════════════════════════════════════
         7. INSTRUCTOR — Bayt Al Mosawer
    ════════════════════════════════════════════════════════  */}
    <section id="instructor" className="py-14 sm:py-20 md:py-24 bg-white" aria-labelledby="instructor-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

          {/*  Instructor Image  */}
          <div className="reveal">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-surface border border-border shadow-md max-w-sm mx-auto lg:max-w-none">
              <img src="/images/instructors/ahmed-zaghloul.jpg"
                data-fallback="/images/instructors/ahmed-zaghloul.jpg"
                alt="Instructor Ahmed Zaghloul teaching a photography masterclass in studio"
                className="w-full h-full object-cover object-bottom"
                loading="eager"
                decoding="async"
                width="961"
                height="808" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"></div>
              <div className="absolute bottom-5 inset-x-5 text-white">
                <span className="text-xs uppercase tracking-widest text-brand font-bold">The Instructor</span>
                <h3 className="text-2xl font-bold mt-1">Ahmed Zaghloul</h3>
                <p className="text-xs text-neutral-300 mt-0.5">Commercial &amp; Portrait Photographer</p>
              </div>
            </div>
          </div>

          {/*  Instructor Bio  */}
          <div className="space-y-5 reveal">
            <div>
              <span className="text-xs uppercase tracking-widest text-brand font-semibold">The Instructor</span>
              <h2 id="instructor-heading" className="text-3xl sm:text-4xl font-display font-bold text-dark mt-2">Ahmed Zaghloul</h2>
              <a
                href="https://www.instagram.com/zaghloulphotographer/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/10"
              >
                <svg className="w-4 h-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                <span dir="ltr">@zaghloulphotographer</span>
              </a>
            </div>

            <p className="text-lg font-semibold text-white leading-relaxed">
              Over 10 years of experience in visual arts
            </p>

            <p className="text-muted text-base leading-relaxed">
              Throughout his career, he has collaborated with government entities, leading local and international brands, delivering dozens of specialized workshops and masterclasses in photography, studio lighting, and content creation, with a continuous focus on practical application and real-world mastery.
            </p>

            {/*  Instructor Stats Grid  */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center sm:text-start">
                <span className="block text-xl sm:text-2xl font-black text-white">+5000</span>
                <span className="text-xs text-muted font-medium">Trained Students</span>
              </div>
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center sm:text-start">
                <span className="block text-xl sm:text-2xl font-black text-white">+100</span>
                <span className="text-xs text-muted font-medium">Workshops Delivered</span>
              </div>
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center sm:text-start">
                <span className="block text-xl sm:text-2xl font-black text-white">10+</span>
                <span className="text-xs text-muted font-medium">Years Experience</span>
              </div>
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center sm:text-start">
                <span className="block text-xl sm:text-2xl font-black text-white">+100</span>
                <span className="text-xs text-muted font-medium">Commercial Projects</span>
              </div>
            </div>

            {/*  Past Collaborations (Not Workshop Sponsors)  */}
            <div className="pt-3 border-t border-white/10">
              <p className="text-xs uppercase tracking-wider text-muted font-semibold mb-3">Entities We Had the Honor of Collaborating With</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center">
                {[
                  { name: "Sony", src: "/images/Sony-01.png", alt: "Sony Logo", extra: "scale-[1.35]" },
                  { name: "Nanlite", src: "/images/nanlite-logo_brandlogos.net_jey7u.png", alt: "Nanlite Logo", extra: "" },
                  { name: "Neom", src: "/images/Neom.png", alt: "NEOM Logo", extra: "scale-95" },
                  { name: "UBT", src: "/images/ubt_logo-26009518.png", alt: "UBT Logo", extra: "" },
                ].map((partner) => (
                  <div
                    key={partner.name}
                    className="flex items-center justify-center h-14 px-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors overflow-hidden"
                  >
                    <img
                      src={partner.src}
                      alt={partner.alt}
                      className={`max-h-7 max-w-[82%] object-contain filter brightness-0 invert opacity-85 hover:opacity-100 transition-all ${partner.extra}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted/70 mt-2.5 text-center sm:text-start">Past collaborations with Bayt Al Mosawer; does not imply sponsorship of this workshop.</p>
            </div>
          </div>

        </div>
      </div>
    </section>

    {/*  ═══════════════════════════════════════════════════
         8. PRICING & BOOKING — 3 honest tiers + form
    ════════════════════════════════════════════════════════  */}
    <section id="pricing" className="py-14 sm:py-20 md:py-24 bg-surface border-y border-border" aria-labelledby="pricing-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-10 md:mb-14 reveal">
          <span className="text-xs uppercase tracking-widest text-brand font-semibold">Pricing</span>
          <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-display font-bold text-dark mt-2">Reserve Your Seat for This Live Edition</h2>
          <p className="text-muted text-base mt-3 max-w-xl mx-auto leading-relaxed">
            One comprehensive masterclass with full access to all live sessions and course resources.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">

          {/*  Left Column: What is Included + Pricing Stages Timeline  */}
          <div className="space-y-5 reveal">

            {/*  What's included in all stages  */}
            <div className="bg-white rounded-2xl border border-border p-6 space-y-3">
              <h3 className="font-bold text-dark text-base mb-4">Included in All Registrations</h3>
              <div className="flex items-center gap-3 text-sm text-dark">
                <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                <span>3-Days Live Access on Zoom (9 Hours Total)</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-dark">
                <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                <span>PDF with 10 Illustrated Lighting Diagrams</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-dark">
                <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                <span>Color Combination Cheat Sheet</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-dark">
                <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                <span>Camera Settings Guide &amp; White Balance Notes</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-dark">
                <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                <span>3-Day Recordings with 30-Day Access</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-dark">
                <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                <span>Digital Certificate of Attendance (Bayt Al Mosawer)</span>
              </div>
            </div>

            {/*  Pricing Stages Timeline  */}
            <div className="space-y-3">

              {/*  Stage 1 — Active Now  */}
              <div className="bg-white rounded-2xl border-2 border-brand p-5 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <span className="text-xs font-bold bg-brand text-white px-2.5 py-0.5 rounded-full uppercase tracking-wide">Active Now</span>
                  <span className="text-xs text-muted">Stage 1</span>
                </div>
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-dark">Early Bird Rate</h3>
                    <p className="text-xs text-muted mt-0.5">First 20 seats at this rate · 15% VAT included</p>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-dark">199 <span className="text-base font-semibold">SAR</span></span>
                </div>
              </div>

              {/*  Stage 2 — Upcoming  */}
              <div className="bg-white rounded-2xl border border-border p-4 opacity-75">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold bg-surface text-muted px-2.5 py-0.5 rounded-full uppercase tracking-wide border border-border">Upcoming</span>
                      <span className="text-xs text-muted">Stage 2</span>
                    </div>
                    <h3 className="text-base font-bold text-dark">Standard Pricing</h3>
                    <p className="text-xs text-muted mt-0.5">After the first 20 confirmed bookings</p>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-muted">399 <span className="text-sm font-semibold">SAR</span></span>
                </div>
              </div>

            </div>

            {/*  Pricing Notice Banner  */}
            <div className="p-3.5 rounded-xl bg-brand/5 border border-brand/20 flex items-center gap-2.5 text-xs sm:text-sm text-dark font-medium">
              <span className="w-2 h-2 rounded-full bg-brand shrink-0"></span>
              <span>After the first 20 confirmed bookings, the workshop price will increase to 399 SAR.</span>
            </div>
          </div>

          {/*  Right Column: Registration Form (Active Now: 199 SAR)  */}
          <div className="reveal">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8">
              <div className="mb-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs uppercase font-semibold text-brand tracking-widest">Instant Seat Registration</span>
                  <span className="text-xs font-bold bg-brand/10 text-brand-ink px-2.5 py-1 rounded-full uppercase">Stage 1 Active</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-2">
                  <span className="text-3xl sm:text-4xl font-black text-dark">199 SAR</span>
                  <span className="text-sm text-muted">Early Bird Rate</span>
                </div>
                <p className="text-xs text-muted mt-1">VAT included · Flexible digital payment options</p>
                <div className="mt-3 p-3 rounded-xl bg-brand/5 border border-brand/20 flex items-center gap-2 text-xs sm:text-sm text-dark font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0"></span>
                  <span>After the first 20 confirmed bookings, the workshop price will increase to 399 SAR.</span>
                </div>
              </div>

              {/*  Moyasar Guest Checkout Form (199 SAR VAT included)  */}
              <ChromaticsCheckoutForm checkoutEnabled={CHROMATICS_CHECKOUT_ENABLED} />
            </div>
          </div>

        </div>
      </div>
    </section>

    {/*  ═══════════════════════════════════════════════════
         9. FAQ
    ════════════════════════════════════════════════════════  */}
    <section id="faq" className="py-16 md:py-24 bg-white" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-12 reveal">
          <span className="text-xs uppercase tracking-widest text-brand font-semibold">Got Questions?</span>
          <h2 id="faq-heading" className="text-3xl sm:text-4xl font-display font-bold text-dark mt-2">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3 reveal">

          <details className="group bg-surface rounded-2xl border border-border overflow-hidden" open>
            <summary className="flex items-center justify-between gap-4 px-5 py-5 cursor-pointer list-none [-webkit-list-style:none] [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-dark text-base">How will I access the LIVE Zoom sessions?</span>
              <svg className="accordion-icon w-5 h-5 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-5 pb-5 border-t border-border">
              <p className="text-muted text-sm leading-relaxed mt-4">
                Upon successful registration, you will receive an immediate confirmation email containing your personal Zoom access links, class schedule details, and calendar invitations for all 3 days.
              </p>
            </div>
          </details>

          <details className="group bg-surface rounded-2xl border border-border overflow-hidden">
            <summary className="flex items-center justify-between gap-4 px-5 py-5 cursor-pointer list-none [-webkit-list-style:none] [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-dark text-base">What gear or equipment do I need to follow along?</span>
              <svg className="accordion-icon w-5 h-5 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-5 pb-5 border-t border-border">
              <p className="text-muted text-sm leading-relaxed mt-4">
                You only need a device with Zoom to watch the masterclass. To practice after class, having 1 to 2 studio strobes or speedlights with basic color gels (or continuous RGB lights) is recommended but not strictly required during the live broadcast.
              </p>
            </div>
          </details>

          <details className="group bg-surface rounded-2xl border border-border overflow-hidden">
            <summary className="flex items-center justify-between gap-4 px-5 py-5 cursor-pointer list-none [-webkit-list-style:none] [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-dark text-base">What if I miss a live session? Is there a recording replay?</span>
              <svg className="accordion-icon w-5 h-5 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-5 pb-5 border-t border-border">
              <p className="text-muted text-sm leading-relaxed mt-4">
                Yes! Full high-definition recordings of each 180-minute day will be uploaded to your student portal within 24 hours of live completion, granting you 30-day replay access.
              </p>
            </div>
          </details>

          <details className="group bg-surface rounded-2xl border border-border overflow-hidden">
            <summary className="flex items-center justify-between gap-4 px-5 py-5 cursor-pointer list-none [-webkit-list-style:none] [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-dark text-base">What payment methods are supported?</span>
              <svg className="accordion-icon w-5 h-5 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-5 pb-5 border-t border-border">
              <p className="text-muted text-sm leading-relaxed mt-4">
                We accept credit/debit cards (Mada, Visa, Mastercard) and Apple Pay. All transactions are securely processed in SAR.
              </p>
            </div>
          </details>

          <details className="group bg-surface rounded-2xl border border-border overflow-hidden">
            <summary className="flex items-center justify-between gap-4 px-5 py-5 cursor-pointer list-none [-webkit-list-style:none] [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-dark text-base">Is this masterclass suitable for beginners?</span>
              <svg className="accordion-icon w-5 h-5 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-5 pb-5 border-t border-border">
              <p className="text-muted text-sm leading-relaxed mt-4">
                The masterclass assumes basic familiarity with camera exposure settings (shutter speed, aperture, ISO). Complete beginners may find Day 1 challenging. We recommend having some prior studio or portrait photography experience to get the most value.
              </p>
            </div>
          </details>

        </div>
      </div>
    </section>

    {/*  ═══════════════════════════════════════════════════
         10. FINAL CTA BANNER
    ════════════════════════════════════════════════════════  */}
    <section className="py-14 sm:py-20 md:py-24 bg-white border-t border-border" aria-labelledby="final-cta-heading">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center reveal">
        <span className="text-xs uppercase tracking-widest text-brand font-semibold mb-2 block">Enrollment Open</span>
        <h2 id="final-cta-heading" className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-dark leading-tight">
          Ready to Elevate Your Portrait Lighting?
        </h2>
        <p className="text-muted text-base md:text-lg max-w-xl mx-auto mt-4 leading-relaxed">
          Join visual artists for 3 days of live intensive studio lighting transformation.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#pricing" className="inline-flex w-full sm:w-auto items-center justify-center bg-brand hover:bg-brand-dark text-white font-bold text-lg px-10 py-4 rounded-xl transition-all min-h-[56px] gap-2.5 shadow-sm">
            Reserve Seat · Early Bird 199 SAR
            <svg className="w-5 h-5 flex-shrink-0" data-dir-flip fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </a>
        </div>
        <p className="text-muted text-xs sm:text-sm mt-5">3-Day LIVE Online Portrait Masterclass · Bayt Al Mosawer · Saudi Arabia &amp; MENA</p>
      </div>
    </section>

  </main>

  {/*  ═══════════════════════════════════════════════════
       FOOTER
  ════════════════════════════════════════════════════════  */}
  <footer id="footer" className="bg-white border-t border-border py-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-7 border-b border-border">
        <div>
          <a href="#hero" className="flex items-center gap-2 min-h-[44px]">
            <span className="w-2.5 h-2.5 rounded-full bg-brand flex-shrink-0"></span>
            <span className="font-display font-black text-base sm:text-lg tracking-wider text-dark uppercase">Creative Lighting with Color Gels</span>
          </a>
          <p className="text-xs text-muted mt-1">3-Day LIVE Online Portrait Masterclass · Bayt Al Mosawer</p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted" aria-label="Footer">
          <a href="#outcomes" className="hover:text-brand transition-colors py-2.5 px-1 min-h-[44px] inline-flex items-center">Outcomes</a>
          <a href="#gallery" className="hover:text-brand transition-colors py-2.5 px-1 min-h-[44px] inline-flex items-center">Gallery</a>
          <a href="#curriculum" className="hover:text-brand transition-colors py-2.5 px-1 min-h-[44px] inline-flex items-center">Curriculum</a>
          <a href="#pricing" className="hover:text-brand transition-colors py-2.5 px-1 min-h-[44px] inline-flex items-center">Pricing</a>
          <a href="#faq" className="hover:text-brand transition-colors py-2.5 px-1 min-h-[44px] inline-flex items-center">FAQ</a>
        </nav>

        <div>
          <a href="https://wa.me/" target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm font-semibold text-dark bg-surface hover:bg-border px-4 py-2.5 rounded-full border border-border transition-colors min-h-[44px]">
            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
            WhatsApp Support
          </a>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between pt-5 text-xs text-muted gap-2">
        <p>© 2026 Creative Lighting with Color Gels / Bayt Al Mosawer. All rights reserved.</p>
        <p>Saudi Arabia & MENA Region</p>
      </div>
    </div>
  </footer>

  {/*  ═══════════════════════════════════════════════════
       STICKY MOBILE BOOKING BAR
  ════════════════════════════════════════════════════════  */}
  <div id="mobile-cta-bar" className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border p-3 xl:hidden safe-area-inset-bottom">
    <a href="#pricing" className="flex items-center justify-between w-full bg-brand hover:bg-brand-dark text-white font-bold text-base px-5 py-3 rounded-xl min-h-[52px] transition-all">
      <span>Reserve Your Seat Now</span>
      <span className="font-black">199 SAR</span>
    </a>
  </div>

  {/*  ═══════════════════════════════════════════════════
       INLINE JAVASCRIPT
  ════════════════════════════════════════════════════════  */}
  





{/* lp-badge */}<div className="lp-badge" style={{"all":"initial","display":"block","textAlign":"center","padding":"12px 8px 16px","font":"500 12.5px/1.5 system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif","color":"#64748b","background":"transparent","direction":"ltr"}}><a href="https://studio.baytalmosawer.net/studio/?ref=WJ2GHXH&amp;src=badge" target="_blank" rel="noopener" style={{"color":"inherit","textDecoration":"none","opacity":".8"}}>⚡ Made with Bayt Al Mosawer Studio</a></div>{/* /lp-badge */}




    </div>
  );
}
