/**
 * توافر معدة في فترة — `GET /api/rentals/[slug]/availability?start=&end=`
 * ---------------------------------------------------------------------
 * لوح الحجز يحتاج «كم تبقّى في هذه الفترة» قبل الدفع: الكمية المتاحة =
 * كمية المعدة − الكميات المحجوزة المتقاطعة مع الفترة. لا شيء هنا يقرّر
 * الحجز — القرار يقع في `startEquipmentRental` مجددًا عند الضغط، وفي حارس
 * `prevent_equipment_overbook` في القاعدة عند التزامن.
 */

import { NextResponse } from "next/server";

import { equipmentCheckoutReadiness, loadEquipmentAvailability } from "@/lib/rentals/availability";
import { validateRentalDates } from "@/lib/rentals/dates";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * توافر معدة في فترة — قراءة عامة (معدة منشورة + فترة) فلا تعتمد على
 * المُشاهد، فيصلح كاشه. المدّة قصيرة (5 ثوانٍ للمتصفح) لأن الحجز
 * يغيّر الكمية المتاحة، والقرار النهائي يُعاد فحصه في
 * `startEquipmentRental` عند الدفع وفي حارس القاعدة عند التزامن.
 */
const SHORT_PUBLIC = {
  "Cache-Control": "public, max-age=5, s-maxage=15, stale-while-revalidate=60",
};

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const search = new URL(request.url).searchParams;
  const start = search.get("start") ?? "";
  const end = search.get("end") ?? "";

  const dates = validateRentalDates(start, end);
  if (!dates.ok) {
    return NextResponse.json({ ok: false, error: "invalid_dates" }, { status: 400, headers: SHORT_PUBLIC });
  }

  const { data: item } = await getServiceSupabase()
    .from("equipment_items")
    .select("id, quantity")
    .eq("slug", slug)
    .eq("published", true)
    .in("status", ["available", "rented"])
    .maybeSingle();
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404, headers: SHORT_PUBLIC });

  const [availability, readiness] = await Promise.all([
    loadEquipmentAvailability(item.id, start, end),
    equipmentCheckoutReadiness(),
  ]);
  if (!availability) {
    return NextResponse.json({ ok: false, error: "invalid_dates" }, { status: 400, headers: SHORT_PUBLIC });
  }

  return NextResponse.json(
    {
      ok: true,
      startDate: availability.startDate,
      endDate: availability.endDate,
      days: availability.days,
      capacity: availability.capacity,
      reserved: availability.reserved,
      remaining: availability.remaining,
      checkoutEnabled: readiness.ready,
      checkoutNotice: readiness.reason,
    },
    { headers: SHORT_PUBLIC },
  );
}
