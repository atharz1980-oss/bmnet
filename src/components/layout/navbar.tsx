"use client";

import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

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

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/5 bg-charcoal-950/95 text-white backdrop-blur supports-[backdrop-filter]:bg-charcoal-950/85">
      <Container>
        <div className="flex h-16 items-center justify-between gap-3 lg:h-[76px]">
          {/* الشعار */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-md"
            aria-label={`${siteNameAr} – الصفحة الرئيسية`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 sm:h-11 sm:w-11">
              <Image
                src={logoSrc}
                alt={`${siteNameAr} شعار`}
                width={40}
                height={40}
                className="h-7 w-7 object-contain invert sm:h-8 sm:w-8"
                priority
              />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold sm:text-lg">{siteNameAr}</span>
              <span className="font-latin block text-[9px] font-medium uppercase tracking-[0.22em] text-charcoal-400 sm:text-[10px]">
                {siteNameEn}
              </span>
            </span>
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
                          "rounded-md px-3 py-2 text-[15px] font-medium transition-colors hover:text-white",
                          isActive(link.href) ? "text-brand-400" : "text-charcoal-200"
                        )}
                        aria-haspopup="true"
                        aria-expanded={coursesOpen}
                      >
                        {link.label}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setCoursesOpen((v) => !v)}
                        onKeyDown={(e) => e.key === "Escape" && setCoursesOpen(false)}
                        aria-label="فتح قائمة الدورات الفرعية"
                        aria-expanded={coursesOpen}
                        className="-ms-1 rounded-md p-1 text-charcoal-300 transition-colors hover:text-white"
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
                      <ul className="overflow-hidden rounded-xl border border-charcoal-800 bg-charcoal-900 p-1.5 shadow-xl shadow-black/30">
                        {link.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              tabIndex={coursesOpen ? 0 : -1}
                              className="block rounded-lg px-3.5 py-2.5 transition-colors hover:bg-charcoal-800 focus-visible:bg-charcoal-800"
                            >
                              <span className="block text-sm font-semibold text-white">
                                {child.label}
                              </span>
                              {child.description ? (
                                <span className="mt-0.5 block text-xs leading-relaxed text-charcoal-400">
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
                        "relative rounded-md px-3 py-2 text-[15px] font-medium transition-colors hover:text-white",
                        isActive(link.href) ? "text-brand-400" : "text-charcoal-200"
                      )}
                      aria-current={isActive(link.href) ? "page" : undefined}
                    >
                      {link.label}
                      {isActive(link.href) && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-500"
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
              iconClassName="text-charcoal-300 hover:bg-white/10 hover:text-white"
            />
            <AccountLink variant="navbar" />
            <Button asChild size="sm" className="hidden lg:inline-flex">
              <Link href="/courses">احجز دورتك</Link>
            </Button>

            {/* زر قائمة الموبايل */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white lg:hidden"
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

      {/* قائمة الموبايل — خارج الهيدر لتفادي تأثير backdrop-blur على fixed */}
      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-white/5 bg-charcoal-950 transition-all duration-300 lg:hidden",
          mobileOpen ? "visible opacity-100" : "invisible -translate-y-2 opacity-0"
        )}
        aria-hidden={!mobileOpen}
      >
        {/* القائمة تصل إلى bottom-0، فآخر عنصر فيها يقع خلف شريط الهاتف المنزلق. */}
        <Container className="pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-4">
          <nav aria-label="قائمة الجوال">
            <ul className="divide-y divide-white/5">
              {navLinks.map((link) =>
                link.children ? (
                  <li key={link.href} className="py-1">
                    <div className="flex items-center justify-between">
                      <Link
                        href={link.href}
                        onClick={closeMobileMenu}
                        className={cn(
                          "flex-1 py-3 text-base font-medium",
                          isActive(link.href) ? "text-brand-400" : "text-white"
                        )}
                      >
                        {link.label}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setMobileCoursesOpen((v) => !v)}
                        aria-expanded={mobileCoursesOpen}
                        aria-label="عرض الدورات الفرعية"
                        className="rounded-md p-2 text-charcoal-300"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={cn("h-5 w-5 transition-transform", mobileCoursesOpen && "rotate-180")}
                        />
                      </button>
                    </div>
                    {mobileCoursesOpen && (
                      <ul className="mb-2 space-y-1 border-s-2 border-brand-600/60 ps-3">
                        {link.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={closeMobileMenu}
                              className="block rounded-md py-2 text-sm text-charcoal-300 transition-colors hover:text-white"
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
                        isActive(link.href) ? "text-brand-400" : "text-white"
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

          <div className="mt-6 space-y-3 border-t border-white/5 pt-6">
            <Button asChild size="lg" className="w-full">
              <Link href="/courses" onClick={closeMobileMenu}>احجز دورتك</Link>
            </Button>
            <AccountLink variant="mobile" onNavigate={closeMobileMenu} />
            {(!settings || settings.channels.whatsapp) && (
              <Button asChild size="lg" variant="outline" className="w-full gap-2 border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-4 w-4" />
                  تواصل عبر واتساب
                </a>
              </Button>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/5 pt-6 text-sm text-charcoal-300">
            {(!settings || settings.channels.phone) && (
              <a
                href={phoneHref}
                className="flex items-center gap-2 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4 text-brand-400" aria-hidden="true" />
                <span className="num-ltr">{phoneDisplay}</span>
              </a>
            )}
            <SocialIcons
              items={settings ? settings.footer.socialLinks : socialLinks}
              iconClassName="text-charcoal-300 hover:bg-white/10 hover:text-white"
            />
          </div>
        </Container>
      </div>
    </>
  );
}
