import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* صور الوسائط (bm-media على Supabase Storage) تُعرض عبر next/image —
     بدون هذا النمط يرفض المُحسِّن الرابط البعيد بخطأ 400 «url parameter
     is not allowed» وتظهر الصورة مكسورة على الموقع العام. */
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "11mb" },
  },
  reactStrictMode: false,
  /* الترويسة تعلن إطار العمل ونسخته لكل زائر بلا مقابل. */
  poweredByHeader: false,
  /**
   * ترويسات الأمان التي يملكها التطبيق.
   *
   * الاستضافة لا ترسل إلا `upgrade-insecure-requests`، فلا حماية من
   * التأطير ولا من استنشاق النوع ولا ضبط للمُحيل. وللموقع لوحة تحكم —
   * وصفحة إدارة قابلة للتأطير تعني هجوم نقر مخادع على إجراءاتها.
   *
   * عمدًا بلا CSP كاملة ولا HSTS: الأولى تحتاج جردًا للمصادر قبل فرضها،
   * والثانية قرار نطاق يخص الاستضافة لا التطبيق.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  /**
   * نطاق واحد للموقع: www يُحوَّل تحويلًا دائمًا (308) إلى النطاق الأساسي
   * بالمسار والمعاملات نفسها (utm_source وfbclid وغيرها).
   *
   * التخزين في المتصفح (ومنه موافقة التتبع) خاص بكل Origin، وميسّر يعيد
   * العميل دائمًا إلى النطاق الأساسي — فالزيارة عبر www كانت تفقد الموافقة
   * وحدث Purchase. يطابق المضيف www وحده؛ النطاق الأساسي لا يمر بالقاعدة.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www\\.baytalmosawer\\.net" }],
        destination: "https://baytalmosawer.net/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
