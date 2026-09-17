import "server-only";

/**
 * توافر مقاعد الدفعات — الرقم المعروض، لا الضمان.
 *
 * الضمان الوحيد هو `claim_session_seat`: تقفل الدفعة وتعدّ وتُدرج في معاملة
 * واحدة. ما يُعرض هنا لقطة لحظة القراءة، وصفحة الدورة مخبّأة خمس دقائق،
 * فقد يسبقك غيرك بين العرض والضغط. الواجهة مكتوبة لتحتمل ذلك: رفض المطالبة
 * رسالةٌ مفهومة لا عطل.
 *
 * والمشغول ليس عدّادًا مخزّنًا: مسجّلون يدويًا + مؤكَّدون + حجوزات حيّة لم
 * تنتهِ. الحجز المنتهي يتوقف عن شغل مقعده في اللحظة نفسها، بلا انتظار مهمة
 * تنظيف.
 */

import { getServiceSupabase } from "@/lib/supabase/service";

/** حالات الدفعة التي يمكن الاختيار منها مبدئيًا — والتوافر يحسم البقية. */
const OPEN_STATUSES = ["upcoming", "open"] as const;

export interface SessionOption {
  id: string;
  batchName: string;
  startDate: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  location: string;
  city: string;
  status: string;
  capacity: number;
  /** مسجّلون خارج المنصة — هاتفيًا أو حضورًا. */
  manualCount: number;
  /** مؤكَّدون وحجوزات حيّة. */
  taken: number;
  available: number;
  /** قابلة للاختيار الآن: مفتوحة، ولم تمضِ، وسعتها مضبوطة، وفيها مقعد. */
  selectable: boolean;
}

interface SessionRow {
  id: string;
  batch_name: string | null;
  start_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
  location: string;
  city: string;
  status: string;
  capacity: number;
  registered_count: number;
}

interface AvailabilityRow {
  session_id: string;
  capacity: number;
  manual_count: number;
  taken: number;
  available: number;
  selectable: boolean;
}

/** كل دفعات الدورة مع توافرها الموثوق. تُستعمل للعرض والإدارة معًا. */
export async function loadCourseSessions(courseId: string): Promise<SessionOption[]> {
  const svc = getServiceSupabase();
  const [{ data: rows }, { data: availability }] = await Promise.all([
    svc
      .from("course_sessions")
      .select("id, batch_name, start_date, end_date, start_time, end_time, location, city, status, capacity, registered_count")
      .eq("course_id", courseId)
      .order("start_date", { ascending: true }),
    svc.rpc("session_availability", { p_course_id: courseId }),
  ]);

  const byId = new Map<string, AvailabilityRow>(
    ((availability ?? []) as AvailabilityRow[]).map((row) => [row.session_id, row]),
  );

  return ((rows ?? []) as SessionRow[]).map((row) => {
    const seats = byId.get(row.id);
    return {
      id: row.id,
      batchName: row.batch_name ?? "",
      startDate: row.start_date,
      endDate: row.end_date,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      city: row.city,
      status: row.status,
      capacity: row.capacity,
      manualCount: seats?.manual_count ?? row.registered_count,
      taken: seats?.taken ?? 0,
      available: seats?.available ?? Math.max(row.capacity - row.registered_count, 0),
      /* غياب الصف من دالة التوافر يعني دورة غير منشورة — لا اختيار. */
      selectable: seats?.selectable ?? false,
    };
  });
}

/** الدفعات التي يستطيع الطالب اختيارها الآن. */
export async function selectableSessions(courseId: string): Promise<SessionOption[]> {
  return (await loadCourseSessions(courseId)).filter((session) => session.selectable);
}

/**
 * هل تحتاج هذه الدورة اختيار دفعة؟
 *
 * السؤال بيانات لا تصنيف: الدورة التي لها دفعات مجدولة تحتاج اختيارًا مهما
 * كان نوع تسليمها، والتي لا دفعات لها تمضي كما كانت. دورة أونلاين بدفعات
 * حقيقية (سعة وتاريخ) دفعاتُها حقيقية أيضًا.
 */
export async function sessionRequirement(courseId: string): Promise<{
  hasSessions: boolean;
  selectable: SessionOption[];
  all: SessionOption[];
}> {
  const all = await loadCourseSessions(courseId);
  const scheduled = all.filter((session) => OPEN_STATUSES.includes(session.status as (typeof OPEN_STATUSES)[number]));
  return {
    /* «لها دفعات» = لها دفعة واحدة على الأقل غير ملغاة ولا منتهية. */
    hasSessions: scheduled.length > 0,
    selectable: all.filter((session) => session.selectable),
    all,
  };
}

/** اسم الدفعة كما يُعرض ويُحفظ في السجل المالي. */
export function sessionLabel(session: {
  batchName: string;
  startDate: string;
}): string {
  return session.batchName.trim() !== "" ? session.batchName.trim() : `دفعة ${session.startDate}`;
}

/** وقت الدفعة بصيغة العرض العربية — نسخة واحدة يشترك فيها العرض والحفظ. */
export function sessionTime(start: string, end: string): string {
  const to12 = (value: string): { label: string; period: string } => {
    const [hours, minutes] = value.split(":");
    const hour = Number(hours);
    if (!Number.isFinite(hour)) return { label: value, period: "" };
    const period = hour >= 12 ? "مساءً" : "صباحاً";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return { label: `${hour12}:${minutes ?? "00"}`, period };
  };
  const from = to12(start);
  const to = to12(end);
  return from.period === to.period
    ? `${from.label} – ${to.label} ${from.period}`.trim()
    : `${from.label} ${from.period} – ${to.label} ${to.period}`.trim();
}

/** المكان كما يُعرض ويُحفظ. */
export function sessionPlace(session: { location: string; city: string }): string {
  return [session.location, session.city].map((part) => part.trim()).filter(Boolean).join(" — ");
}
