import { redirect } from "next/navigation";

/**
 * عودة المتصفح من صفحة الدفع.
 *
 * لا تقرأ هذه الصفحة شيئًا من معاملات الرابط إلا معرّف عمليتنا نحن. لا
 * `success=true` ولا حالة ولا مبلغ: ما يكتبه المتصفح لا يفتح وصولًا، وما
 * يضيفه أحد إلى الرابط لا يغيّر شيئًا. الحالة تُقرأ من حالتنا الموثوقة في
 * صفحة الحالة، بعد سؤال المزود.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "حالة الدفع",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.p;
  const paymentId = Array.isArray(raw) ? raw[0] : raw;
  if (!paymentId || !UUID.test(paymentId)) redirect("/courses");
  redirect(`/payment/status/${paymentId}`);
}
