import type { Metadata } from "next";

import { PhotographerAiLanding } from "@/components/landing/photographer-ai-website/landing-page";
import { landingCheckoutTarget } from "@/data/landing/photographer-ai-website";
import { loadPublicView } from "@/lib/cms/public-loader";
import { toLandingView } from "@/lib/landing/checkout";
import { resolveLandingCheckout } from "@/lib/landing/checkout-target";
import { landingInstagramHref, landingWhatsappHref } from "@/lib/landing/contact";

const TITLE = "ابنِ موقعك الاحترافي بالذكاء الاصطناعي | بيت المصور";
const DESCRIPTION =
  "في 3 أيام فقط (9 ساعات تدريبية)، تعلّم كيف تنشئ موقعًا إلكترونيًا يعرض أعمالك الفوتوغرافية باحتراف، ويتيح لعملائك إرسال طلبات الحجز، ويمنحك لوحة إدارة لتحديث صورك وخدماتك بنفسك — دون الحاجة إلى كتابة كود.";
const PATH = "/lp/photographer-ai-website";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    type: "website",
    locale: "ar_SA",
    images: [
      {
        url: "/images/course-portrait.jpg",
        width: 1200,
        height: 630,
        alt: "دورة بناء موقع المصور بالذكاء الاصطناعي — بيت المصور",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images/course-portrait.jpg"],
  },
};

export default async function PhotographerAiLandingPage() {
  const [resolved, view] = await Promise.all([
    resolveLandingCheckout(landingCheckoutTarget),
    loadPublicView(),
  ]);

  const settings = view?.settings;

  return (
    <PhotographerAiLanding
      checkout={toLandingView(resolved.decision)}
      pricing={resolved.pricing}
      contact={{
        whatsappHref: landingWhatsappHref(settings),
        instagramHref: landingInstagramHref(settings),
      }}
    />
  );
}
