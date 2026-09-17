import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CircleAlert, CircleCheck, CircleX, Clock3, RotateCcw } from "lucide-react";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { communityLoginHref } from "@/lib/community/auth-links";
import { getCommunityViewerId } from "@/lib/community/member";
import { getServiceSupabase } from "@/lib/supabase/service";
import { formatHalalas } from "@/lib/payments/money";
import { registrationDestination, verifyAndFinalize } from "@/lib/payments/purchase";

/**
 * حالة عملية دفع — مقروءة من حالتنا بعد سؤال المزود.
 *
 * تُنادي `verifyAndFinalize` عند كل فتح: فإن وصل الطالب قبل الإشعار فُعِّل
 * وصوله هنا، وإن وصل الإشعار أولًا وجد الحالة نهائية ولم يكرر شيئًا.
 * كلا المسارين يمر بالمعاملة نفسها.
 *
 * الملكية تُفحص أولًا: من لا يملك العملية يرى 404 لا حالتها — رقم العملية
 * وحده لا يكشف شيئًا عن أحد.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "حالة الدفع",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface View {
  tone: "success" | "pending" | "error";
  title: string;
  body: string;
}

const VIEWS: Record<string, View> = {
  paid: {
    tone: "success",
    title: "تم الدفع بنجاح",
    body: "فُتح لك محتوى الدورة كاملًا. يمكنك البدء الآن.",
  },
  pending: {
    tone: "pending",
    title: "جارٍ تأكيد الدفع",
    body: "نتحقق من عمليتك لدى بوابة الدفع. قد يستغرق هذا دقيقة — حدّث الصفحة بعد قليل.",
  },
  failed: {
    tone: "error",
    title: "فشل الدفع",
    body: "لم تكتمل العملية ولم يُخصم منك مبلغ. يمكنك المحاولة مرة أخرى.",
  },
  cancelled: {
    tone: "error",
    title: "أُلغيت عملية الدفع",
    body: "أُلغيت العملية قبل إتمامها. الدورة ما زالت متاحة متى أردت.",
  },
  expired: {
    tone: "error",
    title: "انتهت صلاحية عملية الدفع",
    body: "انتهت مهلة صفحة الدفع. ابدأ عملية جديدة من صفحة الدورة.",
  },
  refunded: {
    tone: "error",
    title: "استُرد مبلغ هذه العملية",
    body: "أُعيد المبلغ إلى وسيلة الدفع. تواصل معنا إن كان هذا غير متوقع.",
  },
  unknown: {
    tone: "pending",
    title: "جارٍ تأكيد الدفع",
    body: "لم تكتمل قراءة حالة العملية بعد. حدّث الصفحة بعد قليل، أو تواصل معنا إن استمر الأمر.",
  },
};

export default async function PaymentStatusPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  if (!UUID.test(paymentId)) notFound();

  const viewerId = await getCommunityViewerId();
  if (!viewerId) redirect(communityLoginHref(`/payment/status/${paymentId}`));

  const svc = getServiceSupabase();
  const { data } = await svc
    .from("course_payments")
    .select("id, user_id, course_id, total_amount, currency, status")
    .eq("id", paymentId)
    .maybeSingle();
  /* ليست لك = غير موجودة. لا فرق بين الحالتين من الخارج. */
  if (!data || data.user_id !== viewerId) notFound();

  const outcome = await verifyAndFinalize(paymentId);
  const view = VIEWS[outcome.outcome] ?? VIEWS.unknown;

  const { data: course } = await svc
    .from("courses")
    .select("id, slug, name")
    .eq("id", data.course_id)
    .maybeSingle();
  const courseHref = course ? `/courses/${course.slug}` : "/courses";
  /* الوجهة بحسب الدورة: درس أول لمن له محتوى، وتأكيد تسجيل لورشة حضورية. */
  const destination =
    outcome.outcome === "paid" && course
      ? await registrationDestination(course.id, course.slug)
      : null;

  const Icon =
    view.tone === "success" ? CircleCheck : view.tone === "pending" ? Clock3 : CircleX;

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-charcoal-200 bg-white p-6 text-center sm:p-8">
        <Icon
          aria-hidden="true"
          className={
            view.tone === "success"
              ? "mx-auto h-10 w-10 text-emerald-600"
              : view.tone === "pending"
                ? "mx-auto h-10 w-10 text-amber-500"
                : "mx-auto h-10 w-10 text-charcoal-300"
          }
        />
        <h1 className="mt-4 text-xl font-bold text-charcoal-900 sm:text-2xl">{view.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{view.body}</p>

        {course ? (
          <dl className="mt-5 space-y-2 rounded-xl border border-charcoal-100 bg-surface p-4 text-start text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-charcoal-500">الدورة</dt>
              <dd className="font-semibold text-charcoal-900">{course.name}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-charcoal-500">المبلغ</dt>
              <dd className="num-ltr font-semibold text-charcoal-900">
                {formatHalalas(data.total_amount)} {data.currency === "SAR" ? "ريال" : data.currency}
              </dd>
            </div>
            <p className="pt-1 text-xs leading-relaxed text-charcoal-400">
              المبلغ شامل ضريبة القيمة المضافة.
            </p>
          </dl>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {destination ? (
            <Button asChild>
              <Link href={destination.href}>
                {destination.kind === "lesson" ? "ابدأ الدورة" : "تفاصيل تسجيلك"}
              </Link>
            </Button>
          ) : null}
          {view.tone === "pending" ? (
            <Button asChild variant="outline" className="gap-1.5">
              <Link href={`/payment/status/${paymentId}`}>
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                تحديث الحالة
              </Link>
            </Button>
          ) : null}
          <Button asChild variant={destination ? "outline" : "default"}>
            <Link href={courseHref}>صفحة الدورة</Link>
          </Button>
        </div>

        {view.tone === "error" ? (
          <p className="mt-4 flex items-start justify-center gap-1.5 text-xs leading-relaxed text-charcoal-400">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            إن كان لديك سؤال عن العملية، تواصل معنا وسنراجعها.
          </p>
        ) : null}
      </div>
    </Container>
  );
}
