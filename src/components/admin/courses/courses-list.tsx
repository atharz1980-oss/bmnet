"use client";

/**
 * CoursesList — عرض قائمة الدورات (Desktop جدول / Mobile بطاقات)
 * ---------------------------------------------------------------
 * الإجراءات: تعديل / تكرار / معاينة عامة / حذف (بتأكيد AlertDialog).
 * المعاينة العامة تُفعَّل فقط إذا كان slug الدورة موجودًا في بيانات
 * الموقع العام (Phase 1 المجمدة) — وإلا تُعطَّل برسالة واضحة،
 * فلا ننشئ رابطًا مكسورًا لدورات إدارية جديدة.
 */
import Link from "next/link";
import { useState } from "react";
import { CalendarClock, Copy, ExternalLink, ListVideo, Pencil, Star, Trash2 } from "lucide-react";

import { courses as publicCourses } from "@/data/courses";
import type { AdminCourse, AdminLearningPath } from "@/data/admin/types";
import { getCourseNearestSession, getPathsUsingCourse } from "@/data/admin/selectors";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { courseDurationLabel, coursePriceLabel, courseTypeLabel } from "./course-meta";

interface CoursesListProps {
  courses: AdminCourse[];
  /** المسارات الحالية — لحماية حذف دورة مستخدمة في مسار (قاعدة المسارات 4) */
  paths: AdminLearningPath[];
  onDuplicate: (course: AdminCourse) => void;
  onDelete: (course: AdminCourse) => void;
}

/** هل الدورة منشورة على الموقع العام (لتفعيل المعاينة)؟ */
function publicSlugExists(slug: string): boolean {
  return publicCourses.some((course) => course.slug === slug);
}

