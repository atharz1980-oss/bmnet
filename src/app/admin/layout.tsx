import type { Metadata } from "next";

/**
 * Layout منطقة الإدارة /admin (الجذر)
 * - noindex: لا تُفهرس صفحات الإدارة (متطلب PRD §4.1)
 * - metadata فقط — الهيكل والمزودات في (dashboard)/layout.tsx،
 *   وصفحة الدخول مستقلة تمامًا عن هيكل اللوحة (CP-F).
 */
export const metadata: Metadata = {
  title: "لوحة التحكم",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
