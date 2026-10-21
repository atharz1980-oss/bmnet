"use client";

/**
 * PathsList — عرض قائمة المسارات (المهمة #13)
 * --------------------------------------------
 * Desktop جدول / Mobile بطاقات. الأعمدة: الصورة، المسار، المستوى،
 * عدد الدورات، السعر الأصلي، الخصم %، السعر النهائي، الحالة، إجراءات
 * (تعديل / تكرار / معاينة / حذف بتأكيد).
 *
 * التسعير Derived بالكامل (قرار D-09): يُحسب لحظيًا من أسعار الدورات
 * المرتبطة عبر getPathPricing — لا يُخزَّن ولا يُنسخ في المسار.
 *
 * المعاينة العامة تُفعَّل فقط إذا كان slug المسار موجودًا في بيانات
 * الموقع العام (Phase 1 المجمدة) — وإلا تُعطَّل برسالة واضحة.
 */
import Link from "next/link";
import { useState } from "react";
import { Copy, Pencil, Star, Trash2 } from "lucide-react";

import type { AdminCourse, AdminLearningPath } from "@/data/admin/types";
import { getCoursesInPath, getPathPricing } from "@/data/admin/selectors";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { courseLevelLabel } from "@/components/admin/courses/course-meta";

interface PathsListProps {
  paths: AdminLearningPath[];
  courses: AdminCourse[];
  onDuplicate: (path: AdminLearningPath) => void;
  onDelete: (path: AdminLearningPath) => void;
}

