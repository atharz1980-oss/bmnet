import type { Metadata } from "next";
import { Archivo } from "next/font/google";

/**
 * Layout منطقة الإدارة /admin (الجذر)
 * - noindex: لا تُفهرس صفحات الإدارة (متطلب PRD §4.1)
 * - metadata فقط — الهيكل والمزودات في (dashboard)/layout.tsx،
 *   وصفحة الدخول مستقلة تمامًا عن هيكل اللوحة (CP-F).
 *
 * نطاق الهوية
 * ---------------------------------------------------------------
 * `admin-root` + `data-admin-root` يفعلان رموز هوية «البيت الأسود»
 * على هذا المسار فقط:
 *   BAYT BLACK #111111 · PAPER #F3F1EC · PURE WHITE #FFFFFF
 *   ACCENT ORANGE #E65A2E (للحالة فقط)
 * محدِّد `html:has([data-admin-root])` في globals.css يوسّع النطاق
 * ليشمل بوابات Radix (Dialog/Dropdown) التي تُركَّب خارج الشجرة.
 *
 * خط العرض (Archivo variable, wdth 125) يُحمَّل هنا فقط — لا يلمس
 * الموقع العام.
 */

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

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
  return (
    <div data-admin-root="" className={`admin-root ${archivo.variable} min-h-screen bg-[#F3F1EC]`}>
      {children}
    </div>
  );
}
