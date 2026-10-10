"use client";

/**
 * أحداث Meta Pixel لصفحة الحملة — لا تعرض شيئًا، وتنتظر موافقة الزائر.
 *
 * `PixelPurchase` لا يُصيَّر إلا في فرع «مدفوع» الذي حسمه الخادم بعد سؤال
 * بوابة الدفع، وقيمته من الطلب المؤكد لا من السعر المعروض. لا يصله رقم
 * الطلب — معرّف حدث مشتق على الخادم فقط.
 */

import { useEffect } from "react";

import { trackPurchase, trackViewContent, type PixelContent } from "@/lib/landing/meta-pixel";

import { useAdConsent } from "./tracking-consent";

/** بلا خصائص: محتوى صفحة الجوال وسعرها كما كان. */
export function PixelViewContent({ content, valueSar }: { content?: PixelContent; valueSar?: number } = {}) {
  const consent = useAdConsent();
  useEffect(() => {
    if (consent === "granted") trackViewContent(content, valueSar);
  }, [consent, content, valueSar]);
  return null;
}

export function PixelPurchase({
  eventId,
  valueSar,
  content,
}: {
  eventId: string;
  valueSar: number;
  content?: PixelContent;
}) {
  const consent = useAdConsent();
  useEffect(() => {
    if (consent === "granted") trackPurchase(eventId, valueSar, content);
  }, [consent, eventId, valueSar, content]);
  return null;
}
