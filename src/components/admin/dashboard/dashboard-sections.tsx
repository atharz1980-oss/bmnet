"use client";

/**
 * DashboardSections — أقسام لوحة التحكم الأربعة
 * ---------------------------------------------------------------
 * كل القيم مشتقة من Selectors فوق مخزن الـ Mock — لا أرقام مكررة
 * داخل المكوّنات. الروابط فقط لصفحات مبنية (لا Broken Links).
 *
 * النمط: لوح أبيض + خط شعري + صفوف مفصولة بخطوط (لا ظلال ولا زوايا).
 */
import Link from "next/link";
import { CalendarClock, ChevronLeft, Star } from "lucide-react";

import type { AdminCourse, CorporateRequest, CourseSession, SessionStatus } from "@/data/admin/types";
import type { MockRegistration } from "@/data/admin/selectors";
import { getDerivedSessionStatus, getSessionFillPercent } from "@/data/admin/selectors";
import { formatDate, formatNumber, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BrandMeter } from "@/components/admin/ui/brand-meter";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { EmptyState } from "@/components/admin/ui/empty-state";

/* ─────────────────── بطاقة قسم موحدة ─────────────────── */

function SectionCard({
  title,
  count,
  viewAllHref,
  children,
  className,
}: {
  title: string;
  count?: number;
  /** رابط "عرض الكل" — يُعرض فقط للصفحات مبنية */
  viewAllHref?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn("flex flex-col border border-border bg-white", className)}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="brand-micro flex items-center gap-2 text-[#111111]">
          {title}
          {typeof count === "number" ? (
            <span className="num-ltr text-charcoal-300" dir="ltr">
              {String(count).padStart(2, "0")}
            </span>
          ) : null}
        </h2>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="group flex items-center gap-1 text-xs font-medium text-charcoal-500 transition-colors hover:text-[#111111]"
          >
            عرض الكل
            <ChevronLeft
              aria-hidden="true"
              className="brand-chevron h-3.5 w-3.5"
              strokeWidth={1.5}
            />
          </Link>
        ) : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/* ─────────────────── 1) أقرب الدورات ─────────────────── */

export function UpcomingCoursesSection({
  items,
}: {
  items: Array<{ course: AdminCourse; session: CourseSession }>;
}) {
  return (
    <SectionCard title="أقرب الدورات" count={items.length} viewAllHref="/admin/courses" className="lg:col-span-2">
      {items.length === 0 ? (
        <EmptyState
          title="لا مواعيد قادمة"
          description="أضف موعدًا جديدًا من صفحة أي دورة لتظهر هنا."
          icon={CalendarClock}
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map(({ course, session }) => {
            const fill = getSessionFillPercent(session);
            const displayStatus: SessionStatus = getDerivedSessionStatus(session);
            return (
              <li key={`${course.id}:${session.id}`} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-[#111111] transition-colors hover:text-brand-600"
                  >
                    {course.name}
                  </Link>
                  <StatusBadge status={displayStatus} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-charcoal-400">
                  <span>{formatDate(session.startDate)}</span>
                  <span className="num-ltr">
                    {formatNumber(session.registered)}/{formatNumber(session.seats)} مسجل
                  </span>
                  <BrandMeter
                    value={fill}
                    className="w-24 shrink-0"
                    label={`${formatNumber(session.registered)} من ${formatNumber(session.seats)} مقعد`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

/* ─────────────────── 2) آخر طلبات الشركات ─────────────────── */

export function RecentRequestsSection({ items }: { items: CorporateRequest[] }) {
  return (
    <SectionCard title="آخر طلبات الشركات" count={items.length}>
      {items.length === 0 ? (
        <EmptyState
          title="لا طلبات بعد"
          description="ستظهر هنا طلبات تدريب الشركات عند وصولها."
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((request) => (
            <li key={request.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#111111]">{request.company}</p>
                <p className="mt-0.5 truncate text-xs text-charcoal-400">
                  {request.requestedCourse} — {formatShortDate(request.createdAt.slice(0, 10))}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ─────────────────── 3) آخر التسجيلات (Mock مشتق) ─────────────────── */

export function RecentRegistrationsSection({ items }: { items: MockRegistration[] }) {
  return (
    <SectionCard title="آخر التسجيلات" count={items.reduce((sum, item) => sum + item.registered, 0)}>
      {items.length === 0 ? (
        <EmptyState
          title="لا تسجيلات بعد"
          description="عند تسجيل متدربين في أي دفعة ستظهر تلخيصاتها هنا."
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/admin/courses/${item.course.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-[#111111] transition-colors hover:text-brand-600"
                >
                  {item.course.name}
                </Link>
                <span className="shrink-0 text-xs font-semibold text-[#111111] num-ltr">
                  +{formatNumber(item.registered)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-charcoal-400">
                {item.session.batchName ?? "دفعة"} — تبدأ {formatShortDate(item.session.startDate)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ─────────────────── 4) أكثر الدورات طلبًا ─────────────────── */

export function MostRequestedSection({
  items,
}: {
  items: Array<{ course: AdminCourse; registered: number }>;
}) {
  const max = Math.max(...items.map((item) => item.registered), 1);
  return (
    <SectionCard title="أكثر الدورات طلبًا" count={items.length} viewAllHref="/admin/courses">
      {items.length === 0 ? (
        <EmptyState
          title="لا بيانات كافية"
          description="ستظهر الدورات الأكثر طلبًا بعد تسجيل المتدربين."
          icon={Star}
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <ul className="space-y-3.5">
          {items.map(({ course, registered }) => (
            <li key={course.id}>
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-[#111111] transition-colors hover:text-brand-600"
                >
                  {course.name}
                </Link>
                <span className="shrink-0 text-xs font-semibold text-charcoal-600 num-ltr">
                  {formatNumber(registered)} مسجل
                </span>
              </div>
              <BrandMeter
                value={Math.round((registered / max) * 100)}
                className="mt-2"
                label={`${formatNumber(registered)} مسجل في ${course.name}`}
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
