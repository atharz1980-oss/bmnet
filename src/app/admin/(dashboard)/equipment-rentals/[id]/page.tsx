/**
 * /admin/equipment-rentals/[id] — تفاصيل إيجار واحد وإجراءاته.
 *
 * صفحة العهدة كاملة: الفترة والمبلغ والدفع والعقد الموقّع، هوية المستأجر
 * (توثيق يدوي)، سند الضمان (نافذ)، محضر التسليم، محضر الاسترجاع، وخط زمن
 * التدقيق. العرض بـ`equipment:view` والإجراءات بـ`equipment:manage`،
 * والبوابات الصارمة (دفع + تحقق + سند) مفروضة في الخادم لا هنا.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, FileText } from "lucide-react";

import { IdentityPanel } from "@/components/admin/equipment/identity-panel";
import { InspectionPanel } from "@/components/admin/equipment/inspection-panel";
import { RentalRowActions } from "@/components/admin/equipment/rental-row-actions";
import { SecurityNotePanel } from "@/components/admin/equipment/security-note-panel";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/admin/session";
import { riyadhDateTime } from "@/lib/admin/guest-orders-csv";
import { formatDate, formatPrice } from "@/lib/format";
import { formatSaudiMobile } from "@/lib/landing/guest-validation";
import { loadEquipmentRentalDetail } from "@/lib/rentals/bookings";
import {
  EQUIPMENT_AUDIT_EVENT_LABELS,
  RENTAL_HANDOVER_LABELS,
  RENTAL_IDENTITY_METHOD_LABELS,
  RENTAL_PAYMENT_STATUS_LABELS,
  RENTAL_STATUS_LABELS,
} from "@/lib/rentals/labels";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function Chip({ tone, children }: { tone: "ok" | "danger" | "muted" | "dark"; children: React.ReactNode }) {
  const className =
    tone === "ok"
      ? "rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700"
      : tone === "danger"
        ? "rounded-full bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-700"
        : tone === "dark"
          ? "rounded-full bg-charcoal-800 px-2 py-0.5 text-xs font-semibold text-white"
          : "rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700";
  return <span className={className}>{children}</span>;
}

export default async function EquipmentRentalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePermission("equipment", "view");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const { id } = await params;
  const detail = await loadEquipmentRentalDetail(id);
  if (!detail) notFound();
  const { rental, item, note, inspections, audit } = detail;

  /* المواصفات/السيريال الأساسي للمعدة — لتعبئة محضر التسليم. */
  const { data: itemExtra } = await getServiceSupabase()
    .from("equipment_items")
    .select("serial_number")
    .eq("id", rental.item_id)
    .maybeSingle();

  const handover = inspections.find((row) => row.kind === "handover") ?? null;
  const returned = inspections.find((row) => row.kind === "return") ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <AdminPageHeader
        title={`إيجار ${rental.item_name_snapshot}`}
        description={`${rental.customer_name} — ${formatDate(rental.start_date)} إلى ${formatDate(rental.end_date)}`}
      >
        <Button asChild variant="ghost">
          <Link href="/admin/equipment-rentals">
            <ArrowRight aria-hidden="true" className="me-1.5 h-4 w-4" />
            عودة للقائمة
          </Link>
        </Button>
      </AdminPageHeader>

      <section className="space-y-4 rounded-xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={rental.status === "out_on_rent" ? "dark" : rental.status === "confirmed" ? "ok" : rental.status === "cancelled" || rental.status === "expired" ? "danger" : "muted"}>
            {RENTAL_STATUS_LABELS[rental.status] ?? rental.status}
          </Chip>
          <Chip tone={rental.payment_status === "paid" ? "ok" : rental.payment_status === "failed" || rental.payment_status === "refunded" ? "danger" : "muted"}>
            {RENTAL_PAYMENT_STATUS_LABELS[rental.payment_status] ?? rental.payment_status}
          </Chip>
          <Chip tone="muted">{RENTAL_HANDOVER_LABELS[rental.method] ?? rental.method}</Chip>
          {rental.customer_notified_at ? <Chip tone="muted">أُشعر العميل</Chip> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RentalRowActions rentalId={rental.id} status={rental.status} notified={rental.customer_notified_at !== null} />
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-charcoal-500">الفترة</dt>
            <dd className="mt-0.5 text-charcoal-900">
              {formatDate(rental.start_date)} — {formatDate(rental.end_date)}
              <span className="block text-xs text-charcoal-500">
                {rental.rental_days} يوم × {rental.quantity} وحدة
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-charcoal-500">المستأجر</dt>
            <dd className="mt-0.5 text-charcoal-900">
              {rental.customer_name}
              {rental.company_name ? <span className="block text-xs text-charcoal-500">{rental.company_name}</span> : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-charcoal-500">التواصل</dt>
            <dd className="mt-0.5 text-charcoal-900" dir="ltr">
              <span className="block text-start">{formatSaudiMobile(rental.phone)}</span>
              <span className="block text-start text-xs text-charcoal-500">{rental.email}</span>
            </dd>
          </div>
          {rental.method === "delivery" && rental.delivery_address ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium text-charcoal-500">عنوان التوصيل</dt>
              <dd className="mt-0.5 text-charcoal-900">{rental.delivery_address}</dd>
            </div>
          ) : null}
        </dl>

        <div className="grid gap-2 rounded-lg bg-surface p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-charcoal-600">قيمة الإيجار</span>
            <span className="tabular-nums text-charcoal-900">{formatPrice(rental.rental_amount_halalas / 100)}</span>
          </div>
          {rental.delivery_fee_halalas > 0 ? (
            <div className="flex justify-between">
              <span className="text-charcoal-600">رسوم التوصيل</span>
              <span className="tabular-nums text-charcoal-900">{formatPrice(rental.delivery_fee_halalas / 100)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-charcoal-600">الضريبة ({rental.tax_rate_bps / 100}%)</span>
            <span className="tabular-nums text-charcoal-900">{formatPrice(rental.tax_amount / 100)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-bold">
            <span className="text-charcoal-900">الإجمالي</span>
            <span className="tabular-nums text-brand-700">{formatPrice(rental.total_amount / 100)}</span>
          </div>
        </div>

        {rental.notes ? (
          <p className="rounded-lg bg-surface p-3 text-sm text-charcoal-700">ملاحظات العميل: {rental.notes}</p>
        ) : null}
        {rental.admin_note ? (
          <p className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">ملاحظة إدارية: {rental.admin_note}</p>
        ) : null}
      </section>

      {/* ── العقد والتوقيع ── */}
      <section className="space-y-3 rounded-xl border border-border bg-white p-5">
        <h2 className="flex items-center gap-2 font-bold text-charcoal-900">
          <FileText aria-hidden="true" className="h-4 w-4" />
          العقد الإلكتروني والتوقيع
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-charcoal-500">إصدار العقد المقبول</dt>
            <dd className="mt-0.5 text-charcoal-900">إصدار {rental.agreement_version}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-charcoal-500">قُبل في</dt>
            <dd dir="ltr" className="mt-0.5 text-start tabular-nums text-charcoal-900">
              {riyadhDateTime(rental.agreement_accepted_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-charcoal-500">الاسم الموقّع</dt>
            <dd className="mt-0.5 text-charcoal-900">{rental.signature_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-charcoal-500">بصمة التوقيع</dt>
            <dd dir="ltr" className="mt-0.5 truncate text-start font-mono text-xs text-charcoal-600" title={rental.signature_hash}>
              {rental.signature_hash}
            </dd>
          </div>
        </dl>
        <Button asChild variant="outline" size="sm">
          <a href={`/rentals/receipt/${rental.receipt_token}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" className="me-1.5 h-4 w-4" />
            الإيصال العام
          </a>
        </Button>
      </section>

      <IdentityPanel
        rentalId={rental.id}
        status={rental.identity_status}
        method={RENTAL_IDENTITY_METHOD_LABELS[rental.identity_check_method] ?? rental.identity_check_method}
        reference={rental.identity_reference}
        verifiedAt={rental.identity_verified_at ? riyadhDateTime(rental.identity_verified_at) : null}
        nationalId={rental.national_id}
        nationalIdExpiry={rental.national_id_expiry}
      />

      <SecurityNotePanel
        rentalId={rental.id}
        requiresNote={item?.requires_security_note ?? false}
        note={note}
      />

      {rental.status === "confirmed" ? (
        <InspectionPanel
          rentalId={rental.id}
          kind="handover"
          serialNumber={itemExtra?.serial_number ?? ""}
          customerName={rental.customer_name}
          customerNationalId={rental.national_id}
          recorded={handover}
        />
      ) : null}

      {handover && (rental.status === "out_on_rent" || rental.status === "returned" || rental.status === "closed") ? (
        <InspectionPanel
          rentalId={rental.id}
          kind="return"
          serialNumber={handover.serial_number}
          customerName={rental.customer_name}
          customerNationalId={rental.national_id}
          recorded={returned}
        />
      ) : null}

      {/* ── سجل التدقيق ── */}
      <section className="space-y-3 rounded-xl border border-border bg-white p-5">
        <h2 className="font-bold text-charcoal-900">سجل التدقيق</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-charcoal-500">لا أحداث بعد.</p>
        ) : (
          <ol className="space-y-3">
            {audit.map((event) => (
              <li key={event.id} className="flex gap-3 border-s-2 border-border ps-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-charcoal-900">
                    {EQUIPMENT_AUDIT_EVENT_LABELS[event.event_type] ?? event.event_type}
                  </p>
                  {event.from_status && event.to_status && event.from_status !== event.to_status ? (
                    <p className="text-xs text-charcoal-500">
                      {RENTAL_STATUS_LABELS[event.from_status] ?? event.from_status} ← {RENTAL_STATUS_LABELS[event.to_status] ?? event.to_status}
                    </p>
                  ) : null}
                  <p dir="ltr" className="text-start text-xs tabular-nums text-charcoal-400">
                    {riyadhDateTime(event.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
