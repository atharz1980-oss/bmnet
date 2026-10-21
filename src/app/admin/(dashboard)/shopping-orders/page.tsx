/**
 * /admin/shopping-orders — طلبات السلة المجمّعة (دورات + مساحات).
 *
 * قراءة فقط: لا تعديل ولا استرداد هنا. تحرسها صلاحية `payments:view`
 * القائمة (المالك والمالية). لا مرجع مزود ولا رابط دفع معروض.
 */

import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { requirePermission } from "@/lib/admin/session";
import { riyadhDateTime } from "@/lib/admin/guest-orders-csv";
import {
  SHOPPING_ORDER_FILTERS,
  listShoppingOrders,
  type ShoppingOrderFilter,
} from "@/lib/admin/shopping-orders";
import { formatSaudiMobile } from "@/lib/landing/guest-validation";
import { SPACE_CUSTOMER_TYPES, isSpaceCustomerType } from "@/lib/spaces/customer-types";

export const dynamic = "force-dynamic";

const FILTER_LABELS: Record<ShoppingOrderFilter, string> = {
  paid: "المدفوعة",
  pending: "بانتظار الدفع",
  failed: "الفاشلة",
  expired: "المنتهية",
  cancelled: "الملغاة",
  refunded: "المستردة",
  all: "الكل",
};

const STATUS_LABELS: Record<string, string> = {
  created: "قيد الإنشاء",
  pending: "بانتظار الدفع",
  authorized: "بانتظار الدفع",
  paid: "مدفوع",
  failed: "فشل",
  cancelled: "ملغى",
  expired: "منتهي",
  refunded: "مسترد",
};

const FAILURE_LABELS: Record<string, string> = {
  partial_fulfillment: "تأكيد جزئي — راجع العناصر",
  paid_after_cancel: "دفع متأخر بعد إلغاء",
  paid_after_expiry: "دفع متأخر بعد انتهاء",
  paid_after_failure: "دفع متأخر بعد فشل",
  checkout_expired: "انتهت مهلة الدفع",
  cancelled_by_customer: "ألغاه العميل",
};

function parseFilter(raw: string | string[] | undefined): ShoppingOrderFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (SHOPPING_ORDER_FILTERS as readonly string[]).includes(value ?? "")
    ? (value as ShoppingOrderFilter)
    : "paid";
}

function customerTypeLabel(type: string | null): string {
  return type && isSpaceCustomerType(type) ? SPACE_CUSTOMER_TYPES[type] : "—";
}

export default async function ShoppingOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const gate = await requirePermission("payments", "view");
  if (!gate.ok) return <p className="p-8" role="alert">{gate.error}</p>;

  const filter = parseFilter((await searchParams).status);
  const orders = await listShoppingOrders(filter);
  const paidTotal = orders
    .filter((order) => order.status === "paid")
    .reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="الطلبات"
        index="03"
        title="طلبات السلة"
        description="طلبات الدفع المجمّعة (دورات ومساحات) — دفعة واحدة لعدة عناصر أو لعنصر واحد. للعرض والمتابعة."
      />

      <nav aria-label="تصفية حسب الحالة" className="flex flex-wrap gap-2">
        {SHOPPING_ORDER_FILTERS.map((status) => (
          <Link
            key={status}
            href={`/admin/shopping-orders?status=${status}`}
            aria-current={status === filter ? "page" : undefined}
            className={
              status === filter
                ? "rounded-full bg-charcoal-900 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-full border border-border px-3 py-1.5 text-sm text-charcoal-700 hover:bg-surface-muted"
            }
          >
            {FILTER_LABELS[status]}
          </Link>
        ))}
      </nav>

      <p className="text-sm text-charcoal-600">
        {orders.length} طلب
        {filter === "paid" || filter === "all" ? ` — إجمالي المدفوع ${(paidTotal / 100).toFixed(2)} ر.س` : ""}
      </p>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-charcoal-500">
          لا توجد طلبات بهذه الحالة.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-surface text-start text-charcoal-600">
              <tr>
                {[
                  "الاسم",
                  "النوع",
                  "الجوال",
                  "البريد",
                  "الحالة",
                  "العناصر",
                  "المبلغ",
                  "تاريخ الدفع",
                  "ملاحظات",
                ].map((head) => (
                  <th key={head} scope="col" className="px-4 py-3 text-start font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-medium text-charcoal-900">{order.customerName}</td>
                  <td className="px-4 py-3">{customerTypeLabel(order.customerType)}</td>
                  <td className="px-4 py-3" dir="ltr">
                    {order.phone ? formatSaudiMobile(order.phone) : "—"}
                  </td>
                  <td className="px-4 py-3" dir="ltr">
                    {order.email}
                  </td>
                  <td className="px-4 py-3">{STATUS_LABELS[order.status] ?? order.status}</td>
                  <td className="px-4 py-3 tabular-nums">{order.itemCount}</td>
                  <td className="px-4 py-3 tabular-nums">{(order.totalAmount / 100).toFixed(2)} ر.س</td>
                  <td className="px-4 py-3 tabular-nums" dir="ltr">
                    {riyadhDateTime(order.paidAt)}
                  </td>
                  <td className="px-4 py-3 text-danger-700">
                    {order.failureCode ? (FAILURE_LABELS[order.failureCode] ?? order.failureCode) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
