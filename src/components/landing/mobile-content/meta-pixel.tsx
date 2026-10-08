"use client";

/**
 * Meta Pixel لصفحة الحملة — يُحمَّل بعد «موافق» فقط، وعلى النطاق المسموح.
 * PageView يدوي لكل مسار (صفحة الهبوط وصفحة النجاح). لا عنصر مرئي.
 */

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import {
  clearTrackingData,
  installPixel,
  markPixelLoaded,
  pixelAllowedHere,
  pruneTrackingMarkers,
  trackPageView,
} from "@/lib/landing/meta-pixel";

import { useAdConsent } from "./tracking-consent";

const noopSubscribe = () => () => {};

export function MetaPixel({ pixelId }: { pixelId: string }) {
  const consent = useAdConsent();
  const pathname = usePathname();
  /* النطاق يُعرف في المتصفح فقط؛ على الخادم لا Pixel. */
  const allowedHere = useSyncExternalStore(
    noopSubscribe,
    () => pixelAllowedHere(pixelId, window.location.hostname),
    () => false,
  );
  const enabled = consent === "granted" && allowedHere;

  /* علامات Purchase المنتهية تُحذف عند كل تحميل؛ والرفض المحفوظ ينظّف أي بقايا. */
  useEffect(() => pruneTrackingMarkers(), []);
  useEffect(() => {
    if (consent === "denied") clearTrackingData();
  }, [consent]);

  useEffect(() => {
    if (enabled) installPixel(pixelId);
  }, [enabled, pixelId]);

  useEffect(() => {
    if (enabled) trackPageView(pathname);
  }, [enabled, pathname]);

  if (!enabled) return null;
  return (
    <Script
      id="meta-pixel"
      src="https://connect.facebook.net/en_US/fbevents.js"
      strategy="afterInteractive"
      onReady={markPixelLoaded}
    />
  );
}
