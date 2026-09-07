import type { Metadata } from "next";

import { BlogEditor } from "@/components/admin/blog/blog-editor";

export const metadata: Metadata = {
  title: "مقال جديد | بيت المصور",
};

/** /admin/blog/new — إضافة مقال (#15) */
export default function AdminNewBlogPostPage() {
  return <BlogEditor mode="create" />;
}
