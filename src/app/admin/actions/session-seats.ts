"use server";

/**
 * مقاعد الدفعات كما تراها الإدارة — قراءة فقط في هذه المرحلة.
 *
 * الأرقام تُشتق من `course_session_seats` ودالة التوافر، لا من عدّاد مخزّن:
 * «مسجلون يدويًا» يبقى ما تكتبه الإدارة، و«مؤكَّد» و«محجوز» يحسبهما النظام.
 * وإظهارهما منفصلين مقصود — خلطهما في رقم واحد يخفي مصدر كل مقعد.
 */

import { z } from "zod";

import { requirePermission } from "@/lib/admin/session";
import { fail, ok, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { getServiceSupabase } from "@/lib/supabase/service";
import { loadCourseSessions, sessionLabel, sessionPlace, sessionTime } from "@/lib/sessions/availability";

const uuid = z.string().uuid("معرّف الدورة غير صالح.");

export interface SessionSeatsView {
  id: string;
  label: string;
  date: string;
  time: string;
  place: string;
  status: string;
  capacity: number;
  /** ما تكتبه الإدارة: تسجيلات هاتفية أو حضورية. */
  manualCount: number;
  confirmed: number;
  held: number;
  available: number;
  selectable: boolean;
  /** لا يمكن حذف الموعد ما دام له سجل مقاعد. */
  hasSeatHistory: boolean;
  /** عمليات دُفعت ولم يبقَ لها مقعد — تحتاج قرارًا يدويًا. */
  paidWithoutSeat: number;
}

export async function loadSessionSeatsAction(
  courseId: unknown,
): Promise<ActionResult<SessionSeatsView[]>> {
  const gate = await requirePermission("sessions", "view");
  if (!gate.ok) return gate;
  const parsed = uuid.safeParse(courseId);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "معرّف غير صالح.");

  const svc = getServiceSupabase();
  const sessions = await loadCourseSessions(parsed.data);
  if (sessions.length === 0) return ok([]);

  const ids = sessions.map((session) => session.id);
  const [{ data: seats, error: seatsError }, { data: payments }] = await Promise.all([
    svc.from("course_session_seats").select("session_id, status, hold_expires_at").in("session_id", ids),
    svc
      .from("course_payments")
      .select("session_id, status, failure_code")
      .in("session_id", ids)
      .eq("status", "paid")
      .eq("failure_code", "seat_unavailable"),
  ]);
  if (seatsError) return fail(toArabicDbError(seatsError, "قراءة المقاعد"));

  const now = Date.now();
  return ok(
    sessions.map((session) => {
      const rows = (seats ?? []).filter((row) => row.session_id === session.id);
      return {
        id: session.id,
        label: sessionLabel(session),
        date: session.startDate,
        time: sessionTime(session.startTime, session.endTime),
        place: sessionPlace(session),
        status: session.status,
        capacity: session.capacity,
        manualCount: session.manualCount,
        confirmed: rows.filter((row) => row.status === "confirmed").length,
        held: rows.filter(
          (row) => row.status === "held" && row.hold_expires_at !== null && new Date(row.hold_expires_at).getTime() > now,
        ).length,
        available: session.available,
        selectable: session.selectable,
        hasSeatHistory: rows.length > 0,
        paidWithoutSeat: (payments ?? []).filter((row) => row.session_id === session.id).length,
      };
    }),
  );
}
