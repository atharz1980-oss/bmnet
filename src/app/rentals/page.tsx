import type { Metadata } from "next";
import { Package } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { EquipmentCard } from "@/components/rentals/equipment-card";
import { EquipmentCatalogBrowser } from "@/components/rentals/equipment-catalog-browser";
import { loadPublicEquipment, loadPublicEquipmentCategories } from "@/lib/rentals/public";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "تأجير المعدات",
  description:
    "استأجر معدات التصوير من بيت المصور: كاميرات وعدسات وإضاءة ومايكات وشاشات وسماعات — بفترة محددة ودفع إلكتروني وتوقيع عقد إلكتروني.",
  alternates: { canonical: "/rentals" },
};

/** كتالوج المعدات — كلها تصل من الباك اند (equipment_items المنشورة). */
export default async function RentalsPage() {
  const [items, categories] = await Promise.all([loadPublicEquipment(), loadPublicEquipmentCategories()]);

  return (
    <>
      <PageHeader
        title="تأجير المعدات"
        description="اختر المعدة، حدّد فترة الإيجار، ووقّع العقد إلكترونيًا — الإيجار يُثبَّت بعد نجاح الدفع."
        breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: "تأجير المعدات" }]}
      />
      <Container className="py-12 sm:py-16">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-charcoal-200 bg-white p-10 text-center">
            <Package aria-hidden="true" className="mx-auto h-10 w-10 text-charcoal-300" />
            <h2 className="mt-4 text-lg font-bold text-charcoal-900">لا توجد معدات متاحة حاليًا</h2>
            <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
              المعدات تُضاف وتُدار من لوحة التحكم — تواصل معنا لترتيب إيجار خاص حتى تُنشر المعدات.
            </p>
          </div>
        ) : (
          <EquipmentCatalogBrowser
            items={items.map((item) => ({
              id: item.id,
              slug: item.slug,
              categorySlug: item.categorySlug,
              categoryName: item.categoryName,
              name: item.name,
              shortDescription: item.shortDescription,
              pricePerDaySar: item.pricePerDaySar,
              featured: item.featured,
              requiresSecurityNote: item.requiresSecurityNote,
              imageUrl: item.images[0]?.url ?? null,
              imageAlt: item.images[0]?.alt ?? "",
            }))}
            categories={categories.map((category) => ({ slug: category.slug, name: category.name }))}
          />
        )}
      </Container>
    </>
  );
}
