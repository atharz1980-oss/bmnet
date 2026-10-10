import type { Metadata } from "next";

import { PhotographyBasicsLanding } from "@/components/landing/photography-basics/landing-page";
import { PixelViewContent } from "@/components/landing/mobile-content/pixel-events";
import {
  PHOTOGRAPHY_BASICS_PATH,
  PHOTOGRAPHY_BASICS_SLUG,
  PHOTOGRAPHY_IMAGE,
  PHOTOGRAPHY_PIXEL_CONTENT,
  PHOTOGRAPHY_WHATSAPP_MESSAGE,
  photographyOffer,
  photographyPricing,
  photographyWorkshop,
} from "@/data/landing/photography-basics";
import { loadPublicView } from "@/lib/cms/public-loader";
import { landingWhatsappHref } from "@/lib/landing/contact";
import { photographyJsonLd } from "@/lib/landing/photography-json-ld";
import { workshopCheckoutReady } from "@/lib/workshops/orders";

const TITLE = "ورشة أساسيات التصوير الفوتوغرافي في جدة | بيت المصور";
const DESCRIPTION = `ورشة حضورية لمدة 4 أيام في مقر أكاديمية بيت المصور بجدة ${photographyWorkshop.dateLabel}: الكاميرا والعدسات، مثلث التعريض، التصوير اليدوي، وعمق الميدان. ${photographyOffer.name}: ${photographyPricing.currentSar} ريال بدلًا من ${photographyPricing.previousSar}.`;
const IMAGE = PHOTOGRAPHY_IMAGE;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PHOTOGRAPHY_BASICS_PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PHOTOGRAPHY_BASICS_PATH,
    type: "website",
    locale: "ar_SA",
    images: [{ url: IMAGE, width: 1344, height: 768, alt: "ورشة أساسيات التصوير الفوتوغرافي — بيت المصور" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [IMAGE] },
};

export default async function PhotographyBasicsPage() {
  const [ready, view] = await Promise.all([workshopCheckoutReady(PHOTOGRAPHY_BASICS_SLUG), loadPublicView()]);
  const jsonLd = JSON.stringify(photographyJsonLd()).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <PixelViewContent content={PHOTOGRAPHY_PIXEL_CONTENT} valueSar={photographyPricing.currentSar} />
      <PhotographyBasicsLanding
        checkoutReady={ready}
        whatsappHref={landingWhatsappHref(view?.settings, PHOTOGRAPHY_WHATSAPP_MESSAGE)}
      />
    </>
  );
}
