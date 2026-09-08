import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/layout/admin-shell";
import { AdminStoreProvider } from "@/context/admin-store";
import { getAdminSession } from "@/lib/admin/session";

/**
 * Layout مجموعة (dashboard) — بوابة الجلسة (CP-F)
 * -------------------------------------------------
 * كل صفحات الإدارة (عدا /admin/login) تمر من هنا:
 *  1. جلسة مصادقة صالحة + ملف شخصي نشط (الحاجز الثاني بعد الـ middleware).
 *  2. AdminStoreProvider: مخزن CMS (Local حتى CP-G — يُستبدل بقاعدة البيانات).
 *  3. AdminShell: Sidebar + Topbar + Breadcrumbs — RTL كامل.
 */
export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAdminSession();
  if (!session) {
    /* حاجز ثانٍ (العمق الدفاعي): الـ middleware يفترض أن يكون قد اصطاد هذا */
    redirect("/admin/login?next=/admin");
  }

  return (
    <AdminStoreProvider>
      <AdminShell>{children}</AdminShell>
    </AdminStoreProvider>
  );
}
