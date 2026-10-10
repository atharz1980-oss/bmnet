import type { CSSProperties } from "react";

/**
 * رموز الهوية التجريبية لصفحة /contact فقط (المرحلة B1) — تُطبَّق كمتغيرات CSS على غلاف
 * الصفحة نفسه (style)، فلا تمس :root ولا ألوان المنصة، ولا تضيف ملف CSS يعطّل العرض.
 *
 * المصدر: Brand assets.ai (بيانات Illustrator الأصلية، RGB) — القيم كما هي حرفيًا،
 * عدا --bm-ink-72 المشتق (الفحمي بشفافية 72% على الأبيض) لنص ثانوي يجتاز 4.5:1.
 */
export const brandTokens = {
  "--bm-orange": "#E65A2E", // Orange — مؤكد من .ai
  "--bm-ink": "#1D1D1B", // Dark — لون الأشكال في .ai
  "--bm-black": "#000000", // Black — مربع اللون في .ai
  "--bm-white": "#FFFFFF",
  "--bm-gray": "#878787", // Gray — مؤكد من .ai
  "--bm-gray-200": "#DADADA", // Light gray — مؤكد من .ai
  "--bm-gray-100": "#EDEDED", // Very light gray — مؤكد من .ai
  "--bm-offwhite": "#F3F1EC", // Off-white — مؤكد من .ai
  "--bm-ink-72": "#5C5C5B", // مشتق للإتاحة: نص ثانوي 6.69:1 على الأبيض
} as CSSProperties;

/** Montserrat للإنجليزية والأرقام اللاتينية فقط، مع IBM Plex Sans Arabic احتياطًا. */
export const latinFont = "font-[family-name:var(--font-bm-montserrat),var(--font-ibm-plex-arabic)]";

/** سطر علوي لاتيني (Metadata tag) بأسلوب ملف الهوية. */
export const eyebrowClass = `${latinFont} text-xs font-semibold uppercase tracking-[0.2em]`;
