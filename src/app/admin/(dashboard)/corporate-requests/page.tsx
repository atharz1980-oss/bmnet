"use client";

/**
 * /admin/corporate-requests — قائمة طلبات تدريب الشركات (#16)
 * -------------------------------------------------------------
 * بحث (الشركة/مسؤول التواصل/الجوال/البريد) + فلاتر (الحالة/الدورة/
 * النطاق النشط-الأرشيف) + 4 ترتيبات (الأحدث/الأقدم/اسم الشركة/عدد
 * المتدربين) — كلها تعمل فعليًا على المخزن.
 * لا حذف نهائي: الأرشفة فقط (قرار موثق Checkpoint 5).
 */
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { useAdminActions, useAdminData } from "@/context/admin-store";
import type { CorporateRequest } from "@/data/admin/types";
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
import {
  ConfirmArchiveDialog,
  CorporateRequestsList,
} from "@/components/admin/corporate-requests/corporate-requests-list";

type ScopeFilter = "active" | "archived" | "all";
type StatusFilter = "all" | "new" | "contacted" | "preparing-offer" | "offer-sent" | "agreed" | "closed";
type SortKey = "newest" | "oldest" | "company" | "trainees";

export default function CorporateRequestsPage() {
  const data = useAdminData();
  const { updateRequest } = useAdminActions();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [archiveTarget, setArchiveTarget] = useState<CorporateRequest | null>(null);

  /* قائمة الدورات المطلوبة الفريدة (للفلتر) — مشتقة من البيانات */
  const requestedCourses = useMemo(
    () => Array.from(new Set(data.requests.map((request) => request.requestedCourse))).sort(),
    [data.requests],
  );

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = data.requests.filter((request) => {
      if (scopeFilter === "active" && request.archivedAt) return false;
      if (scopeFilter === "archived" && !request.archivedAt) return false;
      if (statusFilter !== "all" && request.status !== statusFilter) return false;
      if (courseFilter !== "all" && request.requestedCourse !== courseFilter) return false;
      if (q) {
        const haystack = `${request.company} ${request.contactPerson} ${request.phone} ${request.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortKey) {
        case "oldest":
          return a.createdAt.localeCompare(b.createdAt);
        case "company":
          return a.company.localeCompare(b.company, "ar");
        case "trainees":
          return b.traineesCount - a.traineesCount;
        case "newest":
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [data.requests, query, scopeFilter, statusFilter, courseFilter, sortKey]);

  async function handleArchive(request: CorporateRequest) {
    const result = await updateRequest(request.id, { archivedAt: new Date().toISOString() });
    if (!result.ok) {
      toast({ title: "تعذر الأرشفة", description: result.error, variant: "destructive" });
      return;
    }
    toast({
      title: "تم أرشفة الطلب",
      description: `أُخفي طلب «${request.company}» من القائمة النشطة — يمكن استعادته من فلتر «الأرشيف».`,
    });
  }

  async function handleRestore(request: CorporateRequest) {
    const result = await updateRequest(request.id, { archivedAt: undefined });
    if (!result.ok) {
      toast({ title: "تعذر الحذف من الأرشيف", description: result.error, variant: "destructive" });
      return;
    }
    toast({
      title: "تمت الاستعادة",
      description: `عاد طلب «${request.company}» إلى قائمة الطلبات النشطة.`,
    });
  }

  const activeCount = data.requests.filter((request) => !request.archivedAt).length;
  const archivedCount = data.requests.length - activeCount;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="طلبات تدريب الشركات"
        description={`${formatNumber(activeCount)} طلبًا نشطًا و${formatNumber(archivedCount)} في الأرشيف — تُدار الحالات والملاحظات الداخلية من صفحة كل طلب.`}
      />

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
            placeholder="ابحث بالشركة أو مسؤول التواصل أو الجوال أو البريد…"
            aria-label="بحث في طلبات الشركات"
            className="bg-white ps-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center">
          <Select value={scopeFilter} onValueChange={(value) => setScopeFilter(value as ScopeFilter)}>
            <SelectTrigger aria-label="تصفية حسب النطاق" className="w-full bg-white sm:w-32">
              <SelectValue placeholder="النطاق" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">النشطة ({formatNumber(activeCount)})</SelectItem>
              <SelectItem value="archived">الأرشيف ({formatNumber(archivedCount)})</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger aria-label="تصفية حسب الحالة" className="w-full bg-white sm:w-36">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="new">جديد</SelectItem>
              <SelectItem value="contacted">تم التواصل</SelectItem>
              <SelectItem value="preparing-offer">تحضير العرض</SelectItem>
              <SelectItem value="offer-sent">أُرسل العرض</SelectItem>
              <SelectItem value="agreed">تم الاتفاق</SelectItem>
              <SelectItem value="closed">مُغلق</SelectItem>
            </SelectContent>
          </Select>

          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger aria-label="تصفية حسب الدورة المطلوبة" className="w-full bg-white sm:w-44">
              <SelectValue placeholder="الدورة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الدورات</SelectItem>
              {requestedCourses.map((course) => (
                <SelectItem key={course} value={course}>
                  {course}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
            <SelectTrigger aria-label="ترتيب الطلبات" className="w-full bg-white sm:w-40">
              <SelectValue placeholder="الترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث أولًا</SelectItem>
              <SelectItem value="oldest">الأقدم أولًا</SelectItem>
              <SelectItem value="company">اسم الشركة</SelectItem>
              <SelectItem value="trainees">عدد المتدربين</SelectItem>
            </SelectContent>
          </Select>

          {query || statusFilter !== "all" || courseFilter !== "all" || scopeFilter !== "active" ? (
            <Button
              variant="ghost"
              size="sm"
              className="col-span-2 sm:col-span-1"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setCourseFilter("all");
                setScopeFilter("active");
              }}
            >
              مسح الفلاتر
            </Button>
          ) : null}
        </div>
      </AdminToolbar>

      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        عرض {formatNumber(filteredRequests.length)} من {formatNumber(data.requests.length)} طلب
      </p>

      <CorporateRequestsList
        requests={filteredRequests}
        /* زر الأرشفة يفتح حوار التأكيد أولًا — لا أرشفة صامتة */
        onArchive={setArchiveTarget}
        onRestore={setArchiveTarget}
      />

      <ConfirmArchiveDialog
        target={archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        onArchive={handleArchive}
        onRestore={handleRestore}
      />
    </div>
  );
}
