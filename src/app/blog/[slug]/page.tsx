import type { Metadata } from "next";
import { blogPosts } from "@/data/content";
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
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "مقال غير موجود" };
  return { title: post.title, description: post.excerpt };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  /* Checkpoint 7: الهيكل الثابت للـ SSR — والعميل يستبدله بمقال الـ CMS بعد الترطيب */
  return <BlogPostView slug={slug} />;
}