function Thumb({ path, size = "md" }: { path: AdminLearningPath; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-lg border border-border bg-surface",
        size === "md" ? "h-11 w-16" : "h-16 w-24",
      )}
    >
      {path.image ? (
        <img
          src={path.image}
          alt={path.imageAlt || `صورة مسار ${path.name}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center text-[10px] text-charcoal-300"
        >
          بلا صورة
        </span>
      )}
    </span>
  );
}

/** خلية السعر النهائي — Derived من أسعار الدورات المرتبطة لحظيًا */
function PricingCell({ path, courses }: { path: AdminLearningPath; courses: AdminCourse[] }) {
  const pricing = getPathPricing(path, courses);

  if (pricing.originalTotal === 0) {
    return <span className="text-sm text-muted-foreground">بلا دورات</span>;
  }

  return (
    <span className="block leading-tight">
      <span className="block text-sm font-semibold text-charcoal-800">
        <span className="num-ltr">{formatNumber(pricing.finalPrice)}</span> ريال
      </span>
      <span className="num-ltr block text-xs text-muted-foreground">
        <s>{formatNumber(pricing.originalTotal)}</s> − {formatNumber(pricing.discountPercent)}%
      </span>
    </span>
  );
}

interface RowActionsProps {
  path: AdminLearningPath;
  onDuplicate: (path: AdminLearningPath) => void;
  /** يفتح حوار التأكيد — الحذف الفعلي يحدث بعد التأكيد فقط (قرار D-20) */
  onRequestDelete: (path: AdminLearningPath) => void;
  withLabels?: boolean;
}

function RowActions({ path, onDuplicate, onRequestDelete, withLabels }: RowActionsProps) {
  return (
    <div className={cn("items-center gap-1", withLabels ? "flex" : "flex justify-end")}>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
      >
        <Link href={`/admin/paths/${path.id}`} aria-label={`تعديل مسار ${path.name}`}>
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
        onClick={() => onDuplicate(path)}
        aria-label={`تكرار مسار ${path.name}`}
      >
        <Copy aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:bg-danger-50 hover:text-danger-700"
        onClick={() => onRequestDelete(path)}
        aria-label={`حذف مسار ${path.name}`}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function PathsList({ paths, courses, onDuplicate, onDelete }: PathsListProps) {
  const [deleteTarget, setDeleteTarget] = useState<AdminLearningPath | null>(null);

  function confirmDelete() {
    if (deleteTarget) onDelete(deleteTarget);
    setDeleteTarget(null);
  }

  if (paths.length === 0) {
    return (
      <EmptyState
        title="لا توجد مسارات مطابقة"
        description="جرّب تعديل البحث أو الفلاتر، أو أنشئ مسارًا جديدًا يجمع دورات متدرجة."
      >
        <Button asChild size="sm">
          <Link href="/admin/paths/new">إنشاء مسار جديد</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <>
      {/* ── Desktop: جدول ── */}
      <div className="brand-table hidden md:block">
        <table className="w-full text-start text-sm">
          <thead>
            <tr>
              <th scope="col" className="text-start">المسار</th>
              <th scope="col" className="text-start">المستوى</th>
              <th scope="col" className="text-start">الدورات</th>
              <th scope="col" className="text-start">التسعير</th>
              <th scope="col" className="text-start">الحالة</th>
              <th scope="col" className="text-center">مميز</th>
              <th scope="col" className="text-end">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {paths.map((path) => {
              const linked = getCoursesInPath(path, courses);
              return (
                <tr key={path.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Thumb path={path} />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/paths/${path.id}`}
                          className="block max-w-[220px] truncate font-medium text-charcoal-800 hover:text-brand-700"
                        >
                          {path.name}
                        </Link>
                        <span
                          className="block max-w-[220px] truncate text-xs text-charcoal-400 font-latin"
                          dir="ltr"
                        >
                          {path.slug}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="text-charcoal-600">
                    {courseLevelLabel(path.level)}
                  </td>
                  <td>
                    <span className="num-ltr font-medium text-charcoal-700">
                      {formatNumber(linked.length)}
                    </span>
                  </td>
                  <td>
                    <PricingCell path={path} courses={courses} />
                  </td>
                  <td>
                    <StatusBadge status={path.status} />
                  </td>
                  <td className="text-center">
                    {path.featured ? (
                      <Star
                        aria-label={`مسار ${path.name} مميز`}
                        className="inline h-4 w-4 fill-brand-500 text-brand-500"
                      />
                    ) : (
                      <span className="text-charcoal-300" aria-label="غير مميز">—</span>
                    )}
                  </td>
                  <td>
                    <RowActions path={path} onDuplicate={onDuplicate} onRequestDelete={setDeleteTarget} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: بطاقات ── */}
      <ul className="space-y-3 md:hidden">
        {paths.map((path) => {
          const linked = getCoursesInPath(path, courses);
          return (
            <li key={path.id} className="border border-border bg-white p-4">
              <div className="flex items-start gap-3">
                <Thumb path={path} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/admin/paths/${path.id}`}
                      className="block font-medium leading-snug text-charcoal-800 hover:text-brand-700"
                    >
                      {path.name}
                    </Link>
                    {path.featured ? (
                      <Star aria-label="مميز" className="mt-0.5 h-4 w-4 shrink-0 fill-brand-500 text-brand-500" />
                    ) : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={path.status} />
                    <span className="brand-micro text-charcoal-400">
                      {courseLevelLabel(path.level)}
                    </span>
                  </div>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="brand-micro text-charcoal-400">الدورات</dt>
                  <dd className="num-ltr text-charcoal-700">{formatNumber(linked.length)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="brand-micro text-charcoal-400">السعر النهائي</dt>
                  <dd>
                    <PricingCell path={path} courses={courses} />
                  </dd>
                </div>
              </dl>
              <div className="mt-3 border-t border-border pt-2.5">
                <RowActions
                  path={path}
                  onDuplicate={onDuplicate}
                  onRequestDelete={setDeleteTarget}
                  withLabels={false}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="حذف المسار"
        description={
          deleteTarget
            ? `سيتم حذف «${deleteTarget.name}» نهائيًا. الدورات المرتبطة به لن تتأثر — إزالة المسار لا تمس الدورات نفسها. لا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        confirmLabel="حذف نهائي"
        onConfirm={confirmDelete}
      />
    </>
  );
}
