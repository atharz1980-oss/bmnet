"use client";

/**
 * TestimonialsList — قائمة التقييمات (المهمة #15)
 * ------------------------------------------------
 * Desktop جدول / Mobile بطاقات. الأعمدة: الاسم، التقييم، المصدر، مميز،
 * ظاهر، مقتطف المراجعة، إجراءات (تعديل/تكرار/حذف بتأكيد).
 */
import Link from "next/link";
import { useState } from "react";
import { Copy, Pencil, Star, Trash2 } from "lucide-react";

import type { AdminTestimonial } from "@/data/admin/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";

interface TestimonialsListProps {
  testimonials: AdminTestimonial[];
  onDuplicate: (testimonial: AdminTestimonial) => void;
  onDelete: (testimonial: AdminTestimonial) => void;
}

/** نجوم التقييم 1–5 */
function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`التقييم ${rating} من 5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={
            index < rating
              ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
              : "h-3.5 w-3.5 text-charcoal-200"
          }
        />
      ))}
    </span>
  );
}

interface RowActionsProps {
  testimonial: AdminTestimonial;
  onDuplicate: (testimonial: AdminTestimonial) => void;
  onRequestDelete: (testimonial: AdminTestimonial) => void;
  withLabels?: boolean;
}

function RowActions({ testimonial, onDuplicate, onRequestDelete, withLabels }: RowActionsProps) {
  return (
    <div className={cn("items-center gap-1", withLabels ? "flex" : "flex justify-end")}>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
      >
        <Link
          href={`/admin/testimonials/${testimonial.id}`}
          aria-label={`تعديل تقييم ${testimonial.name}`}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:text-charcoal-800"
        onClick={() => onDuplicate(testimonial)}
        aria-label={`تكرار تقييم ${testimonial.name}`}
      >
        <Copy aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:bg-brand-50 hover:text-brand-700"
        onClick={() => onRequestDelete(testimonial)}
        aria-label={`حذف تقييم ${testimonial.name}`}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TestimonialsList({
  testimonials,
  onDuplicate,
  onDelete,
}: TestimonialsListProps) {
  /* الحذف لا يتم إلا بعد التأكيد داخل هذه القائمة (نمط المدربين — D-20) */
  const [deleteTarget, setDeleteTarget] = useState<AdminTestimonial | null>(null);

  if (testimonials.length === 0) {
    return (
      <EmptyState
        title="لا توجد تقييمات"
        description="لم يُضف أي تقييم بعد — أضف أول تقييم ليعرض في الموقع بعد الربط."
      >
        <Button asChild size="sm">
          <Link href="/admin/testimonials/new">إضافة تقييم</Link>
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
              <th scope="col" className="px-4 py-3 text-start font-medium">الاسم</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">التقييم</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">المصدر</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الحالة</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">مقتطف المراجعة</th>
              <th scope="col" className="px-4 py-3 text-end font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {testimonials.map((testimonial) => (
              <tr key={testimonial.id} className="transition-colors hover:bg-surface/40">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/testimonials/${testimonial.id}`}
                    className="block max-w-[160px] truncate font-medium text-charcoal-800 hover:text-brand-700"
                  >
                    {testimonial.name}
                  </Link>
                  {testimonial.role ? (
                    <span className="block max-w-[160px] truncate text-xs text-charcoal-500">
                      {testimonial.role}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <Stars rating={testimonial.rating} />
                </td>
                <td className="px-3 py-3">
                  <Badge
                    variant="outline"
                    className={
                      testimonial.source === "google"
                        ? "border-charcoal-200 bg-surface text-charcoal-600"
                        : "border-charcoal-200 bg-white text-charcoal-500"
                    }
                  >
                    {testimonial.source === "google" ? "Google" : "يدوي"}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {testimonial.featured ? (
                      <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50">
                        مميز
                      </Badge>
                    ) : null}
                    <Badge
                      variant="outline"
                      className={cn(
                        testimonial.visible
                          ? "border-brand-200 bg-brand-50 text-brand-700"
                          : "border-charcoal-200 bg-surface text-charcoal-400",
                      )}
                    >
                      {testimonial.visible ? "ظاهر" : "مخفي"}
                    </Badge>
                  </div>
                </td>
                <td className="max-w-[220px] px-3 py-3">
                  <p className="truncate text-xs leading-relaxed text-charcoal-500">
                    {testimonial.review}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    testimonial={testimonial}
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
        {testimonials.map((testimonial) => (
          <li key={testimonial.id} className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/admin/testimonials/${testimonial.id}`}
                className="block font-medium leading-snug text-charcoal-800 hover:text-brand-700"
              >
                {testimonial.name}
              </Link>
              <Stars rating={testimonial.rating} />
            </div>
            {testimonial.role ? (
              <p className="mt-0.5 truncate text-xs text-charcoal-500">{testimonial.role}</p>
            ) : null}
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-charcoal-500">
              {testimonial.review}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
              <Badge
                variant="outline"
                className={
                  testimonial.source === "google"
                    ? "border-charcoal-200 bg-surface text-charcoal-600"
                    : "border-charcoal-200 bg-white text-charcoal-500"
                }
              >
                {testimonial.source === "google" ? "Google" : "يدوي"}
              </Badge>
              {testimonial.featured ? (
                <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50">
                  مميز
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className={cn(
                  testimonial.visible
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-charcoal-200 bg-surface text-charcoal-400",
                )}
              >
                {testimonial.visible ? "ظاهر" : "مخفي"}
              </Badge>
              <div className="ms-auto">
                <RowActions
                  testimonial={testimonial}
                  onDuplicate={onDuplicate}
                  onRequestDelete={setDeleteTarget}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* حذف بتأكيد — لا حذف صامت */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="حذف التقييم"
        description={
          deleteTarget
            ? `سيتم حذف تقييم «${deleteTarget.name}» نهائيًا. لا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        confirmLabel="حذف نهائي"
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
