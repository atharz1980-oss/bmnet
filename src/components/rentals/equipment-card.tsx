import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Package } from "lucide-react";

import { formatPrice } from "@/lib/format";
import type { PublicEquipment } from "@/lib/rentals/public";

/**
 * بطاقة معدة في الكتالوج العام — مكوّن خادم بلا حالة.
 * الصور والاسم والسعر من الباك اند؛ لا شيء مكتوب يدويًا هنا.
 */
export function EquipmentCard({ item }: { item: PublicEquipment }) {
  const cover = item.images[0];
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-charcoal-200 bg-white shadow-soft transition hover:-translate-y-1 hover:border-brand-300">
      <div className="relative aspect-video overflow-hidden bg-charcoal-100">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt || item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center" aria-hidden="true">
            <Package className="h-10 w-10 text-charcoal-300" />
          </div>
        )}
        <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-charcoal-700 backdrop-blur">
          {item.categoryName}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-charcoal-900">{item.name}</h3>
        {item.shortDescription ? (
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-charcoal-600">{item.shortDescription}</p>
        ) : (
          <span className="flex-1" />
        )}
        {item.requiresSecurityNote ? (
          <p className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            يلزم سند ضمان «نافذ»
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between border-t border-charcoal-100 pt-4">
          <span className="text-lg font-bold text-brand-700">
            {formatPrice(item.pricePerDaySar)}
            <span className="ms-1 text-xs font-normal text-charcoal-500">/ اليوم</span>
          </span>
          <Link
            href={`/rentals/${item.slug}`}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-charcoal-800 transition group-hover:text-brand-700"
          >
            استأجر المعدة
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        {item.quantity > 0 ? (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-charcoal-500">
            <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
            اختر فترة الإيجار لتظهر الكمية المتاحة
          </p>
        ) : null}
      </div>
    </article>
  );
}
