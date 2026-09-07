"use client";

/**
 * RequestDetail — تفاصيل طلب تدريب الشركات (#16)
 * ------------------------------------------------
 * ثلاثة أقسام: بيانات الشركة / التدريب المطلوب / بيانات النظام.
 * إدارة الحالة (كل تغيير يضيف حدث Timeline تلقائيًا)، الملاحظات الداخلية
 * (إضافة/حذف بتأكيد — لا تظهر للعميل)، الإجراءات السريعة كروابط فقط
 * (tel: / mailto: / wa.me — بلا WhatsApp API)، وأرشفة/استعادة.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";

import { useAdminActions, useAdminState } from "@/context/admin-store";
import type { CorporateRequest, RequestStatus } from "@/data/admin/types";
import { formatDateTime, formatNumber, phoneDigits } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { ConfirmArchiveDialog } from "@/components/admin/corporate-requests/corporate-requests-list";
import { EmptyState } from "@/components/admin/ui/empty-state";

const STATUS_OPTIONS: Array<{ value: RequestStatus; label: string }> = [
  { value: "new", label: "جديد" },
  { value: "contacted", label: "تم التواصل" },
  { value: "preparing-offer", label: "تحضير العرض" },
  { value: "offer-sent", label: "أُرسل العرض" },
  { value: "agreed", label: "تم الاتفاق" },
  { value: "closed", label: "مُغلق" },
];

const STATUS_LABEL: Record<RequestStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<RequestStatus, string>;

/** صف بيانات بسيط داخل بطاقة (تسمية + قيمة) */
function DataRow({ label, value, ltr }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-xs font-medium text-charcoal-500">{label}</dt>
      <dd className={`text-sm text-charcoal-800 ${ltr ? "text-start sm:text-end num-ltr" : "sm:text-end"}`}>
        {value}
      </dd>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-charcoal-900">
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-charcoal-600">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

interface RequestDetailProps {
  requestId: string;
}

export function RequestDetail({ requestId }: RequestDetailProps) {
  const { toast } = useToast();
  const { data, hydrated } = useAdminState();
  const { updateRequestStatus, updateRequest, addRequestNote, deleteRequestNote } = useAdminActions();

  const request = data.requests.find((entry) => entry.id === requestId);

  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CorporateRequest | null>(null);

  /* أحدث الأحداث أولًا في العرض — والمخزن يضيف الجديد في النهاية */
  const timeline = useMemo(
    () => (request ? [...request.timeline].reverse() : []),
    [request],
  );

  if (hydrated && !request) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <EmptyState
          title="الطلب غير موجود"
          description="ربما أُغلق هذا الطلب أو أن الرابط غير صحيح."
        >
          <Button asChild size="sm">
            <Link href="/admin/corporate-requests">العودة لقائمة الطلبات</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto w-full max-w-4xl py-24 text-center text-sm text-charcoal-400">
        جارٍ تحميل الطلب…
      </div>
    );
  }

  const whatsappUrl = `https://wa.me/${phoneDigits(request.phone)}?text=${encodeURIComponent(
    `مرحبًا ${request.contactPerson}، بخصوص طلب تدريب «${request.requestedCourse}» من ${request.company}.`,
  )}`;

  function handleChangeStatus(status: RequestStatus) {
    if (status === request?.status) return;
    const previousLabel = request ? STATUS_LABEL[request.status] : "";
    updateRequestStatus(request!.id, status);
    toast({
      title: "تم تحديث الحالة",
      description: `انتقل الطلب من «${previousLabel}» إلى «${STATUS_LABEL[status]}» — وسُجّل الحدث في السجل الزمني.`,
    });
  }

  function handleAddNote() {
    const text = noteText.trim();
    if (!text) {
      setNoteError("نص الملاحظة مطلوب.");
      return;
    }
    addRequestNote(request!.id, { text, author: "المالك" });
    setNoteText("");
    setNoteError("");
    toast({ title: "أُضيفت الملاحظة", description: "الملاحظات الداخلية لا تظهر للعميل." });
  }

  function handleDeleteNote() {
    if (!deleteNoteId) return;
    deleteRequestNote(request!.id, deleteNoteId);
    setDeleteNoteId(null);
    toast({ title: "حُذفت الملاحظة" });
  }

  const isArchived = Boolean(request.archivedAt);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <AdminPageHeader
        title={request.company}
        description={`طلب تدريب شركات — ${formatNumber(request.traineesCount)} متدربًا في «${request.requestedCourse}».`}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/corporate-requests">
            <ChevronRight aria-hidden="true" className="me-1 h-4 w-4" />
            قائمة الطلبات
          </Link>
        </Button>
      </AdminPageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={request.status} />
        {isArchived ? (
          <span className="inline-flex items-center rounded-full border border-charcoal-200 bg-surface px-2.5 py-0.5 text-xs font-medium text-charcoal-500">
            مؤرشف
          </span>
        ) : null}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {/* إجراءات سريعة — روابط فقط بلا أي APIs */}
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${phoneDigits(request.phone)}`} aria-label={`اتصال بـ ${request.contactPerson}`}>
              <Phone aria-hidden="true" className="me-1.5 h-4 w-4" />
              اتصال
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={`مراسلة ${request.contactPerson} على واتساب`}>
              <MessageCircle aria-hidden="true" className="me-1.5 h-4 w-4" />
              واتساب
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`mailto:${request.email}?subject=${encodeURIComponent(`بخصوص طلب تدريبكم — ${request.requestedCourse}`)}`} aria-label={`مراسلة ${request.company} بالبريد`}>
              <Mail aria-hidden="true" className="me-1.5 h-4 w-4" />
              بريد
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={isArchived ? "" : "text-charcoal-700"}
            onClick={() => setArchiveTarget(request)}
          >
            {isArchived ? (
              <>
                <ArchiveRestore aria-hidden="true" className="me-1.5 h-4 w-4" />
                استعادة من الأرشيف
              </>
            ) : (
              <>
                <Archive aria-hidden="true" className="me-1.5 h-4 w-4" />
                أرشفة الطلب
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── العمود الأيمن: بيانات الطلب ── */}
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="بيانات الشركة" icon={Users}>
            <dl className="divide-y divide-border">
              <DataRow label="اسم الشركة" value={request.company} />
              <DataRow label="مسؤول التواصل" value={request.contactPerson} />
              <DataRow label="رقم الجوال" value={request.phone} ltr />
              <DataRow
                label="البريد الإلكتروني"
                value={
                  <a href={`mailto:${request.email}`} className="rounded font-medium text-brand-600 hover:text-brand-700" dir="ltr">
                    {request.email}
                  </a>
                }
                ltr
              />
              <DataRow label="عدد المتدربين" value={`${formatNumber(request.traineesCount)} متدربًا`} />
            </dl>
          </SectionCard>

          <SectionCard title="التدريب المطلوب" icon={GraduationCap}>
            <dl className="divide-y divide-border">
              <DataRow label="الدورة المطلوبة" value={request.requestedCourse} />
              <DataRow
                label="ملاحظات الطلب (من النموذج)"
                value={request.notes ? <span className="leading-relaxed">{request.notes}</span> : "—"}
              />
            </dl>
          </SectionCard>

          <SectionCard title="بيانات النظام" icon={ClipboardList}>
            <dl className="divide-y divide-border">
              <DataRow
                label="تاريخ الطلب"
                value={
                  <span className="flex items-center gap-1.5">
                    <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-charcoal-400" />
                    {formatDateTime(request.createdAt)}
                  </span>
                }
              />
              <DataRow label="الحالة الحالية" value={<StatusBadge status={request.status} />} />
            </dl>

            {/* إدارة الحالة */}
            <div className="mt-4 rounded-xl border border-border bg-surface/60 p-4">
              <label htmlFor="request-status" className="mb-2 block text-sm font-medium text-charcoal-800">
                تغيير حالة الطلب
              </label>
              <Select value={request.status} onValueChange={(value) => handleChangeStatus(value as RequestStatus)}>
                <SelectTrigger id="request-status" className="w-full bg-white sm:w-64" aria-label="حالة الطلب">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                كل تغيير حالة يُسجَّل تلقائيًا في السجل الزمني باسم «المالك».
              </p>
            </div>
          </SectionCard>
        </div>

        {/* ── العمود الأيسر: السجل الزمني + الملاحظات الداخلية ── */}
        <div className="space-y-4">
          <SectionCard title="السجل الزمني (Timeline)" icon={CheckCircle2}>
            {timeline.length === 0 ? (
              <p className="py-4 text-center text-xs text-charcoal-400">لا أحداث بعد.</p>
            ) : (
              <ol className="relative space-y-4 ps-5" aria-label="سجل تغيّر حالة الطلب">
                {/* خط عمودي — يبدأ من الشاشات ويظل داخليًا */}
                <span aria-hidden="true" className="absolute inset-y-1 start-[7px] w-px bg-border" />
                {timeline.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -start-5 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-500 ring-1 ring-border"
                    />
                    <p className="text-sm font-medium text-charcoal-800">
                      {STATUS_LABEL[entry.newStatus]}
                      {entry.previousStatus ? (
                        <span className="text-xs font-normal text-charcoal-500">
                          {" "}— بعد «{STATUS_LABEL[entry.previousStatus]}»
                        </span>
                      ) : (
                        <span className="text-xs font-normal text-charcoal-500"> — وصول الطلب</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-charcoal-500">
                      {formatDateTime(entry.timestamp)}
                      <span className="mx-1.5 text-charcoal-300">·</span>
                      {entry.actor}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          <SectionCard title="الملاحظات الداخلية" icon={StickyNote}>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              ملاحظات الفريق فقط — لا تظهر للعميل في أي واجهة.
            </p>

            {request.internalNotes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-charcoal-200 bg-surface/50 px-3 py-4 text-center text-xs text-charcoal-400">
                لا ملاحظات داخلية بعد — أضف أول ملاحظة أدناه.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {request.internalNotes.map((note) => (
                  <li key={note.id} className="rounded-xl border border-border bg-surface/50 p-3">
                    <p className="text-sm leading-relaxed text-charcoal-800">{note.text}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-charcoal-400">
                        {note.author} — {formatDateTime(note.createdAt)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setDeleteNoteId(note.id)}
                        className="rounded-md p-1 text-charcoal-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
                        aria-label={`حذف الملاحظة: ${note.text.slice(0, 30)}`}
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* إضافة ملاحظة */}
            <div className="mt-4 space-y-2">
              <label htmlFor="new-note" className="block text-sm font-medium text-charcoal-800">
                + إضافة ملاحظة داخلية
              </label>
              <Textarea
                id="new-note"
                value={noteText}
                onChange={(event) => {
                  setNoteText(event.target.value);
                  if (noteError) setNoteError("");
                }}
                rows={3}
                placeholder="مثال: اتصلت بالجهة وحددنا جلسة عرض يوم الثلاثاء…"
                aria-invalid={Boolean(noteError)}
                aria-describedby={noteError ? "new-note-error" : undefined}
              />
              {noteError ? (
                <p id="new-note-error" role="alert" className="text-xs font-medium text-brand-700">
                  {noteError}
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">الكاتب: المالك (Mock)</p>
                <Button size="sm" onClick={handleAddNote}>
                  أضف الملاحظة
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* حوارات التأكيد */}
      <ConfirmArchiveDialog
        target={archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        onArchive={() => {
          updateRequest(request.id, { archivedAt: new Date().toISOString() });
          setArchiveTarget(null);
          toast({ title: "تم أرشفة الطلب", description: "أُخفي من القائمة النشطة والعدادات — البيانات محفوظة." });
        }}
        onRestore={() => {
          updateRequest(request.id, { archivedAt: undefined });
          setArchiveTarget(null);
          toast({ title: "تمت الاستعادة", description: "عاد الطلب إلى قائمة الطلبات النشطة." });
        }}
      />

      <ConfirmDialog
        open={deleteNoteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteNoteId(null);
        }}
        title="حذف الملاحظة الداخلية"
        description="سيتم حذف هذه الملاحظة نهائيًا من سجل الطلب. لا يمكن التراجع."
        confirmLabel="حذف نهائي"
        onConfirm={handleDeleteNote}
      />
    </div>
  );
}
