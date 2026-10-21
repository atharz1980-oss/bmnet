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
              ? "h-3.5 w-3.5 fill-brand-600 text-brand-600"
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
        className="h-11 w-11 lg:h-8 lg:w-8 text-charcoal-500 hover:bg-danger-50 hover:text-danger-700"
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
      <div className="brand-table hidden md:block">
        <table className="w-full text-start text-sm">
          <thead>
            <tr>
              <th scope="col" className="text-start">الاسم</th>
              <th scope="col" className="text-start">التقييم</th>
              <th scope="col" className="text-start">المصدر</th>
              <th scope="col" className="text-start">الحالة</th>
              <th scope="col" className="text-start">مقتطف المراجعة</th>
              <th scope="col" className="text-end">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {testimonials.map((testimonial) => (
              <tr key={testimonial.id}>
                <td>
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
                <td>
                  <Stars rating={testimonial.rating} />
                </td>
                <td>
                  <span className="brand-micro text-charcoal-500">
                    {testimonial.source === "google" ? "Google" : "يدوي"}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {testimonial.featured ? (
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-brand-700">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                        مميز
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 text-xs font-medium",
                        testimonial.visible ? "text-brand-700" : "text-charcoal-400",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          testimonial.visible ? "bg-brand-600" : "bg-charcoal-300",
                        )}
                      />
                      {testimonial.visible ? "ظاهر" : "مخفي"}
                    </span>
                  </div>
                </td>
                <td className="max-w-[220px] px-3 py-3">
                  <p className="truncate text-xs leading-relaxed text-charcoal-500">
                    {testimonial.review}
                  </p>
                </td>
                <td>
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
          <li key={testimonial.id} className="border border-border bg-white p-4">
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
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <span className="brand-micro text-charcoal-500">
                {testimonial.source === "google" ? "Google" : "يدوي"}
              </span>
              {testimonial.featured ? (
                <span className="inline-flex items-center gap-2 text-xs font-medium text-brand-700">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                  مميز
                </span>
              ) : null}
              <span
                className={cn(
                  "inline-flex items-center gap-2 text-xs font-medium",
                  testimonial.visible ? "text-brand-700" : "text-charcoal-400",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    testimonial.visible ? "bg-brand-600" : "bg-charcoal-300",
                  )}
                />
                {testimonial.visible ? "ظاهر" : "مخفي"}
              </span>
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
