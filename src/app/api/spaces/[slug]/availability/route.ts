/**
 * توافر يوم في مساحة — `GET /api/spaces/[slug]/availability?date=YYYY-MM-DD`
 * -------------------------------------------------------------------------
 * لوح الحجز يحتاج إلى «متى يمكن الحجز» بعد اختيار اليوم: ساعات العمل
 * المعلنة من الـ backend ونطاقات الوقت الحرّة المتبقية بعد طرح الحجوزات
 * القائمة. لا شيء هنا يقرّر الحجز — القرار يقع في `startSpaceBooking`
 * مجددًا عند الضغط، فتبقى هذه القراءة تلميحًا لا عهدًا.
 */

import { NextResponse } from "next/server";

import { loadSpaceDayPlan, spaceCheckoutReadiness } from "@/lib/spaces/availability";
import {
  MAX_BOOKING_DAYS_AHEAD,
  MIN_BOOKING_MINUTES,
  SLOT_STEP_MINUTES,
  addDays,
  isDateIso,
  todayIso,
} from "@/lib/spaces/schedule";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * التوافر قراءة عامة (مساحة منشورة + يوم محدّد) فلا يعتمد على المُشاهد،
 * فيصلح كاشه. المدّة قصيرة (5 ثوانٍ للمتصفح) لأن الحجز يغيّر التوافر،
 * والقرار النهائي يُعاد فحصه في `startSpaceBooking` عند الضغط — فما
 * يُعرض هنا تلميح لا عهد.
 */
const SHORT_PUBLIC = {
  "Cache-Control": "public, max-age=5, s-maxage=15, stale-while-revalidate=60",
};

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const date = new URL(request.url).searchParams.get("date") ?? "";

  if (!isDateIso(date)) {
    return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400, headers: SHORT_PUBLIC });
  }
  const today = todayIso();
  if (date < today || date > addDays(today, MAX_BOOKING_DAYS_AHEAD)) {
    return NextResponse.json({ ok: false, error: "date_out_of_range" }, { status: 400, headers: SHORT_PUBLIC });
  }

  const { data: space } = await getServiceSupabase()
    .from("studio_spaces")
    .select("id")
    .eq("slug", slug)
    .eq("publish_status", "published")
    .maybeSingle();
  if (!space) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404, headers: SHORT_PUBLIC });

  const [plan, readiness] = await Promise.all([loadSpaceDayPlan(space.id, date), spaceCheckoutReadiness()]);
  if (!plan) {
    return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400, headers: SHORT_PUBLIC });
  }

  return NextResponse.json(
    {
      ok: true,
      date: plan.date,
      closed: plan.closed,
      open: plan.open,
      busy: plan.busy,
      free: plan.free,
      bookingEnabled: readiness.ready,
      bookingNotice: readiness.reason,
      minSlotMinutes: MIN_BOOKING_MINUTES,
      stepMinutes: SLOT_STEP_MINUTES,
    },
    { headers: SHORT_PUBLIC },
  );
}
