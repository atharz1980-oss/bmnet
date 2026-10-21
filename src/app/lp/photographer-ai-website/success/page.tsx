import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  Laptop,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { LANDING_PATH, REGISTRATION_ANCHOR } from "@/components/landing/photographer-ai-website/anchors";
import { WhatsAppSuccessActions } from "@/components/landing/photographer-ai-website/whatsapp-success-actions";
import { maskEmail } from "@/lib/landing/guest-validation";
import { loadGuestReceipt } from "@/lib/payments/guest-orders";
import { verifyGuestAccessToken } from "@/lib/payments/guest-token";
import { getCourseWhatsAppGroup } from "@/lib/courses/whatsapp-group";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "تأكيد الاشتراك في الدورة | بيت المصور" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function riyals(halalas: number): string {
  return halalas % 100 === 0 ? String(halalas / 100) : (halalas / 100).toFixed(2);
}

const COURSE_FACTS = [
  { icon: CalendarDays, title: "تاريخ البداية", value: "15 نوفمبر 2026" },
  { icon: Clock, title: "المدة التدريبية", value: "3 أيام، 9 ساعات" },
  { icon: Laptop, title: "طريقة التدريب", value: "أونلاين مباشر مع تسجيلات" },
  { icon: GraduationCap, title: "الشهادة", value: "شهادة حضور من بيت المصور" },
];

