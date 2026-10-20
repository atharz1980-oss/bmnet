import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package, ReceiptText, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { formatDate, formatPrice } from "@/lib/format";
import { loadEquipmentRentalReceiptByToken } from "@/lib/rentals/bookings";
import { RENTAL_HANDOVER_LABELS, RENTAL_IDENTITY_STATUS_LABELS, RENTAL_STATUS_LABELS, SECURITY_NOTE_STATUS_LABELS } from "@/lib/rentals/labels";

export const metadata: Metadata = {
  title: "إيصال إيجار المعدة",
  robots: { index: false, follow: false },
};

/**
 * الإيصال العام — لا يُقرأ إلا بمفتاح `receipt_token` العشوائي (لا بالمعرّف).
 * لا يُعرض رقم الهوية كاملًا، والإيصال يعرض الحالة الفعلية بلا تجميل.
 */
export default async function EquipmentReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const receipt = await loadEquipmentRentalReceiptByToken(token);
  if (!receipt) notFound();

  const paid = receipt.outcome === "paid";

  return (
    <Container className="py-16 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-charcoal-900">
            <ReceiptText aria-hidden="true" className="h-6 w-6 text-brand-600" />
            إيصال إيجار معدات
          </h1>
          <span
            className={
              paid
                ? "rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700"
                : "rounded-full bg-surface px-3 py-1 text-sm font-semibold text-charcoal-700"
            }
          >
            {RENTAL_STATUS_LABELS[receipt.status] ?? receipt.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-charcoal-600">
          رقم الإيجار: <span className="num-ltr font-medium text-charcoal-800">{receipt.rentalId}</span>
        </p>

        <dl className="mt-6 divide-y divide-charcoal-100 rounded-2xl border border-charcoal-200 bg-white">
          <Row label="المعدة" value={receipt.itemName} strong />
          <Row label="المستأجر" value={receipt.customerName} />
          <Row label="الفترة" value={`${formatDate(receipt.startDate)} — ${formatDate(receipt.endDate)}`} />
          <Row label="المدة" value={`${receipt.days} ${receipt.days === 1 ? "يوم" : "أيام"}`} />
          <Row label="الكمية" value={String(receipt.quantity)} />
          <Row label="طريقة التسليم" value={RENTAL_HANDOVER_LABELS[receipt.method] ?? receipt.method} />
          <Row label="أجرة الإيجار" value={formatPrice(receipt.rentalAmount / 100)} />
          {receipt.deliveryFee > 0 ? <Row label="رسوم التوصيل" value={formatPrice(receipt.deliveryFee / 100)} /> : null}
          <Row label="ضريبة القيمة المضافة" value={formatPrice(receipt.taxAmount / 100)} />
          <Row label="الإجمالي المدفوع" value={formatPrice(receipt.totalAmount / 100)} strong />
          <Row label="حالة الدفع" value={paid ? "مدفوع" : receipt.paymentStatus} />
          <Row
            label="التحقق من الهوية"
            value={RENTAL_IDENTITY_STATUS_LABELS[receipt.identityStatus] ?? receipt.identityStatus}
          />
          {receipt.securityNoteStatus ? (
            <Row
              label="سند الضمان (نافذ)"
              value={SECURITY_NOTE_STATUS_LABELS[receipt.securityNoteStatus] ?? receipt.securityNoteStatus}
            />
          ) : null}
          {receipt.paidAt ? <Row label="تاريخ الدفع" value={formatDate(receipt.paidAt.slice(0, 10))} /> : null}
        </dl>

        <div className="mt-6 space-y-3 rounded-2xl border border-charcoal-200 bg-charcoal-50 p-5 text-sm leading-relaxed text-charcoal-700">
          <p className="flex items-start gap-2">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>
              هذا الإيصال يوثّق الإيجار وقيمته وحالته. التحقق من الهوية يجري يدويًا من أصل الهوية عند التسليم، ولا يدّعي
              هذا الإيصال تحققًا حكوميًا. سند الضمان، عند طلبه، يُعتمد من بوابة «نافذ» ولا يُعد معتمدًا إلا بعد تأكيدها.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <Package aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>يُسلَّم الإيصال برابط خاص لا يُشارَك. احتفظ به للرجوع إليه عند الحاجة.</span>
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {receipt.checkoutUrl ? (
            <Button asChild>
              <a href={receipt.checkoutUrl}>إكمال الدفع</a>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/rentals">تصفّح المعدات</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
      <dt className="text-charcoal-500">{label}</dt>
      <dd className={strong ? "font-bold text-charcoal-900" : "font-medium text-charcoal-800"}>{value}</dd>
    </div>
  );
}
