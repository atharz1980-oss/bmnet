"use server";
/**
 * أكشنات التفاعل (CP-H V1): إعجاب/تعليق/حفظ/متابعة/حجب/بلاغ.
 * المنطق: toggle ذري — كتابة عبر عميل العضو فيطبّق RLS (منع الحجب المتبادل
 * وزوج الإعجاب الفريد ومتابعة الذات) وتُترجم الأكواد لرسائل عربية.
 * العدادات تُعاد محسوبة من القاعدة (race-safe) لا من العميل.
 */
import { revalidatePath } from "next/cache";

import { fail, ok, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCommunityMember } from "@/lib/community/member";
import {
  validateCommentBody,
  validateReportDetails,
  validateReportReason,
} from "@/lib/community/validation";
import type { ReportReason, ReportTargetType } from "@/lib/community/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function toggleLikeAction(
  postId: string,
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  if (!isUuid(postId)) return fail("منشور غير صالح.");
  try {
    const supabase = await createSupabaseServerClient();
    const uid = gate.member.userId;
    const existing = await supabase
      .from("community_post_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", uid)
      .maybeSingle();
    if (existing.error && existing.error.code !== "PGRST116")
      return fail(toArabicDbError(existing.error, "الإعجاب"));

    if (existing.data) {
      const { error } = await supabase
        .from("community_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", uid);
      if (error) return fail(toArabicDbError(error, "إلغاء الإعجاب"));
    } else {
      const { error } = await supabase
        .from("community_post_likes")
        .insert({ post_id: postId, user_id: uid });
      if (error) {
        const msg = (error.message ?? "").toLowerCase();
        if (msg.includes("duplicate") || error.code === "23505")
          return ok({ liked: true, likeCount: -1 }); // سبق وأعجب — الذرية حافظت
        if (error.code === "42501")
          return fail("لا يمكنك التفاعل مع هذا المنشور.");
        return fail(toArabicDbError(error, "الإعجاب"));
      }
    }
    const { count } = await supabase
      .from("community_post_likes")
      .select("post_id", { count: "exact", head: true })
      .eq("post_id", postId);
    revalidatePath("/", "layout");
    return ok({ liked: !existing.data, likeCount: count ?? 0 });
  } catch (error) {
    return fail(toArabicDbError(error, "الإعجاب"));
  }
}

export async function addCommentAction(
  postId: string,
  body: string,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  if (!isUuid(postId)) return fail("منشور غير صالح.");
  const bodyError = validateCommentBody(body);
  if (bodyError) return fail(bodyError);
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("community_post_comments")
      .insert({
        post_id: postId,
        author_id: gate.member.userId,
        body: body.trim(),
        status: "published",
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) {
      if (error?.code === "42501")
        return fail("لا يمكنك التعليق على هذا المنشور.");
      return fail(toArabicDbError(error ?? new Error("no row"), "إضافة التعليق"));
    }
    revalidatePath("/", "layout");
    return ok({ id: data.id });
  } catch (error) {
    return fail(toArabicDbError(error, "إضافة التعليق"));
  }
}

export async function deleteCommentAction(
  commentId: string,
): Promise<ActionResult<{ deleted: boolean }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  if (!isUuid(commentId)) return fail("تعليق غير صالح.");
  try {
    const supabase = await createSupabaseServerClient();
    // RLS: صاحب التعليق، أو صاحب المنشور، أو الإدارة — غير ذلك 0 صفوف
    const { data, error } = await supabase
      .from("community_post_comments")
      .delete()
      .eq("id", commentId)
      .select("id");
    if (error) {
      if (error.code === "42501")
        return fail("لا يمكنك حذف هذا التعليق.");
      return fail(toArabicDbError(error, "حذف التعليق"));
    }
    if (!data || data.length === 0) return fail("التعليق غير موجود أو لا تملك حذفه.");
    revalidatePath("/", "layout");
    return ok({ deleted: true });
  } catch (error) {
    return fail(toArabicDbError(error, "حذف التعليق"));
  }
}

export async function toggleSaveAction(
  postId: string,
): Promise<ActionResult<{ saved: boolean }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  if (!isUuid(postId)) return fail("منشور غير صالح.");
  try {
    const supabase = await createSupabaseServerClient();
    const uid = gate.member.userId;
    const existing = await supabase
      .from("community_saved_posts")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", uid)
      .maybeSingle();
    if (existing.error && existing.error.code !== "PGRST116")
      return fail(toArabicDbError(existing.error, "الحفظ"));
    if (existing.data) {
      const { error } = await supabase
        .from("community_saved_posts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", uid);
      if (error) return fail(toArabicDbError(error, "إلغاء الحفظ"));
      revalidatePath("/", "layout");
      return ok({ saved: false });
    }
    const { error } = await supabase
      .from("community_saved_posts")
      .insert({ post_id: postId, user_id: uid });
    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      if (msg.includes("duplicate") || error.code === "23505")
        return ok({ saved: true });
      if (error.code === "42501")
        return fail("لا يمكنك حفظ هذا المنشور.");
      return fail(toArabicDbError(error, "الحفظ"));
    }
    revalidatePath("/", "layout");
    return ok({ saved: true });
  } catch (error) {
    return fail(toArabicDbError(error, "الحفظ"));
  }
}

