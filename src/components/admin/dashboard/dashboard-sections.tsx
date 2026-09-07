"use client";

/**
 * DashboardSections — أقسام لوحة التحكم الأربعة
 * كل القيم مشتقة من Selectors فوق مخزن الـ Mock — لا أرقام مكررة
 * داخل المكوّنات. الروابط فقط لصفحات مبنية (لا Broken Links).
 */
import Link from "next/link";
import { CalendarClock, ChevronLeft, Star } from "lucide-react";

import type { AdminCourse, CorporateRequest, CourseSession, SessionStatus } from "@/data/admin/types";
import type { MockRegistration } from "@/data/admin/selectors";
import { getDerivedSessionStatus, getSessionFillPercent } from "@/data/admin/selectors";
import { formatDate, formatNumber, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
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
  /** رابط "عرض الكل" — يُعرض فقط للصفحات المبنية */
  viewAllHref?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn("flex flex-col rounded-xl border border-border bg-white p-4 sm:p-5", className)}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-charcoal-900">
          {title}
          {typeof count === "number" ? (
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-charcoal-500 num-ltr">
              {formatNumber(count)}
            </span>
          ) : null}
        </h2>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="flex items-center gap-0.5 rounded-md text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            عرض الكل
            <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      {children}
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
              <li key={`${course.id}:${session.id}`} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="min-w-0 flex-1 truncate rounded text-sm font-medium text-charcoal-800 hover:text-brand-700"
                  >
                    {course.name}
                  </Link>
                  <StatusBadge status={displayStatus} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatDate(session.startDate)}</span>
                  <span className="num-ltr">
                    {formatNumber(session.registered)}/{formatNumber(session.seats)} مسجل
                  </span>
                  <span className="w-24 shrink-0">
                    <Progress value={fill} className="h-1.5" aria-hidden="true" />
                  </span>
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
            <li key={request.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal-800">{request.company}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
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
            <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/admin/courses/${item.course.id}`}
                  className="min-w-0 flex-1 truncate rounded text-sm font-medium text-charcoal-800 hover:text-brand-700"
                >
                  {item.course.name}
                </Link>
                <span className="shrink-0 text-xs font-semibold text-charcoal-700 num-ltr">
                  +{formatNumber(item.registered)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
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
        <ul className="space-y-3">
          {items.map(({ course, registered }) => (
            <li key={course.id}>
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="min-w-0 flex-1 truncate rounded text-sm font-medium text-charcoal-800 hover:text-brand-700"
                >
                  {course.name}
                </Link>
                <span className="shrink-0 text-xs font-semibold text-charcoal-600 num-ltr">
                  {formatNumber(registered)} مسجل
                </span>
              </div>
              <Progress
                value={Math.round((registered / max) * 100)}
                className="mt-1.5 h-1.5"
                aria-hidden="true"
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
