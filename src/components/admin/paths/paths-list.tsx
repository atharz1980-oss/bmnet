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
import { Copy, ExternalLink, Pencil, Star, Trash2 } from "lucide-react";

import { learningPaths as publicPaths } from "@/data/paths";
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

/** هل المسار منشور على الموقع العام (لتفعيل المعاينة)؟ */
function publicSlugExists(slug: string): boolean {
  return publicPaths.some((path) => path.slug === slug);
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
  const canPreview = publicSlugExists(path.slug);
  return (
    <div className={cn("items-center gap-1", withLabels ? "flex" : "flex justify-end")}>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800"
      >
        <Link href={`/admin/paths/${path.id}`} aria-label={`تعديل مسار ${path.name}`}>
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800"
        onClick={() => onDuplicate(path)}
        aria-label={`تكرار مسار ${path.name}`}
      >
        <Copy aria-hidden="true" className="h-4 w-4" />
      </Button>
      {canPreview ? (
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800">
          <a
            href={`/paths/${path.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`معاينة مسار ${path.name} على الموقع العام`}
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          disabled
          className="h-8 w-8"
          aria-label={`المعاينة العامة غير متاحة لمسار ${path.name}`}
          title="المعاينة العامة ستربط في مرحلة التكامل — المسار غير موجود في بيانات الموقع العام"
        >
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:bg-brand-50 hover:text-brand-700"
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
      <div className="hidden overflow-hidden rounded-xl border border-border bg-white md:block">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/60 text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-3 text-start font-medium">المسار</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">المستوى</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الدورات</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">التسعير</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الحالة</th>
              <th scope="col" className="px-3 py-3 text-center font-medium">مميز</th>
              <th scope="col" className="px-4 py-3 text-end font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paths.map((path) => {
              const linked = getCoursesInPath(path, courses);
              return (
                <tr key={path.id} className="transition-colors hover:bg-surface/40">
                  <td className="px-4 py-3">
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
                  <td className="px-3 py-3 text-charcoal-600">
                    {courseLevelLabel(path.level)}
                  </td>
                  <td className="px-3 py-3">
                    <span className="num-ltr font-medium text-charcoal-700">
                      {formatNumber(linked.length)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <PricingCell path={path} courses={courses} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={path.status} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {path.featured ? (
                      <Star
                        aria-label={`مسار ${path.name} مميز`}
                        className="inline h-4 w-4 fill-brand-500 text-brand-500"
                      />
                    ) : (
                      <span className="text-charcoal-300" aria-label="غير مميز">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
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
            <li key={path.id} className="rounded-xl border border-border bg-white p-4">
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
                    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-charcoal-600">
                      {courseLevelLabel(path.level)}
                    </span>
                  </div>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">الدورات</dt>
                  <dd className="num-ltr text-charcoal-700">{formatNumber(linked.length)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">السعر النهائي</dt>
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
