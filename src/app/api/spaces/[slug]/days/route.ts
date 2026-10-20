/**
 * ملخّص الأيام المتاحة في مساحة — `GET /api/spaces/[slug]/days?from=YYYY-MM-DD&days=14`
 * ------------------------------------------------------------------------------------
 * يغذّي شريط «اختر يومك» في واجهة الحجز: لكل يوم مغلق/مفتوح، وعدد الفترات
 * الحرّة ومجموع دقائقها — بقراءة واحدة بدل طلب خطة كل يوم على حدة.
 *
 * لا شيء هنا يقرّر الحجز: `startSpaceBooking` يعيد فحص التوافر والسعر عند
 * الضغط، وهذا ملخّص للعرض فقط.
 */

import { NextResponse } from "next/server";

import { loadSpaceDaysPlan, spaceCheckoutReadiness } from "@/lib/spaces/availability";
import { MAX_BOOKING_DAYS_AHEAD, addDays, isDateIso, todayIso } from "@/lib/spaces/schedule";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
/** أقصى نافذة في طلب واحد — الشريط يجلبها على دفعات. */
const MAX_WINDOW_DAYS = 31;
const DEFAULT_WINDOW_DAYS = 14;

function invalid(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400, headers: NO_STORE });
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? todayIso();
  const requested = Number(url.searchParams.get("days") ?? DEFAULT_WINDOW_DAYS);

  if (!isDateIso(from)) return invalid("invalid_date");
  const today = todayIso();
  const lastDate = addDays(today, MAX_BOOKING_DAYS_AHEAD);
  if (from < today || from > lastDate) return invalid("date_out_of_range");

  /* لا نتجاوز آخر يوم مسموح، ولا نفتح نافذة أطول من حدّ الطلب الواحد. */
  const remaining =
    Math.floor(
      (new Date(`${lastDate}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000,
    ) + 1;
  const days = Math.min(Number.isFinite(requested) ? Math.floor(requested) : DEFAULT_WINDOW_DAYS, remaining, MAX_WINDOW_DAYS);
  if (days < 1) return invalid("date_out_of_range");

  const { data: space } = await getServiceSupabase()
    .from("studio_spaces")
    .select("id")
    .eq("slug", slug)
    .eq("publish_status", "published")
    .maybeSingle();
  if (!space) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const [dates, readiness] = await Promise.all([
    loadSpaceDaysPlan(space.id, from, days),
    spaceCheckoutReadiness(),
  ]);

  return NextResponse.json(
    {
      ok: true,
      from,
      days,
      dates,
      bookingEnabled: readiness.ready,
      bookingNotice: readiness.reason,
    },
    { headers: NO_STORE },
  );
}
