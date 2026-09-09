import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { BlogView } from "@/components/blog/blog-view";
import { images } from "@/data/images";

export const metadata: Metadata = {
  title: "المدونة",
  description:
    "مقالات ونصائح في التصوير الفوتوغرافي والفيديو وصناعة المحتوى من مدربي بيت المصور.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <>
      <PageHeader
        title="المدونة"
        description="نصائح عملية ومقالات مبسطة في التصوير والفيديو وصناعة المحتوى."
        breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: "المدونة" }]}
        backgroundImage={images.upcomingCourse.src}
        imageAlt={images.upcomingCourse.alt}
      />
      {/* Checkpoint 7: المنشورة فقط من الـ CMS بعد الترطيب — وإلا مقالات Phase 1 */}
      <BlogView />
    </>
  );
}
