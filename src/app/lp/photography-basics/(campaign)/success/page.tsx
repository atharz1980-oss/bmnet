/**
 * صفحة ما بعد الدفع لورشة «أساسيات التصوير» — لكل دفعة (كامل، عربون، متبقٍّ).
 *
 * لا تقرأ من الرابط إلا معرّف الدفعة `o` (يحذفه Pixel قبل أي إرسال). الحالة
 * تُحسم على الخادم: من القاعدة، أو بسؤال ميسّر مباشرة. Purchase لدفعة مؤكدة
 * فقط، بقيمتها هي (300 أو 796 أو المتبقي)، ومعرّف حدث ثابت لكل دفعة.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, Loader2, MapPin, RotateCcw, XCircle } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { PixelPurchase } from "@/components/landing/mobile-content/pixel-events";
import { ReceiptRefresh } from "@/components/landing/mobile-content/receipt-refresh";
import { TrackingSettingsButton } from "@/components/landing/mobile-content/tracking-consent";
import { WhatsAppIcon } from "@/components/shared/social-icons";
import {
  PHOTOGRAPHY_BASICS_PATH,
  PHOTOGRAPHY_BASICS_SLUG,
  PHOTOGRAPHY_BOOKING_ANCHOR,
  PHOTOGRAPHY_PIXEL_CONTENT,
  photographyWorkshop,
} from "@/data/landing/photography-basics";
import { maskEmail } from "@/lib/landing/guest-validation";
import { purchaseEventId, purchaseTrackable } from "@/lib/landing/meta-pixel-server";
import { photographyGroupLinkFor } from "@/lib/workshops/group-links";
import { loadWorkshopReceipt } from "@/lib/workshops/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "حالة الحجز | بيت المصور" },
  robots: { index: false, follow: false },
  referrer: "strict-origin",
};

const FACTS = [
  { icon: MapPin, text: photographyWorkshop.location },
  { icon: CalendarDays, text: photographyWorkshop.dateLabel },
  { icon: Clock, text: photographyWorkshop.duration },
];

function riyals(halalas: number): string {
  return halalas % 100 === 0 ? String(halalas / 100) : (halalas / 100).toFixed(2);
}

export default async function PhotographySuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).o;
  const paymentId = Array.isArray(raw) ? raw[0] : raw;
  const receipt = paymentId ? await loadWorkshopReceipt(PHOTOGRAPHY_BASICS_SLUG, paymentId) : null;
  /* بلا سعر اختبار في هذه الصفحة: الإنتاج وحده، دفعة مؤكدة حديثة. */
  const purchaseEvent =
    paymentId && receipt?.outcome === "paid" && purchaseTrackable({ paidAt: receipt.paidAt, testPriceSar: null })
      ? purchaseEventId(paymentId)
      : null;
  const depositOnly = receipt?.outcome === "paid" && receipt.orderStatus === "deposit_paid";
  /* رابط الجروب من الخادم فقط، لدفعة كامل/عربون مؤكدة من ميسّر — لا يُقرأ من الرابط. */
  const groupLink = photographyGroupLinkFor(receipt);

  return (
    <div className="min-h-[100dvh] bg-charcoal-950 text-white">
      <Container className="py-6">
        <Logo variant="master" mode="light-on-dark" height={34} alt="بيت المصور" />
      </Container>
      <Container className="pb-16 pt-6 sm:pt-12">
        <section
          aria-labelledby="receipt-title"
          data-workshop-outcome={receipt?.outcome ?? "not-found"}
          className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white p-6 text-charcoal-950 sm:p-8"
        >
          {!receipt ? (
            <Outcome
              icon={<XCircle aria-hidden="true" className="h-12 w-12 text-charcoal-400" />}
              title="لم نجد هذه العملية"
              body="تأكد من الرابط، أو ارجع إلى صفحة الورشة."
            />
          ) : receipt.outcome === "paid" ? (
            <>
              <Outcome
                icon={<CheckCircle2 aria-hidden="true" className="h-12 w-12 text-emerald-600" />}
                title={
                  receipt.kind === "balance"
                    ? "تم سداد المبلغ المتبقي بنجاح 🎉"
                    : depositOnly
                      ? "تم حجز مقعدك بالعربون 🎉"
                      : "تم حجز مقعدك بنجاح 🎉"
                }
                body={receipt.workshopTitle}
              />
              {purchaseEvent && (
                <PixelPurchase
                  eventId={purchaseEvent}
                  valueSar={receipt.paymentAmount / 100}
                  content={PHOTOGRAPHY_PIXEL_CONTENT}
                />
              )}
              {groupLink && (
                <div
                  data-workshop-group
                  aria-labelledby="group-title"
                  role="region"
                  className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center sm:p-6"
                >
                  <h2 id="group-title" className="text-lg font-bold text-charcoal-950 sm:text-xl">
                    تم تأكيد حجزك بنجاح!
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-800 sm:text-base">
                    انضم إلى جروب الورشة على واتساب ليصلك موعد البدء والتنبيهات وكل التفاصيل.
                  </p>
                  {/* لا تحويل تلقائي — الانضمام بضغطة المتدرب نفسه. */}
                  <a
                    data-lp-keep-clear
                    href={groupLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 text-balance rounded-xl bg-[#1DA851] px-5 py-3 text-center text-base font-bold leading-snug text-white shadow-lg shadow-emerald-900/20 outline-none transition-colors hover:bg-[#178a43] focus-visible:ring-[3px] focus-visible:ring-emerald-600/40 focus-visible:ring-offset-2 sm:text-lg"
                  >
                    <WhatsAppIcon className="h-6 w-6" />
                    انضم الآن إلى جروب واتساب الورشة
                    <span className="sr-only">(يفتح واتساب في نافذة جديدة)</span>
                  </a>
                </div>
              )}
              <dl className="mt-6 space-y-3 rounded-2xl bg-surface p-5 text-sm">
                <Row label="المبلغ المدفوع في هذه العملية" value={`${riyals(receipt.paymentAmount)} ريال`} />
                <Row label="إجمالي المدفوع" value={`${riyals(receipt.paidAmount)} ريال`} />
                {receipt.remainingAmount > 0 && (
                  <Row label="المتبقي" value={`${riyals(receipt.remainingAmount)} ريال`} />
                )}
                {FACTS.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-charcoal-800">
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />
                    <dd>{text}</dd>
                  </div>
                ))}
              </dl>
              {receipt.remainingAmount > 0 && (
                <p data-balance-note className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900">
                  يُسدَّد المتبقي إلكترونيًا قبل بدء الورشة بـ48 ساعة، بعد تحديد موعدها النهائي. سنرسل لك رابط السداد.
                </p>
              )}
              <p className="mt-5 text-sm leading-relaxed text-charcoal-700">
                سنتواصل معك بموعد البدء على جوالك وبريدك{" "}
                <span dir="ltr" className="font-medium">
                  {maskEmail(receipt.email)}
                </span>
                .
              </p>
            </>
          ) : receipt.outcome === "pending" ? (
            <>
              <ReceiptRefresh />
              <Outcome
                icon={<Loader2 aria-hidden="true" className="h-12 w-12 animate-spin text-brand-600" />}
                title="جارٍ تأكيد الدفع…"
                body="نتحقق من عملية الدفع لدى ميسّر، ويستغرق ذلك عادة ثوانيَ قليلة. لا تُعد الدفع — ستتحدث هذه الصفحة تلقائيًا."
                live
              />
              <Link
                href={`${PHOTOGRAPHY_BASICS_PATH}/success?o=${encodeURIComponent(paymentId ?? "")}`}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-charcoal-300 text-sm font-semibold hover:bg-surface"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                تحديث الحالة
              </Link>
            </>
          ) : receipt.outcome === "refunded" ? (
            <Outcome
              icon={<RotateCcw aria-hidden="true" className="h-12 w-12 text-charcoal-500" />}
              title="تم استرداد هذا الدفع"
              body="هذه العملية مستردة. تواصل معنا إن كان لديك استفسار."
            />
          ) : (
            <>
              <Outcome
                icon={<XCircle aria-hidden="true" className="h-12 w-12 text-brand-600" />}
                title="لم يكتمل الدفع"
                body="لم يتم تأكيد دفع لهذه المحاولة. يمكنك المحاولة مرة أخرى."
              />
              {receipt.kind !== "balance" && (
                <Link
                  href={`${PHOTOGRAPHY_BASICS_PATH}#${PHOTOGRAPHY_BOOKING_ANCHOR}`}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-base font-semibold text-white hover:bg-brand-700"
                >
                  العودة إلى الحجز
                </Link>
              )}
            </>
          )}

          {(!receipt || receipt.outcome === "paid" || receipt.outcome === "refunded") && (
            <Link
              href={PHOTOGRAPHY_BASICS_PATH}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center text-sm font-medium text-charcoal-600 underline underline-offset-4"
            >
              العودة إلى صفحة الورشة
            </Link>
          )}
        </section>
        <TrackingSettingsButton className="mx-auto mt-6 block text-sm text-charcoal-400 underline underline-offset-4 outline-none hover:text-charcoal-200 focus-visible:ring-2 focus-visible:ring-brand-400/70" />
      </Container>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-charcoal-600">{label}</dt>
      <dd className="type-price text-base text-charcoal-950">{value}</dd>
    </div>
  );
}

function Outcome({ icon, title, body, live = false }: { icon: React.ReactNode; title: string; body: string; live?: boolean }) {
  return (
    <div className="text-center" role={live ? "status" : undefined}>
      <div className="flex justify-center">{icon}</div>
      <h1 id="receipt-title" className="mt-4 text-2xl font-bold">
        {title}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-charcoal-700">{body}</p>
    </div>
  );
}
