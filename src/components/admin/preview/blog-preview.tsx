"use client";

/**
 * BlogPreview — معاينة إدارية لمقال (#15)
 * -----------------------------------------
 * تعرض المقال من Admin Store بكتله المنظمة بنفس لغة التصميم.
 * المسودات تظهر هنا بوضوح (شارة مسودة) — ولا تنشئ أي رابط عام.
 */
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import type { AdminBlogPost } from "@/data/admin/types";
import { formatDate, formatNumber } from "@/lib/format";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { cn } from "@/lib/utils";

export function BlogPreview({ post }: { post: AdminBlogPost | undefined }) {
  if (!post) {
    return (
      <div className="mx-auto w-full max-w-3xl py-10">
        <EmptyState
          title="المقال غير موجود"
          description="ربما حُذف هذا المقال أو أن الرابط غير صحيح."
        >
          <Button asChild size="sm">
            <Link href="/admin/blog">العودة لقائمة المدونة</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl pb-16">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          معاينة إدارية — لا تمثل صفحة الموقع العام.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/blog/${post.id}`}>تعديل المقال</Link>
        </Button>
      </div>

      {post.status === "draft" ? (
        <p
          role="alert"
          className="mb-4 flex items-start gap-1.5 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs leading-relaxed text-brand-700"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          هذا المقال <strong>مسودة</strong> — لن يظهر كمنشور على الموقع حتى تغيّر حالته إلى «منشور»
          (قاعدة Business 5).
        </p>
      ) : null}

      <article className="overflow-hidden rounded-2xl border border-border bg-white">
        {/* رأس المقال */}
        <Container className="max-w-3xl pt-8 sm:pt-10">
          <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-400">
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
            <span>{post.category}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span className="num-ltr">{formatNumber(post.readMinutes)} دقائق قراءة</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-snug tracking-tight text-charcoal-900 sm:text-3xl">
            {post.title}
          </h1>
          <p className="mt-3 leading-relaxed text-charcoal-500">{post.excerpt}</p>
          <p className="mt-4 text-sm text-charcoal-600">
            بقلم <span className="font-semibold text-charcoal-800">{post.author}</span>
          </p>
        </Container>

        {/* الغلاف */}
        {post.coverImage ? (
          <Container className="max-w-3xl mt-6">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-charcoal-100 bg-surface">
              <img
                src={post.coverImage}
                alt={post.coverImageAlt || `غلاف مقال ${post.title}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </Container>
        ) : null}

        {/* كتل المحتوى */}
        <Container className="max-w-3xl py-8">
          <div className="space-y-5">
            {post.contentBlocks.map((block) => {
              switch (block.type) {
                case "paragraph":
                  return (
                    <p key={block.id} className="leading-loose text-charcoal-700">
                      {block.text}
                    </p>
                  );
                case "heading":
                  return (
                    <h2 key={block.id} className="pt-2 text-xl font-bold text-charcoal-900">
                      {block.text}
                    </h2>
                  );
                case "quote":
                  return (
                    <blockquote
                      key={block.id}
                      className="rounded-xl border-s-4 border-brand-600 bg-surface p-4 text-charcoal-700"
                    >
                      <p className="leading-relaxed">“{block.text}”</p>
                    </blockquote>
                  );
                case "list":
                  return (
                    <ul key={block.id} className="list-inside list-disc space-y-1.5 text-charcoal-700">
                      {(block.items ?? []).map(
                        (item, index) =>
                          item.trim() ? <li key={index}>{item}</li> : null,
                      )}
                    </ul>
                  );
                case "image":
                  return (
                    <figure key={block.id}>
                      {block.image ? (
                        <div className="overflow-hidden rounded-xl border border-charcoal-100">
                          <img
                            src={block.image}
                            alt={block.imageAlt ?? ""}
                            className="w-full object-cover"
                          />
                        </div>
                      ) : null}
                      {block.imageAlt ? (
                        <figcaption className="mt-1.5 text-center text-xs text-charcoal-400">
                          {block.imageAlt}
                        </figcaption>
                      ) : null}
                    </figure>
                  );
                default:
                  return null;
              }
            })}
          </div>

          {/* التاغز */}
          {post.tags.length > 0 ? (
            <div className="mt-8 border-t border-border pt-5">
              <ul className="flex flex-wrap gap-1.5" aria-label="تاغز المقال">
                {post.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-md bg-surface px-2 py-1 text-xs text-charcoal-600"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Container>
      </article>
    </div>
  );
}
