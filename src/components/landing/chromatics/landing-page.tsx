"use client";

/**
 * CHROMATICS — Creative Portrait Lighting Masterclass Landing Page
 * صفحة الهبوط المعتمدة: ماستر كلاس إضاءة البورتريه الإبداعية
 * 
 * Reuses approved HTML, CSS, JavaScript, and original images.
 * Pricing tiers: 199 / 249 / 299 SAR
 * Unlisted, Mobile-First, Bilingual AR (RTL) / EN (LTR).
 */

import React, { useEffect, useRef, useState } from "react";
import { CHROMATICS_CHECKOUT_ENABLED, CHROMATICS_METADATA_AR, CHROMATICS_METADATA_EN } from "@/data/landing/chromatics";
import { ChromaticsCheckoutForm } from "./checkout-form";
import { AR_ATTR, AR_TEXT } from "@/data/landing/chromatics-i18n";
import "./chromatics.css";

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function ChromaticsLanding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentLang, setCurrentLang] = useState<"ar" | "en">("ar");

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
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA") {
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
        const translated = AR_TEXT[norm(original)];
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
      <a href="#hero" className="flex items-center gap-2 group shrink-0 min-h-[44px]" aria-label="Creative Lighting with Color Gels Home">
        <span className="w-2.5 h-2.5 rounded-full bg-brand group-hover:scale-125 transition-transform flex-shrink-0"></span>
        <span className="font-display font-black text-sm sm:text-base tracking-wider text-dark uppercase">Creative Lighting with Color Gels</span>
        <span className="hidden lg:inline-block text-xs uppercase tracking-widest text-muted border-s border-border ps-3 font-medium">Bayt Al Mosawer</span>
      </a>

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

          {/*  Text Content  */}
          <div className="space-y-6 sm:space-y-7 reveal">

            {/*  Label  */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface border border-border text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse-slow flex-shrink-0"></span>
              <span className="text-dark">3-Day LIVE Online Portrait Masterclass</span>
              <span className="text-muted">·</span>
              <span className="text-muted">Bayt Al Mosawer</span>
            </div>

            {/*  Headline: clean mobile sizing, no excessive wrapping  */}
            <h1 className="font-display font-black tracking-tight text-dark leading-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
              <span className="block">Control Light.</span>
              <span className="block">Understand Color.</span>
              <span className="block text-brand">Craft Distinct Portraits.</span>
            </h1>

            {/*  Subheadline  */}
            <p className="text-base sm:text-lg md:text-xl text-muted leading-relaxed max-w-lg">
              In 3 live intensive days, master creative portrait lighting using Color Gels and RGB setups. From single light sources up to complex 4-light compositions with real-time model practice.
            </p>

            {/*  Key Benefits / Stats  */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6 py-4 sm:py-5 border-y border-border text-center sm:text-start">
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

            {/*  Price + Primary Orange CTA (Price clearly visible, then Orange CTA)  */}
            <div className="space-y-3.5 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl font-display font-black text-dark">199 <span className="text-lg font-bold">SAR</span></span>
                <span className="text-xs font-bold bg-brand/10 text-brand-ink px-3 py-1.5 rounded-full uppercase tracking-wide border border-brand/20">Early Bird · First 20 Seats</span>
              </div>

              <a href="#pricing" className="flex w-full sm:w-auto sm:inline-flex items-center justify-center bg-brand hover:bg-brand-dark text-white font-bold text-lg px-8 py-4 rounded-xl transition-all min-h-[56px] gap-2.5 shadow-sm">
                Reserve Your Seat Now
                <svg className="w-5 h-5 flex-shrink-0" data-dir-flip fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </a>

              <p className="text-xs sm:text-sm text-muted flex items-center gap-1.5 pt-1">
                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                Full Zoom recording included. Lifetime access.
              </p>
            </div>
          </div>

          {/*  Hero Portrait Image  */}
          <div className="reveal mt-4 lg:mt-0">
            <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-none">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-surface border border-border shadow-xl">
                <img src="/images/landing/chromatics/cl-045-1n.JPG.jpeg"
                  data-fallback="/images/landing/chromatics/cl-045-1n.JPG.jpeg"
                  alt="Masterclass Key Visual — Creative portrait with color gels"
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  width="1200"
                  height="1500" />
                {/*  Overlay badge  */}
                <div className="absolute bottom-4 inset-x-4">
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 border border-border/50 shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand flex-shrink-0 animate-pulse-slow"></span>
                    <div>
                      <p className="text-xs font-bold text-dark uppercase tracking-wider">3-Day LIVE Online Portrait Masterclass</p>
                      <p className="text-xs text-muted mt-0.5">By Bayt Al Mosawer</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
              Understand hard vs. soft light dynamics, distance falloff, and direct light with flags and grids.
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

        <div className="mb-10 md:mb-14 reveal">
          <span className="text-xs uppercase tracking-widest text-brand font-semibold">Work Samples</span>
          <h2 id="gallery-heading" className="text-3xl sm:text-4xl font-display font-bold text-dark mt-2">Photography Showcase</h2>
          <p className="text-muted text-base mt-3 max-w-xl leading-relaxed">
            Real portraits created using the gel and RGB techniques taught in this masterclass.
          </p>
        </div>

        {/*  1 col on mobile, 2 on tablet, 3 on desktop  */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">

          {/*  Large featured image (spans 2 cols on lg)  */}
          <div className="lg:col-span-2 gallery-item group overflow-hidden rounded-2xl border border-border bg-white cursor-pointer reveal"
               data-src="/images/landing/chromatics/1B9C0C3F-7F01-4C86-B7C3-789A7A34DAC2.JPG.jpeg"
               data-title="High Contrast Red Gel Spotlight — Studio Portrait"
               role="button" tabIndex={0} aria-label="Open lightbox: High Contrast Red Gel Spotlight">
            <div className="aspect-[16/9] lg:aspect-[16/8] overflow-hidden">
              <img src="/images/landing/chromatics/1B9C0C3F-7F01-4C86-B7C3-789A7A34DAC2.JPG.jpeg"
                   data-fallback="/images/landing/chromatics/1B9C0C3F-7F01-4C86-B7C3-789A7A34DAC2.JPG.jpeg"
                   alt="Beauty portrait of a woman with red gel spotlight effect on face against white backdrop"
                   className="w-full h-full object-cover"
                   loading="eager" decoding="async" width="1440" height="720" />
            </div>
          </div>

          {/*  Card 2  */}
          <div className="gallery-item group overflow-hidden rounded-2xl border border-border bg-white cursor-pointer reveal"
               data-src="/images/landing/chromatics/1B2190DC-A929-4B76-BD10-B4F98EBA7AC1.JPG.jpeg"
               data-title="Multi-Gel Ambient & Key Light Setup"
               role="button" tabIndex={0} aria-label="Open lightbox: Multi-Gel Ambient Setup">
            <div className="aspect-square overflow-hidden">
              <img src="/images/landing/chromatics/1B2190DC-A929-4B76-BD10-B4F98EBA7AC1.JPG.jpeg"
                   data-fallback="/images/landing/chromatics/1B2190DC-A929-4B76-BD10-B4F98EBA7AC1.JPG.jpeg"
                   alt="Woman wearing a black dress in a photo shoot illuminated by purple and blue studio lights"
                   className="w-full h-full object-cover"
                   loading="eager" decoding="async" width="1440" height="1440" />
            </div>
          </div>

          {/*  Card 3  */}
          <div className="gallery-item group overflow-hidden rounded-2xl border border-border bg-white cursor-pointer reveal"
               data-src="/images/landing/chromatics/1FA2BB5E-36F6-42B9-BD85-4071C31D4CE1.JPG.jpeg"
               data-title="Seated Gel Portrait — Purple & Blue Harmonies"
               role="button" tabIndex={0} aria-label="Open lightbox: Seated Gel Portrait">
            <div className="aspect-[3/4] overflow-hidden">
              <img src="/images/landing/chromatics/1FA2BB5E-36F6-42B9-BD85-4071C31D4CE1.JPG.jpeg"
                   data-fallback="/images/landing/chromatics/1FA2BB5E-36F6-42B9-BD85-4071C31D4CE1.JPG.jpeg"
                   alt="Model seated on stool with raised arm under purple and blue light gels"
                   className="w-full h-full object-cover"
                   loading="eager" decoding="async" width="1440" height="1440" />
            </div>
          </div>

          {/*  Card 4  */}
          <div className="gallery-item group overflow-hidden rounded-2xl border border-border bg-white cursor-pointer reveal"
               data-src="/images/landing/chromatics/33A52D79-3117-491B-93D5-447033E6096E.JPG.jpeg"
               data-title="Dramatic Purple Close-up — Studio Masterclass"
               role="button" tabIndex={0} aria-label="Open lightbox: Dramatic Purple Close-up">
            <div className="aspect-[3/4] overflow-hidden">
              <img src="/images/landing/chromatics/33A52D79-3117-491B-93D5-447033E6096E.JPG.jpeg"
                   data-fallback="/images/landing/chromatics/33A52D79-3117-491B-93D5-447033E6096E.JPG.jpeg"
                   alt="Close-up portrait of a woman looking at camera with dramatic purple studio lighting"
                   className="w-full h-full object-cover"
                   loading="eager" decoding="async" width="1440" height="1440" />
            </div>
          </div>

          {/*  Card 5  */}
          <div className="gallery-item group overflow-hidden rounded-2xl border border-border bg-white cursor-pointer reveal"
               data-src="/images/landing/chromatics/9627FD84-8BF0-4C10-92C1-BA727005C93D.JPG.jpeg"
               data-title="Creative Shadow Separation on Backdrop"
               role="button" tabIndex={0} aria-label="Open lightbox: Creative Shadow Separation">
            <div className="aspect-[3/4] overflow-hidden">
              <img src="/images/landing/chromatics/9627FD84-8BF0-4C10-92C1-BA727005C93D.JPG.jpeg"
                   data-fallback="/images/landing/chromatics/9627FD84-8BF0-4C10-92C1-BA727005C93D.JPG.jpeg"
                   alt="Full body portrait casting multi-colored yellow, cyan and pink shadows on backdrop"
                   className="w-full h-full object-cover"
                   loading="eager" decoding="async" width="1440" height="1440" />
            </div>
          </div>

          {/*  Card 6: Clean Original Photography (Replaces text-heavy diagram with clean fashion portrait)  */}
          <div className="sm:col-span-2 lg:col-span-2 gallery-item group overflow-hidden rounded-2xl border border-border bg-white cursor-pointer reveal"
               data-src="/images/landing/chromatics/جلسة تصوير أزياء بإضاءة زرقاء وأرجوانية.png"
               data-title="Editorial Fashion Portrait — Creative Blue & Purple Lighting"
               role="button" tabIndex={0} aria-label="Open lightbox: Editorial Fashion Portrait">
            <div className="aspect-[16/9] overflow-hidden">
              <img src="/images/landing/chromatics/جلسة تصوير أزياء بإضاءة زرقاء وأرجوانية.png"
                   data-fallback="/images/landing/chromatics/جلسة تصوير أزياء بإضاءة زرقاء وأرجوانية.png"
                   alt="Creative editorial portrait with blue and purple gel lighting scheme"
                   className="w-full h-full object-cover"
                   loading="eager" decoding="async" width="1254" height="700" />
            </div>
          </div>

          {/*  Card 7  */}
          <div className="gallery-item group overflow-hidden rounded-2xl border border-border bg-white cursor-pointer reveal"
               data-src="/images/landing/chromatics/990C9583-C203-4DA1-BD3D-347479A6F496.JPG.jpeg"
               data-title="Three-Quarter Profile with Dual Color Gels"
               role="button" tabIndex={0} aria-label="Open lightbox: Three-Quarter Profile">
            <div className="aspect-square overflow-hidden">
              <img src="/images/landing/chromatics/990C9583-C203-4DA1-BD3D-347479A6F496.JPG.jpeg"
                   data-fallback="/images/landing/chromatics/990C9583-C203-4DA1-BD3D-347479A6F496.JPG.jpeg"
                   alt="Three-quarter profile portrait with purple light gels"
                   className="w-full h-full object-cover"
                   loading="eager" decoding="async" width="1440" height="1440" />
            </div>
          </div>

        </div>
      </div>
    </section>

    {/*  LIGHTBOX MODAL  */}
    <div id="lightbox" className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm hidden items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Image lightbox">
      <button id="lightbox-close" className="absolute top-4 end-4 md:top-6 md:end-6 min-w-11 min-h-11 flex items-center justify-center text-white/70 hover:text-white p-2 text-2xl leading-none" aria-label="Close Lightbox">&times;</button>
      <div className="max-w-4xl w-full flex flex-col items-center">
        <img data-fallback="/images/landing/chromatics/cl-045-1n.JPG.jpeg" decoding="async" loading="lazy" id="lightbox-img" src="" alt="Full screen portrait preview" className="max-h-[75vh] w-auto rounded-xl object-contain shadow-2xl" />
        <p id="lightbox-caption" className="text-white text-sm font-medium mt-4 text-center opacity-70"></p>
      </div>
    </div>

    {/*  ═══════════════════════════════════════════════════
         4. COURSE CURRICULUM — 3 accordion days
    ════════════════════════════════════════════════════════  */}
    <section id="curriculum" className="py-16 md:py-24 bg-surface border-y border-border" aria-labelledby="curriculum-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-12 md:mb-16 reveal">
          <span className="text-xs uppercase tracking-widest text-brand font-semibold">3-Day Live Itinerary</span>
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
                <span className="text-xs font-semibold text-brand-ink bg-brand/10 px-3 py-1 rounded-full uppercase tracking-wider">Fundamentals &amp; 1-Light Setups</span>
              </div>
              <ul className="space-y-3 text-sm text-muted">
                <li className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-dark">Hard vs. Soft Light Dynamics:</strong> Controlling distance, modifier scale, and light falloff (Inverse Square Law).</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-dark">In-Camera White Balance &amp; Color Shift:</strong> How Kelvin temperature settings radically transform gel color outputs.</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-dark">Single Source Gel Setups:</strong> Live demonstration of creating moody, high-impact portraits with just 1 gelled strobe.</span>
                </li>
              </ul>
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
                <span className="text-xs font-semibold text-brand-ink bg-brand/10 px-3 py-1 rounded-full uppercase tracking-wider">Multi-Source &amp; Color Separation</span>
              </div>
              <ul className="space-y-3 text-sm text-muted">
                <li className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-dark">Key, Fill, Rim &amp; Background Roles:</strong> Assigning specific color roles to individual light units without muddying skin tones.</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-dark">Precision Modifiers:</strong> Utilizing V-flats, honeycomb grids, barn doors, and snoots to control gel spill with surgical precision.</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-dark">RGB Light Integration:</strong> Blending continuous RGB sources with traditional studio strobes to create seamless hybrid color palettes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-dark">2 &amp; 3-Light Gel Compositions:</strong> Step-by-step progressive buildup from two-source complementary schemes to full three-light setups.</span>
                </li>
              </ul>
            </div>
          </details>

          {/*  Day 3  */}
          <details className="group bg-white rounded-2xl border border-border overflow-hidden reveal">
            <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none [-webkit-list-style:none] [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-4 min-w-0">
                <span className="px-3 py-1.5 bg-brand text-white text-xs font-bold rounded-lg uppercase tracking-wider flex-shrink-0">Day 3</span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-dark">Create Your Vision</h3>
                  <p className="text-xs text-muted mt-0.5">Duration: 180 Minutes · Live Session</p>
                </div>
              </div>
              <svg className="accordion-icon w-5 h-5 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="px-6 pb-6 border-t border-border">
              <div className="mt-4 mb-3">
                <span className="text-xs font-semibold text-brand-ink bg-brand/10 px-3 py-1 rounded-full uppercase tracking-wider">Advanced Setups &amp; Live Model Demo</span>
              </div>
              <ul className="space-y-3 text-sm text-muted">
                <li className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-dark">Full 4-Light Gel Setups:</strong> Complete complex arrangements featuring key, fill, hair, and independently colored backgrounds.</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-dark">Reference Deconstruction:</strong> Analyzing published editorial and commercial portraits to reverse-engineer their gel and modifier schemes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-dark">Live Model Demonstration:</strong> Full live shoot on a studio model — camera settings, power ratios, and gel choices displayed on screen in real time.</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  <span><strong className="text-dark">Live Q&amp;A &amp; Personalized Feedback:</strong> Direct interaction with the instructor to address your specific creative challenges.</span>
                </li>
              </ul>
            </div>
          </details>

        </div>
      </div>
    </section>

    {/*  ═══════════════════════════════════════════════════
         5. INCLUDED RESOURCES
    ════════════════════════════════════════════════════════  */}
    <section id="resources" className="py-16 md:py-24 bg-white" aria-labelledby="resources-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-12 reveal">
          <span className="text-xs uppercase tracking-widest text-brand font-semibold">What's Included</span>
          <h2 id="resources-heading" className="text-3xl sm:text-4xl font-display font-bold text-dark mt-2">Everything You Receive</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 reveal">

          <div className="flex items-start gap-4 bg-surface rounded-2xl border border-border p-5">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-dark text-base">Lighting Diagrams PDF</h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">Downloadable diagrams for every setup covered across all 3 days.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-surface rounded-2xl border border-border p-5">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-dark text-base">Color Cheat Sheet</h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">Quick-reference card for complementary and analogous gel pairings.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-surface rounded-2xl border border-border p-5">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-dark text-base">Camera Settings Guide</h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">Optimal exposure, sync, and white balance settings for gel work.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-surface rounded-2xl border border-border p-5">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-dark text-base">30-Day HD Recordings</h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">Full recordings of all 3 sessions available for 30 days after the live class.</p>
            </div>
          </div>

          <div className="sm:col-span-2 flex items-start gap-4 bg-dark rounded-2xl border border-dark p-5">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Digital Certificate of Completion</h3>
              <p className="text-sm text-gray-300 mt-1 leading-relaxed">Official digital certificate from Bayt Al Mosawer issued upon course completion.</p>
            </div>
          </div>

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
              <img src="/images/landing/chromatics/13612F2F-7962-43A2-AE8A-FAAFF221DFA4.JPG.jpeg"
                data-fallback="/images/landing/chromatics/13612F2F-7962-43A2-AE8A-FAAFF221DFA4.JPG.jpeg"
                alt="Bayt Al Mosawer Studio Photography Masterclass"
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
                width="1440"
                height="1440" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"></div>
              <div className="absolute bottom-5 inset-x-5 text-white">
                <span className="text-xs uppercase tracking-widest text-brand font-bold">Hosted By</span>
                <h3 className="text-xl font-bold mt-1">Bayt Al Mosawer</h3>
                <p className="text-xs text-gray-200 mt-0.5">Creative Photography Academy &amp; Studio Hub</p>
              </div>
            </div>
          </div>

          {/*  Instructor Bio  */}
          <div className="space-y-5 reveal">
            <div>
              <span className="text-xs uppercase tracking-widest text-brand font-semibold">Authority &amp; Excellence</span>
              <h2 id="instructor-heading" className="text-3xl sm:text-4xl font-display font-bold text-dark mt-2">Empowering Visual Creators Across the MENA Region</h2>
            </div>

            <p className="text-muted text-base leading-relaxed">
              <strong className="text-dark">Bayt Al Mosawer</strong> is a premier photography academy dedicated to bridging international high-fashion lighting techniques with studio artists across Saudi Arabia and the Gulf.
            </p>

            <p className="text-muted text-base leading-relaxed">
              This masterclass breaks down technical lighting principles into structured, repeatable formulas. Rather than guessing light positions, you will gain an analytical framework to construct any color gel setup with confidence and artistic intent.
            </p>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-2">
              <div className="border-s-2 border-brand ps-3 sm:ps-4">
                <span className="block text-lg sm:text-xl font-bold text-dark">Live Studio</span>
                <span className="text-xs text-muted uppercase tracking-wider">Real-Time Demos</span>
              </div>
              <div className="border-s-2 border-brand ps-3 sm:ps-4">
                <span className="block text-lg sm:text-xl font-bold text-dark">Hands-On</span>
                <span className="text-xs text-muted uppercase tracking-wider">Practical Focus</span>
              </div>
              <div className="border-s-2 border-brand ps-3 sm:ps-4">
                <span className="block text-lg sm:text-xl font-bold text-dark">Direct Q&amp;A</span>
                <span className="text-xs text-muted uppercase tracking-wider">Mentorship</span>
              </div>
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
            One comprehensive masterclass with progressive pricing stages. All stages receive identical 100% full course access and resources.
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
                <span>HD Session Recordings with 30-Day Access</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-dark">
                <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                <span>Downloadable Lighting Diagrams &amp; Cheat Sheets</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-dark">
                <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                <span>Camera Settings Guide &amp; Color Cheat Sheet</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-dark">
                <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                <span>Certificate of Completion from Bayt Al Mosawer</span>
              </div>
            </div>

            {/*  Pricing Stages Header  */}
            <div className="pt-2">
              <h4 className="text-xs uppercase tracking-wider font-bold text-muted mb-3">Progressive Pricing Stages</h4>
            </div>

            {/*  3 Pricing Stages Cards  */}
            <div className="space-y-3">

              {/*  Stage 1 — Active Early Bird  */}
              <div className="bg-white rounded-2xl border-2 border-brand p-5 tier-active shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold bg-brand text-white px-2.5 py-0.5 rounded-full uppercase tracking-wide">Active Now</span>
                      <span className="text-xs text-muted">Stage 1</span>
                    </div>
                    <h3 className="text-lg font-bold text-dark">Early Bird</h3>
                    <p className="text-xs text-muted mt-0.5">First 20 seats at this rate</p>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-dark">199 <span className="text-base font-semibold">SAR</span></span>
                </div>
              </div>

              {/*  Stage 2 — Next Stage  */}
              <div className="bg-white rounded-2xl border border-border p-4 opacity-75">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold bg-surface text-muted px-2.5 py-0.5 rounded-full uppercase tracking-wide border border-border">Upcoming</span>
                      <span className="text-xs text-muted">Stage 2</span>
                    </div>
                    <h3 className="text-base font-bold text-dark">Standard Pricing</h3>
                    <p className="text-xs text-muted mt-0.5">After Early Bird tier fills</p>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-muted">249 <span className="text-sm font-semibold">SAR</span></span>
                </div>
              </div>

              {/*  Stage 3 — Final Stage  */}
              <div className="bg-white rounded-2xl border border-border p-4 opacity-60">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold bg-surface text-muted px-2.5 py-0.5 rounded-full uppercase tracking-wide border border-border">Final Stage</span>
                      <span className="text-xs text-muted">Stage 3</span>
                    </div>
                    <h3 className="text-base font-bold text-dark">Regular Price</h3>
                    <p className="text-xs text-muted mt-0.5">Full price after all tiers</p>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-muted">299 <span className="text-sm font-semibold">SAR</span></span>
                </div>
              </div>

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
        <p>© <span id="year"></span> Creative Lighting with Color Gels / Bayt Al Mosawer. All rights reserved.</p>
        <p>Saudi Arabia &amp; MENA Region</p>
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
  





{/* lp-badge */}<div className="lp-badge" style={{"all":"initial","display":"block","textAlign":"center","padding":"12px 8px 16px","font":"500 12.5px/1.5 system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif","color":"#64748b","background":"transparent","direction":"ltr"}}><a href="https://studio.baytalmosawer.net/studio/?ref=WJ2GHXH&amp;src=badge" target="_blank" rel="noopener" style={{"color":"inherit","textDecoration":"none","opacity":".8"}}>âš¡ Made with Bayt Al Mosawer Studio</a></div>{/* /lp-badge */}




    </div>
  );
}
