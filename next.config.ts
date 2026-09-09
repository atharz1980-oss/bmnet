import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* صور الوسائط (bm-media على Supabase Storage) تُعرض عبر next/image —
     بدون هذا النمط يرفض المُحسِّن الرابط البعيد بخطأ 400 «url parameter
     is not allowed» وتظهر الصورة مكسورة على الموقع العام. */
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
