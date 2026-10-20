import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, RefreshCw, Undo2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { formatDate, formatPrice } from "@/lib/format";
import { loadEquipmentRentalReceipt, type EquipmentRentalOutcome } from "@/lib/rentals/bookings";
import { RENTAL_IDENTITY_STATUS_LABELS, RENTAL_STATUS_LABELS } from "@/lib/rentals/labels";

export const metadata: Metadata = {
  title: "إيجار المعدة",
  robots: { index: false, follow: false },
};

/** صفحة النجاح: تحقّق الخادم يسأل ميسّر — لا تؤكّد هذه الصفحة شيئًا بنفسها. */

interface OutcomeView {
  title: string;
  note: string;
  icon: typeof CheckCircle2;
  tone: "success" | "muted" | "danger";
}

const OUTCOMES: Record<EquipmentRentalOutcome, OutcomeView> = {
  paid: {
    title: "تم تأكيد إيجارك",
    note: "وصل المال وطابق المبلغ — الإيجار مؤكد. سيصلك تواصل لترتيب التسليم والتحقق من الهوية.",
    icon: CheckCircle2,
    tone: "success",
  },
  pending: {
    title: "الدفع قيد المعالجة",
    note: "استلمنا محاولة الدفع ولم تُحسم بعد. أعد تحميل الصفحة بعد لحظات — أو تواصل معنا إن استمر الانتظار.",
    icon: Clock3,
    tone: "muted",
  },
  failed: {
    title: "لم يكتمل الدفع",
    note: "لم ينجح الدفع أو لم يطابق المبلغ المطلوب. لم يُخصم شيء — أعد المحاولة أو تواصل معنا.",
    icon: XCircle,
    tone: "danger",
  },
  expired: {
    title: "انتهت مهلة الدفع",
    note: "لم تُكمل الدفع داخل المهلة، فعادت الكمية إلى المتاح ولم يُخصم شيء.",
    icon: Clock3,
    tone: "muted",
  },
  cancelled: {
    title: "هذا الإيجار ملغى",
    note: "أُلغي الإيجار من الإدارة. إن كان لديك استفسار فتواصل معنا.",
    icon: Undo2,
    tone: "muted",
  },
  refunded: {
    title: "تم استرداد المبلغ",
    note: "سُجّل استرداد كامل للمبلغ عبر ميسر، وأُلغي الإيجار.",
    icon: Undo2,
    tone: "muted",
  },
  unverified: {
    title: "جارٍ تأكيد الدفع",
    note: "تعذّر السؤال عن المزود للحظة. أعد تحميل الصفحة بعد قليل.",
    icon: RefreshCw,
    tone: "muted",
  },
  unknown: {
    title: "لم نعثر على الإيجار",
    note: "الرابط غير صالح أو أن الإيجار غير موجود. اختر المعدة من جديد وحاول مرة أخرى.",
    icon: XCircle,
    tone: "danger",
  },
};

export default async function EquipmentRentalSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const { r } = await searchParams;
  const receipt = r ? await loadEquipmentRentalReceipt(r) : null;
  const view = OUTCOMES[receipt ? receipt.outcome : "unknown"];
  const Icon = view.icon;

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-lg rounded-2xl border border-charcoal-200 bg-white p-8 text-center shadow-soft">
        <Icon
          aria-hidden="true"
          className={`mx-auto h-12 w-12 ${view.tone === "success" ? "text-brand-600" : view.tone === "danger" ? "text-danger-600" : "text-charcoal-400"}`}
        />
        <h1 className="mt-4 text-2xl font-bold text-charcoal-900">{view.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-charcoal-600">{view.note}</p>

        {receipt ? (
          <dl className="mt-6 space-y-3 rounded-xl bg-charcoal-50 p-5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal-500">المعدة</dt>
              <dd className="font-bold text-charcoal-900">{receipt.itemName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal-500">الفترة</dt>
              <dd className="font-medium text-charcoal-800">
                {formatDate(receipt.startDate)} — {formatDate(receipt.endDate)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal-500">المدة والكمية</dt>
              <dd className="font-medium text-charcoal-800">
                {receipt.days} {receipt.days === 1 ? "يوم" : "أيام"} — {receipt.quantity}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal-500">المبلغ</dt>
              <dd className="font-bold text-brand-700">{formatPrice(receipt.totalAmount / 100)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal-500">الحالة</dt>
              <dd className="font-medium text-charcoal-800">{RENTAL_STATUS_LABELS[receipt.status] ?? receipt.status}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal-500">التحقق من الهوية</dt>
              <dd className="font-medium text-charcoal-800">
                {RENTAL_IDENTITY_STATUS_LABELS[receipt.identityStatus] ?? receipt.identityStatus}
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {receipt?.checkoutUrl ? (
            <Button asChild>
              <a href={receipt.checkoutUrl}>إكمال الدفع</a>
            </Button>
          ) : null}
          {receipt?.outcome === "paid" ? (
            <Button asChild variant={receipt.checkoutUrl ? "outline" : "default"}>
              <Link href={`/rentals/receipt/${receipt.receiptToken}`}>عرض الإيصال والعقد</Link>
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
