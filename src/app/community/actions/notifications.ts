"use server";
/**
 * أكشنات الإشعارات (CP-H V1) — تعليم قراءة صفوف المالك فقط (RLS).
 */
import { revalidatePath } from "next/cache";

import { fail, ok, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCommunityMember } from "@/lib/community/member";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult<{ read: boolean }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  if (!UUID_RE.test(notificationId)) return fail("إشعار غير صالح.");
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("community_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", gate.member.userId)
      .select("id");
    if (error) {
      if (error.code === "42501") return fail("ليست لديك صلاحية تنفيذ هذا الإجراء.");
      return fail(toArabicDbError(error, "تعليم الإشعار"));
    }
    if (!data || data.length === 0) return fail("الإشعار غير موجود.");
    revalidatePath("/", "layout");
    return ok({ read: true });
  } catch (error) {
    return fail(toArabicDbError(error, "تعليم الإشعار"));
  }
}

export async function markAllNotificationsReadAction(): Promise<
  ActionResult<{ updated: number }>
> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("community_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", gate.member.userId)
      .is("read_at", null)
      .select("id");
    if (error) {
      if (error.code === "42501") return fail("ليست لديك صلاحية تنفيذ هذا الإجراء.");
      return fail(toArabicDbError(error, "تعليم الإشعارات"));
    }
    revalidatePath("/", "layout");
    return ok({ updated: data?.length ?? 0 });
  } catch (error) {
    return fail(toArabicDbError(error, "تعليم الإشعارات"));
  }
}
