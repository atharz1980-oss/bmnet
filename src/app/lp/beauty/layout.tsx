/**
 * غلاف صفحة «ورشة البيوتي» — Meta Pixel وشريط الموافقة على التتبع
 */

import { MetaPixel } from '@/components/landing/mobile-content/meta-pixel';
import { TrackingConsent } from "@/components/landing/mobile-content/tracking-consent";
import { metaPixelId } from "@/lib/landing/meta-pixel-server";

export default function BeautyWorkshopLayout({ children }: { children: React.ReactNode }) {
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
