import type { MetadataRoute } from "next";

import { loadPublicView } from "@/lib/cms/public-loader";
import { getPublicAnonClient } from "@/lib/supabase/service";
import { siteConfig } from "@/data/site";

export const revalidate = 3600;

/** أسماء مستخدمي أعضاء المجتمع النشطين — تُسقط بصمت عند تعذر القاعدة (D-86) */
async function loadCommunityUsernames(): Promise<string[]> {
  try {
    const client = getPublicAnonClient();
    const { data, error } = await client
      .from("community_profiles")
      .select("username")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return [];
    return (data ?? []).map((row: { username: string }) => row.username);
  } catch {
    return [];
  }
}

/** خريطة الموقع: الصفحات الثابتة + المحتوى المنشور من قاعدة البيانات */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/courses`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/paths`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/corporate-training`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/community`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/community/photographers`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    ...["privacy", "terms", "refund", "registration-cancellation"].map((slug) => ({
      url: `${base}/policies/${slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  /* المحتوى الحي من القاعدة — وعند فشل الجلب تبقى الصفحات الثابتة فقط (D-86) */
  try {
    const [view, usernames] = await Promise.all([loadPublicView(), loadCommunityUsernames()]);
    if (view) {
      return [
        ...staticRoutes,
        ...view.courses.map((course) => ({
          url: `${base}/courses/${course.slug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        })),
        ...view.paths.map((entry) => ({
          url: `${base}/paths/${entry.path.slug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })),
        ...view.posts.map((entry) => ({
          url: `${base}/blog/${entry.post.slug}`,
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
        ...usernames.map((username) => ({
          url: `${base}/community/u/${username}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.5,
        })),
      ];
    }
  } catch {
    /* تجاهل — الخريطة الثابتة كافية عند تعذر القاعدة */
  }

  return staticRoutes;
}
