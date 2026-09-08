"use client";

/**
 * /admin/testimonials — قائمة التقييمات (المهمة #15)
 * ----------------------------------------------------
 * Search + فلاتر (المصدر/التقييم/المميز/الظاهر) — تعمل فعليًا على المخزن.
 * الإجراءات: تعديل / تكرار / حذف (بتأكيد داخل القائمة).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { useAdminActions, useAdminData } from "@/context/admin-store";
import type { AdminTestimonial } from "@/data/admin/types";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { AdminToolbar } from "@/components/admin/ui/admin-toolbar";
import { TestimonialsList } from "@/components/admin/testimonials/testimonials-list";

export default function AdminTestimonialsPage() {
  const data = useAdminData();
  const { duplicateTestimonial, deleteTestimonial } = useAdminActions();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<string>("all");
  const [visibleFilter, setVisibleFilter] = useState<string>("all");

  const filteredTestimonials = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.testimonials.filter((testimonial) => {
      if (sourceFilter !== "all" && testimonial.source !== sourceFilter) return false;
      if (ratingFilter !== "all" && testimonial.rating !== Number(ratingFilter)) return false;
      if (featuredFilter !== "all" && testimonial.featured !== (featuredFilter === "yes"))
        return false;
      if (visibleFilter !== "all" && testimonial.visible !== (visibleFilter === "yes"))
        return false;
      if (q) {
        const haystack = `${testimonial.name} ${testimonial.role ?? ""} ${testimonial.review}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [data.testimonials, query, sourceFilter, ratingFilter, featuredFilter, visibleFilter]);

  async function handleDuplicate(testimonial: AdminTestimonial) {
    const result = await duplicateTestimonial(testimonial.id);
    if (result.ok) {
      toast({
        title: "تم تكرار التقييم",
        description: `أُنشئت نسخة باسم «${testimonial.name} (نسخة)» بحالة غير مميز ومخفية — عدّلها ثم اعرضها.`,
      });
    } else {
      toast({ title: "تعذر التكرار", description: result.error, variant: "destructive" });
    }
  }

  async function handleDelete(testimonial: AdminTestimonial) {
    const result = await deleteTestimonial(testimonial.id);
    if (result.ok) {
      toast({ title: "تم حذف التقييم", description: `حُذف تقييم «${testimonial.name}» من قاعدة البيانات.` });
    } else {
      toast({ title: "تعذر الحذف", description: result.error, variant: "destructive" });
    }
  }

  const hasActiveFilters =
    query.trim() !== "" ||
    sourceFilter !== "all" ||
    ratingFilter !== "all" ||
    featuredFilter !== "all" ||
    visibleFilter !== "all";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="التقييمات"
        description={`تقييمات المتدربين — ${formatNumber(data.testimonials.length)} تقييمًا في المخزن. المميز منها يغذي قسم التقييمات في الرئيسية (الوضع التلقائي).`}
      >
        <Button asChild>
          <Link href="/admin/testimonials/new">
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            تقييم جديد
          </Link>
        </Button>
      </AdminPageHeader>

      <AdminToolbar>
        <div className="relative w-full lg:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالاسم أو نص المراجعة…"
            aria-label="بحث في التقييمات"
            className="bg-white ps-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger aria-label="تصفية حسب المصدر" className="w-full bg-white sm:w-32">
              <SelectValue placeholder="المصدر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المصادر</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="manual">يدوي</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger aria-label="تصفية حسب التقييم" className="w-full bg-white sm:w-32">
              <SelectValue placeholder="التقييم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التقييمات</SelectItem>
              {[5, 4, 3, 2, 1].map((rating) => (
                <SelectItem key={rating} value={String(rating)}>
                  <span className="num-ltr">{rating} ★</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
            <SelectTrigger aria-label="تصفية حسب التمييز" className="w-full bg-white sm:w-32">
              <SelectValue placeholder="التمييز" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">مميز وغير مميز</SelectItem>
              <SelectItem value="yes">مميز فقط</SelectItem>
              <SelectItem value="no">غير مميز فقط</SelectItem>
            </SelectContent>
          </Select>

          <Select value={visibleFilter} onValueChange={setVisibleFilter}>
            <SelectTrigger aria-label="تصفية حسب الظهور" className="w-full bg-white sm:w-32">
              <SelectValue placeholder="الظهور" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ظاهر ومخفي</SelectItem>
              <SelectItem value="yes">ظاهر فقط</SelectItem>
              <SelectItem value="no">مخفي فقط</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              className="col-span-2 sm:col-span-1"
              onClick={() => {
                setQuery("");
                setSourceFilter("all");
                setRatingFilter("all");
                setFeaturedFilter("all");
                setVisibleFilter("all");
              }}
            >
              مسح الفلاتر
            </Button>
          ) : null}
        </div>
      </AdminToolbar>

      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        عرض {formatNumber(filteredTestimonials.length)} من {formatNumber(data.testimonials.length)} تقييم
      </p>

      <TestimonialsList
        testimonials={filteredTestimonials}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  );
}
