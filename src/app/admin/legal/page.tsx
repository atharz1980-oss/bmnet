"use client";

/**
 * /admin/legal — الصفحات القانونية (#18)
 * ---------------------------------------
 * قائمة الصفحات الأربع (خصوصية/شروط/استرجاع/تسجيل وإلغاء): العنوان
 * والـ slug وتاريخ آخر تحديث وحالة النشر — وكل صفحة تُحرر من صفحتها.
 * المحتوى textarea منظم (فقرات بسطر فارغ) — بلا Rich Text (D-06).
 */
import Link from "next/link";
import { Pencil, Scale } from "lucide-react";

import { useAdminData } from "@/context/admin-store";
import { formatDate, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { EmptyState } from "@/components/admin/ui/empty-state";

export default function LegalPagesPage() {
  const data = useAdminData();
  const publishedCount = data.legal.filter((page) => page.published).length;

  if (data.legal.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <AdminPageHeader title="الصفحات القانونية" />
        <EmptyState
          title="لا صفحات قانونية"
          description="لم تُعرف أي صفحات قانونية في المخزن بعد."
          icon={Scale}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <AdminPageHeader
        title="الصفحات القانونية"
        description={`${formatNumber(publishedCount)} من ${formatNumber(data.legal.length)} منشورة — تعديل العنوان أو النشر هنا ينعكس على الروابط القانونية في إعدادات الفوتر تلقائيًا.`}
      />

      <ul className="space-y-3">
        {data.legal.map((page) => (
          <li
            key={page.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4 sm:p-5"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-charcoal-900">{page.title}</h2>
                <Badge
                  variant="outline"
                  className={
                    page.published
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-charcoal-200 bg-surface text-charcoal-500"
                  }
                >
                  {page.published ? "منشورة" : "غير منشورة"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-charcoal-500">
                <span className="num-ltr font-latin" dir="ltr">
                  /policies/{page.slug}
                </span>
                <span className="mx-1.5 text-charcoal-300">·</span>
                آخر تحديث: {formatDate(page.lastUpdated)}
                <span className="mx-1.5 text-charcoal-300">·</span>
                {page.content.trim() ? `${page.content.trim().split(/\n\n+/).length} فقرات` : "بلا محتوى"}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/legal/${page.id}`}>
                <Pencil aria-hidden="true" className="me-1.5 h-3.5 w-3.5" />
                تحرير
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
