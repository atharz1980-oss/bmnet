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

  /* المنصات المفعّلة في «بيانات التواصل» — القائمة نفسها المستخدمة في الهيدر والفوتر */
  const socialItems = settings ? settings.footer.socialLinks : staticSocialLinks;

  /*
   * المرحلة B1: العرض بألوان الهوية الرسمية عبر رموز --bm-* المعرّفة في نطاق صفحة /contact
   * (src/app/contact/_brand/tokens.ts). هذا المكوّن لا يُستخدم إلا في تلك الصفحة.
   * البيانات والقنوات والروابط كما هي.
   */
  return (
    <Container className="pb-16 pt-10 sm:pb-20 sm:pt-14 lg:pb-28 lg:pt-20">
      <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
        {/* بيانات التواصل */}
        {/* min-w-0: عنصر الشبكة لا يتمدد بعرض أطول سطر (كان يقص النص على الجوال). */}
        <Reveal className="min-w-0 lg:col-span-2">
          <h2 className="text-2xl font-bold leading-snug text-[var(--bm-ink)]">بيانات التواصل</h2>
          <p className="mt-3 text-base leading-[1.9] text-[var(--bm-ink-72)]">
            يمكنك التواصل مباشرة عبر أي من القنوات التالية، أو زيارتنا في مقر المركز بجدة.
          </p>
          <ul className="mt-8 space-y-3">
            {contactItems.map((item) => {
              const content = (
                <>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bm-offwhite)] text-[var(--bm-orange)]">
                    <item.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-[var(--bm-ink-72)]">{item.label}</span>
                    {/* يلتف بدل القص: العنوان الطويل يظهر كاملًا على الشاشات الصغيرة. */}
                    <span
                      className={`mt-0.5 block break-words text-base font-semibold leading-relaxed text-[var(--bm-ink)]${item.ltr ? " font-[family-name:var(--font-bm-montserrat),var(--font-ibm-plex-arabic)]" : ""}`}
                      dir={item.ltr ? "ltr" : undefined}
                    >
                      {item.value}
                    </span>
                  </span>
                </>
              );
              const card =
                "flex min-h-[4.5rem] items-center gap-4 rounded-2xl border border-[var(--bm-gray-200)] bg-[var(--bm-white)] p-3 sm:p-4";
              return (
                <li key={item.label}>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className={`${card} outline-none transition-colors hover:border-[var(--bm-gray)] focus-visible:ring-2 focus-visible:ring-[var(--bm-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bm-offwhite)] motion-reduce:transition-none`}
                    >
                      {content}
                    </a>
                  ) : (
                    <div className={card}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
          {socialItems.length > 0 && (
            <div className="mt-8 border-t border-[var(--bm-gray-200)] pt-6">
              <p className="text-sm text-[var(--bm-ink-72)]">تابعنا على</p>
              <SocialIcons
                items={socialItems}
                className="mt-3 flex-wrap gap-2"
                iconClassName="h-11 w-11 shrink-0 bg-[var(--bm-white)] text-[var(--bm-ink)] hover:bg-[var(--bm-gray-100)] hover:text-[var(--bm-ink)] focus-visible:ring-2 focus-visible:ring-[var(--bm-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bm-offwhite)]"
              />
            </div>
          )}
        </Reveal>

        {/* النموذج */}
        <Reveal delay={100} className="min-w-0 lg:col-span-3">
          <div className="rounded-3xl bg-[var(--bm-white)] p-5 shadow-[0_1px_2px_rgba(29,29,27,0.06)] ring-1 ring-[var(--bm-gray-200)] sm:p-8 lg:p-10">
            <h2 className="text-2xl font-bold leading-snug text-[var(--bm-ink)]">أرسل رسالتك</h2>
            <p className="mb-8 mt-3 text-base leading-[1.9] text-[var(--bm-ink-72)]">
              عبّئ البيانات التالية وسنعود إليك في أقرب وقت.
            </p>
            <ContactForm />
          </div>
        </Reveal>
      </div>
    </Container>
  );
}
