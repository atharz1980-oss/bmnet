/**
 * صفحة ما بعد الدفع لورشة «البيوتي بحلّتها الجديدة — فن تصوير البيوتي الاحترافي».
 *
 * لا تقرأ من الرابط إلا معرّف الدفعة `o` (يحذفه Pixel قبل أي إرسال). الحالة
 * تُحسم على الخادم: من القاعدة، أو بسؤال ميسّر مباشرة. Purchase لدفعة مؤكدة
 * فقط ومعرّف حدث ثابت لكل دفعة.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, FileCheck, Loader2, RotateCcw, Sparkles, XCircle } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { PixelPurchase } from "@/components/landing/mobile-content/pixel-events";
import { ReceiptRefresh } from "@/components/landing/mobile-content/receipt-refresh";
import { TrackingSettingsButton } from "@/components/landing/mobile-content/tracking-consent";
import {
  BEAUTY_PATH,
  BEAUTY_PIXEL_CONTENT,
  BEAUTY_PRICING,
  BEAUTY_SLUG,
} from "@/data/landing/beauty";
import { maskEmail } from "@/lib/landing/guest-validation";
import { purchaseEventId, purchaseTrackable } from "@/lib/landing/meta-pixel-server";
import { loadWorkshopReceipt } from "@/lib/workshops/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "حالة الحجز | ورشة البيوتي بحلّتها الجديدة — بيت المصور" },
  robots: { index: false, follow: false },
  referrer: "strict-origin",
};

const WORKSHOP_FACTS = [
  { icon: Clock, text: "ورشة حضورية في جدة: 24–26 ديسمبر 2026 (3 أيام × 4 ساعات = 12 ساعة)" },
  { icon: Sparkles, text: "الكاميرات والعدسات ومعدات التصوير مشمولة بالكامل للاستخدام أثناء الورشة" },
  { icon: FileCheck, text: "تطبيق عملي على مودل أجنبية + 3 ساعات استوديو مجانية + جروب متابعة" },
];

function riyals(halalas: number): string {
  return halalas % 100 === 0 ? String(halalas / 100) : (halalas / 100).toFixed(2);
}

export default async function BeautySuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).o;
  const paymentId = Array.isArray(raw) ? raw[0] : raw;
  const receipt = paymentId ? await loadWorkshopReceipt(BEAUTY_SLUG, paymentId) : null;

  const purchaseEvent =
    paymentId && receipt?.outcome === "paid" && purchaseTrackable({ paidAt: receipt.paidAt, testPriceSar: null })
      ? purchaseEventId(paymentId)
      : null;

  const bookingActive = receipt?.orderStatus === "paid" || receipt?.orderStatus === "deposit_paid";

  return (
    <div className="min-h-[100dvh] bg-[#FFFFFF] text-[#0E0E12] font-sans" dir="rtl">
      <header className="border-b border-[#E6E6EC] bg-white">
        <Container className="py-5 flex items-center justify-between">
          <Link href={BEAUTY_PATH} className="inline-block" aria-label="ورشة البيوتي">
            <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-[#0E0E12]">
              BEAUTY<span className="text-[#E65A2E]">.</span>
            </span>
          </Link>
          <Logo variant="master" mode="dark-on-light" height={28} alt="بيت المصور" />
        </Container>
      </header>

      <main>
        <Container className="pb-16 pt-8 sm:pt-14">
          <section
            aria-labelledby="receipt-title"
            data-workshop-outcome={receipt?.outcome ?? "not-found"}
            className="mx-auto max-w-lg rounded-3xl border border-[#E6E6EC] bg-white p-6 sm:p-9 shadow-sm"
          >
            {!receipt ? (
              <Outcome
                icon={<XCircle aria-hidden="true" className="h-14 w-14 text-gray-400" />}
                title="لم نجد هذه العملية"
                body="تأكد من صحة الرابط أو ارجع إلى صفحة الورشة الرئيسية."
              />
            ) : receipt.outcome === "paid" ? (
              <>
                <Outcome
                  icon={<CheckCircle2 aria-hidden="true" className="h-14 w-14 text-[#E65A2E]" />}
                  title="تم تأكيد حجز مقعدك بنجاح 🎉"
                  body={bookingActive ? "مرحبًا بك في ورشة البيوتي بحلّتها الجديدة — بيت المصور" : receipt.workshopTitle}
                />

                {purchaseEvent && (
                  <PixelPurchase
                    eventId={purchaseEvent}
                    valueSar={receipt.paymentAmount / 100}
                    content={BEAUTY_PIXEL_CONTENT}
                  />
                )}

                <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/60 p-5 text-center">
                  <h2 className="text-base font-bold text-gray-900">
                    تم استلام دفعتك وتأكيد انضمامك للورشة
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    أرسلنا تفاصيل الحجز وموقع الورشة في جدة إلى بريدك الإلكتروني:{" "}
                    <span dir="ltr" className="font-semibold text-gray-950">
                      {maskEmail(receipt.email)}
                    </span>
                  </p>
                </div>

                <dl className="mt-6 space-y-3 rounded-2xl bg-[#FAFAFC] p-5 text-sm border border-[#E6E6EC]">
                  <Row label="المبلغ المدفوع (شامل الضريبة)" value={`${riyals(receipt.paymentAmount)} ${BEAUTY_PRICING.currencyAr}`} />
                  <Row label="حالة التسجيل" value="مؤكد رسميًا ✓" highlight />
                  <div className="pt-2 border-t border-[#E6E6EC] space-y-2.5">
                    {WORKSHOP_FACTS.map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-700">
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#E65A2E]" />
                        <dd>{text}</dd>
                      </div>
                    ))}
                  </div>
                </dl>

                <p className="mt-5 text-xs sm:text-sm leading-relaxed text-gray-600 text-center">
                  سيتم التواصل معك عبر الواتساب لتزويدك برابط مجموعة المتابعة وكافة تفاصيل الحضور.
                </p>
              </>
            ) : receipt.outcome === "pending" ? (
              <>
                <ReceiptRefresh />
                <Outcome
                  icon={<Loader2 aria-hidden="true" className="h-14 w-14 animate-spin text-[#E65A2E]" />}
                  title="جارٍ تأكيد الدفع لدى ميسّر…"
                  body="نتحقق من عملية السداد مع بوابة الدفع ميسّر، ويستغرق ذلك عادة بضع ثوانٍ. لا تقم بإعادة الدفع — ستتحدّث هذه الصفحة تلقائيًا."
                  live
                />
                <Link
                  href={`${BEAUTY_PATH}/success?o=${encodeURIComponent(paymentId ?? "")}`}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#E6E6EC] text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  تحديث حالة الدفع يدويًا
                </Link>
              </>
            ) : receipt.outcome === "refunded" ? (
              <Outcome
                icon={<RotateCcw aria-hidden="true" className="h-14 w-14 text-gray-500" />}
                title="تم استرداد هذا الدفع"
                body="هذه العملية مستردة. تواصل معنا عبر الدعم إن كان لديك أي استفسار."
              />
            ) : (
              <>
                <Outcome
                  icon={<XCircle aria-hidden="true" className="h-14 w-14 text-red-600" />}
                  title="لم تكتمل عملية الدفع"
                  body="لم يتم تأكيد السداد لهذه المحاولة. يمكنك العودة وإعادة المحاولة عبر بوابة الدفع الآمنة."
                />
                <Link
                  href={`${BEAUTY_PATH}#pricing`}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#E65A2E] hover:bg-[#C84E27] text-base font-bold text-white transition-colors shadow-sm"
                >
                  العودة إلى صفحة التسجيل
                </Link>
              </>
            )}

            {(!receipt || receipt.outcome === "paid" || receipt.outcome === "refunded") && (
              <Link
                href={BEAUTY_PATH}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center text-sm font-medium text-gray-600 underline underline-offset-4 hover:text-black"
              >
                العودة إلى صفحة الورشة الرئيسية
              </Link>
            )}
          </section>

          <TrackingSettingsButton className="mx-auto mt-6 block text-xs text-gray-400 underline underline-offset-4 outline-none hover:text-gray-600" />
        </Container>
      </main>
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-gray-600">{label}</dt>
      <dd className={`text-sm sm:text-base font-bold ${highlight ? "text-[#E65A2E]" : "text-gray-950"}`}>{value}</dd>
    </div>
  );
}

function Outcome({
  icon,
  title,
  body,
  live = false,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  live?: boolean;
}) {
  return (
    <div className="text-center" role={live ? "status" : undefined}>
      <div className="flex justify-center">{icon}</div>
      <h1 id="receipt-title" className="mt-4 text-xl sm:text-2xl font-black text-gray-950">
        {title}
      </h1>
      <p className="mt-2 text-sm sm:text-base leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}
