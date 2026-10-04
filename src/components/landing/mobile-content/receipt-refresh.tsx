"use client";

/**
 * تحديث تلقائي لصفحة النجاح ما دام الدفع «قيد التأكيد»: يعيد تصيير الخادم
 * (الذي يسأل ميسّر) كل بضع ثوانٍ، بحدّ أقصى، ثم يترك الزر اليدوي.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVAL_MS = 5000;
const MAX_TRIES = 12;

export function ReceiptRefresh() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= MAX_TRIES) window.clearInterval(id);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
