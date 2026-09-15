"use client";

/**
 * BlogView — قائمة المدونة (Checkpoint 7 — D-45)
 * -----------------------------------------------
 * SSR بمقالات Phase 1 الثابتة، وبعد الترطيب مقالات الـ CMS المنشورة فقط
 * (الأحدث أولًا) — المسودات لا تظهر للعامة أبدًا.
 */
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { blogPosts as staticPosts } from "@/data/content";
import { usePublicCms } from "@/context/public-cms";
import { formatDate } from "@/lib/format";
import type { BlogPost } from "@/types";

export function BlogView() {
  const { view } = usePublicCms();
  const posts: BlogPost[] = view ? view.posts.map((entry) => entry.post) : staticPosts;
  const [featured, ...rest] = posts;

  return (
    <Container className="py-12 sm:py-16 lg:py-20">
      {/* المقال الأحدث */}
      {featured && (
        <Reveal>
          <article className="relative grid overflow-hidden rounded-2xl border border-charcoal-200/80 bg-white shadow-sm lg:grid-cols-2">
            <div className="relative min-h-56 bg-charcoal-100 lg:min-h-full">
              <Image
                src={featured.image}
                alt={featured.imageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-400">
                <Badge variant="outline" className="border-brand-200 bg-brand-50 text-brand-700">
                  {featured.category}
                </Badge>
                <time dateTime={featured.date} className="flex items-center gap-1.5">
                  <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                  {formatDate(featured.date)}
                </time>
                <span className="flex items-center gap-1.5">
                  <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                  {featured.readMinutes} دقائق قراءة
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-bold leading-snug tracking-tight text-charcoal-900">
                <Link href={`/blog/${featured.slug}`} className="transition-colors after:absolute after:inset-0 hover:text-brand-700">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-3 leading-relaxed text-charcoal-500">{featured.excerpt}</p>
              <p className="mt-5 text-sm font-semibold text-brand-600">أحدث المقالات</p>
            </div>
          </article>
        </Reveal>
      )}

      {/* بقية المقالات */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {rest.map((post, index) => (
          <Reveal key={post.id} delay={(index % 3) * 80}>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-charcoal-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-charcoal-900/5">
              <div className="relative aspect-[16/10] overflow-hidden bg-charcoal-100">
                <Image
                  src={post.image}
                  alt={post.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-3 text-xs text-charcoal-400">
                  <Badge variant="outline" className="border-charcoal-200 text-charcoal-500">
                    {post.category}
                  </Badge>
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                </div>
                <h3 className="mt-2.5 text-lg font-bold leading-snug text-charcoal-900">
                  <Link href={`/blog/${post.slug}`} className="transition-colors after:absolute after:inset-0 hover:text-brand-700">
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-charcoal-500">
                  {post.excerpt}
                </p>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-charcoal-400">
                  <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                  {post.readMinutes} دقائق قراءة
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Container>
  );
}
