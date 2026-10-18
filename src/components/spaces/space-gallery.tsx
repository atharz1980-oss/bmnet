"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PublicSpaceImage } from "@/lib/spaces/public";

/**
 * معرض صور المساحة — صورة رئيسية ومصغّرات.
 * الصور تصل من الباك اند (جدول studio_space_images) — لا صور مكتوبة هنا.
 */
export function SpaceGallery({ images, name }: { images: PublicSpaceImage[]; name: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-charcoal-200 bg-charcoal-100" aria-hidden="true">
        <Camera className="h-12 w-12 text-charcoal-300" />
      </div>
    );
  }
  const current = images[Math.min(active, images.length - 1)];
  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-charcoal-200 bg-charcoal-100">
        <Image
          key={current.path}
          src={current.url}
          alt={current.alt || name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 ? (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {images.map((image, index) => (
            <li key={image.path}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`عرض الصورة ${index + 1}`}
                aria-pressed={index === active}
                className={cn(
                  "relative aspect-square w-full overflow-hidden rounded-xl border-2 transition",
                  index === active ? "border-brand-600" : "border-transparent hover:border-charcoal-300",
                )}
              >
                <Image src={image.url} alt="" fill sizes="120px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
