"use client";

/**
 * BlogPostView — صفحة المقال (Checkpoint 7 — D-45)
 * ---------------------------------------------------
 * SSR بالهيكل الثابت، وبعد الترطيب مقال الـ CMS المنشور مع **كتل المحتوى
 * المنظمة** (paragraph/heading/image/quote/list) — بلا Rich Text ولا HTML خام.
 * مسودة/محذوف في الـ CMS → واجهة غير متاحة.
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/shared/container";
import { blogPosts as staticPosts } from "@/data/content";
import { usePublicCms } from "@/context/public-cms";
import { formatDate } from "@/lib/format";
import type { BlogContentBlock } from "@/data/admin/types";

function PostUnavailable() {
  return (
    <Container className="py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
        هذا المقال غير متاح حالياً
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-charcoal-500">
        ربما حُدِّثت المقالات أو أُزيل هذا المقال — استعرض بقية مقالات المدونة.
      </p>
      <Button asChild size="lg" className="mt-8 h-12 px-8 text-base font-semibold">
        <Link href="/blog">العودة إلى المدونة</Link>
      </Button>
    </Container>
  );
}

/** عرض كتل المحتوى المنظمة — المصدر الوحيد للمحتوى بلا HTML خام (قرار D-24) */
function ContentBlocks({ blocks }: { blocks: BlogContentBlock[] }) {
  return (
    <div className="mt-8 space-y-6">
      {blocks.map((block) => {
        switch (block.type) {
          case "heading":
            return (
              <h2 key={block.id} className="text-xl font-bold tracking-tight text-charcoal-900 sm:text-2xl">
                {block.text}
              </h2>
            );
          case "quote":
            return (
              <blockquote
                key={block.id}
                className="rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-6"
              >
                <p className="flex items-start gap-3 text-base leading-relaxed text-charcoal-700">
                  <Quote aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-brand-500" />
                  {block.text}
                </p>
              </blockquote>
            );
          case "list":
            return (
              <ul key={block.id} className="space-y-2.5">
                {(block.items ?? []).map((item) => (
                  <li key={item} className="flex items-start gap-2.5 leading-relaxed text-charcoal-600">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "image":
            if (!block.image || !block.image.startsWith("/") || block.image.startsWith("//")) {
              return null;
            }
            return (
              <figure key={block.id} className="overflow-hidden rounded-2xl border border-charcoal-100">
                <div className="relative aspect-[16/9] bg-charcoal-100">
                  <Image
                    src={block.image}
                    alt={block.imageAlt ?? block.image}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover"
                  />
                </div>
                {block.imageAlt ? (
                  <figcaption className="p-3 text-center text-xs text-charcoal-400">
                    {block.imageAlt}
                  </figcaption>
                ) : null}
              </figure>
            );
          default:
            return (
              <p key={block.id} className="text-base leading-relaxed text-charcoal-700">
                {block.text}
              </p>
            );
        }
      })}
    </div>
  );
}

export function BlogPostView({ slug }: { slug: string }) {
  const { view, hydrated } = usePublicCms();

  const cmsEntry = view?.posts.find((entry) => entry.post.slug === slug);
  const staticPost = staticPosts.find((p) => p.slug === slug);
  /* بعد الترطيب: الـ CMS هو المصدر — المقال غير موجود فيه (مسودة/محذوف) = غير متاح */
  const post = view ? cmsEntry?.post : staticPost;
  const blocks = cmsEntry?.contentBlocks ?? [];

  if (!post) {
    if (!hydrated) {
      return (
        <Container className="flex min-h-64 items-center justify-center py-24 text-charcoal-300">
          <span className="sr-only">جارٍ تحميل المقال…</span>
        </Container>
      );
    }
    return <PostUnavailable />;
  }

  return (
    <>
      <header className="bg-charcoal-950 py-12 text-white sm:py-16">
        <Container>
          <nav aria-label="مسار التنقل" className="mb-5 text-sm text-charcoal-300">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link href="/" className="transition-colors hover:text-white">الرئيسية</Link></li>
              <li aria-hidden="true" className="text-charcoal-500">/</li>
              <li><Link href="/blog" className="transition-colors hover:text-white">المدونة</Link></li>
              <li aria-hidden="true" className="text-charcoal-500">/</li>
              <li aria-current="page" className="font-medium text-brand-400">{post.title}</li>
            </ol>
          </nav>
          <Badge variant="outline" className="border-white/20 text-charcoal-200">
            {post.category}
          </Badge>
          <h1 className="mt-4 max-w-3xl text-2xl font-bold leading-snug tracking-tight sm:text-3xl lg:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-charcoal-300">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readMinutes} دقائق قراءة</span>
          </div>
        </Container>
      </header>

      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-charcoal-100">
            <Image
              src={post.image}
              alt={post.imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>

          <p className="mt-8 text-lg leading-relaxed text-charcoal-700">{post.excerpt}</p>

          {blocks.length > 0 ? (
            <ContentBlocks blocks={blocks} />
          ) : (
            <div className="mt-8 flex items-start gap-3 rounded-xl border border-dashed border-charcoal-300 bg-charcoal-50/50 p-6 text-sm leading-relaxed text-charcoal-500">
              <FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
              <p>
                هذه صفحة هيكلية للمقال — النص الكامل سيُنشر عند تشغيل المدونة رسمياً.
                يمكنك متابعة حساباتنا أو الاشتراك بالنشرة ليصلك إشعار النشر.
              </p>
            </div>
          )}

          <Button asChild variant="outline" className="mt-10 gap-2">
            <Link href="/blog">
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
              العودة إلى المدونة
            </Link>
          </Button>
        </div>
      </Container>
    </>
  );
}
