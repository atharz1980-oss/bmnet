"use client";

/**
 * 404 لوحة التحكم — إصلاح Checkpoint 5
 * -------------------------------------
 * أي مسار غير موجود تحت /admin/* يعرض واجهة إدارية داخل AdminShell
 * (بدون Navbar/Footer العام) مع زر العودة إلى لوحة التحكم.
 * تُستدعى من catch-all: src/app/admin/[...rest]/page.tsx.
 */
import Link from "next/link";
import { Camera, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-charcoal-950 text-brand-400"
      >
        <Camera className="h-7 w-7" />
      </span>
      <p className="font-latin mt-6 text-6xl font-bold tracking-tight text-charcoal-900 num-ltr">404</p>
      <h1 className="mt-3 text-xl font-bold text-charcoal-900 sm:text-2xl">
        الصفحة غير موجودة في لوحة التحكم
      </h1>
      <p className="mt-3 max-w-md leading-relaxed text-charcoal-500">
        المسار الذي تبحث عنه غير موجود أو تم نقله. تحقق من الرابط أو عد إلى
        لوحة التحكم وابدأ من هناك.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-12 px-7 text-base font-semibold">
          <Link href="/admin">
            <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
            العودة إلى لوحة التحكم
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base font-semibold">
          <Link href="/admin/courses">إدارة الدورات</Link>
        </Button>
      </div>
    </div>
  );
}
