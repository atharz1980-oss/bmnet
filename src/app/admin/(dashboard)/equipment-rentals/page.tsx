/**
 * /admin/equipment-rentals — إيجارات المعدات لإدارة الفترة والدفع والعهدة.
 *
 * العرض بـ`equipment:view` والإجراءات بـ`equipment:manage`. القائمة تحرّر
 * أولًا الإيجارات المنتهية المهلة (كنس لطيف)، ثم تربط المعدة بالفترة
 * والحالة والدفع والهوية وسند الضمان، مع فلترة حسب المعدة والحالة والنطاق
 * والبحث بالاسم أو البريد أو الجوال.
 */

import Link from "next/link";

import { RentalRowActions } from "@/components/admin/equipment/rental-row-actions";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { requirePermission } from "@/lib/admin/session";
import { riyadhDateTime } from "@/lib/admin/guest-orders-csv";
import { formatDate, formatPrice } from "@/lib/format";
import { formatSaudiMobile } from "@/lib/landing/guest-validation";
import { listEquipmentRentals } from "@/lib/rentals/bookings";
import {
  RENTAL_HANDOVER_LABELS,
  RENTAL_IDENTITY_STATUS_LABELS,
  RENTAL_PAYMENT_STATUS_LABELS,
  RENTAL_STATUS_LABELS,
  SECURITY_NOTE_STATUS_LABELS,
} from "@/lib/rentals/labels";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_VALUES = ["pending", "confirmed", "out_on_rent", "returned", "closed", "cancelled", "expired"];

function first(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim();
}

function statusChipClass(status: string): string {
  if (status === "confirmed") return "rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700";
  if (status === "out_on_rent") return "rounded-full bg-charcoal-800 px-2 py-0.5 text-xs font-semibold text-white";
  if (status === "returned" || status === "closed") {
    return "rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700";
  }
  if (status === "cancelled" || status === "expired") {
    return "rounded-full bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-700";
  }
  return "rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700";
}

const SELECT_CLASS =
  "h-11 w-full rounded-md border border-charcoal-300 bg-white px-3 text-base lg:text-sm text-charcoal-800 focus:border-brand-500 focus:outline-none";
const INPUT_CLASS =
  "h-11 w-full rounded-md border border-charcoal-300 bg-white px-3 text-base lg:text-sm text-charcoal-800 focus:border-brand-500 focus:outline-none";

