"use client";

/**
 * CorporateRequestsList — قائمة طلبات تدريب الشركات (#16)
 * --------------------------------------------------------
 * Desktop جدول / Mobile بطاقات. الأعمدة: الشركة، مسؤول التواصل، الجوال،
 * البريد، عدد المتدربين، الدورة المطلوبة، التاريخ، الحالة، إجراءات.
 * الإجراءات: فتح التفاصيل / أرشفة (بدل الحذف — قرار Checkpoint 5) بتأكيد.
 */
import Link from "next/link";
import { Archive, ArchiveRestore, Eye } from "lucide-react";

import type { CorporateRequest } from "@/data/admin/types";
import { formatNumber, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/admin/ui/empty-state";

interface RequestsListProps {
  requests: CorporateRequest[];
  onArchive: (request: CorporateRequest) => void;
  onRestore: (request: CorporateRequest) => void;
}

function RowActions({
  request,
  onArchive,
  onRestore,
  withLabels,
}: {
  request: CorporateRequest;
  onArchive: (request: CorporateRequest) => void;
  onRestore: (request: CorporateRequest) => void;
  withLabels?: boolean;
}) {
  const archived = Boolean(request.archivedAt);
  return (
    <div className={cn("items-center gap-1", withLabels ? "flex" : "flex justify-end")}>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800"
      >
        <Link href={`/admin/corporate-requests/${request.id}`} aria-label={`فتح طلب ${request.company}`}>
          <Eye aria-hidden="true" className="h-4 w-4" />
        </Link>
      </Button>
      {archived ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-charcoal-500 hover:text-charcoal-800"
          onClick={() => onRestore(request)}
          aria-label={`استعادة طلب ${request.company} من الأرشيف`}
        >
          <ArchiveRestore aria-hidden="true" className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-charcoal-500 hover:bg-brand-50 hover:text-brand-700"
          onClick={() => onArchive(request)}
          aria-label={`أرشفة طلب ${request.company}`}
        >
          <Archive aria-hidden="true" className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function CorporateRequestsList({ requests, onArchive, onRestore }: RequestsListProps) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title="لا طلبات مطابقة"
        description="لم يُعثر على طلبات بهذه الفلاتر — جرّب مسح الفلاتر أو تغيير كلمة البحث."
      />
    );
  }

  return (
    <>
      {/* ── Desktop: جدول ── */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-white md:block">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/60 text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-3 text-start font-medium">الشركة</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">مسؤول التواصل</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الجوال</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">المتدربون</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الدورة المطلوبة</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">التاريخ</th>
              <th scope="col" className="px-3 py-3 text-start font-medium">الحالة</th>
              <th scope="col" className="px-4 py-3 text-end font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((request) => (
              <tr
                key={request.id}
                className={cn("transition-colors hover:bg-surface/40", request.archivedAt && "opacity-70")}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/corporate-requests/${request.id}`}
                    className="block max-w-[180px] truncate font-medium text-charcoal-800 hover:text-brand-700"
                  >
                    {request.company}
                  </Link>
                  <span className="block max-w-[180px] truncate text-xs text-charcoal-500" dir="ltr">
                    {request.email}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="block max-w-[160px] truncate text-charcoal-700">
                    {request.contactPerson}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="block text-xs text-charcoal-600 num-ltr">{request.phone}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700 num-ltr">
                    {formatNumber(request.traineesCount)}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="block max-w-[200px] truncate text-xs text-charcoal-600">
                    {request.requestedCourse}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-xs text-charcoal-600">
                    {formatShortDate(request.createdAt.slice(0, 10))}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={request.status} />
                    {request.archivedAt ? (
                      <span className="inline-flex items-center rounded-full border border-charcoal-200 bg-surface px-2.5 py-0.5 text-xs font-medium text-charcoal-500">
                        مؤرشف
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RowActions request={request} onArchive={onArchive} onRestore={onRestore} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: بطاقات ── */}
      <ul className="space-y-3 md:hidden">
        {requests.map((request) => (
          <li
            key={request.id}
            className={cn("rounded-xl border border-border bg-white p-4", request.archivedAt && "opacity-75")}
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/admin/corporate-requests/${request.id}`}
                className="block font-medium leading-snug text-charcoal-800 hover:text-brand-700"
              >
                {request.company}
              </Link>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-0.5 truncate text-xs text-charcoal-500">{request.contactPerson}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-charcoal-600">
              <span className="truncate num-ltr">{request.phone}</span>
              <span className="truncate">
                {formatNumber(request.traineesCount)} متدرب
              </span>
              <span className="col-span-2 truncate">{request.requestedCourse}</span>
              <span className="text-charcoal-400">
                {formatShortDate(request.createdAt.slice(0, 10))}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
              {request.archivedAt ? (
                <span className="inline-flex items-center rounded-full border border-charcoal-200 bg-surface px-2.5 py-0.5 text-xs font-medium text-charcoal-500">
                  مؤرشف
                </span>
              ) : null}
              <div className="ms-auto">
                <RowActions
                  request={request}
                  onArchive={onArchive}
                  onRestore={onRestore}
                  withLabels
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * ConfirmArchiveDialog — تأكيد الأرشفة/الاستعادة
 * مفصولة ليستخدمها الصفحان (القائمة والتفاصيل) بنفس النص.
 */
export function ConfirmArchiveDialog({
  target,
  onOpenChange,
  onArchive,
  onRestore,
}: {
  target: CorporateRequest | null;
  onOpenChange: (open: boolean) => void;
  onArchive: (request: CorporateRequest) => void;
  onRestore: (request: CorporateRequest) => void;
}) {
  const isRestore = target ? Boolean(target.archivedAt) : false;
  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={onOpenChange}
      destructive={false}
      title={isRestore ? "استعادة الطلب من الأرشيف" : "أرشفة الطلب"}
      description={
        target
          ? isRestore
            ? `سيعود طلب «${target.company}» إلى قائمة الطلبات النشطة ويُحسب في عدادات لوحة التحكم.`
            : `سيُخفى طلب «${target.company}» من القائمة النشطة والعدادات مع الاحتفاظ ببياناته كاملة في الأرشيف — الطلبات بيانات تشغيلية لا تُحذف.`
          : ""
      }
      confirmLabel={isRestore ? "استعادة" : "أرشفة"}
      onConfirm={() => {
        if (!target) return;
        if (target.archivedAt) {
          onRestore(target);
        } else {
          onArchive(target);
        }
      }}
    />
  );
}
