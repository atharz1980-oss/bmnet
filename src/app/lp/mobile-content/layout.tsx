/**
 * غلاف صفحة الحملة وصفحة نجاح الدفع التابعة لها — لا يغيّر أي عنصر مرئي.
 *
 * يضيف Meta Pixel وشريط الموافقة على التتبع لهذين المسارين فقط؛ بقية الموقع
 * ولوحة الإدارة خارج هذا الغلاف. بلا `NEXT_PUBLIC_META_PIXEL_ID` صالح: لا
 * Pixel ولا شريط.
 */

import { MetaPixel } from "@/components/landing/mobile-content/meta-pixel";
import { TrackingConsent } from "@/components/landing/mobile-content/tracking-consent";
import { metaPixelId } from "@/lib/landing/meta-pixel-server";

export default function MobileContentCampaignLayout({ children }: { children: React.ReactNode }) {
  const pixelId = metaPixelId();
  return (
    <>
      {children}
      {pixelId && (
        <>
          <MetaPixel pixelId={pixelId} />
          <TrackingConsent />
        </>
      )}
    </>
  );
}
