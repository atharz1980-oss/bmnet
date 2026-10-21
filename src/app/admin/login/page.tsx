import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { BaytMark } from "@/components/brand/bayt-mark";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول — لوحة التحكم",
  robots: { index: false, follow: false },
};

/**
 * /admin/login — صفحة الدخول (CP-F)
 * ----------------------------------------------------------------------------
 * أرضية حبر (BAYT BLACK) مع علامة مكبّرة مقطوعة بزاوية 45°، ولوح
 * أبيض (PURE WHITE) يحمل النموذج. البرتقالي محجوز للحالة فقط.
 */
export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#111111] px-4 py-12 text-[#F3F1EC]">
      {/* العلامة المكبّرة المقطوعة — تفيض خارج الإطار */}
      <div
        aria-hidden="true"
        className="brand-crop-start pointer-events-none absolute -top-24 -start-20 opacity-[0.05]"
      >
        <BaytMark size={460} />
      </div>

      <div className="relative w-full max-w-md">
        {/* الهوية */}
        <div className="mb-9 flex flex-col items-center text-center">
          <BaytMark size={44} animate aperture className="text-[#F3F1EC]" />
          <p
            dir="ltr"
            className="brand-micro mt-4 text-[#F3F1EC]"
            style={{ letterSpacing: "0.18em" }}
          >
            BAYT AL MOSAWER
          </p>
          <h1 className="brand-display-ar mt-4 text-2xl">لوحة التحكم</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-white/50">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            الوصول مقيَّد بالصلاحيات
          </p>
        </div>

        {/* النموذج — لوح أبيض بخط شعري */}
        <div className="border border-white/15 bg-white p-6 sm:p-8">
          {/* useSearchParams ← يتطلب Suspense للـ prerender — خطأ البناء الموثق */}
          <Suspense
            fallback={
              <div className="flex min-h-48 items-center justify-center text-sm text-charcoal-400">
                جارٍ تحضير نموذج الدخول…
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          <Link href="/" className="transition-colors hover:text-[#F3F1EC]">
            ← العودة إلى موقع بيت المصور
          </Link>
        </p>
      </div>
    </div>
  );
}