export async function toggleFollowAction(
  targetUserId: string,
): Promise<ActionResult<{ following: boolean }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  if (!isUuid(targetUserId)) return fail("عضو غير صالح.");
  if (targetUserId === gate.member.userId)
    return fail("لا يمكنك متابعة نفسك.");
  try {
    const supabase = await createSupabaseServerClient();
    const uid = gate.member.userId;
    const existing = await supabase
      .from("community_follows")
      .select("follower_id")
      .eq("follower_id", uid)
      .eq("following_id", targetUserId)
      .maybeSingle();
    if (existing.error && existing.error.code !== "PGRST116")
      return fail(toArabicDbError(existing.error, "المتابعة"));
    if (existing.data) {
      const { error } = await supabase
        .from("community_follows")
        .delete()
        .eq("follower_id", uid)
        .eq("following_id", targetUserId);
      if (error) return fail(toArabicDbError(error, "إلغاء المتابعة"));
      revalidatePath("/", "layout");
      return ok({ following: false });
    }
    const { error } = await supabase
      .from("community_follows")
      .insert({ follower_id: uid, following_id: targetUserId });
    if (error) {
      if (error.code === "42501")
        return fail("لا يمكنك متابعة هذا العضو.");
      return fail(toArabicDbError(error, "المتابعة"));
    }
    revalidatePath("/", "layout");
    return ok({ following: true });
  } catch (error) {
    return fail(toArabicDbError(error, "المتابعة"));
  }
}

export async function blockUserAction(
  targetUserId: string,
): Promise<ActionResult<{ blocked: boolean }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  if (!isUuid(targetUserId)) return fail("عضو غير صالح.");
  if (targetUserId === gate.member.userId)
    return fail("لا يمكنك حجب نفسك.");
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("community_user_blocks")
      .insert({ blocker_id: gate.member.userId, blocked_id: targetUserId });
    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      if (msg.includes("duplicate") || error.code === "23505")
        return ok({ blocked: true });
      if (error.code === "42501")
        return fail("لا يمكنك حجب هذا العضو.");
      return fail(toArabicDbError(error, "حجب العضو"));
    }
    // مشغل DB يقطع المتابعة المتبادلة تلقائيًا
    revalidatePath("/", "layout");
    return ok({ blocked: true });
  } catch (error) {
    return fail(toArabicDbError(error, "حجب العضو"));
  }
}

export async function unblockUserAction(
  targetUserId: string,
): Promise<ActionResult<{ blocked: boolean }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  if (!isUuid(targetUserId)) return fail("عضو غير صالح.");
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("community_user_blocks")
      .delete()
      .eq("blocker_id", gate.member.userId)
      .eq("blocked_id", targetUserId)
      .select("blocker_id");
    if (error) return fail(toArabicDbError(error, "إلغاء الحجب"));
    if (!data || data.length === 0) return fail("هذا العضو غير محجوب.");
    revalidatePath("/", "layout");
    return ok({ blocked: false });
  } catch (error) {
    return fail(toArabicDbError(error, "إلغاء الحجب"));
  }
}

export async function reportContentAction(
  input: {
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details: string;
  },
): Promise<ActionResult<{ reported: boolean }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  if (!["post", "comment", "profile"].includes(input.targetType))
    return fail("نوع البلاغ غير صالح.");
  if (!isUuid(input.targetId)) return fail("عنصر البلاغ غير صالح.");
  const reasonError = validateReportReason(input.reason);
  if (reasonError) return fail(reasonError);
  const detailsError = validateReportDetails(input.details);
  if (detailsError) return fail(detailsError);
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("community_content_reports").insert({
      reporter_id: gate.member.userId,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
      details: (input.details ?? "").trim() || null,
      status: "open",
    });
    if (error) {
      if (error.code === "42501")
        return fail("لا يمكنك تقديم هذا البلاغ.");
      return fail(toArabicDbError(error, "إرسال البلاغ"));
    }
    revalidatePath("/", "layout");
    return ok({ reported: true });
  } catch (error) {
    return fail(toArabicDbError(error, "إرسال البلاغ"));
  }
}
