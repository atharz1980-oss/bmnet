import type { Metadata } from "next";
import { BeautyLanding } from "@/components/landing/beauty/landing-page";
import { BEAUTY_METADATA_AR, BEAUTY_PATH } from "@/data/landing/beauty";

/**
 * صفحة الهبوط غير المدرجة: ورشة البيوتي بحلّتها الجديدة
 * Target URL: https://baytalmosawer.net/lp/beauty
 * Unlisted: noindex, follow — excluded from sitemap.xml and navigations.
 */
export const metadata: Metadata = {
  title: { absolute: BEAUTY_METADATA_AR.title },
  description: BEAUTY_METADATA_AR.description,
  alternates: { canonical: BEAUTY_PATH },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: BEAUTY_METADATA_AR.title,
    description: BEAUTY_METADATA_AR.description,
    url: BEAUTY_PATH,
    type: "website",
    locale: "ar_SA",
    images: [
      {
        url: BEAUTY_METADATA_AR.ogImage,
        width: 800,
        height: 1000,
        alt: BEAUTY_METADATA_AR.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BEAUTY_METADATA_AR.title,
    description: BEAUTY_METADATA_AR.description,
    images: [BEAUTY_METADATA_AR.ogImage],
  },
};

export default function BeautyWorkshopPage() {
  return <BeautyLanding />;
}
