/**
 * /admin/guest-orders — حجوزات صفحة الهبوط (Fast Guest Checkout).
 *
 * قراءة فقط: لا تعديل ولا حذف. تحرسها صلاحية `payments:view` القائمة
 * (المالك والمالية) — لا صلاحية جديدة. لا مرجع مزود ولا رابط دفع معروض.
 */

import Link from "next/link";
import { Download } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { requirePermission } from "@/lib/admin/session";
import { GUEST_STATUS_LABELS, guestOrderFlags, riyadhDateTime } from "@/lib/admin/guest-orders-csv";
import { formatSaudiMobile } from "@/lib/landing/guest-validation";
import { GUEST_ORDER_STATUSES, listGuestOrders, type GuestOrderFilter } from "@/lib/payments/guest-orders";

export const dynamic = "force-dynamic";

const FILTER_LABELS: Record<GuestOrderFilter, string> = {
  paid: "المدفوعة",
  pending: "بانتظار الدفع",
  failed: "الفاشلة",
  expired: "المنتهية",
  cancelled: "الملغاة",
  refunded: "المستردة",
  all: "الكل",
};

function parseFilter(raw: string | string[] | undefined): GuestOrderFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (GUEST_ORDER_STATUSES as readonly string[]).includes(value ?? "") ? (value as GuestOrderFilter) : "paid";
}

export default async function GuestOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const gate = await requirePermission("payments", "view");
  if (!gate.ok) return <p className="p-8" role="alert">{gate.error}</p>;

  const filter = parseFilter((await searchParams).status);
  const orders = await listGuestOrders(filter);
  const paidTotal = orders.filter((order) => order.status === "paid").reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="حجوزات صفحة الهبوط"
        description="طلبات الدفع بلا حساب من /lp/mobile-content. المدفوع حجز مؤكد — أرسل تفاصيل Zoom للمسجلين."
      >
        <a
          href={`/admin/guest-orders/export?status=${filter}`}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-surface-muted"
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          تصدير CSV
        </a>
      </AdminPageHeader>

      <nav aria-label="تصفية حسب الحالة" className="flex flex-wrap gap-2">
        {GUEST_ORDER_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/admin/guest-orders?status=${status}`}
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
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-surface text-start text-charcoal-600">
              <tr>
                {["الاسم", "الجوال", "البريد", "الحالة", "المبلغ", "تاريخ الدفع", "المصدر", "الحملة", "ملاحظات"].map(
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
                <tr key={order.id}>
                  <td className="px-4 py-3 font-medium text-charcoal-900">{order.customerName}</td>
                  <td className="px-4 py-3" dir="ltr">
                    {formatSaudiMobile(order.phone)}
                  </td>
                  <td className="px-4 py-3" dir="ltr">
                    {order.email}
                  </td>
                  <td className="px-4 py-3">{GUEST_STATUS_LABELS[order.status] ?? order.status}</td>
                  <td className="px-4 py-3 tabular-nums">{(order.totalAmount / 100).toFixed(2)} ر.س</td>
                  <td className="px-4 py-3 tabular-nums" dir="ltr">
                    {riyadhDateTime(order.paidAt)}
                  </td>
                  <td className="px-4 py-3">{order.utmSource ?? "—"}</td>
                  <td className="px-4 py-3">{order.utmCampaign ?? "—"}</td>
                  <td className="px-4 py-3 text-brand-700">{guestOrderFlags(order)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
