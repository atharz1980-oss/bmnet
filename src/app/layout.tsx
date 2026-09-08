import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChromeGate } from "@/components/layout/chrome-gate";
import { PublicCmsProvider } from "@/context/public-cms";
import { loadPublicView } from "@/lib/cms/public-loader";
import { siteConfig } from "@/data/site";

/* الخط العربي الأساسي */
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
  display: "swap",
});

/* الخط الإنجليزي الثانوي */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.nameAr} | ${siteConfig.tagline} – ${siteConfig.city}`,
    template: `%s | ${siteConfig.nameAr}`,
  },
  description: siteConfig.description,
  keywords: [
    "دورات تصوير",
    "تعلم التصوير",
    "تصوير جدة",
    "بيت المصور",
    "Bayt Almosawer",
    "صناعة المحتوى",
    "تدريب تصوير",
    "دورة تصوير جدة",
  ],
  authors: [{ name: siteConfig.nameAr }],
  openGraph: {
    title: `${siteConfig.nameAr} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.nameAr,
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.nameAr} | ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101013",
};

/* شبكة أمان ISR: الصفحات العامة تُعاد بناؤها كل 5 دقائق حتى بلا زيارات إدارة */
export const revalidate = 300;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* بيانات الـ CMS من قاعدة البيانات عبر anon بلا كوكيز (D-86):
     أي فشل يُرجع null وتُعرض بيانات Phase 1 الثابتة — لا انهيار أبداً */
  const initialView = await loadPublicView();

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${ibmPlexArabic.variable} ${inter.variable} font-sans antialiased bg-background text-foreground flex min-h-screen flex-col`}
      >
        {/* رابط تخطّي إلى المحتوى لمستخدمي لوحة المفاتيح */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
        >
          تخطَّ إلى المحتوى الرئيسي
        </a>
        {/* CP-G (D-85): جسر بيانات CMS العام من قاعدة البيانات — يغلف الجسم كاملًا
            ليصل الـ Navbar والـ Footer أيضًا — أول رسم ببيانات حقيقية */}
        <PublicCmsProvider initialView={initialView}>
          <ChromeGate>
            <Navbar />
          </ChromeGate>
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <ChromeGate>
            <Footer />
          </ChromeGate>
        </PublicCmsProvider>
        <Toaster />
      </body>
    </html>
  );
}
