"use client";

/**
 * شريط الحجز الثابت على الجوال — نفس زر الدفع الرئيسي بنفس `checkout`.
 *
 * يختفي ما دام أي نداء حجز آخر ظاهرًا (الافتتاحية، بطاقة السعر، النداء
 * الختامي، التذييل) فلا يكرر زرًا مرئيًا ولا يغطي الخاتمة. ويحترم حافة
 * الشاشة الآمنة. مخفيٌّ على الشاشات المتوسطة فما فوق.
 */

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { LandingCheckout } from "@/lib/landing/checkout";

import { BOOKING_ANCHOR, CTA_ZONE_ATTR } from "./anchors";
import { CheckoutCta } from "./checkout-cta";

export function StickyCta({ checkout, priceLabel }: { checkout: LandingCheckout; priceLabel: string }) {
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
          <p className="type-price text-xl text-white">{priceLabel}</p>
        </div>
        {checkout.status === "ready" ? (
          <CheckoutCta
            checkout={checkout}
            label="احجز الآن"
            showIcon={false}
            formClassName="flex-1"
            className="w-full px-4"
            errorClassName="text-xs"
          />
        ) : (
          /* الدفع مغلق: الشريط يقود إلى قسم الحجز حيث السبب والبديل، لا زر معطل. */
          <a
            href={`#${BOOKING_ANCHOR}`}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-white px-4 text-base font-semibold text-charcoal-950 outline-none focus-visible:ring-[3px] focus-visible:ring-brand-400/70"
          >
            احجز الآن
          </a>
        )}
      </div>
    </div>
  );
}
