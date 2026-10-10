/**
 * /admin/workshop-orders — حجوزات الورش الحضورية (دفع كامل أو عربون) والرصيد
 * التدريبي.
 *
 * العرض بصلاحية `payments:view`، والإجراءات بصلاحية `payments:manage` (يتحقق
 * منها الخادم في كل إجراء). لا مرجع مزود ولا رابط دفع معروض، ولا رمز سداد:
 * الرابط يُنشأ عند الطلب ويُعرض مرة واحدة.
 */

import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { RedeemCreditForm, WorkshopOrderActions } from "@/components/admin/workshops/workshop-order-actions";
import { riyadhDateTime } from "@/lib/admin/guest-orders-csv";
import { requirePermission } from "@/lib/admin/session";
import { formatSaudiMobile } from "@/lib/landing/guest-validation";
import { listTrainingCredits } from "@/lib/workshops/credits";
import { listWorkshopOrders, type WorkshopOrderStatus } from "@/lib/workshops/orders";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<WorkshopOrderStatus, string> = {
  pending: "بانتظار الدفع",
  deposit_paid: "عربون مدفوع",
  paid: "مدفوع بالكامل",
  cancelled_by_customer: "ألغاه المشترك (رصيد)",
  cancelled_by_academy: "ألغته الأكاديمية",
  expired: "منتهٍ",
};

const REFUND_LABELS = { none: "", due: "استرداد مستحق", refunded: "تم الاسترداد" } as const;

function sar(halalas: number): string {
  return `${(halalas / 100).toFixed(2)} ر.س`;
}

export default async function WorkshopOrdersPage() {
  const gate = await requirePermission("payments", "view");
  if (!gate.ok) return <p className="p-8" role="alert">{gate.error}</p>;

  const [orders, credits] = await Promise.all([listWorkshopOrders(), listTrainingCredits()]);
  const confirmed = orders.filter((order) => order.status === "paid" || order.status === "deposit_paid");
  const collected = confirmed.reduce((sum, order) => sum + order.paidAmount, 0);
  const due = confirmed.reduce((sum, order) => sum + order.remainingAmount, 0);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="حجوزات الورش الحضورية"
        description="ورشة أساسيات التصوير (/lp/photography-basics): دفع كامل أو عربون. رابط سداد المتبقي يُرسل يدويًا. لا استرداد تلقائي."
      />

      <p className="text-sm text-charcoal-600">
        {confirmed.length} حجز مؤكد — المحصَّل {sar(collected)} — المتبقي على أصحاب العربون {sar(due)}
      </p>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-charcoal-500">
          لا توجد حجوزات بعد.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[1280px] text-sm">
            <thead className="bg-surface text-start text-charcoal-600">
              <tr>
                {["الاسم", "الجوال", "البريد", "الحالة", "الخطة", "الإجمالي", "المدفوع", "المتبقي", "التاريخ", "ملاحظات", "إجراءات"].map(
                  (head) => (
                    <th key={head} scope="col" className="px-4 py-3 text-start font-medium">
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="align-top">
                  <td className="min-w-[8rem] px-4 py-3 font-medium text-charcoal-900">{order.customerName}</td>
                  <td className="whitespace-nowrap px-4 py-3" dir="ltr">
                    {formatSaudiMobile(order.phone)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3" dir="ltr">
                    {order.email}
                  </td>
                  <td className="min-w-[7rem] px-4 py-3">{STATUS_LABELS[order.status] ?? order.status}</td>
                  <td className="px-4 py-3">{order.paymentPlan === "deposit" ? "عربون" : "كامل"}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{sar(order.totalAmount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{sar(order.paidAmount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{sar(order.remainingAmount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums" dir="ltr">
                    {riyadhDateTime(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-brand-700">
                    {[
                      REFUND_LABELS[order.refundStatus] &&
                        `${REFUND_LABELS[order.refundStatus]} (${sar(order.refundDueAmount)})`,
                      order.overpaid && "مدفوع أكثر من الإجمالي — راجع",
                      order.hasBalanceLink && "رابط سداد صادر",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <WorkshopOrderActions
                      orderId={order.id}
                      status={order.status}
                      refundStatus={order.refundStatus}
                      paidSar={order.paidAmount / 100}
                      canBalanceLink={order.status === "deposit_paid" && order.remainingAmount > 0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section aria-labelledby="credits-title" className="space-y-3">
        <h2 id="credits-title" className="text-lg font-bold text-charcoal-950">
          الرصيد التدريبي
        </h2>
        <p className="text-sm text-charcoal-600">
          يُصدر تلقائيًا عند إلغاء المشترك، صالح سنة ميلادية، ويُستخدم في الدورات القادمة مع سداد الفرق. لا يُعدَّل يدويًا.
        </p>
        {credits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-charcoal-500">لا يوجد رصيد.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-surface text-charcoal-600">
                <tr>
                  {["صاحب الرصيد", "الجوال", "الأصل", "المتبقي", "الحالة", "ينتهي", "استخدام"].map((head) => (
                    <th key={head} scope="col" className="px-4 py-3 text-start font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {credits.map((credit) => (
                  <tr key={credit.id} className="align-top">
                    <td className="px-4 py-3">
                      <span className="font-medium text-charcoal-900">{credit.holderName}</span>
                      <span className="block text-xs text-charcoal-500" dir="ltr">
                        {credit.holderEmail}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" dir="ltr">
                      {formatSaudiMobile(credit.holderPhone)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{sar(credit.originalAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{sar(credit.balance)}</td>
                    <td className="px-4 py-3">
                      {credit.expired ? "منتهي الصلاحية" : credit.status === "active" ? "نشط" : credit.status === "used" ? "مستخدم" : "ملغى"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums" dir="ltr">
                      {riyadhDateTime(credit.expiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      {credit.status === "active" && !credit.expired ? <RedeemCreditForm creditId={credit.id} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
