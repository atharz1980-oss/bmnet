"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { SocialIcons, WhatsAppIcon } from "@/components/shared/social-icons";
import { navLinks, siteConfig, socialLinks } from "@/data/site";
import { images } from "@/data/images";
import { usePublicCms } from "@/context/public-cms";
import { AccountLink } from "@/components/layout/account-link";
import { Logo } from "@/components/brand/logo";
import { brandTokens } from "@/components/brand/brand-tokens";
import { cn } from "@/lib/utils";

/*
 * المرحلة B2: ألوان الهوية الرسمية (رموز --bm-* من brand-tokens على الهيدر وقائمة الجوال).
 * زر الحجز برتقالي بنص فحمي (4.72:1) — لا نص أبيض على البرتقالي. وفي وضع التباين العالي
 * (forced-colors) يُلغى لون الخلفية، فيُعطى حدًّا وإطار تركيز بألوان النظام فيه وحده.
 */
const ctaClass =
  "bg-[var(--bm-orange)] font-bold text-[var(--bm-ink)] shadow-none hover:bg-[var(--bm-white)] hover:text-[var(--bm-ink)] focus-visible:ring-2 focus-visible:ring-[var(--bm-white)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bm-ink)] forced-colors:border-2 forced-colors:border-solid forced-colors:border-[ButtonText] forced-colors:focus-visible:outline-solid forced-colors:focus-visible:outline-[3px] forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[Highlight]";
/* الرابط النشط: برتقالي (4.72:1 على الفحمي، و3.58:1 مقابل الأبيض) مع خط سفلي على سطح المكتب */
const linkIdle = "text-[var(--bm-gray-200)] hover:text-[var(--bm-white)]";
const linkActive = "text-[var(--bm-orange)]";

