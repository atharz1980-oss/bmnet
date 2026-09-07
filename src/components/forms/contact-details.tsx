"use client";

/**
 * ContactDetails — بيانات التواصل (Checkpoint 7 — D-45)
 * --------------------------------------------------------
 * SSR ببيانات Phase 1 الثابتة، وبعد الترطيب من إعدادات التواصل في الـ CMS:
 * القيم + تفعيل/تعطيل كل قناة + توليد wa.me من الرقم المطبّع.
 */
import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { ContactForm } from "@/components/forms/contact-form";
import { SocialIcons, WhatsAppIcon } from "@/components/shared/social-icons";
import { siteConfig, socialLinks as staticSocialLinks } from "@/data/site";
import { usePublicCms } from "@/context/public-cms";

export function ContactDetails() {
  const { view } = usePublicCms();
  const settings = view?.settings;

  const phoneDisplay = settings?.phoneDisplay ?? siteConfig.phoneDisplay;
  const phoneHref = `tel:${settings?.phone ?? siteConfig.phone}`;
  const whatsappHref = settings?.whatsappHref ?? siteConfig.whatsappLink;
  const email = settings?.email ?? siteConfig.email;
  const address = settings?.address ?? siteConfig.address;
  const workingHours = settings?.workingHours ?? siteConfig.workingHours;
  const channels = settings?.channels;

  const contactItems = [
    channels && !channels.phone
      ? null
      : {
          icon: Phone,
          label: "الهاتف",
          value: phoneDisplay,
          href: phoneHref,
          ltr: true,
        },
    channels && !channels.whatsapp
      ? null
      : {
          icon: WhatsAppIcon,
          label: "واتساب",
          value: phoneDisplay,
          href: whatsappHref,
          ltr: true,
        },
    channels && !channels.email
      ? null
      : {
          icon: Mail,
          label: "البريد الإلكتروني",
          value: email,
          href: `mailto:${email}`,
          ltr: true,
        },
    channels && !channels.address
      ? null
      : {
          icon: MapPin,
          label: "المقر",
          value: address,
          /* رابط الخريطة إن فُعّل ووُجد — وإلا عنصر نصي */
          href: channels?.maps && settings?.mapsUrl ? settings.mapsUrl : undefined,
          ltr: false,
        },
    channels && !channels.workingHours
      ? null
      : {
          icon: Clock3,
          label: "أوقات العمل",
          value: workingHours,
          href: undefined,
          ltr: false,
        },
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  /* أيقونات التواصل الاجتماعي مفعلة فقط حسب الإعدادات */
  const socialItems = settings
    ? settings.footer.socialLinks.filter((link) => {
        if (link.id === "instagram") return settings.channels.instagram;
        if (link.id === "tiktok") return settings.channels.tiktok;
        if (link.id === "whatsapp") return settings.channels.whatsapp;
        if (link.id === "email") return settings.channels.email;
        return false;
      })
    : staticSocialLinks;

  return (
    <Container className="py-12 sm:py-16 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-5 lg:gap-12">
        {/* بيانات التواصل */}
        <Reveal className="lg:col-span-2">
          <h2 className="text-xl font-bold tracking-tight text-charcoal-900">بيانات التواصل</h2>
          <p className="mt-2.5 text-sm leading-relaxed text-charcoal-500">
            يمكنك التواصل مباشرة عبر أي من القنوات التالية، أو زيارتنا في مقر المركز بجدة.
          </p>
          <ul className="mt-6 space-y-4">
            {contactItems.map((item) => {
              const content = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <item.icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-charcoal-400">{item.label}</span>
                    <span
                      className="block truncate text-sm font-semibold text-charcoal-900"
                      dir={item.ltr ? "ltr" : undefined}
                    >
                      {item.value}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={item.label}>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="flex items-center gap-3.5 rounded-xl border border-transparent p-2 transition-colors hover:border-charcoal-200 hover:bg-white"
                    >
                      {content}
                    </a>
                  ) : (
                    <div className="flex items-center gap-3.5 p-2">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
          {socialItems.length > 0 && (
            <div className="mt-6 border-t border-charcoal-100 pt-5">
              <p className="text-xs text-charcoal-400">تابعنا على</p>
              <SocialIcons items={socialItems} className="mt-2" />
            </div>
          )}
        </Reveal>

        {/* النموذج */}
        <Reveal delay={100} className="lg:col-span-3">
          <div className="rounded-2xl border border-charcoal-200/80 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold tracking-tight text-charcoal-900">أرسل رسالتك</h2>
            <p className="mb-6 mt-2 text-sm leading-relaxed text-charcoal-500">
              عبّئ البيانات التالية وسنعود إليك في أقرب وقت.
            </p>
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </Container>
  );
}
