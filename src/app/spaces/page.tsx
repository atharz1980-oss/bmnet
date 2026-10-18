import type { Metadata } from "next";
import { Frame } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { SpaceCard } from "@/components/spaces/space-card";
import { loadPublicSpaces } from "@/lib/spaces/public";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "المساحات",
  description:
    "مساحات استوديو بيت المصور للتصوير وصناعة المحتوى: كروما خضراء وبيضاء ومساحات بودكاست وغيرها — اختر المساحة واليوم والوقت «من — إلى» واحجز بدفع إلكتروني بتأكيد فوري.",
  alternates: { canonical: "/spaces" },
};

/** قائمة المساحات — كلها تصل من الباك اند (studio_spaces المنشورة). */
export default async function SpacesPage() {
  const spaces = await loadPublicSpaces();
  return (
    <>
      <PageHeader
        title="مساحات الاستوديو"
        description="اختر المساحة التي تناسب تصويرك، وحدّد اليوم والوقت «من — إلى»، واحجز فورًا بدفع إلكتروني — التأكيد يصلك بعد نجاح الدفع مباشرة."
        breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: "المساحات" }]}
      />
      <Container className="py-12 sm:py-16">
        {spaces.length === 0 ? (
          <div className="rounded-2xl border border-charcoal-200 bg-white p-10 text-center">
            <Frame aria-hidden="true" className="mx-auto h-10 w-10 text-charcoal-300" />
            <h2 className="mt-4 text-lg font-bold text-charcoal-900">لا توجد مساحات متاحة حاليًا</h2>
            <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
              المساحات تُضاف وتُدار من لوحة التحكم — تواصل معنا لترتيب حجز خاص حتى تُنشر المساحات.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
