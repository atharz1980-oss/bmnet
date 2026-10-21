"use client";

/**
 * DashboardOverview — محتوى لوحة القياس التجريبي (بيانات Mock محلية).
 * ------------------------------------------------------------------
 * كان مضمّنًا في /admin سابقًا. فُصل ليبقى مكوّن عميل، بينما أصبحت الصفحة
 * مكوّن خادم يعرض المؤشرات المالية الحقيقية فوق هذا المحتوى.
 *
 * أُزيلت بطاقة «الإيرادات (تجريبية)» عمدًا — الإيراد المحاسبي غير قابل
 * للإثبات، والمؤشرات المالية الحقيقية في لوحة منفصلة.
 */
import Link from "next/link";
import {
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
import { StatCard } from "@/components/admin/ui/stat-card";
import { BrandEyebrow } from "@/components/admin/ui/brand-eyebrow";
import { QuickActions } from "@/components/admin/dashboard/quick-actions";
import {
  MostRequestedSection,
  RecentRegistrationsSection,
  RecentRequestsSection,
  UpcomingCoursesSection,
} from "@/components/admin/dashboard/dashboard-sections";

export function DashboardOverview() {
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

  const tiles = [
    {
      label: "إجمالي الدورات",
      value: formatNumber(stats.totalCourses),
      icon: GraduationCap,
      href: "/admin/courses",
    },
    {
      label: "الدورات القادمة",
      value: formatNumber(stats.upcomingCourses),
      icon: CalendarClock,
      hint: "لها موعد تسجيل مفتوح أو قادم",
      href: "/admin/courses",
    },
    {
      label: "إجمالي المتدربين",
      value: formatNumber(stats.traineesCount),
      icon: Users,
      hint: "مجموع المسجلين في كل الدفعات",
    },
    {
      label: "طلبات الشركات الجديدة",
      value: formatNumber(stats.newRequestsCount),
      icon: Building2,
      hint: "بحالة «جديد» تنتظر التواصل",
    },
    {
      label: "المسارات",
      value: formatNumber(stats.pathsCount),
      icon: Route,
      hint: "مسارات تعلم منجزة",
    },
    {
      label: "المقالات",
      value: formatNumber(stats.postsCount),
      icon: FileText,
    },
    {
      label: "المدربون",
      value: formatNumber(stats.activeTrainersCount),
      icon: UserCog,
      hint: "مدربون بنشاط مفعّل",
    },
  ];

  return (
    <>
      {/* شريط المؤشرات — لوح واحد مقسّم بخطوط شعرية (contact sheet) */}
      <section aria-labelledby="dashboard-stats-heading" className="mb-8">
        <BrandEyebrow index="01" className="mb-3">
          المؤشرات
        </BrandEyebrow>
        <h2 id="dashboard-stats-heading" className="sr-only">
          مؤشرات لوحة التحكم
        </h2>
        <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((tile, index) => (
            <StatCard
              key={tile.label}
              index={index + 1}
              label={tile.label}
              value={tile.value}
              icon={tile.icon}
              hint={tile.hint}
              href={tile.href}
              className="border-0"
            />
          ))}
        </div>
      </section>

      {/* الإجراءات السريعة — الصفحات غير المبنية تظهر معطلة بتلميح */}
      <QuickActions className="mb-8" />

      {/* الأقسام الأربعة */}
      <section aria-labelledby="dashboard-sections-heading">
        <BrandEyebrow index="02" className="mb-3">
          النشاط
        </BrandEyebrow>
        <h2 id="dashboard-sections-heading" className="sr-only">
          أقسام النشاط
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <UpcomingCoursesSection items={upcoming} />
          <RecentRequestsSection items={recentRequests} />
          <RecentRegistrationsSection items={recentRegistrations} />
          <MostRequestedSection items={mostRequested} />
        </div>
      </section>

      <p className="mt-8 border-t border-border pt-5 text-center text-xs text-charcoal-400">
        الأقسام أعلاه تعمل على بيانات تجريبية محلية —{" "}
        <Link
          href="/admin/courses"
          className="font-medium text-[#111111] underline decoration-charcoal-300 underline-offset-4 transition-colors hover:decoration-[#111111]"
        >
          ابدأ بإدارة الدورات
        </Link>
      </p>
    </>
  );
}
