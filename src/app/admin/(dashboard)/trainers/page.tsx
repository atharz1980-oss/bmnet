"use client";

/**
 * /admin/trainers — قائمة المدربين (المهمة #12)
 * ----------------------------------------------
 * Search + فلترة الحالة + ترتيب — تعمل فعليًا على مخزن الـ Mock عبر useMemo.
 * الإجراءات: تعديل / تكرار / حذف (بتأكيد) — والحذف مع الحماية المعتمدة
 * (D-21): مدرب مرتبط بدورات لا يُحذف — يُحوَّل إلى مخفي من الحوار.
 *
 * لا زر معاينة: لا توجد Public Trainer Page في هذه المرحلة (قرار المالك).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { useAdminActions, useAdminData } from "@/context/admin-store";
import type { AdminTrainer } from "@/data/admin/types";
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
import { TrainersList } from "@/components/admin/trainers/trainers-list";

type SortKey = "default" | "name" | "experience" | "courses";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "default", label: "الترتيب المخزَّن" },
  { value: "name", label: "الاسم (أ–ي)" },
  { value: "experience", label: "الأعلى خبرة" },
  { value: "courses", label: "الأكثر دورات مرتبطة" },
];

export default function AdminTrainersPage() {
  const data = useAdminData();
  const { duplicateTrainer, deleteTrainer, updateTrainer } = useAdminActions();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  /* عدد الدورات المرتبطة بكل مدرب (مرجع trainerId — حساب واحد لكل الرسم) */
  const coursesCountByTrainer = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const course of data.courses) {
      if (course.trainerId) {
        counts[course.trainerId] = (counts[course.trainerId] ?? 0) + 1;
      }
    }
    return counts;
  }, [data.courses]);

  const filteredTrainers = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = data.trainers.filter((trainer) => {
      if (statusFilter !== "all" && trainer.status !== statusFilter) return false;
      if (q) {
        const haystack =
          `${trainer.name} ${trainer.title} ${trainer.specialty}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortKey !== "default") {
      list = [...list].sort((a, b) => {
        switch (sortKey) {
          case "name":
            return a.name.localeCompare(b.name, "ar");
          case "experience":
            return b.yearsOfExperience - a.yearsOfExperience;
          case "courses":
            return (
              (coursesCountByTrainer[b.id] ?? 0) - (coursesCountByTrainer[a.id] ?? 0)
            );
          default:
            return 0;
        }
      });
    }

    return list;
  }, [data.trainers, query, statusFilter, sortKey, coursesCountByTrainer]);

  async function handleDuplicate(trainer: AdminTrainer) {
    const result = await duplicateTrainer(trainer.id);
    if (result.ok) {
      toast({
        title: "تم تكرار بيانات المدرب",
        description: `أُنشئت نسخة باسم «${trainer.name} (نسخة)» بحالة مخفية — عدّلها ثم فعّلها.`,
      });
    } else {
      toast({ title: "تعذر التكرار", description: result.error, variant: "destructive" });
    }
  }

  /** حذف مدرب غير مرتبط — يستدعى بعد تأكيد الحوار فقط */
  async function handleDelete(trainer: AdminTrainer) {
    const result = await deleteTrainer(trainer.id);
    if (result.ok) {
      toast({ title: "تم حذف المدرب", description: `حُذف «${trainer.name}» من قاعدة البيانات.` });
    } else {
      toast({ title: "تعذر الحذف", description: result.error, variant: "destructive" });
    }
  }

  /** البديل الآمن للمدرب المرتبط بدورات (D-21): تحويل إلى مخفي بدل الحذف */
  async function handleHide(trainer: AdminTrainer) {
    const result = await updateTrainer(trainer.id, { status: "hidden" });
    if (result.ok) {
      toast({
        title: "تم تحويل المدرب إلى مخفي",
        description: "لم يعد يظهر في اختيار مدربي الدورات الجديدة — وبقيت علاقاته القائمة محفوظة.",
      });
    } else {
      toast({ title: "تعذر التحديث", description: result.error, variant: "destructive" });
    }
  }

  const hasActiveFilters = query.trim() !== "" || statusFilter !== "all";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="المدربون"
        description={`فريق تدريب بيت المصور — ${formatNumber(data.trainers.length)} مدرب في المخزن.`}
      >
        <Button asChild>
          <Link href="/admin/trainers/new">
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            مدرب جديد
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
            placeholder="ابحث بالاسم أو التخصص…"
            aria-label="بحث في المدربين"
            className="bg-white ps-9"
          />
        </div>

        {/* الفلترة + الترتيب */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="تصفية حسب الحالة" className="w-full bg-white sm:w-40">
              <SelectValue placeholder="كل الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="hidden">مخفي</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
            <SelectTrigger aria-label="ترتيب النتائج" className="w-full bg-white sm:w-52">
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
              }}
            >
              مسح الفلاتر
            </Button>
          ) : null}
        </div>
      </AdminToolbar>

      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        عرض {formatNumber(filteredTrainers.length)} من {formatNumber(data.trainers.length)} مدرب
      </p>

      <TrainersList
        trainers={filteredTrainers}
        coursesCountByTrainer={coursesCountByTrainer}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onHide={handleHide}
      />
    </div>
  );
}
