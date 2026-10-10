"use client";

/**
 * يعرض نموذج الحجز أو بديل «الدفع غير متاح» حسب جاهزية الدفع الآن — لا حسب
 * لحظة بناء الصفحة الساكنة.
 *
 * يبدأ بالنموذج (الحالة الطبيعية)، ثم يسأل `/api/workshops/<slug>/checkout-status`
 * مرة عند التحميل. إن فشل السؤال يبقى النموذج: إجراء الحجز على الخادم يتحقق
 * من الجاهزية نفسها ويرد «غير متاح» إن لزم — لا دفع يبدأ بلا جاهزية.
 */

import { useEffect, useState, type ReactNode } from "react";

export function CheckoutGate({ slug, children, fallback }: { slug: string; children: ReactNode; fallback: ReactNode }) {
  const [ready, setReady] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/workshops/${encodeURIComponent(slug)}/checkout-status`, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { ready?: unknown } | null) => {
        if (body && body.ready === false) setReady(false);
      })
      .catch(() => {
        /* تعذر السؤال ≠ غير متاح: الخادم يحسم عند الإرسال. */
      });
    return () => controller.abort();
  }, [slug]);

  return <div data-checkout-gate={ready ? "ready" : "unavailable"}>{ready ? children : fallback}</div>;
}
