import type { SocialLink } from "@/types";

/**
 * إعدادات الموقع المركزية — بيانات تجريبية (Mock)
 * غيّر القيم هنا فقط لتتحدث في كل الموقع.
 */

export const siteConfig = {
  nameAr: "بيت المصور",
  nameEn: "Bayt Almosawer",
  tagline: "مركز التدريب على التصوير وصناعة المحتوى",
  description:
    "بيت المصور مركز متخصص في التدريب على التصوير الفوتوغرافي والفيديو وصناعة المحتوى في جدة، يقدّم دورات حضورية وأونلاين وبرامج تدريب مخصصة للأفراد والشركات.",
  url: "https://baytalmosawer.com", // تجريبي — يُحدَّث عند النشر
  city: "جدة",
  address: "جدة – حي الروضة، شارع الأمير سلطان",
  phone: "+966551234567",
  phoneDisplay: "+966 55 123 4567",
  whatsapp: "+966551234567",
  whatsappLink:
    "https://wa.me/966551234567?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%B1%D8%AF%D8%AA%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D8%A7%D8%AA",
  email: "info@baytalmosawer.com",
  workingHours: "السبت – الخميس: 9 صباحاً – 9 مساءً",
} as const;

export const socialLinks: SocialLink[] = [
  { id: "instagram", label: "إنستغرام", href: "https://instagram.com/baytalmosawer" },
  { id: "tiktok", label: "تيك توك", href: "https://tiktok.com/@baytalmosawer" },
  { id: "whatsapp", label: "واتساب", href: siteConfig.whatsappLink },
  { id: "email", label: "البريد الإلكتروني", href: `mailto:${siteConfig.email}` },
];

export interface NavLink {
  label: string;
  href: string;
  /** قائمة فرعية (Dropdown) */
  children?: { label: string; href: string; description?: string }[];
}

export const navLinks: NavLink[] = [
  { label: "الرئيسية", href: "/" },
  { label: "من نحن", href: "/about" },
  {
    label: "الدورات",
    href: "/courses",
    children: [
      {
        label: "حضوري أفراد",
        href: "/courses?category=in-person-individuals",
        description: "دورات عملية في مقر المركز بمجموعات صغيرة",
      },
      {
        label: "حضوري شركات",
        href: "/corporate-training",
        description: "برامج تدريبية مصممة لفرق العمل والجهات",
      },
      {
        label: "أونلاين",
        href: "/courses?category=online",
        description: "تعلّم عن بُعد بجلسات مباشرة ومسجلة",
      },
      {
        label: "برايفت",
        href: "/courses?category=private",
        description: "تدريب فردي بإشراف مباشر حسب هدفك",
      },
    ],
  },
  { label: "المسارات", href: "/paths" },
  { label: "المدونة", href: "/blog" },
  { label: "تواصل معنا", href: "/contact" },
];

export const policyLinks = [
  { label: "سياسة الخصوصية", href: "/policies/privacy" },
  { label: "الشروط والأحكام", href: "/policies/terms" },
  { label: "سياسة الاسترجاع", href: "/policies/refund" },
  { label: "سياسة التسجيل والإلغاء", href: "/policies/registration-cancellation" },
];
