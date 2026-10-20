"use client";

/**
 * مدخل السلة في الشريط وقائمة الجوال — مع شارة عدد.
 *
 * العدد يُقرأ من `GET /api/cart/count` (خادم، بلا معرّف من المتصفح)،
 * ويُحدَّث عند حدث النافذة `bm-cart-updated` الذي تطلقه بطاقات الإضافة
 * وبطاقة الشراء. لا يُقرأ في التصميم (layout) لأن الصفحات العامة مخبّأة،
 * والسلة لكل زائر.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Variant = "navbar" | "mobile";

export function CartLink({
  variant,
  onNavigate,
  className,
}: {
  variant: Variant;
  onNavigate?: () => void;
  className?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/cart/count", { cache: "no-store" })
        .then((response) => response.json())
        .then((data: { count?: number }) => {
          if (!cancelled) setCount(typeof data.count === "number" ? data.count : 0);
        })
        .catch(() => {
          /* العدّاد تجميلي — فشل القراءة لا يعطّل شيئًا. */
        });
    };
    load();
    const onUpdate = () => load();
    window.addEventListener("bm-cart-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("bm-cart-updated", onUpdate);
    };
  }, []);

  const label = count > 0 ? `السلة (${count})` : "السلة";

  if (variant === "mobile") {
    return (
      <Button
        asChild
        size="lg"
        variant="outline"
        className={cn(
          "w-full gap-2 border-white/20 bg-transparent text-[var(--bm-white)] hover:bg-white/10 hover:text-[var(--bm-white)] focus-visible:ring-2 focus-visible:ring-[var(--bm-white)]",
          className,
        )}
      >
        <Link href="/cart" onClick={onNavigate}>
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {label}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      size="sm"
      variant="ghost"
      className={cn(
        "hidden min-w-[92px] justify-center gap-1.5 text-[var(--bm-gray-200)] hover:bg-white/10 hover:text-[var(--bm-white)] focus-visible:ring-2 focus-visible:ring-[var(--bm-white)] lg:inline-flex lg:h-10",
        className,
      )}
    >
      <Link href="/cart" aria-label={label}>
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        <span className="relative">
          السلة
          {count > 0 ? (
            <span
              aria-hidden="true"
              className="num-ltr absolute -end-3 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--bm-orange)] px-1 text-[10px] font-bold text-[var(--bm-ink)]"
            >
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
      </Link>
    </Button>
  );
}
