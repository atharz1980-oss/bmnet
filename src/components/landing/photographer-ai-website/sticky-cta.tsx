"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { REGISTRATION_ANCHOR } from "./anchors";

export function StickyCta({
  pricingSar,
  isCheckoutReady,
}: {
  pricingSar: number | null;
  isCheckoutReady: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      /* إظهار الشريط بعد النزول بمقدار 350 بكسل */
      setVisible(window.scrollY > 350);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="شريط الحجز السريع للجوال"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-white/10 bg-charcoal-950/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-lg shadow-2xl transition-all duration-300"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-charcoal-400 font-medium">
            صمّم موقعك الاحترافي باستخدام الذكاء الاصطناعي
          </div>
          <div className="text-sm font-bold text-white">
            <span>
              <span className="text-amber-400">{pricingSar ?? 249}</span> ر.س
            </span>
          </div>
        </div>

        <a
          href={`#${REGISTRATION_ANCHOR}`}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] px-5 text-sm font-bold text-white shadow-md shadow-red-950/40 transition-all duration-200 hover:bg-[#B91C1C] hover:scale-[1.02] active:scale-95"
        >
          <span>احجز مقعدك الآن</span>
          <ArrowLeft className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
