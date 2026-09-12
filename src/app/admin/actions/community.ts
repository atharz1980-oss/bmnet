"use server";
/**
 * إشراف المجتمع (CP-H V1) — مدمج في /admin الحالي بلا نظام أدوار جديد.
 * كل إجراء: requirePermission('community', …) → كتابة عبر عميل الخدمة → revalidate → ActionResult.
 * قراءة البلاغات تستهدف المحتوى الفعلي (معاينة مقتطعة) دون كشف بيانات حساسة.
 */
import { revalidatePath } from "next/cache";

import {
  fail,
  ok,
  toArabicDbError,
  type ActionResult,
} from "@/lib/cms/result";
import { requirePermission } from "@/lib/admin/session";
import { getServiceSupabase } from "@/lib/supabase/service";
import { removeCommunityImages } from "@/lib/community/storage";
import { reportFromDb, type ReportDbRow } from "@/lib/community/mappers";
import type { ReportItem, ReportStatus } from "@/lib/community/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadModerationReportsAction(): Promise<ReportItem[]> {
  const gate = await requirePermission("community", "view");
  if (!gate.ok) return [];
  try {
    const svc = getServiceSupabase();
    const { data: reports, error } = await svc
      .from("community_content_reports")
      .select(
        `id, target_type, target_id, reason, details, status, created_at,
         reporter:community_profiles (user_id, username)`,
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !reports) return [];

    const rows = reports as unknown as ReportDbRow[];
    // معاينة الهدف: استعلام مقتطع لكل نوع (لا N+1 — استعلام واحد لكل نوع)
    const postIds = rows.filter((r) => r.target_type === "post").map((r) => r.target_id);
    const commentIds = rows.filter((r) => r.target_type === "comment").map((r) => r.target_id);
    const profileIds = rows.filter((r) => r.target_type === "profile").map((r) => r.target_id);
    const previews = new Map<string, string>();

    if (postIds.length > 0) {
      const { data } = await svc
        .from("community_posts")
        .select("id, caption")
        .in("id", postIds);
      (data ?? []).forEach((p: { id: string; caption: string | null }) =>
        previews.set(`post:${p.id}`, (p.caption ?? "").slice(0, 80) || "(بلا تعليق)"),
      );
    }
    if (commentIds.length > 0) {
      const { data } = await svc
        .from("community_post_comments")
        .select("id, body")
        .in("id", commentIds);
      (data ?? []).forEach((c: { id: string; body: string }) =>
        previews.set(`comment:${c.id}`, (c.body ?? "").slice(0, 80)),
      );
    }
    if (profileIds.length > 0) {
      const { data } = await svc
        .from("community_profiles")
        .select("user_id, username, display_name")
        .in("user_id", profileIds);
      (data ?? []).forEach((p: { user_id: string; username: string; display_name: string }) =>
        previews.set(`profile:${p.user_id}`, `${p.display_name} (@${p.username})`),
      );
    }

    return rows.map((row) => ({
      ...reportFromDb(row),
      targetPreview:
        previews.get(`${row.target_type}:${row.target_id}`) ?? "المحتوى المحذوف",
    }));
  } catch {
    return [];
  }
}

async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  staffId: string,
): Promise<ActionResult<{ updated: boolean }>> {
  if (!UUID_RE.test(reportId)) return fail("بلاغ غير صالح.");
  try {
    const svc = getServiceSupabase();
    const { error } = await svc
      .from("community_content_reports")
      .update({ status, reviewed_by: staffId, reviewed_at: new Date().toISOString() })
      .eq("id", reportId);
    if (error) return fail(toArabicDbError(error, "تحديث البلاغ"));
    revalidatePath("/", "layout");
    return ok({ updated: true });
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث البلاغ"));
  }
}

export async function resolveReportAction(
  reportId: string,
): Promise<ActionResult<{ updated: boolean }>> {
  const gate = await requirePermission("community", "edit");
  if (!gate.ok) return gate;
  return updateReportStatus(reportId, "resolved", gate.data.userId);
}

export async function dismissReportAction(
  reportId: string,
): Promise<ActionResult<{ updated: boolean }>> {
  const gate = await requirePermission("community", "edit");
  if (!gate.ok) return gate;
  return updateReportStatus(reportId, "dismissed", gate.data.userId);
}

export async function setPostHiddenAction(
  postId: string,
  hidden: boolean,
): Promise<ActionResult<{ updated: boolean }>> {
  const gate = await requirePermission("community", "edit");
  if (!gate.ok) return gate;
  if (!UUID_RE.test(postId)) return fail("منشور غير صالح.");
  try {
    const svc = getServiceSupabase();
    const { error } = await svc
      .from("community_posts")
      .update({ status: hidden ? "hidden" : "published" })
      .eq("id", postId);
    if (error) return fail(toArabicDbError(error, hidden ? "إخفاء المنشور" : "استرجاع المنشور"));
    revalidatePath("/", "layout");
    return ok({ updated: true });
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث حالة المنشور"));
  }
}

export async function setCommentHiddenAction(
  commentId: string,
  hidden: boolean,
): Promise<ActionResult<{ updated: boolean }>> {
  const gate = await requirePermission("community", "edit");
  if (!gate.ok) return gate;
  if (!UUID_RE.test(commentId)) return fail("تعليق غير صالح.");
  try {
    const svc = getServiceSupabase();
    const { error } = await svc
      .from("community_post_comments")
      .update({ status: hidden ? "hidden" : "published" })
      .eq("id", commentId);
    if (error) return fail(toArabicDbError(error, hidden ? "إخفاء التعليق" : "استرجاع التعليق"));
    revalidatePath("/", "layout");
    return ok({ updated: true });
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث حالة التعليق"));
  }
}

export async function setMemberSuspendedAction(
  userId: string,
  suspended: boolean,
): Promise<ActionResult<{ updated: boolean }>> {
  const gate = await requirePermission("community", "edit");
  if (!gate.ok) return gate;
  if (!UUID_RE.test(userId)) return fail("عضو غير صالح.");
  if (userId === gate.data.userId)
    return fail("لا يمكنك تعليق حسابك الإداري بنفسك.");
  try {
    const svc = getServiceSupabase();
    const { error } = await svc
      .from("community_profiles")
      .update({ status: suspended ? "suspended" : "active" })
      .eq("user_id", userId);
    if (error) return fail(toArabicDbError(error, suspended ? "تعليق العضو" : "استرجاع العضو"));
    revalidatePath("/", "layout");
    return ok({ updated: true });
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث حالة العضو"));
  }
}

export async function deleteCommunityPostAction(
  postId: string,
): Promise<ActionResult<{ deleted: boolean }>> {
  const gate = await requirePermission("community", "delete");
  if (!gate.ok) return gate;
  if (!UUID_RE.test(postId)) return fail("منشور غير صالح.");
  try {
    const svc = getServiceSupabase();
    /* المسارات تُقرأ قبل الحذف: صفوف الوسائط تختفي بـcascade. */
    const { data: media } = await svc
      .from("community_post_media")
      .select("storage_path")
      .eq("post_id", postId);
    const { error } = await svc.from("community_posts").delete().eq("id", postId);
    if (error) return fail(toArabicDbError(error, "حذف المنشور"));
    /* الحذف الإشرافي يجب أن يُزيل الصورة فعلًا: الـbucket عام والرابط يبقى حيًا. */
    await removeCommunityImages(svc, (media ?? []).map((row) => row.storage_path));
    revalidatePath("/", "layout");
    return ok({ deleted: true });
  } catch (error) {
    return fail(toArabicDbError(error, "حذف المنشور"));
  }
}
