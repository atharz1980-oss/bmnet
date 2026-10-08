/**
 * صفحة ما بعد الدفع لطلب الضيف — تحت /lp فهي بلا واجهة الموقع.
 *
 * لا تقرأ من الرابط إلا معرّف الطلب `o`. لا `status=paid` ولا مبلغ: الحالة
 * تُحسم على الخادم من القاعدة، وإن لم تُحسم بعد يُسأل ميسّر مباشرة.
 * «تم حجز مقعدك بنجاح» ورابط جروب واتساب الورشة لا يظهران إلا لطلب مدفوع
 * مؤكَّد — ولا تحويل تلقائي إلى واتساب. لا اسم ولا جوال ولا بريد كامل.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, Loader2, MonitorPlay, RotateCcw, XCircle } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { LANDING_PATH, GUEST_FORM_ANCHOR } from "@/components/landing/mobile-content/anchors";
import { PixelPurchase } from "@/components/landing/mobile-content/pixel-events";
import { ReceiptRefresh } from "@/components/landing/mobile-content/receipt-refresh";
import { WhatsAppIcon } from "@/components/shared/social-icons";
import { maskEmail } from "@/lib/landing/guest-validation";
import { purchaseEventId, purchaseTrackable } from "@/lib/landing/meta-pixel-server";
import { WORKSHOP_WHATSAPP_GROUP_URL } from "@/lib/landing/workshop-group";
import { loadGuestReceipt } from "@/lib/payments/guest-orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "حالة الحجز | بيت المصور" },
  robots: { index: false, follow: false },
  /* رقم الطلب في الرابط لا يخرج مُحيلًا إلى أي صفحة أو جهة تالية. */
  referrer: "strict-origin",
};

const WORKSHOP_FACTS = [
  { icon: CalendarDays, text: "27 – 29 أكتوبر 2026" },
  { icon: Clock, text: "8:00 مساءً بتوقيت الرياض" },
  { icon: MonitorPlay, text: "أونلاين عبر Zoom" },
];

function riyals(halalas: number): string {
  return halalas % 100 === 0 ? String(halalas / 100) : (halalas / 100).toFixed(2);
}

export default async function GuestSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).o;
  const orderId = Array.isArray(raw) ? raw[0] : raw;
  const receipt = orderId ? await loadGuestReceipt(orderId) : null;
  /* Purchase لطلب مدفوع مؤكد، حديث، في بيئة الإنتاج فقط — القرار هنا على الخادم. */
  const purchaseEvent =
    orderId && receipt?.outcome === "paid" && purchaseTrackable({ paidAt: receipt.paidAt })
      ? purchaseEventId(orderId)
      : null;

  return (
    <div className="min-h-[100dvh] bg-charcoal-950 text-white">
      <Container className="py-6">
        <Logo variant="master" mode="light-on-dark" height={34} alt="بيت المصور" />
      </Container>
      <Container className="pb-16 pt-6 sm:pt-12">
        <section
          aria-labelledby="receipt-title"
          data-guest-outcome={receipt?.outcome ?? "not-found"}
          className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white p-6 text-charcoal-950 sm:p-8"
        >
          {!receipt ? (
            <Outcome
              icon={<XCircle aria-hidden="true" className="h-12 w-12 text-charcoal-400" />}
              title="لم نجد هذا الطلب"
              body="تأكد من الرابط، أو ارجع إلى صفحة الورشة."
            />
          ) : receipt.outcome === "paid" ? (
            <>
              <Outcome
                icon={<CheckCircle2 aria-hidden="true" className="h-12 w-12 text-emerald-600" />}
                title="تم حجز مقعدك بنجاح 🎉"
                body={receipt.courseTitle}
              />
              {purchaseEvent && <PixelPurchase eventId={purchaseEvent} valueSar={receipt.totalAmount / 100} />}
              {/* لمن دفع فقط: هذا الفرع لا يُصيَّر إلا لطلب حسمه الخادم «مدفوعًا».
                  لا تحويل تلقائي — الانضمام بضغطة المتدرب نفسه. */}
              <div data-workshop-group className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <h2 className="text-base font-bold text-charcoal-950">الخطوة الأخيرة:</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-charcoal-800">
                  انضم إلى جروب الورشة على واتساب لتصلك روابط Zoom والتنبيهات وكل تفاصيل الورشة.
                </p>
                <a
                  data-lp-keep-clear
                  href={WORKSHOP_WHATSAPP_GROUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1DA851] px-5 text-base font-semibold text-white outline-none transition-colors hover:bg-[#178a43] focus-visible:ring-[3px] focus-visible:ring-emerald-600/40 focus-visible:ring-offset-2"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  انضم الآن إلى جروب الورشة
                  <span className="sr-only">(يفتح واتساب في نافذة جديدة)</span>
                </a>
              </div>
              <dl className="mt-6 space-y-3 rounded-2xl bg-surface p-5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-charcoal-600">المبلغ المدفوع</dt>
                  <dd className="type-price text-lg text-charcoal-950">{riyals(receipt.totalAmount)} ريال</dd>
                </div>
                {WORKSHOP_FACTS.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-charcoal-800">
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />
                    <dd>{text}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-sm leading-relaxed text-charcoal-700">
                وعند الحاجة سنتواصل معك على جوالك وبريدك{" "}
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
                href={`${LANDING_PATH}/success?o=${encodeURIComponent(orderId ?? "")}`}
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
              body="هذا الطلب مسترد. تواصل معنا إن كان لديك استفسار."
            />
          ) : (
            <>
              <Outcome
                icon={<XCircle aria-hidden="true" className="h-12 w-12 text-brand-600" />}
                title="لم يكتمل الدفع"
                body="لم يتم تأكيد دفع لهذه المحاولة. يمكنك المحاولة مرة أخرى من صفحة الورشة."
              />
              <Link
                href={`${LANDING_PATH}#${GUEST_FORM_ANCHOR}`}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-base font-semibold text-white hover:bg-brand-700"
              >
                العودة إلى الحجز
              </Link>
            </>
          )}

          {(!receipt || receipt.outcome === "paid" || receipt.outcome === "refunded") && (
            <Link
              href={LANDING_PATH}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center text-sm font-medium text-charcoal-600 underline underline-offset-4"
            >
              العودة إلى صفحة الورشة
            </Link>
          )}
        </section>
      </Container>
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
      <h1 id="receipt-title" className="mt-4 text-2xl font-bold">
        {title}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-charcoal-700">{body}</p>
    </div>
  );
}
