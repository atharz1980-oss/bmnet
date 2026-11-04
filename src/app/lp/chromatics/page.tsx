import type { Metadata } from "next";
import { ChromaticsLanding } from "@/components/landing/chromatics/landing-page";
import {
  CHROMATICS_METADATA_AR,
  CHROMATICS_PATH,
} from "@/data/landing/chromatics";

/**
 * صفحة الهبوط غير المدرجة: كروماتيكس — ماستر كلاس إضاءة البورتريه الإبداعية
 * Target URL: https://baytalmosawer.net/lp/chromatics
 * Unlisted: noindex, follow — excluded from sitemap.xml and navigations.
 */
export const metadata: Metadata = {
  title: { absolute: CHROMATICS_METADATA_AR.title },
  description: CHROMATICS_METADATA_AR.description,
  alternates: { canonical: CHROMATICS_PATH },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: CHROMATICS_METADATA_AR.title,
    description: CHROMATICS_METADATA_AR.description,
    url: CHROMATICS_PATH,
    type: "website",
    locale: "ar_SA",
    images: [
      {
        url: CHROMATICS_METADATA_AR.ogImage,
        width: 1200,
        height: 1500,
        alt: CHROMATICS_METADATA_AR.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: CHROMATICS_METADATA_AR.title,
    description: CHROMATICS_METADATA_AR.description,
    images: [CHROMATICS_METADATA_AR.ogImage],
  },
};

export default function ChromaticsLandingPage() {
  return <ChromaticsLanding />;
}