export default async function EquipmentRentalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const gate = await requirePermission("equipment", "view");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const params = await searchParams;
  const statusRaw = first(params.status);
  const itemRaw = first(params.item);
  const fromRaw = first(params.from);
  const toRaw = first(params.to);
  const query = first(params.q);

  const svc = getServiceSupabase();
  const [{ data: items }] = await Promise.all([
    svc.from("equipment_items").select("id, name").order("name", { ascending: true }),
  ]);
  const itemOptions = (items ?? []) as { id: string; name: string }[];

  const rentals = await listEquipmentRentals({
    itemId: UUID_RE.test(itemRaw) ? itemRaw : undefined,
    status: STATUS_VALUES.includes(statusRaw) ? statusRaw : undefined,
    from: fromRaw || undefined,
    to: toRaw || undefined,
    search: query || undefined,
  });

  /* حالة سند الضمان لكل إيجار — استعلام واحد ثم خريطة. */
  const rentalIds = rentals.map((row) => row.id);
  const noteStatus = new Map<string, string>();
  if (rentalIds.length > 0) {
    const { data: notes } = await svc
      .from("equipment_security_notes")
      .select("rental_id, status")
      .in("rental_id", rentalIds);
    for (const row of (notes ?? []) as { rental_id: string; status: string }[]) {
      noteStatus.set(row.rental_id, row.status);
    }
  }

  const paidTotal = rentals
    .filter((row) => row.payment_status === "paid")
    .reduce((sum, row) => sum + row.total_amount, 0);

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <AdminPageHeader
        eyebrow="الطلبات"
        index="03"
        title="إيجارات المعدات"
        description="كل إيجار بفترته ومعدته ومستأجره: الدفع، التحقق من الهوية، سند الضمان، ثم محاضر التسليم والاسترجاع. لا تسليم قبل استيفاء البوابات."
      />

      <form method="get" action="/admin/equipment-rentals" className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="filter-status" className="mb-1 block text-xs font-medium text-charcoal-700">
            الحالة
          </label>
          <select id="filter-status" name="status" defaultValue={statusRaw} className={SELECT_CLASS}>
            <option value="">كل الحالات</option>
            {STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {RENTAL_STATUS_LABELS[value] ?? value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-item" className="mb-1 block text-xs font-medium text-charcoal-700">
            المعدة
          </label>
          <select id="filter-item" name="item" defaultValue={itemRaw} className={SELECT_CLASS}>
            <option value="">كل المعدات</option>
            {itemOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-from" className="mb-1 block text-xs font-medium text-charcoal-700">
            تنتهي في أو بعد
          </label>
          <input id="filter-from" type="date" name="from" defaultValue={fromRaw} dir="ltr" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="filter-to" className="mb-1 block text-xs font-medium text-charcoal-700">
            تبدأ في أو قبل
          </label>
          <input id="filter-to" type="date" name="to" defaultValue={toRaw} dir="ltr" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="filter-q" className="mb-1 block text-xs font-medium text-charcoal-700">
            بحث (اسم / بريد / جوال)
          </label>
          <input id="filter-q" type="search" name="q" defaultValue={query} className={INPUT_CLASS} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-5">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-charcoal-900 px-4 text-sm font-medium text-white hover:bg-charcoal-800"
          >
            تطبيق الفلاتر
          </button>
          <Link href="/admin/equipment-rentals" className="inline-flex h-10 items-center px-3 text-sm font-medium text-charcoal-600 hover:text-charcoal-900">
            مسح الفلاتر
          </Link>
          <p className="ms-auto text-sm text-charcoal-600" aria-live="polite">
            {rentals.length} إيجار{paidTotal > 0 ? ` — إجمالي المدفوع ${formatPrice(paidTotal / 100)}` : ""}
          </p>
        </div>
      </form>

      {rentals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-charcoal-500">
          لا توجد إيجارات بهذه الفلاتر.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[1400px] text-sm">
            <thead className="bg-surface text-charcoal-600">
              <tr>
                {[
                  "الفترة",
                  "المعدة",
                  "المستأجر",
                  "الجوال",
                  "البريد",
                  "الطريقة",
                  "الحالة",
                  "الدفع",
                  "الهوية",
                  "سند الضمان",
                  "المبلغ",
                  "أُنشئ",
                  "إجراءات",
                ].map((head) => (
                  <th key={head} scope="col" className="px-4 py-3 text-start font-medium">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rentals.map((rental) => {
                const note = noteStatus.get(rental.id);
                return (
                  <tr key={rental.id}>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-charcoal-900">
                      {formatDate(rental.start_date)}
                      <span className="block text-xs font-normal text-charcoal-500">
                        إلى {formatDate(rental.end_date)} — {rental.rental_days} يوم
                      </span>
                    </td>
                    <td className="px-4 py-3 text-charcoal-800">
                      {rental.item_name_snapshot || "—"}
                      <span className="block text-xs text-charcoal-500">الكمية {rental.quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-charcoal-900">
                      <Link href={`/admin/equipment-rentals/${rental.id}`} className="font-medium text-brand-700 hover:underline">
                        {rental.customer_name}
                      </Link>
                      {rental.company_name ? (
                        <span className="block text-xs text-charcoal-500">{rental.company_name}</span>
                      ) : null}
                      {rental.admin_note ? (
                        <span className="mt-0.5 block max-w-56 truncate text-xs text-danger-700" title={rental.admin_note}>
                          {rental.admin_note}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      <span className="block text-start">{formatSaudiMobile(rental.phone)}</span>
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      <span className="block text-start">{rental.email}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-charcoal-700">
                      {RENTAL_HANDOVER_LABELS[rental.method] ?? rental.method}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={statusChipClass(rental.status)}>
                        {RENTAL_STATUS_LABELS[rental.status] ?? rental.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          rental.payment_status === "paid"
                            ? "rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700"
                            : rental.payment_status === "failed" || rental.payment_status === "refunded"
                              ? "rounded-full bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-700"
                              : "rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700"
                        }
                      >
                        {RENTAL_PAYMENT_STATUS_LABELS[rental.payment_status] ?? rental.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          rental.identity_status === "verified"
                            ? "rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700"
                            : rental.identity_status === "failed"
                              ? "rounded-full bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-700"
                              : "rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-charcoal-700"
                        }
                      >
                        {RENTAL_IDENTITY_STATUS_LABELS[rental.identity_status] ?? rental.identity_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-charcoal-700">
                      {note ? SECURITY_NOTE_STATUS_LABELS[note] ?? note : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-charcoal-900">{formatPrice(rental.total_amount / 100)}</td>
                    <td className="px-4 py-3 tabular-nums text-charcoal-600" dir="ltr">
                      <span className="block text-start">{riyadhDateTime(rental.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <RentalRowActions
                        rentalId={rental.id}
                        status={rental.status}
                        notified={rental.customer_notified_at !== null}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
