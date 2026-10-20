import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleAlert, CircleCheck, CircleX, Clock3, RotateCcw } from "lucide-react";

import { CartOrderActions } from "@/components/cart/cart-order-actions";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import {
  finalizeCartOrder,
  loadCartOrderView,
  ownsShoppingOrder,
  type CartOrderOutcome,
} from "@/lib/cart/checkout";
import { getCommunityViewerId } from "@/lib/community/member";
import { formatHalalas } from "@/lib/payments/money";

/**
 * /order/[orderId] — حالة طلب السلة.
 *
 * تُنادي التحقق في كل فتح (يسأل المزود)، فلا يعتمد نجاح الزائر على وصول
 * الإشعار. الملكية تُفحص أولًا — للضيف عبر رمز سلته، وللمسجّل عبر حسابه؛
 * لا تُحوَّل صفحة الضيف إلى الدخول لأن طلبات المساحة بلا حساب صحيحة.
 *
 * مسار مستقل خارج `/payment` عن قصد: صفحات الدفع القائمة موسومة بأنها لا
 * تتغير، وطلب السلة نوع جديد له حياته الخاصة.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "حالة الطلب",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface View {
  tone: "success" | "pending" | "error";
  title: string;
  body: string;
}

const VIEWS: Record<CartOrderOutcome["outcome"], View> = {
  paid: {
    tone: "success",
    title: "تم الدفع بنجاح",
    body: "أُكِّدت عناصر طلبك. تجد تفاصيلها أدناه، ووصلتك على بريدك.",
  },
  pending: {
    tone: "pending",
    title: "جارٍ تأكيد الدفع",
    body: "نتحقق من عمليتك لدى بوابة الدفع. قد يستغرق هذا دقيقة — حدّث الصفحة بعد قليل.",
  },
  failed: {
    tone: "error",
    title: "لم يكتمل الدفع",
    body: "لم تُخصم منك قيمة الطلب. يمكنك العودة إلى السلة والمحاولة مرة أخرى.",
  },
  cancelled: {
    tone: "error",
    title: "أُلغي الطلب",
    body: "أُلغي الطلب وتُحررت مواعيده. عناصرك ما زالت في السلة متى أردت.",
  },
  expired: {
    tone: "error",
    title: "انتهت مهلة الطلب",
    body: "انتهت صلاحية صفحة الدفع وتُحررت المواعيد المؤقتة. ابدأ من جديد من سلتك.",
  },
  refunded: {
    tone: "error",
    title: "استُرد مبلغ الطلب",
    body: "أُعيد المبلغ إلى وسيلة الدفع. تواصل معنا إن كان هذا غير متوقع.",
  },
  unverified: {
    tone: "pending",
    title: "جارٍ تأكيد الدفع",
    body: "لم نتمكن من قراءة حالة العملية الآن. حدّث الصفحة بعد قليل، أو تواصل معنا إن استمر الأمر.",
  },
  unknown: {
    tone: "pending",
    title: "جارٍ تأكيد الدفع",
    body: "لم تكتمل قراءة حالة الطلب بعد. حدّث الصفحة بعد قليل.",
  },
};

const ITEM_STATUS: Record<string, string> = {
  fulfilled: "مؤكد",
  pending: "قيد التأكيد",
  failed: "تعذّر تأكيده",
  cancelled: "ملغى",
};

export default async function CartOrderStatusPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!UUID.test(orderId)) notFound();

  const userId = await getCommunityViewerId();
  if (!(await ownsShoppingOrder(orderId, userId))) notFound();

  const outcome = await finalizeCartOrder(orderId, undefined, { reportUnverified: true });
  const order = await loadCartOrderView(orderId);
  if (!order) notFound();

  const view = VIEWS[outcome.outcome] ?? VIEWS.unknown;
  const settled = order.status === "paid" || order.status === "refunded";
  const resumable =
    !settled && order.status !== "failed" && order.status !== "cancelled" && order.status !== "expired";
  const partial = order.failureCode === "partial_fulfillment";

  const Icon = view.tone === "success" ? CircleCheck : view.tone === "pending" ? Clock3 : CircleX;

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-charcoal-200 bg-white p-6 sm:p-8">
        <div className="text-center">
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
        </div>

        {partial ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            تعذّر تأكيد بعض عناصر الطلب (موعد لم يبقَ متاحًا مثلًا). تواصل معنا وسنعالج الأمر أو نعيد المبلغ.
          </p>
        ) : null}

        <ul className="mt-5 space-y-2">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-charcoal-100 bg-surface p-3"
            >
              <div className="min-w-0">
                <Link href={item.href} className="text-sm font-semibold text-charcoal-900 hover:underline">
                  {item.title}
                </Link>
                {item.subtitle ? (
                  <p className="num-ltr mt-0.5 text-xs leading-relaxed text-charcoal-500">{item.subtitle}</p>
                ) : null}
                <p className="mt-1 text-xs font-medium text-charcoal-600">
                  {ITEM_STATUS[item.status] ?? item.status}
                  {item.failureCode && item.status === "failed" ? ` — ${item.failureCode}` : ""}
                </p>
              </div>
              <span className="num-ltr shrink-0 text-sm font-semibold text-charcoal-800">
                {formatHalalas(item.grossAmount)} ر.س
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-1.5 border-t border-charcoal-100 pt-4 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-charcoal-500">الإجمالي (شامل الضريبة)</dt>
            <dd className="num-ltr font-bold text-charcoal-900">
              {formatHalalas(order.totalAmount)} {order.currency === "SAR" ? "ر.س" : order.currency}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <CartOrderActions orderId={order.id} resumable={resumable} checkoutUrl={order.checkoutUrl} />
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/cart">العودة إلى السلة</Link>
          </Button>
          <Button asChild variant="ghost" className="gap-1.5">
            <Link href={`/order/${order.id}`}>
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              تحديث الحالة
            </Link>
          </Button>
        </div>

        {view.tone === "error" ? (
          <p className="mt-4 flex items-start justify-center gap-1.5 text-xs leading-relaxed text-charcoal-400">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            إن كان لديك سؤال عن الطلب، تواصل معنا وسنراجعه.
          </p>
        ) : null}
      </div>
    </Container>
  );
}
