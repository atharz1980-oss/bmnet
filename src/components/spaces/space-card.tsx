import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Camera, Clock } from "lucide-react";

import { formatPrice } from "@/lib/format";
import type { PublicSpace } from "@/lib/spaces/public";

/**
 * بطاقة مساحة في القائمة العامة — مكوّن خادم بلا حالة.
 * الصور والسعر وكل النصوص تأتي من الباك اند: لا شيء هنا مكتوب يدويًا.
 */
export function SpaceCard({ space }: { space: PublicSpace }) {
  const cover = space.images[0];
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-charcoal-200 bg-white shadow-soft transition hover:-translate-y-1 hover:border-brand-300">
      <div className="relative aspect-video overflow-hidden bg-charcoal-100">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt || space.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center" aria-hidden="true">
            <Camera className="h-10 w-10 text-charcoal-300" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-charcoal-900">{space.name}</h3>
        {space.shortDescription ? (
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-charcoal-600">{space.shortDescription}</p>
        ) : (
          <span className="flex-1" />
        )}
        <div className="mt-4 flex items-center justify-between border-t border-charcoal-100 pt-4">
          <span className="text-lg font-bold text-brand-700">
            {formatPrice(space.pricePerHourSar)}
            <span className="ms-1 text-xs font-normal text-charcoal-500">/ الساعة</span>
          </span>
          <Link
            href={`/spaces/${space.slug}`}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-charcoal-800 transition group-hover:text-brand-700"
          >
            احجز المساحة
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        {space.hours.length > 0 ? (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-charcoal-500">
            <Clock aria-hidden="true" className="h-3.5 w-3.5" />
            متاحة لأيام الحجز المعلنة في صفحة المساحة
          </p>
        ) : null}
      </div>
    </article>
  );
}