/** شريط التنقل الرئيسي — داكن مع حالة النشطة والقوائم المنسدلة */
export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [mobileCoursesOpen, setMobileCoursesOpen] = useState(false);
  /* Checkpoint 7: اسم الموقع والشعار والهاتف/واتساب من إعدادات الـ CMS بعد الترطيب */
  const { view } = usePublicCms();
  const settings = view?.settings;
  const siteNameAr = settings?.siteNameAr ?? siteConfig.nameAr;
  const siteNameEn = settings?.siteNameEn ?? siteConfig.nameEn;
  const logoSrc = settings?.logo ?? images.logo;
  const whatsappHref = settings?.whatsappHref ?? siteConfig.whatsappLink;
  const phoneHref = `tel:${settings?.phone ?? siteConfig.phone}`;
  const phoneDisplay = settings?.phoneDisplay ?? siteConfig.phoneDisplay;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
    setMobileCoursesOpen(false);
  };

  // منع تمرير الصفحة عند فتح قائمة الموبايل
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /*
   * قائمة الموبايل كحوار: عند الفتح ينتقل التركيز إلى أول رابط ويبقى محصورًا بين زر
   * القائمة وعناصرها، وEscape يغلقها ويعيد التركيز إلى الزر (WCAG 2.1.2 و2.4.3).
   */
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const menu = mobileMenuRef.current;
    const focusables = () =>
      [
        menuButtonRef.current,
        ...Array.from(menu?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []),
      ].filter((el): el is HTMLElement => !!el && el.getClientRects().length > 0);
    /* القائمة تظهر بانتقال يشمل visibility: في أول إطار لا تقبل التركيز بعد، فيُعاد
       المحاولة كل إطار حتى ينتقل التركيز (بحد أقصى ~30 إطارًا). */
    let frame = 0;
    let tries = 0;
    const focusFirst = () => {
      const target = focusables()[1];
      target?.focus();
      if (target && document.activeElement !== target && tries++ < 30) frame = requestAnimationFrame(focusFirst);
    };
    frame = requestAnimationFrame(focusFirst);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        setMobileCoursesOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !items.includes(active as HTMLElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !items.includes(active as HTMLElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* لون فحمي صلب بدل الشفافية والتمويه (أخف رسمًا على الجوال). الارتفاع 64/76px + حد 1px كما هو. */}
      <header style={brandTokens} className="sticky top-0 z-50 border-b border-white/10 bg-[var(--bm-ink)] text-[var(--bm-white)]">
      <Container>
        <div className="flex h-16 items-center justify-between gap-3 lg:h-[76px]">
          {/* الشعار الرسمي المعتمد */}
          <Link
            href="/"
            className="flex shrink-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--bm-white)]"
            aria-label={`${siteNameAr} – الصفحة الرئيسية`}
          >
            {/* الشعار الأفقي الكامل لسطح المكتب والأجهزة اللوحية (>= 640px) */}
            <Logo
              variant="master"
              mode="light-on-dark"
              height={38}
              priority
              className="hidden sm:inline-flex"
            />
            {/* الرمز المنفرد لشاشات الجوال الضيقة (< 640px) */}
            <Logo
              variant="symbol"
              mode="light-on-dark"
              height={36}
              priority
              className="inline-flex sm:hidden"
            />
          </Link>

          {/* قائمة سطح المكتب */}
          <nav aria-label="التنقل الرئيسي" className="hidden lg:block">
            <ul className="flex items-center gap-0.5">
              {navLinks.map((link) =>
                link.children ? (
                  <li
                    key={link.href}
                    className="relative"
                    onMouseEnter={() => setCoursesOpen(true)}
                    onMouseLeave={() => setCoursesOpen(false)}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setCoursesOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <Link
                        href={link.href}
                        className={cn(
                          "relative rounded-md px-3 py-2 text-[15px] font-medium transition-colors",
                          isActive(link.href) ? linkActive : linkIdle
                        )}
                        aria-haspopup="true"
                        aria-expanded={coursesOpen}
                      >
                        {link.label}
                        {isActive(link.href) && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--bm-orange)]"
                          />
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setCoursesOpen((v) => !v)}
                        onKeyDown={(e) => e.key === "Escape" && setCoursesOpen(false)}
                        aria-label="فتح قائمة الدورات الفرعية"
                        aria-expanded={coursesOpen}
                        className="relative -ms-1 rounded-md p-1 text-[var(--bm-gray-200)] transition-colors hover:text-[var(--bm-white)]"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={cn("h-4 w-4 transition-transform", coursesOpen && "rotate-180")}
                        />
                      </button>
                    </div>

                    {/* القائمة المنسدلة — invisible عند الإغلاق لإخراجها من شجرة الوصول */}
                    <div
                      className={cn(
                        "absolute end-0 top-full w-72 pt-2 transition-all duration-200",
                        coursesOpen
                          ? "visible translate-y-0 opacity-100"
                          : "invisible translate-y-1 opacity-0"
                      )}
                    >
                      <ul className="overflow-hidden rounded-xl border border-white/10 bg-[var(--bm-black)] p-1.5 shadow-xl shadow-black/30">
                        {link.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              tabIndex={coursesOpen ? 0 : -1}
                              className="block rounded-lg px-3.5 py-2.5 transition-colors hover:bg-white/10 focus-visible:bg-white/10"
                            >
                              <span className="block text-sm font-semibold text-[var(--bm-white)]">
                                {child.label}
                              </span>
                              {child.description ? (
                                <span className="mt-0.5 block text-xs leading-relaxed text-[var(--bm-gray-200)]">
                                  {child.description}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ) : (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "relative rounded-md px-3 py-2 text-[15px] font-medium transition-colors",
                        isActive(link.href) ? linkActive : linkIdle
                      )}
                      aria-current={isActive(link.href) ? "page" : undefined}
                    >
                      {link.label}
                      {isActive(link.href) && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--bm-orange)]"
                        />
                      )}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </nav>

          {/* الجانب الأيسر: تواصل + زر */}
          <div className="flex items-center gap-1.5">
            <SocialIcons
              items={settings ? settings.footer.socialLinks : socialLinks}
              className="hidden xl:flex"
              iconClassName="text-[var(--bm-gray-200)] hover:bg-white/10 hover:text-[var(--bm-white)]"
            />
            <AccountLink variant="navbar" />
            <Button asChild size="sm" className={cn("hidden px-5 lg:inline-flex lg:h-10", ctaClass)}>
              <Link href="/courses">احجز دورتك</Link>
            </Button>

            {/* زر قائمة الموبايل */}
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="icon"
              className="text-[var(--bm-white)] hover:bg-white/10 hover:text-[var(--bm-white)] focus-visible:ring-2 focus-visible:ring-[var(--bm-white)] lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </Container>
      </header>

      {/* قائمة الموبايل — عنصر fixed مستقل خارج الهيدر (لذلك تحمل رموز الهوية بنفسها) */}
      <div
        id="mobile-menu"
        ref={mobileMenuRef}
        inert={!mobileOpen}
        style={brandTokens}
        className={cn(
          "fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-white/10 bg-[var(--bm-ink)] transition-all duration-300 lg:hidden",
          mobileOpen ? "visible opacity-100" : "invisible -translate-y-2 opacity-0"
        )}
        aria-hidden={!mobileOpen}
      >
        {/* القائمة تصل إلى bottom-0، فآخر عنصر فيها يقع خلف شريط الهاتف المنزلق. */}
        <Container className="pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-4">
          <nav aria-label="قائمة الجوال">
            <ul className="divide-y divide-white/10">
              {navLinks.map((link) =>
                link.children ? (
                  <li key={link.href} className="py-1">
                    <div className="flex items-center justify-between">
                      <Link
                        href={link.href}
                        onClick={closeMobileMenu}
                        className={cn(
                          "flex-1 py-3 text-base font-medium",
                          isActive(link.href) ? linkActive : "text-[var(--bm-white)]"
                        )}
                      >
                        {link.label}
                      </Link>
                      {/* هدف لمس 44px (كان 36px) */}
                      <button
                        type="button"
                        onClick={() => setMobileCoursesOpen((v) => !v)}
                        aria-expanded={mobileCoursesOpen}
                        aria-label="عرض الدورات الفرعية"
                        className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--bm-gray-200)] hover:text-[var(--bm-white)]"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={cn("h-5 w-5 transition-transform", mobileCoursesOpen && "rotate-180")}
                        />
                      </button>
                    </div>
                    {mobileCoursesOpen && (
                      <ul className="mb-2 space-y-1 border-s-2 border-[var(--bm-orange)] ps-3">
                        {link.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={closeMobileMenu}
                              className="flex min-h-11 items-center rounded-md text-sm text-[var(--bm-gray-200)] transition-colors hover:text-[var(--bm-white)]"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ) : (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMobileMenu}
                      className={cn(
                        "block py-3.5 text-base font-medium",
                        isActive(link.href) ? linkActive : "text-[var(--bm-white)]"
                      )}
                      aria-current={isActive(link.href) ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </nav>

          <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
            <Button asChild size="lg" className={cn("w-full", ctaClass)}>
              <Link href="/courses" onClick={closeMobileMenu}>احجز دورتك</Link>
            </Button>
            <AccountLink variant="mobile" onNavigate={closeMobileMenu} />
            {(!settings || settings.channels.whatsapp) && (
              <Button asChild size="lg" variant="outline" className="w-full gap-2 border-white/20 bg-transparent text-[var(--bm-white)] hover:bg-white/10 hover:text-[var(--bm-white)] focus-visible:ring-2 focus-visible:ring-[var(--bm-white)]">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-4 w-4" />
                  تواصل عبر واتساب
                </a>
              </Button>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-[var(--bm-gray-200)]">
            {(!settings || settings.channels.phone) && (
              <a
                href={phoneHref}
                className="flex min-h-11 items-center gap-2 transition-colors hover:text-[var(--bm-white)]"
              >
                <Phone className="h-4 w-4 text-[var(--bm-orange)]" aria-hidden="true" />
                <span className="num-ltr">{phoneDisplay}</span>
              </a>
            )}
            {/* 44px لكل أيقونة، وتلتف إلى سطر ثانٍ بدل أن تنضغط عند كثرة الروابط */}
            <SocialIcons
              items={settings ? settings.footer.socialLinks : socialLinks}
              className="flex-wrap gap-2"
              iconClassName="h-11 w-11 shrink-0 text-[var(--bm-gray-200)] hover:bg-white/10 hover:text-[var(--bm-white)]"
            />
          </div>
        </Container>
      </div>
    </>
  );
}
