"use client";

/**
 * /admin/courses — قائمة الدورات (المهمة #8)
 * -------------------------------------------
 * Search + Filter by category + Filter by status + Sort — كلها تعمل
 * فعليًا على مخزن الـ Mock عبر useMemo. الإجراءات (تكرار/حذف) تستدعي
 * Store actions مباشرة مع Toast واضح.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { useAdminActions, useAdminData } from "@/context/admin-store";
import type { AdminCourse, CourseStatus } from "@/data/admin/types";
import type { CourseCategory } from "@/types";
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
import { CoursesList } from "@/components/admin/courses/courses-list";
import {
  COURSE_STATUS_OPTIONS,
  COURSE_TYPE_OPTIONS,
} from "@/components/admin/courses/course-meta";

type SortKey = "newest" | "name" | "price-asc" | "price-desc" | "registered";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "الأحدث إضافة" },
  { value: "name", label: "الاسم (أ–ي)" },
  { value: "price-asc", label: "السعر: الأقل أولًا" },
  { value: "price-desc", label: "السعر: الأعلى أولًا" },
  { value: "registered", label: "الأكثر تسجيلًا" },
];

function registeredCount(course: AdminCourse): number {
  return course.sessions.reduce((sum, session) => sum + session.registered, 0);
}

export default function AdminCoursesPage() {
  const data = useAdminData();
  const { duplicateCourse, deleteCourse } = useAdminActions();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  /* الفلترة والترتيب تعمل فعليًا على بيانات المخزن */
  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = data.courses.filter((course) => {
      if (typeFilter !== "all" && course.type !== (typeFilter as CourseCategory)) return false;
      if (statusFilter !== "all" && course.status !== (statusFilter as CourseStatus)) return false;
      if (q) {
        const haystack = `${course.name} ${course.shortName ?? ""} ${course.slug}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "ar");
        case "price-asc":
          return a.pricing.price - b.pricing.price;
        case "price-desc":
          return b.pricing.price - a.pricing.price;
        case "registered":
          return registeredCount(b) - registeredCount(a);
        case "newest":
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });

    return list;
  }, [data.courses, query, typeFilter, statusFilter, sortKey]);

  async function handleDuplicate(course: AdminCourse) {
    const result = await duplicateCourse(course.id);
    if (result.ok) {
      toast({
        title: "تم تكرار الدورة",
        description: `أُنشئت نسخة باسم «${course.name} (نسخة)» بحالة مسودة — عدّلها ثم انشرها.`,
      });
    } else {
      toast({ title: "تعذر التكرار", description: result.error, variant: "destructive" });
    }
  }

  async function handleDelete(course: AdminCourse) {
    const result = await deleteCourse(course.id);
    if (result.ok) {
      toast({ title: "تم حذف الدورة", description: `حُذفت «${course.name}» من قاعدة البيانات.` });
    } else {
      toast({ title: "تعذر الحذف", description: result.error, variant: "destructive" });
    }
  }

  const hasActiveFilters = query.trim() !== "" || typeFilter !== "all" || statusFilter !== "all";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="الدورات"
        description={`إدارة برامج بيت المصور التدريبية — ${formatNumber(data.courses.length)} دورة في المخزن.`}
      >
        <Button asChild>
          <Link href="/admin/courses/new">
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            دورة جديدة
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
            aria-label="بحث في الدورات"
            className="bg-white ps-9"
          />
        </div>

        {/* الفلاتر + الترتيب */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger aria-label="تصفية حسب النوع" className="w-full bg-white sm:w-40">
              <SelectValue placeholder="كل الأنواع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {COURSE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="تصفية حسب الحالة" className="w-full bg-white sm:w-44">
              <SelectValue placeholder="كل الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {COURSE_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
            <SelectTrigger aria-label="ترتيب النتائج" className="w-full bg-white sm:w-44">
              <SelectValue placeholder="الأحدث إضافة" />
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
                setTypeFilter("all");
                setStatusFilter("all");
              }}
            >
              مسح الفلاتر
            </Button>
          ) : null}
        </div>
      </AdminToolbar>

      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        عرض {formatNumber(filteredCourses.length)} من {formatNumber(data.courses.length)} دورة
      </p>

      <CoursesList
        courses={filteredCourses}
        paths={data.paths}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  );
}
