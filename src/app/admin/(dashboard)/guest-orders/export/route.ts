/**
 * تصدير حجوزات صفحة الهبوط CSV — نفس حارس الصفحة (`payments:view`)،
 * ولا شيء غيره: لا صلاحية جديدة ولا توسيع لأي دور.
 */

import { requirePermission } from "@/lib/admin/session";
import { guestOrdersCsv } from "@/lib/admin/guest-orders-csv";
import { GUEST_ORDER_STATUSES, listGuestOrders, type GuestOrderFilter } from "@/lib/payments/guest-orders";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const gate = await requirePermission("payments", "view");
  if (!gate.ok) {
    return new Response(gate.error, { status: 403, headers: { "cache-control": "no-store" } });
  }
  const raw = new URL(request.url).searchParams.get("status") ?? "paid";
  const filter: GuestOrderFilter = (GUEST_ORDER_STATUSES as readonly string[]).includes(raw)
    ? (raw as GuestOrderFilter)
    : "paid";
  const csv = guestOrdersCsv(await listGuestOrders(filter, 5000));
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="guest-orders-${filter}-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
