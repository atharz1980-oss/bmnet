"use client";

/**
 * شريط الحجز الثابت على الجوال — ينقل إلى نموذج الحجز. يختفي ما دام أي
 * نداء حجز آخر ظاهرًا، ويحترم حافة الشاشة الآمنة. مخفي من الشاشات المتوسطة.
 */

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { CTA_ZONE_ATTR } from "@/components/landing/mobile-content/anchors";
import { PHOTOGRAPHY_BOOKING_ANCHOR, photographyPricing } from "@/data/landing/photography-basics";

export function PhotographyStickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const zones = Array.from(document.querySelectorAll(`[${CTA_ZONE_ATTR}]`));
    if (zones.length === 0 || typeof IntersectionObserver === "undefined") return;
    const inView = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) inView.add(entry.target);
        else inView.delete(entry.target);
      }
      setVisible(inView.size === 0);
    });
    zones.forEach((zone) => observer.observe(zone));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      data-lp-sticky-cta
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-charcoal-950/95 px-4 pt-3 backdrop-blur transition-transform duration-300 motion-reduce:transition-none md:hidden",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="shrink-0 leading-tight">
          <p className="text-xs text-charcoal-400">سعر الورشة</p>
          <p className="type-price text-xl text-white">{photographyPricing.currentSar} ر.س</p>
        </div>
        <a
          href={`#${PHOTOGRAPHY_BOOKING_ANCHOR}`}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-brand-600 px-4 text-base font-semibold text-white outline-none hover:bg-brand-700 focus-visible:ring-[3px] focus-visible:ring-brand-400/70"
        >
          احجز مقعدك
        </a>
      </div>
    </div>
  );
}
