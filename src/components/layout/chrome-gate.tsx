"use client";

import { usePathname } from "next/navigation";

/**
 * ChromeGate — يخفي واجهة الموقع العامة (Navbar/Footer) داخل منطقة /admin.
 *
 * البنية: Navbar وFooter يظلان Server Components في الـ Root Layout
 * ويُمرَّران هنا كـ children — لذلك لا يتحول الـ Layout بالكامل إلى Client،
 * ولا تُعاد هيكلة صفحات Phase 1.
 *
 * ملاحظة hydration: usePathname متاح أثناء SSR بقيمة المسار الفعلي،
 * فصفحات /admin لا تُصيَّر فيها الواجهة العامة أصلاً (لا وميض ولا mismatch).
 *
 * القرار المعماري: memory.md — D-01
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return <>{children}</>;
}
