import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListChecks, Package, ShieldCheck } from "lucide-react";

import { EquipmentBookingPanel } from "@/components/rentals/booking-panel";
import { EquipmentGallery } from "@/components/rentals/equipment-gallery";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { formatPrice } from "@/lib/format";
import { loadPublicEquipmentItem } from "@/lib/rentals/public";

export const revalidate = 3600;

interface EquipmentPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EquipmentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await loadPublicEquipmentItem(slug);
  if (!item) return { title: "المعدة" };
  return {
    title: item.name,
    description: item.shortDescription || `${item.name} — استأجرها من بيت المصور بفترة محددة ودفع إلكتروني.`,
    alternates: { canonical: `/rentals/${item.slug}` },
  };
}

/** صفحة المعدة: المعرض والوصف والمواصفات + لوح الحجز. */
export default async function EquipmentPage({ params }: EquipmentPageProps) {
  const { slug } = await params;
  const item = await loadPublicEquipmentItem(slug);
  if (!item) notFound();

  return (
    <>
      <PageHeader
        title={item.name}
        description={item.shortDescription || undefined}
        breadcrumb={[
          { label: "الرئيسية", href: "/" },
          { label: "تأجير المعدات", href: "/rentals" },
          { label: item.categoryName, href: "/rentals" },
          { label: item.name },
        ]}
      />
      <Container className="py-12 sm:py-16">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div className="space-y-8">
            <EquipmentGallery images={item.images} name={item.name} />

            {item.description ? (
              <div>
                <h2 className="text-xl font-bold text-charcoal-900">عن المعدة</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-charcoal-700">{item.description}</p>
              </div>
            ) : null}

            {item.specs.length > 0 ? (
              <div>
                <h2 className="inline-flex items-center gap-2 text-xl font-bold text-charcoal-900">
                  <ListChecks aria-hidden="true" className="h-5 w-5 text-brand-600" />
                  المواصفات
                </h2>
                <dl className="mt-3 divide-y divide-charcoal-100 rounded-2xl border border-charcoal-200 bg-white">
                  {item.specs.map((spec, index) => (
                    <div key={`${spec.label}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                      <dt className="font-medium text-charcoal-800">{spec.label}</dt>
                      <dd className="text-charcoal-600">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            <div className="rounded-2xl border border-charcoal-200 bg-white p-5">
              <h2 className="inline-flex items-center gap-2 text-lg font-bold text-charcoal-900">
                <Package aria-hidden="true" className="h-5 w-5 text-brand-600" />
                تفاصيل الإيجار
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-charcoal-700">
                <li className="flex items-center justify-between gap-2">
                  <span className="text-charcoal-500">سعر اليوم</span>
                  <span className="font-bold text-brand-700">{formatPrice(item.pricePerDaySar)}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-charcoal-500">قيمة الاستبدال المعلنة</span>
                  <span className="font-medium text-charcoal-800">
                    {item.replacementValueSar > 0 ? formatPrice(item.replacementValueSar) : "غير محددة"}
                  </span>
                </li>
                <li className="flex items-start gap-2 pt-1 text-xs leading-relaxed text-charcoal-500">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <span>
                    سند الضمان عند الحاجة يُنشأ عبر بوابة «نافذ» بعد الدفع، ولا يُعد معتمدًا إلا بعد تأكيد الجهة.
                    التسليم يشترط التحقق من أصل الهوية.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <EquipmentBookingPanel
              item={{
                slug: item.slug,
                name: item.name,
                pricePerDaySar: item.pricePerDaySar,
                quantity: item.quantity,
                requiresSecurityNote: item.requiresSecurityNote,
              }}
            />
          </div>
        </div>
      </Container>
    </>
  );
}
