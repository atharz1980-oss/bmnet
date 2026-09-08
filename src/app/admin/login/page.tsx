import type { Metadata } from "next";
import Link from "next/link";
import { Camera, ShieldCheck } from "lucide-react";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول — لوحة التحكم",
  robots: { index: false, follow: false },
};

/**
 * /admin/login — بوابة لوحة التحكم (CP-F)
 * صفحة مستقلة عن هيكل الإدارة (خارج مجموعة dashboard):
 * لا قوائم ولا مخزن — شاشة دخول نظيفة بعلامة بيت المصوّر.
 */
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
            <Camera aria-hidden="true" className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal-900">بيت المصوّر</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-charcoal-500">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-brand-600" />
            لوحة تحكم إدارة المحتوى
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-charcoal-400">
          <Link
            href="/"
            className="transition-colors hover:text-brand-600"
          >
            ← العودة إلى الموقع العام
          </Link>
        </p>
      </div>
    </div>
  );
}
