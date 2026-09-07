"use client";

/**
 * /admin/paths — قائمة المسارات (المهمة #13)
 * -------------------------------------------
 * Search + فلترة الحالة/المستوى + ترتيب — تعمل فعليًا على مخزن الـ Mock
 * عبر useMemo. الإجراءات: تعديل / تكرار / معاينة / حذف (بتأكيد).
 *
 * ملاحظة الحذف: حذف المسار لا يمس الدورات المرتبطة (مراجع بالمعرّف فقط) —
 * أما حذف دورة مستخدمة في مسار فمحجوب من قائمة الدورات (قاعدة المسارات 4).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Route, Search } from "lucide-react";

import { useAdminActions, useAdminData } from "@/context/admin-store";
import type { AdminLearningPath, PublishStatus } from "@/data/admin/types";
import { getPathPricing } from "@/data/admin/selectors";
import type { CourseLevel } from "@/types";
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
import { PathsList } from "@/components/admin/paths/paths-list";
import { COURSE_LEVEL_OPTIONS } from "@/components/admin/courses/course-meta";

type SortKey = "default" | "name" | "original-desc" | "final-asc" | "final-desc" | "courses";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "default", label: "الترتيب المخزَّن" },
  { value: "name", label: "الاسم (أ–ي)" },
  { value: "original-desc", label: "الإجمالي الأصلي: الأعلى أولًا" },
  { value: "final-asc", label: "السعر النهائي: الأقل أولًا" },
  { value: "final-desc", label: "السعر النهائي: الأعلى أولًا" },
  { value: "courses", label: "الأكثر دورات" },
];

export default function AdminPathsPage() {
  const data = useAdminData();
  const { duplicatePath, deletePath } = useAdminActions();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  /* أسعار مشتقة لكل المسارات — حساب واحد لكل الرسم (Derived — لا تخزين) */
  const pricingByPath = useMemo(() => {
    const map: Record<string, { originalTotal: number; finalPrice: number; coursesCount: number }> = {};
    for (const path of data.paths) {
      map[path.id] = getPathPricing(path, data.courses);
    }
    return map;
  }, [data.paths, data.courses]);

  const filteredPaths = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = data.paths.filter((path) => {
      if (statusFilter !== "all" && path.status !== (statusFilter as PublishStatus)) return false;
      if (levelFilter !== "all" && path.level !== (levelFilter as CourseLevel)) return false;
      if (q) {
        const haystack = `${path.name} ${path.slug}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortKey !== "default") {
      list = [...list].sort((a, b) => {
        switch (sortKey) {
          case "name":
            return a.name.localeCompare(b.name, "ar");
          case "original-desc":
            return (pricingByPath[b.id]?.originalTotal ?? 0) - (pricingByPath[a.id]?.originalTotal ?? 0);
          case "final-asc":
            return (pricingByPath[a.id]?.finalPrice ?? 0) - (pricingByPath[b.id]?.finalPrice ?? 0);
          case "final-desc":
            return (pricingByPath[b.id]?.finalPrice ?? 0) - (pricingByPath[a.id]?.finalPrice ?? 0);
          case "courses":
            return b.courseIds.length - a.courseIds.length;
          default:
            return 0;
        }
      });
    }

    return list;
  }, [data.paths, query, statusFilter, levelFilter, sortKey, pricingByPath]);

  function handleDuplicate(path: AdminLearningPath) {
    const newId = duplicatePath(path.id);
    if (newId) {
      toast({
        title: "تم تكرار المسار",
        description: `أُنشئت نسخة باسم «${path.name} (نسخة)» بحالة مسودة — مع بقاء مراجع دوراتها نفسها.`,
      });
    }
  }

  /** حذف المسار — يستدعى بعد تأكيد الحوار فقط؛ لا يمس الدورات المرتبطة */
  function handleDelete(path: AdminLearningPath) {
    deletePath(path.id);
    toast({ title: "تم حذف المسار", description: `حُذف «${path.name}» — دوراته المرتبطة لم تتأثر.` });
  }

  const hasActiveFilters = query.trim() !== "" || statusFilter !== "all" || levelFilter !== "all";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="المسارات"
        description={`برامج متدرجة تجمع عدة دورات بخصم موحد — ${formatNumber(data.paths.length)} مسار في المخزن.`}
      >
        <Button asChild>
          <Link href="/admin/paths/new">
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            مسار جديد
          </Link>
        </Button>
      </AdminPageHeader>

      <AdminToolbar>
        {/* البحث */}
        <div className="relative w-full lg:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالاسم أو الـ slug…"
            aria-label="بحث في المسارات"
            className="bg-white ps-9"
          />
        </div>

        {/* الفلاتر + الترتيب */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="تصفية حسب الحالة" className="w-full bg-white sm:w-36">
              <SelectValue placeholder="كل الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="draft">مسودة</SelectItem>
              <SelectItem value="published">منشور</SelectItem>
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger aria-label="تصفية حسب المستوى" className="w-full bg-white sm:w-40">
              <SelectValue placeholder="كل المستويات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المستويات</SelectItem>
              {COURSE_LEVEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
            <SelectTrigger aria-label="ترتيب النتائج" className="w-full bg-white sm:w-56">
              <SelectValue placeholder="الترتيب المخزَّن" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setLevelFilter("all");
              }}
            >
              مسح الفلاتر
            </Button>
          ) : null}
        </div>
      </AdminToolbar>

      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        عرض {formatNumber(filteredPaths.length)} من {formatNumber(data.paths.length)} مسار
      </p>

      <PathsList
        paths={filteredPaths}
        courses={data.courses}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  );
}