export default async function PhotographerAiSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawO = params.o;
  const rawT = params.t;
  const orderId = Array.isArray(rawO) ? rawO[0] : rawO;
  const token = Array.isArray(rawT) ? rawT[0] : rawT;

  const receipt = orderId ? await loadGuestReceipt(orderId) : null;

  // التحقق الأمني: لا يظهر الرابط إلا لطلب مؤكد الدفع ومقترن بتوكن وصول موقّع وسليم ومقعده مؤكد
  const isPaid = receipt?.outcome === "paid";
  const isSeatUnavailable = receipt?.failureCode === "seat_unavailable";
  const isConfirmed = Boolean(isPaid && !isSeatUnavailable);
  const isAuthorized = Boolean(
    isConfirmed &&
      orderId &&
      receipt &&
      receipt.email &&
      token &&
      verifyGuestAccessToken(orderId, receipt.email, token)
  );

  let whatsappGroupUrl: string | null = null;
  if (isAuthorized && receipt) {
    whatsappGroupUrl = await getCourseWhatsAppGroup(receipt.courseId || "photographer-ai-website");
  }

  const courseDisplayName =
    receipt?.courseTitle?.trim() || "صمّم موقعك الاحترافي باستخدام الذكاء الاصطناعي";
  const customerName = receipt?.customerName?.trim();

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-charcoal-950 text-white font-sans selection:bg-amber-500 selection:text-charcoal-950"
    >
      {/* رأس الصفحة */}
      <header className="border-b border-white/10 py-5">
        <Container>
          <div className="flex items-center justify-between">
            <Link
              href={LANDING_PATH}
              className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg"
            >
              <Logo className="h-8 w-auto text-white" />
            </Link>
            <span className="text-xs font-semibold text-amber-300">بوابة التسجيل المعتمدة</span>
          </div>
        </Container>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="py-12 sm:py-16">
        <Container>
          <section
            aria-labelledby="receipt-title"
            data-guest-outcome={receipt?.outcome ?? "not-found"}
            className="mx-auto max-w-xl rounded-3xl border border-white/15 bg-charcoal-900/95 p-6 sm:p-10 shadow-2xl backdrop-blur-md"
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
            ) : isPaid ? (
              <div>
                {isSeatUnavailable ? (
                  <div>
                    {/* رأس حالة اكتمال المقاعد رغم الدفع */}
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                        <AlertCircle className="h-10 w-10" />
                      </div>
                      <h1 id="receipt-title" className="text-2xl sm:text-3xl font-extrabold text-white">
                        تم استلام دفعتك بنجاح — المقاعد مكتملة
                      </h1>
                      <p className="mt-2 text-sm text-charcoal-300">
                        عزيزي {customerName || "المشترك"}، نحيطك علماً بأن مقاعد هذه الورشة اكتملت قبل اكتمال سداد العملية.
                      </p>
                    </div>

                    <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
                      <p className="text-sm font-semibold text-amber-200">
                        مبلغك محفوظ ومسجل برقم الطلب: <span className="font-mono text-white">{receipt.orderId}</span>
                      </p>
                      <p className="mt-2 text-xs text-charcoal-300 leading-relaxed">
                        سيتواصل معك فريق خدمة العملاء مباشرة عبر الواتساب لتأكيد إمكانية توفير مقعد استثنائي أو استرداد المبلغ لحسابك البنكي فوراً.
                      </p>
                      <div className="mt-4">
                        <a
                          href={`https://wa.me/966551234567?text=${encodeURIComponent(
                            `السلام عليكم، قمت بسداد رسوم دورة الذكاء الاصطناعي ورقم طلبي: ${receipt.orderId}، وتظهر لي رسالة أن المقاعد مكتملة. أرجو المساعدة.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-charcoal-950 hover:bg-amber-400 transition-colors"
                        >
                          تواصل مع الإدارة لمعالجة الطلب
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* رأس حالة النجاح */}
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="h-10 w-10" />
                      </div>
                      <h1 id="receipt-title" className="text-2xl sm:text-3xl font-extrabold text-white">
                        {customerName
                          ? `مبروك يا ${customerName}! تم تأكيد اشتراكك بنجاح 🎉`
                          : "مبروك! تم تأكيد اشتراكك بنجاح 🎉"}
                      </h1>
                      <p className="mt-2 text-sm text-charcoal-300">
                        أهلاً بك في دورة «{courseDisplayName}».
                      </p>
                    </div>

                    {/* بطاقة الوصول إلى مجموعة واتساب الدورة */}
                    {isAuthorized && whatsappGroupUrl ? (
                      <WhatsAppSuccessActions whatsappUrl={whatsappGroupUrl} />
                    ) : (
                      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                        <p className="text-sm font-semibold text-charcoal-200">
                          رابط مجموعة الواتساب متاح عبر الرابط المباشر الذي تم تحويلك إليه فور إتمام الدفع.
                        </p>
                        <p className="mt-2 text-xs text-charcoal-400 leading-relaxed">
                          لحماية خصوصية المشتركين، لا يظهر الرابط إلا عبر رمز الوصول الموقّع المرفق بالطلب. إذا أغلقت الصفحة بالخطأ أو واجهت صعوبة في الانضمام، تواصل معنا مباشرة لمساعدتك.
                        </p>
                        <div className="mt-4">
                          <a
                            href={`https://wa.me/966551234567?text=${encodeURIComponent(
                              `السلام عليكم، أنا مشترك في دورة الذكاء الاصطناعي ورقم طلبي: ${receipt.orderId}، وأحتاج رابط مجموعة الواتساب.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-white/10 transition-colors"
                          >
                            تواصل مع الدعم عبر الواتساب
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* بيانات الدورة المعتمدة */}
                <div className="mt-8 rounded-2xl border border-white/10 bg-charcoal-950/70 p-5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-4">
                    بيانات الورشة المعتمدة
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    {COURSE_FACTS.map((fact, index) => {
                      const Icon = fact.icon;
                      return (
                        <div
                          key={index}
                          className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-3"
                        >
                          <Icon className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                          <div>
                            <span className="block text-[11px] text-charcoal-400">{fact.title}</span>
                            <span className="font-bold text-white text-xs sm:text-sm">{fact.value}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* تفاصيل الإيصال المالي الموثق */}
                <div className="mt-4 rounded-2xl border border-white/10 bg-charcoal-950/50 p-5 space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between text-charcoal-400">
                    <span>اسم الدورة</span>
                    <span className="font-bold text-white text-end max-w-[240px] truncate">
                      {courseDisplayName}
                    </span>
                  </div>
                  <div className="flex justify-between text-charcoal-400">
                    <span>المبلغ المسدد</span>
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
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      مدفوع ومؤكد بنجاح
                    </span>
                  </div>
                </div>

                {/* إرشادات الحضور والتحضير */}
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>تجهيزات موصى بها قبل بدء الدورة:</span>
                  </h3>
                  <ul className="mt-3 space-y-2 text-xs sm:text-sm text-charcoal-300">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>انضم الآن لجروب الواتساب لضمان عدم تفويت أي إشعار أو ملفات عمل.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>جهّز جهاز كمبيوتر أو لابتوب واتصال إنترنت مستقر للتطبيق العملي أثناء الجلسات.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>اختر 10 إلى 20 صورة من تصويرك لتطبيق بناء الموقع ومعرض الأعمال عليها مباشرة.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 text-center">
                  <Link
                    href={LANDING_PATH}
                    className="text-xs text-charcoal-400 hover:text-white transition-colors underline"
                  >
                    العودة لصفحة الدورة
                  </Link>
                </div>
              </div>
            ) : receipt.outcome === "pending" ? (
              <OutcomeState
                icon={<Clock aria-hidden="true" className="h-14 w-14 text-amber-400 animate-pulse" />}
                title="عملية الدفع قيد التأكيد"
                body="ننتظر استلام تأكيد المعاملة من مزود الدفع. يتم تحديث حالة الطلب تلقائيًا بمجرد اكتمال العملية."
              >
                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    href={`${LANDING_PATH}/success?o=${orderId}${token ? `&t=${token}` : ""}`}
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
                body="تعذر تأكيد الدفع لهذه المحاولة أو انتهت مهلتها. لم يُخصم أي مبلغ من بطاقتك ويمكنك إعادة المحاولة في أي وقت."
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
      </main>
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
