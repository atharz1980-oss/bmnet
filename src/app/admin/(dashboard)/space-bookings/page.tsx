/**
 * /admin/space-bookings — حجوزات المساحات لإدارة الوقت.
 *
 * فلترة حسب اليوم أو نطاق التواريخ أو المساحة أو الحالة أو البحث بالاسم —
 * «كل شيء حسب الوقت» كما يُدار: اليوم ثم الوقت «من — إلى» ثم الزبون.
 * تحرسها صلاحية `spaces:view`؛ الإجراءات (إلغاء/إنهاء) خلف `spaces:edit`.
 */

import Link from "next/link";

import { BookingActions } from "@/components/admin/spaces/booking-actions";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { requirePermission } from "@/lib/admin/session";
import { riyadhDateTime } from "@/lib/admin/guest-orders-csv";
import { formatDateWithWeekday, formatPrice } from "@/lib/format";
import { formatSaudiMobile } from "@/lib/landing/guest-validation";
import { SPACE_CUSTOMER_TYPES } from "@/lib/spaces/customer-types";
import { SPACE_BOOKING_STATUS_LABELS, SPACE_PAYMENT_STATUS_LABELS } from "@/lib/spaces/labels";
import { formatTimeArabic } from "@/lib/spaces/schedule";
import { listSpaceBookings } from "@/lib/spaces/bookings";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_VALUES = ["pending", "confirmed", "completed", "cancelled", "expired"];

function first(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim();
}

function statusChipClass(status: string): string {
  if (status === "confirmed") return "rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700";
  if (status === "completed") return "rounded-full bg-charcoal-800 px-2 py-0.5 text-xs font-semibold text-white";
  if (status === "cancelled" || status === "expired") {
    return "rounded-full bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-700";
  }
  return "rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700";
}

const SELECT_CLASS =
  "h-11 w-full rounded-md border border-charcoal-300 bg-white px-3 text-base lg:text-sm text-charcoal-800 focus:border-brand-500 focus:outline-none";
const INPUT_CLASS =
  "h-11 w-full rounded-md border border-charcoal-300 bg-white px-3 text-base lg:text-sm text-charcoal-800 focus:border-brand-500 focus:outline-none";

