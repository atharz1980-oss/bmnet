/**
 * عنصر «Brand Core» من ملف الهوية الرسمي (Brand assets.ai) — مستخرج حرفيًا من
 * المسار المتجهي الأصلي (المستطيل ذو الزاوية المقطوعة قطريًا)، دون رسم جديد.
 * زخرفي فقط: مخفي عن قارئات الشاشة، بلا حركة، ولونه من رموز الصفحة.
 */

const BRAND_CORE_CUT_CORNER =
  "M30.1 0.04 C39.27 0.04 48.43 0.03 57.6 0.04 C60.03 0.04 60.05 0.13 60.13 2.61 C60.24 5.87 60 8.97 57.92 11.74 C57.09 12.85 55.86 13.34 54.94 14.27 C48.94 20.35 42.9 26.38 36.92 32.47 C35.53 33.89 33.83 34.39 31.98 34.4 C22 34.44 12.02 34.4 2.04 34.45 C0.44 34.46 0.01 33.77 0.01 32.29 C0.05 22.24 0.06 12.2 0.01 2.16 C0 0.49 0.63 0 2.23 0.01 C11.52 0.06 20.81 0.03 30.1 0.04 Z";

export function BrandCoreShape({ className, color = "var(--bm-orange)" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 60.24 34.46" aria-hidden="true" focusable="false" className={className}>
      <path d={BRAND_CORE_CUT_CORNER} fill={color} />
    </svg>
  );
}
