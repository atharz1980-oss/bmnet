"use client";

/**
 * /admin/preview/home — معاينة إدارية للصفحة الرئيسية (#14)
 * ----------------------------------------------------------
 * صفحة client تقرأ Admin Store مباشرة — تعكس تعديلات المحرر في نفس
 * الجلسة (بعد الحفظ). منفصلة تمامًا عن الموقع العام `/` الذي يبقى
 * على بيانات Phase 1 المجمدة.
 */
import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";

import { useAdminData } from "@/context/admin-store";
import { HomePreview } from "@/components/admin/preview/home-preview";

export default function AdminHomePreviewPage() {
  const data = useAdminData();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-charcoal-900">معاينة الصفحة الرئيسية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تعكس أقسام المحرر بترتيبها وحالة تفعيلها — تعديلات المحفوظة تظهر هنا فورًا.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/content/home"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-charcoal-700 hover:bg-surface"
          >
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            تعديل الرئيسية
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-charcoal-700 hover:bg-surface"
          >
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            الموقع العام (بيانات مجمدة)
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <HomePreview data={data} />
      </div>
    </div>
  );
}
