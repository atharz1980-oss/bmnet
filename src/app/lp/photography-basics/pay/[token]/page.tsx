/**
 * سداد المبلغ المتبقي برابط آمن يرسله فريق الأكاديمية يدويًا.
 *
 * خارج غلاف الحملة عمدًا: لا Meta Pixel هنا فلا يصل الرمز (في المسار) إلى أي
 * جهة. الرمز لا يُخزَّن — تجزئته فقط. لا اسم كامل ولا جوال ولا بريد في الصفحة.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Lock, XCircle } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { BalancePaymentForm } from "@/components/landing/photography-basics/balance-form";
import { PHOTOGRAPHY_BASICS_PATH } from "@/data/landing/photography-basics";
import { loadBalanceSummary } from "@/lib/workshops/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "سداد المبلغ المتبقي | بيت المصور" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function riyals(halalas: number): string {
  return halalas % 100 === 0 ? String(halalas / 100) : (halalas / 100).toFixed(2);
}

export default async function BalancePaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const summary = await loadBalanceSummary(token);

  return (
    <div className="min-h-[100dvh] bg-charcoal-950 text-white">
      <Container className="py-6">
        <Logo variant="master" mode="light-on-dark" height={34} alt="بيت المصور" />
      </Container>
      <Container className="pb-16 pt-6 sm:pt-12">
        <section
          aria-labelledby="balance-title"
          data-balance-state={summary ? "due" : "invalid"}
          className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white p-6 text-charcoal-950 sm:p-8"
        >
          {!summary ? (
            <div className="text-center">
              <div className="flex justify-center">
                <XCircle aria-hidden="true" className="h-12 w-12 text-charcoal-400" />
              </div>
              <h1 id="balance-title" className="mt-4 text-2xl font-bold">
                الرابط غير صالح
              </h1>
              <p className="mt-2 text-base leading-relaxed text-charcoal-700">
                قد يكون الرابط منتهيًا أو سُدِّد المبلغ من قبل. تواصل معنا إن احتجت مساعدة.
              </p>
              <Link
                href={PHOTOGRAPHY_BASICS_PATH}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center text-sm font-medium text-charcoal-600 underline underline-offset-4"
              >
                صفحة الورشة
              </Link>
            </div>
          ) : (
            <>
              <h1 id="balance-title" className="text-2xl font-bold">
                {summary.firstName ? `أهلًا ${summary.firstName}،` : "أهلًا،"} سداد المبلغ المتبقي
              </h1>
              <p className="mt-2 text-base leading-relaxed text-charcoal-700">{summary.workshopTitle}</p>
              <dl className="mt-6 space-y-3 rounded-2xl bg-surface p-5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-charcoal-600">قيمة الورشة</dt>
                  <dd className="type-price text-base">{riyals(summary.totalAmount)} ريال</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-charcoal-600">المدفوع</dt>
                  <dd className="type-price text-base">{riyals(summary.paidAmount)} ريال</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-charcoal-200 pt-3">
                  <dt className="font-bold text-charcoal-950">المتبقي</dt>
                  <dd className="type-price text-xl text-charcoal-950">{riyals(summary.remainingAmount)} ريال</dd>
                </div>
              </dl>
              <div className="mt-6">
                <BalancePaymentForm token={token} label={`ادفع ${riyals(summary.remainingAmount)} ريال`} />
              </div>
              <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-charcoal-600">
                <Lock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal-400" />
                يتم الدفع عبر صفحة دفع آمنة ومشفّرة (ميسّر). لا نطلب أي بيانات بطاقة على هذا الموقع.
              </p>
            </>
          )}
        </section>
      </Container>
    </div>
  );
}
