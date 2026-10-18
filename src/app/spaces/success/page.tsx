import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, RefreshCw, Undo2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { formatDateWithWeekday, formatPrice } from "@/lib/format";
import { loadSpaceBookingReceipt, type SpaceBookingOutcome } from "@/lib/spaces/bookings";
import { formatDurationArabic, formatTimeArabic } from "@/lib/spaces/schedule";

export const metadata: Metadata = {
  title: "حجز المساحة",
  robots: { index: false, follow: false },
};

/** صفحة النجاح: تحقّق الخادم يسأل ميسّر — لا تؤكّد هذه الصفحة شيئًا بنفسها. */

interface OutcomeView {
  title: string;
  note: string;
  icon: typeof CheckCircle2;
  tone: "success" | "muted" | "danger";
}

const OUTCOMES: Record<SpaceBookingOutcome, OutcomeView> = {
  paid: {
    title: "تم تأكيد حجزك",
    note: "وصل المال وطابق المبلغ — الحجز مؤكد، وتفاصيله على بريدك.",
    icon: CheckCircle2,
    tone: "success",
  },
  pending: {
    title: "الدفع قيد المعالجة",
    note: "استلمنا محاولة الدفع ولم يُحسم بعد. أعد تحميل الصفحة بعد لحظات — أو تواصل معنا إن استمر الانتظار.",
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
    note: "لم تُكمل الدفع داخل المهلة، فعاد الوقت إلى المتاح ولم يُخصم شيء.",
    icon: Clock3,
    tone: "muted",
  },
  cancelled: {
    title: "هذا الحجز ملغى",
    note: "أُلغي الحجز من الإدارة. إن كان لديك استفسار فتواصل معنا.",
    icon: Undo2,
    tone: "muted",
  },
  refunded: {
    title: "تم استرداد مبلغ الحجز",
    note: "سُجّل استرداد كامل للمبلغ عبر ميسر، وأُلغي الحجز.",
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
    title: "لم نعثر على الحجز",
    note: "الرابط غير صالح أو أن الحجز غير موجود. اختر المساحة من جديد وحاول الحجز مرة أخرى.",
    icon: XCircle,
    tone: "danger",
  },
};

export default async function SpaceBookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string }>;
}) {
  const { b } = await searchParams;
  const receipt = b ? await loadSpaceBookingReceipt(b) : null;
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
              <dt className="text-charcoal-500">المساحة</dt>
              <dd className="font-bold text-charcoal-900">{receipt.spaceName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal-500">اليوم</dt>
              <dd className="font-medium text-charcoal-800">{formatDateWithWeekday(`${receipt.date}T00:00:00Z`)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal-500">الوقت</dt>
              <dd className="font-medium text-charcoal-800">
                {formatTimeArabic(receipt.start)} — {formatTimeArabic(receipt.end)}
                <span className="text-charcoal-500"> ({formatDurationArabic(receipt.durationMinutes)})</span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal-500">المبلغ</dt>
              <dd className="font-bold text-brand-700">{formatPrice(receipt.totalAmount / 100)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal-500">الاسم</dt>
              <dd className="font-medium text-charcoal-800">{receipt.customerName}</dd>
            </div>
            {receipt.outcome === "paid" ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-charcoal-500">تأكيد الحجز</dt>
                <dd className="font-medium text-charcoal-800">صُفّر على بريدك — وجد الحجز مساحتك في الموعد المحدد.</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {receipt?.checkoutUrl ? (
            <Button asChild>
              <a href={receipt.checkoutUrl}>إكمال الدفع</a>
            </Button>
          ) : null}
          <Button asChild variant={receipt?.checkoutUrl ? "outline" : "default"}>
            <Link href="/spaces">تصفّح المساحات</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
