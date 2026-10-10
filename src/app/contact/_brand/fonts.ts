/**
 * Montserrat — الخط الإنجليزي المعتمد في ملف الهوية (Extra font for only English).
 * المصدر: Google Fonts عبر next/font (يُستضاف مع الموقع وقت البناء — لا طلب إلى Google
 * من متصفح الزائر). الترخيص: SIL Open Font License 1.1.
 * مقصور على صفحة /contact في المرحلة التجريبية، وبالأوزان المستخدمة فقط.
 * IBM Plex Sans Arabic (العربي والإنجليزي) محمَّل أصلًا على مستوى الموقع بالأوزان 300–700.
 */
import { Montserrat } from "next/font/google";

export const brandLatin = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-bm-montserrat",
  display: "swap",
  /* لا تحميل مسبق: يُستخدم لكلمات إنجليزية وأرقام قليلة فقط، فلا يزاحم الخط العربي على المسار الحرج. */
  preload: false,
  adjustFontFallback: true,
});
