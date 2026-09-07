"use client";

/**
 * /admin/preview/blog/[id] — معاينة إدارية لمقال (#15)
 * تقرأ المقال من Admin Store — بديل نظيف عن الاعتماد على الموقع العام.
 */
import { useParams } from "next/navigation";

import { useAdminData } from "@/context/admin-store";
import { BlogPreview } from "@/components/admin/preview/blog-preview";

export default function AdminBlogPreviewPage() {
  const params = useParams<{ id: string }>();
  const postId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const data = useAdminData();

  const post = data.posts.find((entry) => entry.id === postId);

  return <BlogPreview post={post} />;
}
