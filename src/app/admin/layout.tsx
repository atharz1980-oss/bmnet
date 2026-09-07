import type { Metadata } from "next";

import { AdminStoreProvider } from "@/context/admin-store";
import { AdminShell } from "@/components/admin/layout/admin-shell";

/**
 * Layout منطقة الإدارة /admin
 * - noindex: لا تُفهرس صفحات الإدارة (متطلب PRD §4.1)
 * - AdminStoreProvider: مخزن Mock CMS (Context + localStorage)
 * - AdminShell: Sidebar + Topbar + Breadcrumbs — RTL كامل
 * - لا تسجيل دخول في هذه المرحلة، والبنية جاهزة لإضافته لاحقًا
 *   (طبقة Store/Actions معزولة عن الـ UI — راجع prd.md §4.1)
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
  return (
    <AdminStoreProvider>
      <AdminShell>{children}</AdminShell>
    </AdminStoreProvider>
  );
}
