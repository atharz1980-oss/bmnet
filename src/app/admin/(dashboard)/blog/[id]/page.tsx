"use client";

/**
 * /admin/blog/[id] — تعديل مقال (المهمة #15)
 * نفس محرر المقال بوضع التعديل — المعرّف من المسار.
 */
import { useParams } from "next/navigation";

import { BlogEditor } from "@/components/admin/blog/blog-editor";

export default function EditBlogPostPage() {
  const params = useParams<{ id: string }>();
  const postId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  return <BlogEditor mode="edit" postId={postId} />;
}