function Thumb({ course, size = "md" }: { course: AdminCourse; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-lg border border-border bg-surface",
        size === "md" ? "h-11 w-16" : "h-16 w-24",
      )}
    >
      {course.images.main ? (
        <img
          src={course.images.main}
          alt={course.images.alt || `صورة دورة ${course.name}`}
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

function PriceTag({ course }: { course: AdminCourse }) {
  const price = coursePriceLabel(course);
  return (
    <span className={cn("text-sm", price.muted ? "text-muted-foreground" : "font-medium text-charcoal-800")}>
      {price.text}
    </span>
  );
}

function NearestSessionCell({ course }: { course: AdminCourse }) {
  const nearest = getCourseNearestSession(course);
  if (!nearest) {
    return <span className="text-sm text-charcoal-300">لا مواعيد</span>;
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-charcoal-600">
      <CalendarClock aria-hidden="true" className="h-3.5 w-3.5 text-charcoal-400" />
      {formatDate(nearest.startDate)}
    </span>
  );
}

interface RowActionsProps {
  course: AdminCourse;
  onDuplicate: (course: AdminCourse) => void;
  /** يفتح حوار التأكيد — الحذف الفعلي يحدث بعد التأكيد فقط */
  onRequestDelete: (course: AdminCourse) => void;
  withLabels?: boolean;
}

function RowActions({ course, onDuplicate, onRequestDelete, withLabels }: RowActionsProps) {
  const canPreview = publicSlugExists(course.slug);
  return (
    <div className={cn("items-center gap-1", withLabels ? "flex" : "flex justify-end")}>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
      >
        <Link href={`/admin/courses/${course.id}`} aria-label={`تعديل دورة ${course.name}`}>
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Link>
      </Button>
      {/* محتوى الدورة الأونلاين — شاشة مستقلة لأن حفظها مستقل عن حفظ الدورة.
          تظهر للأونلاين وحده؛ وتغيير النوع يخفي المدخل ولا يمس المحتوى. */}
      {course.type === "online" ? (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
        >
          <Link
            href={`/admin/courses/${course.id}/content`}
            aria-label={`محتوى دورة ${course.name} الأونلاين`}
          >
            <ListVideo aria-hidden="true" className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
        onClick={() => onDuplicate(course)}
        aria-label={`تكرار دورة ${course.name}`}
      >
        <Copy aria-hidden="true" className="h-4 w-4" />
      </Button>
      {canPreview ? (
        <Button asChild variant="ghost" size="icon" className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800">
          <a
            href={`/courses/${course.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`معاينة دورة ${course.name} على الموقع العام`}
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          disabled
          className="h-11 w-11 lg:h-8 lg:w-8"
          aria-label={`المعاينة العامة غير متاحة لدورة ${course.name}`}
          title="المعاينة العامة ستربط في مرحلة التكامل — الدورة غير موجودة في بيانات الموقع العام"
        >
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:bg-brand-50 hover:text-brand-700"
        onClick={() => onRequestDelete(course)}
        aria-label={`حذف دورة ${course.name}`}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CoursesList({ courses, paths, onDuplicate, onDelete }: CoursesListProps) {
  const [deleteTarget, setDeleteTarget] = useState<AdminCourse | null>(null);

  /* حماية الحذف: دورة مستخدمة في مسار لا تُحذف بصمت — حجب مع تسمية المسارات */
  const blockingPaths =
    deleteTarget ? getPathsUsingCourse(deleteTarget.id, paths) : [];
  const isBlocked = blockingPaths.length > 0;

  function confirmDelete() {
    if (deleteTarget) onDelete(deleteTarget);
    setDeleteTarget(null);
  }

  if (courses.length === 0) {
    return (
      <EmptyState
        title="لا توجد دورات مطابقة"
        description="جرّب تعديل البحث أو الفلاتر، أو أنشئ دورة جديدة."
      >
        <Button asChild size="sm">
          <Link href="/admin/courses/new">إنشاء دورة جديدة</Link>
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
              <th scope="col" className="px-4 py-3 text-start font-medium">الدورة</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">النوع</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">السعر</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">المدة</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">أقرب موعد</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الحالة</th>
              <th scope="col" className="px-3 py-3 text-center font-medium">مميزة</th>
              <th scope="col" className="px-4 py-3 text-end font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {courses.map((course) => (
              <tr key={course.id} className="transition-colors hover:bg-surface/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Thumb course={course} />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className="block max-w-[220px] truncate font-medium text-charcoal-800 hover:text-brand-700"
                      >
                        {course.name}
                      </Link>
                      <span className="block max-w-[220px] truncate text-xs text-charcoal-400 font-latin" dir="ltr">
                        {course.slug}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-charcoal-600">{courseTypeLabel(course.type)}</td>
                <td className="px-3 py-3">
                  <PriceTag course={course} />
                </td>
                <td className="px-3 py-3 text-charcoal-600">{courseDurationLabel(course)}</td>
                <td className="px-3 py-3">
                  <NearestSessionCell course={course} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={course.status} />
                </td>
                <td className="px-3 py-3 text-center">
                  {course.featured ? (
                    <Star
                      aria-label={`دورة ${course.name} مميزة`}
                      className="inline h-4 w-4 fill-brand-500 text-brand-500"
                    />
                  ) : (
                    <span className="text-charcoal-300" aria-label="غير مميزة">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <RowActions course={course} onDuplicate={onDuplicate} onRequestDelete={setDeleteTarget} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: بطاقات ── */}
      <ul className="space-y-3 md:hidden">
        {courses.map((course) => (
          <li key={course.id} className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-start gap-3">
              <Thumb course={course} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="block font-medium leading-snug text-charcoal-800 hover:text-brand-700"
                  >
                    {course.name}
                  </Link>
                  {course.featured ? (
                    <Star aria-label="مميزة" className="mt-0.5 h-4 w-4 shrink-0 fill-brand-500 text-brand-500" />
                  ) : null}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={course.status} />
                  <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-charcoal-600">
                    {courseTypeLabel(course.type)}
                  </span>
                </div>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">السعر</dt>
                <dd><PriceTag course={course} /></dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">المدة</dt>
                <dd className="text-charcoal-700">{courseDurationLabel(course)}</dd>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">أقرب موعد</dt>
                <dd><NearestSessionCell course={course} /></dd>
              </div>
            </dl>
            <div className="mt-3 border-t border-border pt-2.5">
              <RowActions
                course={course}
                onDuplicate={onDuplicate}
                onRequestDelete={setDeleteTarget}
                withLabels={false}
              />
            </div>
          </li>
        ))}
      </ul>

      {/* حوار الحجب: الدورة مستخدمة في مسار — لا حذف بصمت (قاعدة المسارات 4) */}
      <AlertDialog
        open={deleteTarget !== null && isBlocked}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لا يمكن حذف الدورة الآن</AlertDialogTitle>
            <AlertDialogDescription>
              الدورة «{deleteTarget?.name}» مستخدمة في{" "}
              <strong className="text-charcoal-800">
                {formatNumber(blockingPaths.length)}{" "}
                {blockingPaths.length === 1 ? "مسار" : "مسارات"}
              </strong>
              : {blockingPaths.map((path) => `«${path.name}»`).join("، ")}.
              احذفها من المسارات أولًا ثم أعد المحاولة — أو اكتفِ بإخفائها/تحويلها
              إلى مسودة حتى لا تنكسر أسعار المسارات المرتبطة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>فهمت</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        open={deleteTarget !== null && !isBlocked}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="حذف الدورة"
        description={
          deleteTarget
            ? `سيتم حذف «${deleteTarget.name}» نهائيًا مع منهجها و${formatNumber(deleteTarget.sessions.length)} من مواعيدها. لا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        confirmLabel="حذف نهائي"
        onConfirm={confirmDelete}
      />
    </>
  );
}
