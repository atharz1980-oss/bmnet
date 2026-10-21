/**
 * /admin — لوحة القياس (Dashboard Home)
 * -------------------------------------
 * مكوّن خادم: يعرض المؤشرات المالية الحقيقية (FinancialKpisPanel) محصورةً
 * بصلاحية payments:view، فوق محتوى لوحة القياس التجريبي (DashboardOverview).
 * أُزيل عرض «الإيرادات (تجريبية)» — لا إيراد محاسبي قابل للإثبات.
 *
 * البنية البصرية تتبع ملف الهوية: لافتة حبر تتحرك بالعلامة،
 * ثم عنوان، ثم خط شعري، ثم المؤشرات والأقسام.
 */
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { DashboardHero } from "@/components/admin/dashboard/dashboard-hero";
import { DashboardOverview } from "@/components/admin/dashboard/dashboard-overview";
import { FinancialKpisPanel } from "@/components/admin/dashboard/financial-kpis-panel";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <DashboardHero />

      <AdminPageHeader
        eyebrow="نظرة عامة"
        index="00"
        title="لوحة التحكم"
        description="نظرة عامة على أداء بيت المصور: المؤشرات المالية الحقيقية، ثم أقسام تجريبية محلية في هذه المرحلة."
      />

      <FinancialKpisPanel className="mb-8" />

      <DashboardOverview />
    </div>
  );
}
