"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Package } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * متصفح الكتالوج: فلترة بالتصنيف + بحث بالاسم — كل التلميحات محليّة بلا طلب
 * شبكة، والقائمة كاملة تصل من الخادم أصلًا. الغرض ترتيب العرض لا تقييد
 * المتاح: كل معدة منشورة تبقى قابلة للوصول من صفحتها.
 */

interface BrowserItem {
  id: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  name: string;
  shortDescription: string;
  pricePerDaySar: number;
  featured: boolean;
  requiresSecurityNote: boolean;
  imageUrl: string | null;
  imageAlt: string;
}

export function EquipmentCatalogBrowser({
  items,
  categories,
}: {
  items: BrowserItem[];
  categories: { slug: string; name: string }[];
}) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.categorySlug !== category) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.shortDescription.toLowerCase().includes(needle) ||
        item.categoryName.toLowerCase().includes(needle)
      );
    });
  }, [items, category, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="تصنيفات المعدات" className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setCategory("all")}
            aria-pressed={category === "all"}
            className={cn(
              "shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition",
              category === "all"
                ? "border-brand-600 bg-brand-600 text-brand-ink"
                : "border-charcoal-200 bg-white text-charcoal-700 hover:border-brand-300",
            )}
          >
            الكل
          </button>
          {categories.map((entry) => (
            <button
              key={entry.slug}
              type="button"
              onClick={() => setCategory(entry.slug)}
              aria-pressed={category === entry.slug}
              className={cn(
                "shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition",
                category === entry.slug
                  ? "border-brand-600 bg-brand-600 text-brand-ink"
                  : "border-charcoal-200 bg-white text-charcoal-700 hover:border-brand-300",
              )}
            >
              {entry.name}
            </button>
          ))}
        </div>

        <div className="sm:w-72">
          <label htmlFor="equipment-search" className="sr-only">
            ابحث في المعدات
          </label>
          <input
            id="equipment-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالاسم…"
            className="h-11 w-full rounded-lg border border-charcoal-300 bg-white px-3 text-base lg:text-sm text-charcoal-800 placeholder:text-charcoal-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-charcoal-200 bg-white p-10 text-center text-sm text-charcoal-500">
          لا توجد معدات تطابق اختيارك. جرّب تصنيفًا آخر أو امسح البحث.
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <li key={item.id}>
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-charcoal-200 bg-white shadow-soft transition hover:-translate-y-1 hover:border-brand-300">
                <div className="relative aspect-video overflow-hidden bg-charcoal-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt || item.name}
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
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
