"use client";

/**
 * Footer — تذييل الموقع (Checkpoint 7 — D-45)
 * ---------------------------------------------
 * SSR ببيانات Phase 1 الثابتة، وبعد الترطيب من إعدادات الـ CMS:
 * النبذة + الروابط السريعة/القانونية (enabled) + السوشال المفعل + التواصل.
 */
import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/shared/container";
import { SocialIcons, WhatsAppIcon } from "@/components/shared/social-icons";
import { navLinks, policyLinks, siteConfig, socialLinks as staticSocialLinks } from "@/data/site";
import { images } from "@/data/images";
import { usePublicCms } from "@/context/public-cms";
import { AccountLink } from "@/components/layout/account-link";

/** تذييل الموقع — نبذة، روابط، سياسات، بيانات تواصل */
export function Footer() {
  const year = 2026; // تثبيت السنة لتجنّب اختلاف الخادم والمتصفح — بيانات تجريبية
  const { view } = usePublicCms();
  const settings = view?.settings;
  const footer = settings?.footer;

  const siteNameAr = settings?.siteNameAr ?? siteConfig.nameAr;
  const siteNameEn = settings?.siteNameEn ?? siteConfig.nameEn;
  const city = settings?.city ?? siteConfig.city;
  const logoSrc = settings?.logo ?? images.logo;
  const quickLinks = footer?.quickLinks ?? navLinks.map((l) => ({ label: l.label, href: l.href }));
  const legalLinksNav = footer?.legalLinks ?? policyLinks;
  const socialItems = footer?.socialLinks ?? staticSocialLinks;
  const aboutText =
    footer?.aboutText ??
    "مركز متخصص في التدريب على التصوير الفوتوغرافي والفيديو وصناعة المحتوى في جدة، ببرامج عملية للأفراد والشركات يقدمها مدربون محترفون.";
  const copyright = footer?.copyright ?? `© ${year} ${siteConfig.nameAr} — جميع الحقوق محفوظة`;
  const phoneHref = `tel:${settings?.phone ?? siteConfig.phone}`;
  const phoneDisplay = settings?.phoneDisplay ?? siteConfig.phoneDisplay;
  const whatsappHref = settings?.whatsappHref ?? siteConfig.whatsappLink;
  const email = settings?.email ?? siteConfig.email;
  const address = settings?.address ?? siteConfig.address;
  const channels = settings?.channels;

  return (
    <footer className="mt-auto border-t border-white/5 bg-charcoal-950 text-charcoal-300">
      <Container className="py-12 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* نبذة عن المركز */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-md" aria-label={`${siteNameAr} – الصفحة الرئيسية`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5">
                <Image
                  src={logoSrc}
                  alt={`${siteNameAr} شعار`}
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain invert"
                />
              </span>
              <span className="leading-tight">
                <span className="block text-lg font-bold text-white">{siteNameAr}</span>
                <span className="font-latin block text-[10px] font-medium uppercase tracking-[0.22em] text-charcoal-400">
                  {siteNameEn}
                </span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed">{aboutText}</p>
            {socialItems.length > 0 && (
              <SocialIcons
                items={socialItems}
                className="mt-5"
                iconClassName="text-charcoal-400 hover:bg-white/10 hover:text-white"
              />
            )}
          </div>

          {/* روابط سريعة */}
          <nav aria-label="روابط سريعة" className="lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
              روابط سريعة
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
              {/* مدخل الحساب آخر الروابط السريعة — بنفس تنسيقها ومسافاتها. */}
              <li>
                <AccountLink variant="footer" />
              </li>
            </ul>
          </nav>

          {/* السياسات */}
          <nav aria-label="السياسات" className="lg:col-span-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">السياسات</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {legalLinksNav.map((policy) => (
                <li key={policy.href}>
                  <Link href={policy.href} className="transition-colors hover:text-white">
                    {policy.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* بيانات التواصل */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">تواصل معنا</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {(!channels || channels.phone) && (
                <li>
                  <a
                    href={phoneHref}
                    className="flex min-h-11 items-center gap-2.5 transition-colors hover:text-white lg:min-h-0"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-brand-400" aria-hidden="true" />
                    <span className="num-ltr" dir="ltr">
                      {phoneDisplay}
                    </span>
                  </a>
                </li>
              )}
              {(!channels || channels.whatsapp) && (
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-2.5 transition-colors hover:text-white lg:min-h-0"
                  >
                    <WhatsAppIcon className="h-4 w-4 shrink-0 text-brand-400" />
                    <span>واتساب</span>
                    <span className="num-ltr" dir="ltr">
                      {phoneDisplay}
                    </span>
                  </a>
                </li>
              )}
              {(!channels || channels.email) && (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="flex min-h-11 items-center gap-2.5 transition-colors hover:text-white lg:min-h-0"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-brand-400" />
                    <span className="font-latin">{email}</span>
                  </a>
                </li>
              )}
              {(!channels || channels.address) && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" aria-hidden="true" />
                  <span>{address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </Container>

      {/* الشريط السفلي */}
      <div className="border-t border-white/5">
        <Container className="flex flex-col items-center justify-between gap-3 py-5 text-xs text-charcoal-400 sm:flex-row">
          <p>{copyright}</p>
          <p className="font-latin">{siteNameEn} · {city}</p>
        </Container>
      </div>
    </footer>
  );
}
