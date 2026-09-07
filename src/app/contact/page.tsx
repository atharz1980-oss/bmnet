import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ContactDetails } from "@/components/forms/contact-details";
import { images } from "@/data/images";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description:
    "تواصل مع بيت المصور في جدة: هاتف، واتساب، بريد إلكتروني، أو أرسل رسالتك مباشرة عبر نموذج التواصل.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="تواصل معنا"
        description="فريق بيت المصور جاهز للإجابة عن استفساراتك حول الدورات والبرامج التدريبية."
        breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: "تواصل معنا" }]}
        backgroundImage={images.categories.private.src}
        imageAlt={images.categories.private.alt}
      />
      {/* Checkpoint 7: القنوات المفعلة من إعدادات الـ CMS بعد الترطيب */}
      <ContactDetails />
    </>
  );
}
