"use client";

/**
 * TrainersList — قائمة المدربين (المهمة #12)
 * -------------------------------------------
 * Desktop جدول / Mobile بطاقات. الأعمدة: الصورة، الاسم، المسمى، التخصص،
 * سنوات الخبرة، عدد الدورات المرتبطة، الحالة، إجراءات (تعديل/تكرار/حذف).
 *
 * لا زر معاينة: لا توجد Public Trainer Page في هذه المرحلة (قرار المالك) —
 * لن يُضاف إلا عند بنائها لاحقًا.
 *
 * قاعدة الحماية المعتمدة (الأكثر أمانًا — قرار موثق D-21):
 * - مدرب مرتبط بدورات: يُحجب حذفه نهائيًا ويُعرض حوار يشرح الارتباط
 *   مع بديل آمن «تحويل إلى مخفي» — لا حذف صامت ولا كسر للعلاقات.
 * - مدرب غير مرتبط: حذف بتأكيد AlertDialog عادي.
 */
import Link from "next/link";
import { useState } from "react";
import { Copy, EyeOff, Pencil, Trash2 } from "lucide-react";

import type { AdminTrainer } from "@/data/admin/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
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

interface TrainersListProps {
  trainers: AdminTrainer[];
  /** عدد الدورات المرتبطة بكل مدرب (مفتاح = معرّف المدرب) */
  coursesCountByTrainer: Record<string, number>;
  onDuplicate: (trainer: AdminTrainer) => void;
  onDelete: (trainer: AdminTrainer) => void;
  onHide: (trainer: AdminTrainer) => void;
}

