import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";

import { BookingPanel } from "@/components/spaces/booking-panel";
import { SpaceGallery } from "@/components/spaces/space-gallery";
import { Container } from "@/components/shared/container";
import { PageHeader } from "@/components/shared/page-header";
import { loadPublicSpace } from "@/lib/spaces/public";
import { DAY_LABELS, formatTimeArabic } from "@/lib/spaces/schedule";

export const revalidate = 3600;

interface SpacePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SpacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const space = await loadPublicSpace(slug);
  if (!space) return { title: "المساحة" };
  return {
    title: space.name,
    description: space.shortDescription || `${space.name} — مساحة استوديو بيت المصور للحجز بدفع إلكتروني.`,
    alternates: { canonical: `/spaces/${space.slug}` },
  };
}

/** صفحة المساحة: المعرض والوصف ومواعيد العمل + لوح الحجز. */
export default async function SpacePage({ params }: SpacePageProps) {
  const { slug } = await params;
  const space = await loadPublicSpace(slug);
  if (!space) notFound();

  return (
    <div className="overflow-x-hidden">
      <PageHeader
        title={space.name}
        description={space.shortDescription || undefined}
        breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: "المساحات", href: "/spaces" }, { label: space.name }]}
      />
      <Container className="py-8 sm:py-12">
        <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="min-w-0 space-y-8">
            <SpaceGallery images={space.images} name={space.name} />

            {space.description ? (
              <div>
                <h2 className="text-xl font-bold text-charcoal-900">عن المساحة</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-charcoal-700">{space.description}</p>
              </div>
            ) : null}

            <div>
              <h2 className="inline-flex items-center gap-2 text-xl font-bold text-charcoal-900">
                <Clock aria-hidden="true" className="h-5 w-5 text-brand-600" />
                مواعيد الحجز
              </h2>
              <ul className="mt-3 divide-y divide-charcoal-100 rounded-2xl border border-charcoal-200 bg-white">
                {DAY_LABELS.map((label, day) => {
                  const ranges = space.hours.filter((hours) => hours.day === day);
                  return (
                    <li key={day} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                      <span className="font-medium text-charcoal-800">{label}</span>
                      <span className="text-charcoal-600">
                        {ranges.length === 0
                          ? "مغلق"
                          : ranges.map((range) => `${formatTimeArabic(range.start)} — ${formatTimeArabic(range.end)}`).join("، ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-charcoal-500">
                الأوقات المتاحة تُحسب لحظة اختيار اليوم: ما لم يُحجز بعد يظهر لك حرًّا.
              </p>
            </div>
          </div>

          <div className="min-w-0 lg:sticky lg:top-24">
            <BookingPanel space={{ slug: space.slug, name: space.name, pricePerHourSar: space.pricePerHourSar }} />
          </div>
        </div>
      </Container>
    </div>
  );
}
