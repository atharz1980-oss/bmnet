"use client";

/**
 * /admin — لوحة القياس (Dashboard Home) — المهمة #7
 * ---------------------------------------------------
 * 8 إحصائيات + 4 أقسام + Quick Actions. كل القيم مشتقة من
 * Selectors نقية فوق مخزن الـ Mock (لا أرقام Hardcoded داخل
 * المكوّن) — قرار معماري D-09: القيم المحسوبة لا تُخزَّن.
 */
import Link from "next/link";
import {
  Banknote,
  Building2,
  CalendarClock,
  FileText,
  GraduationCap,
  Route,
  UserCog,
  Users,
} from "lucide-react";
import { useMemo } from "react";

import { useAdminData } from "@/context/admin-store";
import {
  getDashboardStats,
  getMostRequestedCourses,
  getRecentRegistrations,
  getUpcomingSessions,
} from "@/data/admin/selectors";
import { formatNumber } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { StatCard } from "@/components/admin/ui/stat-card";
import { QuickActions } from "@/components/admin/dashboard/quick-actions";
import {
  MostRequestedSection,
  RecentRegistrationsSection,
  RecentRequestsSection,
  UpcomingCoursesSection,
} from "@/components/admin/dashboard/dashboard-sections";

export default function AdminDashboardPage() {
  const data = useAdminData();

  /* كل الإحصائيات والقوائم عبر Selectors — مصدر واحد للحقيقة */
  const stats = useMemo(() => getDashboardStats(data), [data]);
  const upcoming = useMemo(() => getUpcomingSessions(data, 5), [data]);
  const recentRequests = useMemo(
    () =>
      [...data.requests]
        .filter((request) => !request.archivedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [data],
  );
  const recentRegistrations = useMemo(() => getRecentRegistrations(data, 5), [data]);
  const mostRequested = useMemo(() => getMostRequestedCourses(data.courses, 4), [data]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="لوحة التحكم"
        description="نظرة عامة على أداء بيت المصور: الدورات والتسجيلات وطلبات الشركات — بيانات تجريبية محلية في هذه المرحلة."
      />

      {/* الإحصائيات الثمانية — من getDashboardStats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="إجمالي الدورات"
          value={formatNumber(stats.totalCourses)}
          icon={GraduationCap}
          href="/admin/courses"
        />
        <StatCard
          label="الدورات القادمة"
          value={formatNumber(stats.upcomingCourses)}
          icon={CalendarClock}
          hint="لها موعد بتسجيل مفتوح أو قادم"
          href="/admin/courses"
        />
        <StatCard
          label="إجمالي المتدربين"
          value={formatNumber(stats.traineesCount)}
          icon={Users}
          hint="مجموع المسجلين في كل الدفعات"
        />
        <StatCard
          label="الإيرادات (تجريبية)"
          value={`${formatNumber(stats.revenue)} ريال`}
          icon={Banknote}
          hint="تقدير من التسجيلات × الأسعار"
        />
        <StatCard
          label="طلبات الشركات الجديدة"
          value={formatNumber(stats.newRequestsCount)}
          icon={Building2}
          hint="بحالة «جديد» تنتظر التواصل"
        />
        <StatCard
          label="المسارات"
          value={formatNumber(stats.pathsCount)}
          icon={Route}
          hint="مسارات تعلم منجزة"
        />
        <StatCard label="المقالات" value={formatNumber(stats.postsCount)} icon={FileText} />
        <StatCard
          label="المدربون"
          value={formatNumber(stats.activeTrainersCount)}
          icon={UserCog}
          hint="مدربون بنشاط مفعّل"
        />
      </div>

      {/* الإجراءات السريعة — الصفحات غير المبنية تظهر معطلة بتلميح */}
      <QuickActions className="mb-6" />

      {/* الأقسام الأربعة */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <UpcomingCoursesSection items={upcoming} />
        <RecentRequestsSection items={recentRequests} />
        <RecentRegistrationsSection items={recentRegistrations} />
        <MostRequestedSection items={mostRequested} />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        أقسام لوحة القياس تعمل على بيانات تجريبية محلية —{" "}
        <Link
          href="/admin/courses"
          className="rounded font-medium text-brand-600 hover:text-brand-700"
        >
          ابدأ بإدارة الدورات
        </Link>
      </p>
    </div>
  );
}
