"use client";

/**
 * BlogList — قائمة المقالات (المهمة #15)
 * ---------------------------------------
 * Desktop جدول / Mobile بطاقات. الأعمدة: الغلاف، العنوان، الفئة، الحالة،
 * الكاتب، تاريخ النشر، تاريخ التحديث، إجراءات (تعديل/تكرار/معاينة/حذف).
 *
 * المعاينة دائمًا إلى /admin/preview/blog/[id] — لا رابط مكسور أبدًا
 * (الموقع العام يبقى على بيانات Phase 1 ولا يعرض مقالات المخزن الجديدة).
 */
import Link from "next/link";
import { useState } from "react";
import { Eye, Pencil, Trash2, Copy } from "lucide-react";

import type { AdminBlogPost } from "@/data/admin/types";
import { formatDate, formatMonthYear } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";

interface BlogListProps {
  posts: AdminBlogPost[];
  onDuplicate: (post: AdminBlogPost) => void;
  onDelete: (post: AdminBlogPost) => void;
}

interface RowActionsProps {
  post: AdminBlogPost;
  onDuplicate: (post: AdminBlogPost) => void;
  onRequestDelete: (post: AdminBlogPost) => void;
  withLabels?: boolean;
}

function RowActions({ post, onDuplicate, onRequestDelete, withLabels }: RowActionsProps) {
  return (
    <div className={cn("items-center gap-1", withLabels ? "flex" : "flex justify-end")}>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800"
      >
        <Link href={`/admin/blog/${post.id}`} aria-label={`تعديل المقال ${post.title}`}>
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800"
      >
        <Link href={`/admin/preview/blog/${post.id}`} aria-label={`معاينة المقال ${post.title}`}>
          <Eye aria-hidden="true" className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800"
        onClick={() => onDuplicate(post)}
        aria-label={`تكرار المقال ${post.title}`}
      >
        <Copy aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:bg-brand-50 hover:text-brand-700"
        onClick={() => onRequestDelete(post)}
        aria-label={`حذف المقال ${post.title}`}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function BlogList({ posts, onDuplicate, onDelete }: BlogListProps) {
  /* الحذف لا يتم إلا بعد التأكيد داخل هذه القائمة (نمط D-20 الموحد) */
  const [deleteTarget, setDeleteTarget] = useState<AdminBlogPost | null>(null);

  if (posts.length === 0) {
    return (
      <EmptyState
        title="لا توجد مقالات"
        description="لم يُكتب أي مقال بعد — ابدأ أول مقال بكتل محتوى منظمة."
      >
        <Button asChild size="sm">
          <Link href="/admin/blog/new">مقال جديد</Link>
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
              <th scope="col" className="px-4 py-3 text-start font-medium">المقال</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الفئة</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الحالة</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الكاتب</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">النشر</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">التحديث</th>
              <th scope="col" className="px-4 py-3 text-end font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {posts.map((post) => (
              <tr key={post.id} className="transition-colors hover:bg-surface/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="relative block h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface"
                    >
                      {post.coverImage ? (
                        <img
                          src={post.coverImage}
                          alt={post.coverImageAlt || `غلاف مقال ${post.title}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="block max-w-[240px] truncate font-medium text-charcoal-800 hover:text-brand-700"
                      >
                        {post.title}
                      </Link>
                      <span className="block max-w-[240px] truncate font-latin text-xs text-charcoal-400" dir="ltr">
                        /blog/{post.slug}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-charcoal-600">{post.category}</td>
                <td className="px-3 py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      post.status === "published"
                        ? "border-brand-200 bg-brand-50 text-brand-700"
                        : "border-charcoal-200 bg-surface text-charcoal-500",
                    )}
                  >
                    {post.status === "published" ? "منشور" : "مسودة"}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-charcoal-600">{post.author}</td>
                <td className="px-3 py-3 text-charcoal-600">
                  {formatMonthYear(post.publishedAt)}
                </td>
                <td className="px-3 py-3 text-charcoal-500">
                  {post.updatedAt ? formatDate(post.updatedAt.slice(0, 10)) : "—"}
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    post={post}
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
        {posts.map((post) => (
          <li key={post.id} className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="relative block h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface"
              >
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt={post.coverImageAlt || `غلاف مقال ${post.title}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="block font-medium leading-snug text-charcoal-800 hover:text-brand-700"
                >
                  {post.title}
                </Link>
                <p className="mt-0.5 truncate text-xs text-charcoal-500">
                  {post.category} · {post.author}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      post.status === "published"
                        ? "border-brand-200 bg-brand-50 text-brand-700"
                        : "border-charcoal-200 bg-surface text-charcoal-500",
                    )}
                  >
                    {post.status === "published" ? "منشور" : "مسودة"}
                  </Badge>
                  <span className="text-[11px] text-charcoal-400">
                    {formatDate(post.publishedAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 border-t border-border pt-2.5">
              <RowActions
                post={post}
                onDuplicate={onDuplicate}
                onRequestDelete={setDeleteTarget}
                withLabels={false}
              />
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
        title="حذف المقال"
        description={
          deleteTarget
            ? `سيتم حذف «${deleteTarget.title}» نهائيًا من المدونة. لا يمكن التراجع عن هذا الإجراء.`
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
