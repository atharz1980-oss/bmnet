import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/layout/admin-shell";
import { AdminStoreProvider } from "@/context/admin-store";
import { getAdminSession } from "@/lib/admin/session";
import { loadAdminData } from "@/lib/cms/admin-loader";

/**
 * Layout مجموعة (dashboard) — بوابة الجلسة + بيانات القاعدة (CP-F/CP-G)
 * ---------------------------------------------------------------------
 * كل صفحات الإدارة (عدا /admin/login) تمر من هنا:
 *  1. جلسة مصادقة صالحة + ملف شخصي نشط (الحاجز الثاني بعد الـ middleware).
 *  2. loadAdminData: حمل صارم من قاعدة البيانات عبر عميل الخدمة (D-85) —
 *     أي فشل يعرض لوحة خطأ عربية مع زر إعادة المحاولة (لا بيانات وهمية).
 *  3. AdminStoreProvider + AdminShell: مخزن متصل بالقاعدة + هيكل RTL.
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

  let adminData;
  let refreshError: string | null = null;
  try {
    adminData = await loadAdminData();
    adminData.currentUserId = session.userId;
  } catch (error) {
    adminData = null;
    refreshError = error instanceof Error ? error.message : "خطأ غير معروف";
  }

  if (!adminData) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-8 max-w-lg">
          <h2 className="mb-2 text-lg font-bold text-destructive">
            تعذر تحميل بيانات لوحة التحكم
          </h2>
          <p className="text-sm text-charcoal-600" dir="rtl">
            {refreshError}
          </p>
          <p className="mt-3 text-xs text-charcoal-400">
            تحقق من الاتصال بقاعدة البيانات ثم أعد تحديث الصفحة.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminStoreProvider
      session={{
        userId: session.userId,
        name: session.name,
        roleId: session.roleId,
      }}
      initialData={adminData}
      refreshError={refreshError}
    >
      <AdminShell>{children}</AdminShell>
    </AdminStoreProvider>
  );
}
