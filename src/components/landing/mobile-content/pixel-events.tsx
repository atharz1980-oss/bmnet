"use client";

/**
 * أحداث Meta Pixel لصفحة الحملة — لا تعرض شيئًا، وتنتظر موافقة الزائر.
 *
 * `PixelPurchase` لا يُصيَّر إلا في فرع «مدفوع» الذي حسمه الخادم بعد سؤال
 * بوابة الدفع، وقيمته من الطلب المؤكد لا من السعر المعروض. لا يصله رقم
 * الطلب — معرّف حدث مشتق على الخادم فقط.
 */

import { useEffect } from "react";

import { trackPurchase, trackViewContent } from "@/lib/landing/meta-pixel";

import { useAdConsent } from "./tracking-consent";

export function PixelViewContent() {
  const consent = useAdConsent();
  useEffect(() => {
    if (consent === "granted") trackViewContent();
  }, [consent]);
  return null;
}

export function PixelPurchase({ eventId, valueSar }: { eventId: string; valueSar: number }) {
  const consent = useAdConsent();
  useEffect(() => {
    if (consent === "granted") trackPurchase(eventId, valueSar);
  }, [consent, eventId, valueSar]);
  return null;
}
