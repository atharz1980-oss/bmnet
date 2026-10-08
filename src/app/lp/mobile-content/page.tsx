import type { Metadata } from "next";

import { MobileContentLanding } from "@/components/landing/mobile-content/landing-page";
import { PixelViewContent } from "@/components/landing/mobile-content/pixel-events";
import { landingCheckoutTarget } from "@/data/landing/mobile-content";
import { loadPublicView } from "@/lib/cms/public-loader";
import { toLandingView } from "@/lib/landing/checkout";
import { resolveLandingCheckout } from "@/lib/landing/checkout-target";
import { landingInstagramHref, landingWhatsappHref } from "@/lib/landing/contact";

const TITLE = "احتراف صناعة المحتوى بالجوال | بيت المصور";
const DESCRIPTION =
  "ورشة أونلاين مباشرة عبر زووم لمدة 3 أيام (27–29 أكتوبر 2026) لاحتراف صناعة المحتوى بالجوال: التصوير، والإضاءة، والمونتاج، واستخدام الذكاء الاصطناعي — من الفكرة إلى ريل جاهز للنشر.";
const PATH = "/lp/mobile-content";

/* بيانات هذه الصفحة فقط — لا تغيير في الإعدادات العامة للموقع. */
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    type: "website",
    locale: "ar_SA",
    images: [
      {
        url: "/images/course-mobile.jpg",
        width: 1344,
        height: 768,
        alt: "صناعة المحتوى بالجوال — ورشة أونلاين من بيت المصور",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images/course-mobile.jpg"],
  },
};

export default async function MobileContentLandingPage() {
  const [decision, view] = await Promise.all([
    resolveLandingCheckout(landingCheckoutTarget),
    loadPublicView(),
  ]);
  const settings = view?.settings;

  return (
    <>
      <PixelViewContent />
      <MobileContentLanding
        /* معرّف الدورة يبقى على الخادم؛ الواجهة تعرف «متاح أم لا» فقط. */
        checkout={toLandingView(decision)}
        contact={{
          whatsappHref: landingWhatsappHref(settings),
          instagramHref: landingInstagramHref(settings),
        }}
      />
    </>
  );
}
