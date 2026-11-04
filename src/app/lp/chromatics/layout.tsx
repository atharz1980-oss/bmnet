/**
 * غلاف صفحة حملة «كروماتيكس» — Meta Pixel وشريط الموافقة على التتبع
 * يتبع المعمارية الموحدة لصفحات الهبوط في المشروع (/lp/mobile-content, /lp/photography-basics).
 */

import { MetaPixel } from '@/components/landing/mobile-content/meta-pixel';
import { TrackingConsent } from "@/components/landing/mobile-content/tracking-consent";
import { metaPixelId } from "@/lib/landing/meta-pixel-server";

export default function ChromaticsCampaignLayout({ children }: { children: React.ReactNode }) {
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
