import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PathsView } from "@/components/paths/paths-view";
import { images } from "@/data/images";

export const metadata: Metadata = {
  title: "المسارات",
  description:
    "مسارات تدريبية متكاملة تجمع عدة دورات متدرجة بخصم خاص: مسار التصوير الاحترافي ومسار صناعة المحتوى والفيديو.",
};

export default function PathsPage() {
  return (
    <>
      <PageHeader
        title="المسارات التعليمية"
        description="مسار = عدة دورات مرتبة بتسلسل منطقي تدرسك معاً بخصم أقل من مجموع أسعارها الفردية."
        breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: "المسارات" }]}
        backgroundImage={images.paths.photography.src}
        imageAlt={images.paths.photography.alt}
      />
      {/* Checkpoint 7: القائمة تُ SSR ببيانات Phase 1 وتُستبدل من الـ CMS بعد الترطيب */}
      <PathsView />
    </>
  );
}
