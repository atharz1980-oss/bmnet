import type { Metadata } from "next";
import { ContactDetails } from "@/components/forms/contact-details";
import { ContactHero } from "./_brand/contact-hero";
import { brandLatin } from "./_brand/fonts";
import { brandTokens } from "@/components/brand/brand-tokens";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description:
    "تواصل مع بيت المصور في جدة: هاتف، واتساب، بريد إلكتروني، أو أرسل رسالتك مباشرة عبر نموذج التواصل.",
  alternates: { canonical: "/contact" },
};

/**
 * المرحلة B1 — معاينة الهوية الرسمية على صفحة التواصل وحدها.
 * الرموز (الألوان) وخط Montserrat معزولة على غلاف هذه الصفحة — لا تمس :root ولا بقية الصفحات.
 * المحتوى ووظيفة النموذج كما هما.
 */
export default function ContactPage() {
  return (
    <div
      style={brandTokens}
      className={`${brandLatin.variable} bg-[var(--bm-offwhite)] font-[family-name:var(--font-ibm-plex-arabic)] text-[var(--bm-ink)]`}
    >
      <ContactHero
        title="تواصل معنا"
        description="فريق بيت المصور جاهز للإجابة عن استفساراتك حول الدورات والبرامج التدريبية."
      />
      {/* Checkpoint 7: القنوات المفعلة من إعدادات الـ CMS بعد الترطيب */}
      <ContactDetails />
    </div>
  );
}
