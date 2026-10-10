/**
 * غلاف صفحة الورشة وصفحة نجاح الدفع — Meta Pixel وشريط الموافقة لهذين
 * المسارين فقط، بالمكوّنات نفسها التي تستخدمها صفحة الجوال.
 *
 * صفحة سداد المتبقي (`/pay/<رمز>`) خارج هذا الغلاف عمدًا: الرمز في المسار
 * لا يصل إلى Meta. بلا `NEXT_PUBLIC_META_PIXEL_ID` صالح: لا Pixel ولا شريط.
 */

import { MetaPixel } from "@/components/landing/mobile-content/meta-pixel";
import { TrackingConsent } from "@/components/landing/mobile-content/tracking-consent";
import { metaPixelId } from "@/lib/landing/meta-pixel-server";

export default function PhotographyCampaignLayout({ children }: { children: React.ReactNode }) {
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
