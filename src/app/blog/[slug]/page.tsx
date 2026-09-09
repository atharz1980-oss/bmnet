import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogPosts } from "@/data/content";
import { loadPublicView } from "@/lib/cms/public-loader";
import { BlogPostView } from "@/components/blog/blog-post-view";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const staticPost = blogPosts.find((p) => p.slug === slug);
  if (staticPost) {
    return {
      title: staticPost.title,
      description: staticPost.excerpt,
      alternates: { canonical: `/blog/${slug}` },
    };
  }
  const view = await loadPublicView();
  const cmsPost = view?.posts.find((entry) => entry.post.slug === slug);
  if (!cmsPost) return { title: "مقال غير موجود" };
  return {
    title: cmsPost.post.title,
    description: cmsPost.post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  /* D-93: العرض العام هو مصدر الحقيقة — مقال غائب عن العرض العام (مسودة
     أو مخفي) → 404 حقيقي حتى لو وُجد في الـSeed الثابت. view=null
     (تعذر قراءة القاعدة) → نتسامح مع الـSeed (D-86) بدل كسر الصفحة. */
  const view = await loadPublicView();
  if (view && !view.posts.some((entry) => entry.post.slug === slug)) {
    notFound();
  }
  return <BlogPostView slug={slug} />;
}
