/**
 * /admin — لوحة القياس (Dashboard Home)
 * -------------------------------------
 * مكوّن خادم: يعرض المؤشرات المالية الحقيقية (FinancialKpisPanel) محصورةً
 * بصلاحية payments:view، فوق محتوى لوحة القياس التجريبي (DashboardOverview).
 * أُزيل عرض «الإيرادات (تجريبية)» — لا إيراد محاسبي قابل للإثبات.
 */
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { DashboardOverview } from "@/components/admin/dashboard/dashboard-overview";
import { FinancialKpisPanel } from "@/components/admin/dashboard/financial-kpis-panel";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="لوحة التحكم"
        description="نظرة عامة على أداء بيت المصور: المؤشرات المالية الحقيقية، ثم أقسام تجريبية محلية في هذه المرحلة."
      />

      <FinancialKpisPanel className="mb-8" />

      <DashboardOverview />
    </div>
  );
}