/** صورة مصغّرة — Initials عند غياب الصورة */
function Avatar({ trainer, size = "md" }: { trainer: AdminTrainer; size?: "md" | "lg" }) {
  const initials = trainer.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-lg border border-border bg-surface",
        size === "md" ? "h-11 w-11" : "h-14 w-14",
      )}
      aria-hidden="true"
    >
      {trainer.image ? (
        <img
          src={trainer.image}
          alt={trainer.imageAlt || `صورة المدرب ${trainer.name}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-charcoal-400">
          {initials}
        </span>
      )}
    </span>
  );
}

interface RowActionsProps {
  trainer: AdminTrainer;
  onDuplicate: (trainer: AdminTrainer) => void;
  onRequestDelete: (trainer: AdminTrainer) => void;
  withLabels?: boolean;
}

function RowActions({ trainer, onDuplicate, onRequestDelete, withLabels }: RowActionsProps) {
  return (
    <div className={cn("items-center gap-1", withLabels ? "flex" : "flex justify-end")}>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800"
      >
        <Link href={`/admin/trainers/${trainer.id}`} aria-label={`تعديل المدرب ${trainer.name}`}>
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800"
        onClick={() => onDuplicate(trainer)}
        aria-label={`تكرار بيانات المدرب ${trainer.name}`}
      >
        <Copy aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:bg-brand-50 hover:text-brand-700"
        onClick={() => onRequestDelete(trainer)}
        aria-label={`حذف المدرب ${trainer.name}`}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TrainersList({
  trainers,
  coursesCountByTrainer,
  onDuplicate,
  onDelete,
  onHide,
}: TrainersListProps) {
  const [deleteTarget, setDeleteTarget] = useState<AdminTrainer | null>(null);
  const linkedCount = deleteTarget ? (coursesCountByTrainer[deleteTarget.id] ?? 0) : 0;
  const isLinked = linkedCount > 0;

  function confirmDelete() {
    if (deleteTarget) onDelete(deleteTarget);
    setDeleteTarget(null);
  }

  function confirmHide() {
    if (deleteTarget) onHide(deleteTarget);
    setDeleteTarget(null);
  }

  if (trainers.length === 0) {
    return (
      <EmptyState
        title="لا يوجد مدربون"
        description="لم يُضف أي مدرب بعد — أضف أول مدرب لربطه بالدورات."
      >
        <Button asChild size="sm">
          <Link href="/admin/trainers/new">إضافة مدرب</Link>
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
              <th scope="col" className="px-4 py-3 text-start font-medium">المدرب</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">التخصص</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الخبرة</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">دورات مرتبطة</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الحالة</th>
              <th scope="col" className="px-4 py-3 text-end font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trainers.map((trainer) => (
              <tr key={trainer.id} className="transition-colors hover:bg-surface/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar trainer={trainer} />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/trainers/${trainer.id}`}
                        className="block max-w-[200px] truncate font-medium text-charcoal-800 hover:text-brand-700"
                      >
                        {trainer.name}
                      </Link>
                      <span className="block max-w-[200px] truncate text-xs text-charcoal-500">
                        {trainer.title}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-charcoal-600">{trainer.specialty}</td>
                <td className="px-3 py-3">
                  <span className="num-ltr text-charcoal-600">
                    {formatNumber(trainer.yearsOfExperience)} سنة
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="num-ltr font-medium text-charcoal-700">
                    {formatNumber(coursesCountByTrainer[trainer.id] ?? 0)}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={trainer.status} />
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    trainer={trainer}
                    onDuplicate={onDuplicate}
                    onRequestDelete={setDeleteTarget}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: بطاقات ── */}
      <ul className="space-y-3 md:hidden">
        {trainers.map((trainer) => (
          <li key={trainer.id} className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-start gap-3">
              <Avatar trainer={trainer} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/admin/trainers/${trainer.id}`}
                    className="block font-medium leading-snug text-charcoal-800 hover:text-brand-700"
                  >
                    {trainer.name}
                  </Link>
                  <StatusBadge status={trainer.status} />
                </div>
                <p className="mt-0.5 truncate text-xs text-charcoal-500">{trainer.title}</p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">التخصص</dt>
                <dd className="truncate text-charcoal-700">{trainer.specialty}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">الخبرة</dt>
                <dd className="num-ltr text-charcoal-700">
                  {formatNumber(trainer.yearsOfExperience)} سنة
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">دورات</dt>
                <dd className="num-ltr font-medium text-charcoal-700">
                  {formatNumber(coursesCountByTrainer[trainer.id] ?? 0)}
                </dd>
              </div>
            </dl>
            <div className="mt-3 border-t border-border pt-2.5">
              <RowActions
                trainer={trainer}
                onDuplicate={onDuplicate}
                onRequestDelete={setDeleteTarget}
                withLabels={false}
              />
            </div>
          </li>
        ))}
      </ul>

      {/* حوار الحجب: مدرب مرتبط بدورات — لا حذف صامت (القرار الآمن الموثق D-21) */}
      <AlertDialog
        open={deleteTarget !== null && isLinked}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لا يمكن حذف المدرب الآن</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  المدرب «{deleteTarget?.name}» مرتبط بـ{" "}
                  <strong className="text-charcoal-800">
                    {formatNumber(linkedCount)}{" "}
                    {linkedCount === 1 ? "دورة" : "دورات"}
                  </strong>
                  . حذفه يترك الدورات بلا مدرب ويكسر العلاقة.
                </p>
                <p className="text-charcoal-600">
                  البديل الآمن: تحويله إلى <strong>مخفي</strong> — تختفي إشاراته من
                  الاختيارات الجديدة بينما تبقى دوراته الحالية محفوظة الارتباط.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmHide}
              className="bg-charcoal-800 text-white hover:bg-charcoal-700"
            >
              <EyeOff aria-hidden="true" className="me-1.5 h-4 w-4" />
              تحويل إلى مخفي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* حذف عادي: مدرب غير مرتبط بأي دورة */}
      <ConfirmDialog
        open={deleteTarget !== null && !isLinked}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="حذف المدرب"
        description={
          deleteTarget
            ? `سيتم حذف «${deleteTarget.name}» نهائيًا من قائمة المدربين. لا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        confirmLabel="حذف نهائي"
        onConfirm={confirmDelete}
      />
    </>
  );
}
