import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CoursesExplorer } from "@/components/courses/courses-explorer";
import { images } from "@/data/images";

export const metadata: Metadata = {
  title: "الدورات",
  description:
    "استعرض جميع دورات بيت المصور في التصوير الفوتوغرافي والفيديو وصناعة المحتوى: حضورية وأونلاين وبرامج خاصة.",
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  return (
    <>
      <PageHeader
        title="الدورات"
        description="برامج تدريبية عملية بأوقات وأسعار واضحة — اختر فئتك وابدأ من حيث يناسبك."
        breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: "الدورات" }]}
        backgroundImage={images.categories.inPersonIndividuals.src}
        imageAlt={images.categories.inPersonIndividuals.alt}
      />
      <Suspense>
        <CoursesExplorer initialCategory={category} />
      </Suspense>
    </>
  );
}
