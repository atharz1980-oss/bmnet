"use client";

/**
 * /admin/blog — قائمة المدونة (المهمة #15)
 * ------------------------------------------
 * Search + فلاتر (الحالة/الفئة/الكاتب) + 3 طرق ترتيب — تعمل فعليًا على المخزن.
 * الإجراءات: تعديل / معاينة إدارية / تكرار / حذف (بتأكيد داخل القائمة).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { useAdminActions, useAdminData } from "@/context/admin-store";
import type { AdminBlogPost } from "@/data/admin/types";
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
import { BlogList } from "@/components/admin/blog/blog-list";

type SortKey = "newest" | "oldest" | "title";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "الأحدث نشرًا" },
  { value: "oldest", label: "الأقدم نشرًا" },
  { value: "title", label: "العنوان (أ–ي)" },
];

export default function AdminBlogPage() {
  const data = useAdminData();
  const { duplicatePost, deletePost } = useAdminActions();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const categories = useMemo(
    () => Array.from(new Set(data.posts.map((post) => post.category))).sort(),
    [data.posts],
  );
  const authors = useMemo(
    () => Array.from(new Set(data.posts.map((post) => post.author))).sort(),
    [data.posts],
  );

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = data.posts.filter((post) => {
      if (statusFilter !== "all" && post.status !== statusFilter) return false;
      if (categoryFilter !== "all" && post.category !== categoryFilter) return false;
      if (authorFilter !== "all" && post.author !== authorFilter) return false;
      if (q) {
        const haystack = `${post.title} ${post.excerpt} ${post.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "newest":
          return b.publishedAt.localeCompare(a.publishedAt);
        case "oldest":
          return a.publishedAt.localeCompare(b.publishedAt);
        case "title":
          return a.title.localeCompare(b.title, "ar");
        default:
          return 0;
      }
    });

    return list;
  }, [data.posts, query, statusFilter, categoryFilter, authorFilter, sortKey]);

  async function handleDuplicate(post: AdminBlogPost) {
    const result = await duplicatePost(post.id);
    if (result.ok) {
      toast({
        title: "تم تكرار المقال",
        description: `أُنشئت نسخة مسودة بعنوان «${post.title} (نسخة)» و Slug فريد.`,
      });
    } else {
      toast({ title: "تعذر التكرار", description: result.error, variant: "destructive" });
    }
  }

  async function handleDelete(post: AdminBlogPost) {
    const result = await deletePost(post.id);
    if (result.ok) {
      toast({ title: "تم حذف المقال", description: `حُذف «${post.title}» من قاعدة البيانات.` });
    } else {
      toast({ title: "تعذر الحذف", description: result.error, variant: "destructive" });
    }
  }

  const hasActiveFilters =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    authorFilter !== "all";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="المدونة"
        description={`${formatNumber(data.posts.length)} مقالًا في المخزن — المحتوى بكتل منظمة، والمعاينة داخل لوحة التحكم.`}
      >
        <Button asChild>
          <Link href="/admin/blog/new">
            <Plus aria-hidden="true" className="me-1.5 h-4 w-4" />
            مقال جديد
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
            placeholder="ابحث بالعنوان أو المقتطف أو التاغ…"
            aria-label="بحث في المقالات"
            className="bg-white ps-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="تصفية حسب الحالة" className="w-full bg-white sm:w-32">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="draft">مسودة</SelectItem>
              <SelectItem value="published">منشور</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger aria-label="تصفية حسب الفئة" className="w-full bg-white sm:w-40">
              <SelectValue placeholder="الفئة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={authorFilter} onValueChange={setAuthorFilter}>
            <SelectTrigger aria-label="تصفية حسب الكاتب" className="w-full bg-white sm:w-40">
              <SelectValue placeholder="الكاتب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الكُتّاب</SelectItem>
              {authors.map((author) => (
                <SelectItem key={author} value={author}>
                  {author}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
            <SelectTrigger aria-label="ترتيب النتائج" className="w-full bg-white sm:w-40">
              <SelectValue placeholder="الترتيب" />
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
              className="col-span-2 sm:col-span-1"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setCategoryFilter("all");
                setAuthorFilter("all");
              }}
            >
              مسح الفلاتر
            </Button>
          ) : null}
        </div>
      </AdminToolbar>

      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        عرض {formatNumber(filteredPosts.length)} من {formatNumber(data.posts.length)} مقال
      </p>

      <BlogList posts={filteredPosts} onDuplicate={handleDuplicate} onDelete={handleDelete} />
    </div>
  );
}