export default async function SpaceBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const gate = await requirePermission("spaces", "view");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const params = await searchParams;
  const statusRaw = first(params.status);
  const spaceRaw = first(params.space);
  const dateRaw = first(params.date);
  const fromRaw = first(params.from);
  const toRaw = first(params.to);
  const query = first(params.q);

  const svc = getServiceSupabase();
  const [{ data: spaces }] = await Promise.all([
    svc
      .from("studio_spaces")
      .select("id, name")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);
  const spaceOptions = (spaces ?? []) as { id: string; name: string }[];

  const bookings = await listSpaceBookings({
    spaceId: UUID_RE.test(spaceRaw) ? spaceRaw : undefined,
    status: STATUS_VALUES.includes(statusRaw) ? statusRaw : undefined,
    /* يوم محدد يغني عن النطاق — وإلا النطاق «من — إلى». */
    date: dateRaw ? dateRaw : undefined,
    from: dateRaw ? undefined : fromRaw || undefined,
    to: dateRaw ? undefined : toRaw || undefined,
    search: query || undefined,
  });

  const paidTotal = bookings
    .filter((booking) => booking.payment_status === "paid")
    .reduce((sum, booking) => sum + booking.total_amount, 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <AdminPageHeader
        title="حجوزات المساحات"
        description="كل حجز بيومه ووقته «من — إلى» ونوع مزوّده: فرد، شركة، معلن، أو أي أحد. المدفوع مؤكد؛ الملغى يحرّر الوقت فورًا."
      />

      <form method="get" action="/admin/space-bookings" className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label htmlFor="filter-status" className="mb-1 block text-xs font-medium text-charcoal-700">
            الحالة
          </label>
          <select id="filter-status" name="status" defaultValue={statusRaw} className={SELECT_CLASS}>
            <option value="">كل الحالات</option>
            {STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {SPACE_BOOKING_STATUS_LABELS[value] ?? value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-space" className="mb-1 block text-xs font-medium text-charcoal-700">
            المساحة
          </label>
          <select id="filter-space" name="space" defaultValue={spaceRaw} className={SELECT_CLASS}>
            <option value="">كل المساحات</option>
            {spaceOptions.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-date" className="mb-1 block text-xs font-medium text-charcoal-700">
            يوم محدد
          </label>
          <input id="filter-date" type="date" name="date" defaultValue={dateRaw} dir="ltr" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="filter-from" className="mb-1 block text-xs font-medium text-charcoal-700">
            من تاريخ
          </label>
          <input id="filter-from" type="date" name="from" defaultValue={fromRaw} dir="ltr" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="filter-to" className="mb-1 block text-xs font-medium text-charcoal-700">
            إلى تاريخ
          </label>
          <input id="filter-to" type="date" name="to" defaultValue={toRaw} dir="ltr" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="filter-q" className="mb-1 block text-xs font-medium text-charcoal-700">
            بحث (اسم / بريد / جوال)
          </label>
          <input id="filter-q" type="search" name="q" defaultValue={query} className={INPUT_CLASS} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-6">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-charcoal-900 px-4 text-sm font-medium text-white hover:bg-charcoal-800"
          >
            تطبيق الفلاتر
          </button>
          <Link href="/admin/space-bookings" className="inline-flex h-10 items-center px-3 text-sm font-medium text-charcoal-600 hover:text-charcoal-900">
            مسح الفلاتر
          </Link>
          <p className="ms-auto text-sm text-charcoal-600" aria-live="polite">
            {bookings.length} حجز{paidTotal > 0 ? ` — إجمالي المدفوع ${formatPrice(paidTotal / 100)}` : ""}
          </p>
        </div>
      </form>

      {bookings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-charcoal-500">
          لا توجد حجوزات بهذه الفلاتر.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-surface text-charcoal-600">
              <tr>
                {["اليوم", "الوقت", "المساحة", "الزبون", "الجوال", "البريد", "الحالة", "الدفع", "المبلغ", "أُنشئ", "إجراءات"].map(
                  (head) => (
                    <th key={head} scope="col" className="px-4 py-3 text-start font-medium">
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-4 py-3 font-medium text-charcoal-900">
                    {formatDateWithWeekday(`${booking.booking_date}T00:00:00Z`)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-charcoal-800">
                    {formatTimeArabic(booking.start_time.slice(0, 5))} — {formatTimeArabic(booking.end_time.slice(0, 5))}
                    <span className="block text-xs text-charcoal-500">{booking.duration_minutes} دقيقة</span>
                  </td>
                  <td className="px-4 py-3 text-charcoal-800">{booking.space_name_snapshot || "—"}</td>
                  <td className="px-4 py-3 text-charcoal-900">
                    <span className="font-medium">{booking.customer_name}</span>
                    <span className="block text-xs text-charcoal-500">
                      {SPACE_CUSTOMER_TYPES[booking.customer_type as keyof typeof SPACE_CUSTOMER_TYPES] ?? booking.customer_type}
                      {booking.company_name ? ` — ${booking.company_name}` : ""}
                    </span>
                    {booking.admin_note ? (
                      <span className="mt-0.5 block max-w-56 truncate text-xs text-danger-700" title={booking.admin_note}>
                        {booking.admin_note}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3" dir="ltr">
                    <span className="block text-start">{formatSaudiMobile(booking.phone)}</span>
                  </td>
                  <td className="px-4 py-3" dir="ltr">
                    <span className="block text-start">{booking.email}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={statusChipClass(booking.status)}>
                      {SPACE_BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={
                        booking.payment_status === "paid"
                          ? "rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700"
                          : booking.payment_status === "failed" || booking.payment_status === "refunded"
                            ? "rounded-full bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-700"
                            : "rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700"
                      }
                    >
                      {SPACE_PAYMENT_STATUS_LABELS[booking.payment_status] ?? booking.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-charcoal-900">{formatPrice(booking.total_amount / 100)}</td>
                  <td className="px-4 py-3 tabular-nums text-charcoal-600" dir="ltr">
                    <span className="block text-start">{riyadhDateTime(booking.created_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <BookingActions bookingId={booking.id} status={booking.status} />
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
