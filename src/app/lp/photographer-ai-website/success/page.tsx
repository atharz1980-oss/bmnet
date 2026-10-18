import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Laptop,
  MonitorPlay,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { WhatsAppIcon } from "@/components/shared/social-icons";
import { LANDING_PATH, REGISTRATION_ANCHOR } from "@/components/landing/photographer-ai-website/anchors";
import { maskEmail } from "@/lib/landing/guest-validation";
import { loadGuestReceipt } from "@/lib/payments/guest-orders";
import { loadPublicView } from "@/lib/cms/public-loader";
import { landingWhatsappHref } from "@/lib/landing/contact";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "حالة الحجز | بيت المصور" },
  robots: { index: false, follow: false },
  referrer: "strict-origin",
};

function riyals(halalas: number): string {
  return halalas % 100 === 0 ? String(halalas / 100) : (halalas / 100).toFixed(2);
}

export default async function PhotographerAiSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).o;
  const orderId = Array.isArray(raw) ? raw[0] : raw;
  const [receipt, publicView] = await Promise.all([
    orderId ? loadGuestReceipt(orderId) : null,
    loadPublicView(),
  ]);

  const whatsappHref = landingWhatsappHref(publicView?.settings);

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-charcoal-950 text-white font-sans selection:bg-amber-500 selection:text-charcoal-950">
      <Container className="py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <Link href={LANDING_PATH} className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg">
            <Logo className="h-8 w-auto text-white" />
          </Link>
          <span className="text-xs text-amber-300 font-medium">بوابة التسجيل المعتمدة</span>
        </div>
      </Container>

      <Container className="py-12 sm:py-16">
        <section
          aria-labelledby="receipt-title"
          data-guest-outcome={receipt?.outcome ?? "not-found"}
          className="mx-auto max-w-xl rounded-3xl border border-white/15 bg-charcoal-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-md"
        >
          {!receipt ? (
            <OutcomeState
              icon={<XCircle aria-hidden="true" className="h-14 w-14 text-charcoal-500" />}
              title="لم نتمكن من العثور على هذا الطلب"
              body="يرجى التأكد من صحة الرابط أو العودة لصفحة الدورة للتحقق."
            >
              <div className="mt-6">
                <Link
                  href={LANDING_PATH}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-charcoal-800 px-6 font-semibold text-white hover:bg-charcoal-700 transition-colors"
                >
                  العودة إلى صفحة الدورة
                </Link>
              </div>
            </OutcomeState>
          ) : receipt.outcome === "paid" ? (
            <div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h1 id="receipt-title" className="text-2xl sm:text-3xl font-extrabold text-white">
                  تم تأكيد حجز مقعدك بنجاح 🎉
                </h1>
                <p className="mt-2 text-sm text-charcoal-300">
                  سعداء بانضمامك إلى دورة «{receipt.courseTitle}».
                </p>
              </div>

              {/* تفاصيل الإيصال المالي الموثق */}
              <div className="mt-8 rounded-2xl border border-white/10 bg-charcoal-950/70 p-5 space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between text-charcoal-400">
                  <span>الدورة</span>
                  <span className="font-bold text-white text-end max-w-[240px] truncate">
                    {receipt.courseTitle}
                  </span>
                </div>
                <div className="flex justify-between text-charcoal-400">
                  <span>المبلغ المحصَّل</span>
                  <span className="font-bold text-amber-300 font-mono">
                    {riyals(receipt.totalAmount)} ر.س
                  </span>
                </div>
                <div className="flex justify-between text-charcoal-400">
                  <span>البريد الإلكتروني</span>
                  <span className="font-mono text-charcoal-200" dir="ltr">
                    {maskEmail(receipt.email)}
                  </span>
                </div>
                <div className="flex justify-between text-charcoal-400">
                  <span>حالة الدفع</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    مؤكد ومسجل
                  </span>
                </div>
              </div>

              {/* خطوات التحضير والتجهيز */}
              <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
                <h2 className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>خطواتك التالية قبل موعد الورشة:</span>
                </h2>
                <ul className="mt-3 space-y-2.5 text-xs sm:text-sm text-charcoal-200">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>تفقد بريدك الإلكتروني والواتساب لاستلام رابط القاعة الافتراضية وجدول المواعيد.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>جهّز جهاز لابتوب أو كمبيوتر مكتبي للتطبيق العملي السلس أثناء البث.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>حضّر مجلدًا يحوي 15–30 من أفضل لقطاتك الفوتوغرافية لاستخدامها في بناء معرض أعمالك.</span>
                  </li>
                </ul>
              </div>

              {/* التواصل مع الدعم عند الحاجة */}
              {whatsappHref && (
                <div className="mt-6 text-center">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/40"
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    <span>تواصل مع فريق الدعم عبر واتساب</span>
                  </a>
                </div>
              )}
            </div>
          ) : receipt.outcome === "pending" ? (
            <OutcomeState
              icon={<Clock aria-hidden="true" className="h-14 w-14 text-amber-400 animate-pulse" />}
              title="عملية الدفع قيد التأكيد"
              body="ننتظر رد مزود الدفع النهائي. يتم تحديث الحالة تلقائيًا خلال لحظات."
            >
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={`${LANDING_PATH}/success?o=${orderId}`}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 font-bold text-charcoal-950 hover:bg-amber-400 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>تحديث حالة الطلب</span>
                </Link>
              </div>
            </OutcomeState>
          ) : (
            <OutcomeState
              icon={<XCircle aria-hidden="true" className="h-14 w-14 text-rose-500" />}
              title="لم تكتمل عملية الدفع"
              body="تعذر تأكيد الدفع لهذه المحاولة. لم يُخصم أي مبلغ من بطاقتك ويمكنك إعادة المحاولة."
            >
              <div className="mt-6">
                <Link
                  href={`${LANDING_PATH}#${REGISTRATION_ANCHOR}`}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-amber-500 px-6 font-bold text-charcoal-950 hover:bg-amber-400 transition-colors"
                >
                  العودة لإعادة المحاولة
                </Link>
              </div>
            </OutcomeState>
          )}
        </section>
      </Container>
    </div>
  );
}

function OutcomeState({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="text-center py-4">
      <div className="mx-auto mb-4 flex justify-center">{icon}</div>
      <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
      <p className="mt-2 text-sm text-charcoal-300 leading-relaxed max-w-sm mx-auto">{body}</p>
      {children}
    </div>
  );
}
