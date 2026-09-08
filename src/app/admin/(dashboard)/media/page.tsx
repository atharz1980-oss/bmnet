"use client";

/**
 * /admin/media — مكتبة الوسائط (#17 — Mock فقط)
 * ------------------------------------------------
 * رفع محلي بالتحقق (النوع قبل المعاينة + حد 10 MB) + Grid/List +
 * بحث + فلترة + ترتيب + تحرير بيانات + نسخ رابط Mock + حذف بحماية
 * المراجع. عناصر المعاينة المحلية (blob:) لا تُخزن في localStorage
 * وتُفقد بعد التحديث — بتنويه صريح داخل الصفحة.
 */
import { useMemo, useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";

import { useAdminActions, useAdminData } from "@/context/admin-store";
import type { MediaItem } from "@/data/admin/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
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
import { MediaLibrary } from "@/components/admin/media/media-library";
import { MediaUpload } from "@/components/admin/media/media-upload";

type ViewMode = "grid" | "list";
type SourceFilter = "all" | "seed" | "local-preview";
type SortKey = "newest" | "oldest" | "name" | "size";

export default function MediaLibraryPage() {
  const data = useAdminData();
  const { addMediaItems } = useAdminActions();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const filteredMedia = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = data.media.filter((item) => {
      if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
      if (q) {
        const haystack = `${item.name} ${item.altText}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortKey) {
        case "oldest":
          return a.createdAt.localeCompare(b.createdAt);
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return b.size - a.size;
        case "newest":
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [data.media, query, sourceFilter, sortKey]);

  function handleUpload(item: Omit<MediaItem, "id">) {
    addMediaItems([item]);
    toast({
      title: "أُضيفت الصورة إلى المكتبة",
      description: "معاينة محلية لهذه الجلسة — التخزين الفعلي بعد ربط Storage.",
    });
  }

  const localPreviewsCount = data.media.filter((item) => item.source === "local-preview").length;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="مكتبة الوسائط"
        description={`${formatNumber(data.media.length)} عنصرًا في المكتبة — الصور فقط في هذه المرحلة (Mock بلا تخزين فعلي).`}
      />

      {/* الرفع */}
      <div className="mb-4">
        <MediaUpload onUpload={handleUpload} />
      </div>

      {localPreviewsCount > 0 ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-charcoal-200 bg-surface px-4 py-2.5 text-xs leading-relaxed text-charcoal-600"
        >
          {formatNumber(localPreviewsCount)}{" "}
          {localPreviewsCount === 1 ? "معاينة محلية" : "معاينات محلية"} في هذه الجلسة —
          ستُفقد بعد تحديث الصفحة لأن Object URLs لا تُخزَّن في localStorage.
        </p>
      ) : null}

      {/* أدوات العرض */}
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
            placeholder="ابحث بالاسم أو النص البديل…"
            aria-label="بحث في المكتبة"
            className="bg-white ps-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center">
          <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as SourceFilter)}>
            <SelectTrigger aria-label="تصفية حسب المصدر" className="w-full bg-white sm:w-40">
              <SelectValue placeholder="المصدر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المصادر</SelectItem>
              <SelectItem value="seed">من النظام</SelectItem>
              <SelectItem value="local-preview">معاينة محلية</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
            <SelectTrigger aria-label="ترتيب المكتبة" className="w-full bg-white sm:w-40">
              <SelectValue placeholder="الترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث أولًا</SelectItem>
              <SelectItem value="oldest">الأقدم أولًا</SelectItem>
              <SelectItem value="name">الاسم</SelectItem>
              <SelectItem value="size">الحجم</SelectItem>
            </SelectContent>
          </Select>

          {/* Grid / List */}
          <div
            role="group"
            aria-label="طريقة العرض"
            className="col-span-2 flex items-center gap-1 rounded-lg border border-border bg-white p-1 sm:col-span-1"
          >
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              aria-label="عرض شبكة"
              className={cn(
                "flex h-8 w-9 items-center justify-center rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-brand-50 text-brand-700"
                  : "text-charcoal-400 hover:text-charcoal-700",
              )}
            >
              <LayoutGrid aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              aria-label="عرض قائمة"
              className={cn(
                "flex h-8 w-9 items-center justify-center rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-brand-50 text-brand-700"
                  : "text-charcoal-400 hover:text-charcoal-700",
              )}
            >
              <List aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </AdminToolbar>

      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        عرض {formatNumber(filteredMedia.length)} من {formatNumber(data.media.length)} عنصر
      </p>

      <MediaLibrary items={filteredMedia} viewMode={viewMode} />
    </div>
  );
}
