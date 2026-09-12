"use server";
/**
 * أكشنات المنشورات (CP-H V1): إنشاء/تعديل/حذف — ملكية صاحبة عبر RLS.
 * لا تسمح بتعديل منشور شخص آخر (using+with check على author_id) ولا بتجاوز
 * الإخفاء الإداري (المالك يعدّل المنشور المنشور فقط).
 */
import { revalidatePath } from "next/cache";

import { fail, ok, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCommunityMember } from "@/lib/community/member";
import { removeCommunityImages } from "@/lib/community/storage";
import {
  MAX_POST_MEDIA,
  validateCaption,
  validateMediaCount,
  validateOwnedMediaPath,
  validateShortText,
} from "@/lib/community/validation";
import type { PostInput } from "@/lib/community/types";

interface PostRow {
  id: string;
  author_id: string;
}

async function assertOwnedPost(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  postId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(postId)) return { ok: false, error: "منشور غير موجود." };
  const { data, error } = await supabase
    .from("community_posts")
    .select("id, author_id")
    .eq("id", postId)
    .maybeSingle<PostRow>();
  if (error) return { ok: false, error: "تعذر التحقق من المنشور — أعد المحاولة." };
  if (!data) return { ok: false, error: "المنشور غير موجود أو غير متاح." };
  if (data.author_id !== userId)
    return { ok: false, error: "لا يمكنك تعديل منشور شخص آخر." };
  return { ok: true };
}

function validatePostInput(
  input: PostInput,
  userId: string,
): string | null {
  const captionError = validateCaption(input.caption ?? "");
  if (captionError) return captionError;
  const catError = validateShortText(input.category ?? "", "التصنيف", 60);
  if (catError) return catError;
  const camError = validateShortText(input.camera ?? "", "الكاميرا", 80);
  if (camError) return camError;
  const lensError = validateShortText(input.lens ?? "", "العدسة", 80);
  if (lensError) return lensError;
  const locError = validateShortText(input.locationName ?? "", "الموقع", 120);
  if (locError) return locError;
  const media = input.media ?? [];
  const countError = validateMediaCount(media.length, MAX_POST_MEDIA, "المنشور");
  if (countError) return countError;
  for (const m of media) {
    const pathError = validateOwnedMediaPath(m?.path ?? "", userId, 1);
    if (pathError) return pathError;
  }
  return null;
}

export async function createPostAction(
  input: PostInput,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  const member = gate.member;
  const inputError = validatePostInput(input, member.userId);
  if (inputError) return fail(inputError);
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        author_id: member.userId,
        caption: (input.caption ?? "").trim(),
        category: (input.category ?? "").trim() || null,
        camera: (input.camera ?? "").trim() || null,
        lens: (input.lens ?? "").trim() || null,
        location_name: (input.locationName ?? "").trim() || null,
        visibility: "public",
        status: "published",
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !data)
      return fail(toArabicDbError(error ?? new Error("no row"), "نشر المنشور"));

    const media = (input.media ?? []).map((m, index) => ({
      post_id: data.id,
      storage_path: m.path,
      alt_text: (m.alt ?? "").trim().slice(0, 300),
      sort_order: index,
    }));
    if (media.length > 0) {
      const { error: mediaError } = await supabase
        .from("community_post_media")
        .insert(media);
      if (mediaError) {
        // تنظيف عند الفشل: حذف المنشور يتيمًا (cascade يشمل الوسائط الجزئية)
        await supabase.from("community_posts").delete().eq("id", data.id);
        return fail(toArabicDbError(mediaError, "حفظ صور المنشور"));
      }
    }
    revalidatePath("/", "layout");
    return ok({ id: data.id });
  } catch (error) {
    return fail(toArabicDbError(error, "نشر المنشور"));
  }
}

export async function updatePostAction(
  postId: string,
  input: PostInput,
): Promise<ActionResult<{ updated: boolean }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  const member = gate.member;
  const inputError = validatePostInput(input, member.userId);
  if (inputError) return fail(inputError);
  try {
    const supabase = await createSupabaseServerClient();
    const owned = await assertOwnedPost(supabase, postId, member.userId);
    if (!owned.ok) return fail(owned.error);

    const { data: updated, error } = await supabase
      .from("community_posts")
      .update({
        caption: (input.caption ?? "").trim(),
        category: (input.category ?? "").trim() || null,
        camera: (input.camera ?? "").trim() || null,
        lens: (input.lens ?? "").trim() || null,
        location_name: (input.locationName ?? "").trim() || null,
      })
      .eq("id", postId)
      .eq("author_id", member.userId)
      .eq("status", "published")
      .select("id");
    if (!error && !updated?.length) return fail("لا يمكنك تعديل هذا المنشور.");
    if (error) {
      if (error.code === "42501")
        return fail("لا يمكنك تعديل هذا المنشور.");
      return fail(toArabicDbError(error, "تحديث المنشور"));
    }

    // استبدال الوسائط (نمط المشروع: حذف + إعادة إدراج)
    const { error: delError } = await supabase
      .from("community_post_media")
      .delete()
      .eq("post_id", postId);
    if (delError) return fail(toArabicDbError(delError, "تحديث صور المنشور"));
    const media = (input.media ?? []).map((m, index) => ({
      post_id: postId,
      storage_path: m.path,
      alt_text: (m.alt ?? "").trim().slice(0, 300),
      sort_order: index,
    }));
    if (media.length > 0) {
      const { error: mediaError } = await supabase
        .from("community_post_media")
        .insert(media);
      if (mediaError) return fail(toArabicDbError(mediaError, "حفظ صور المنشور"));
    }
    revalidatePath("/", "layout");
    return ok({ updated: true });
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث المنشور"));
  }
}

export async function deletePostAction(
  postId: string,
): Promise<ActionResult<{ deleted: boolean }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  const member = gate.member;
  try {
    const supabase = await createSupabaseServerClient();
    /* المسارات تُقرأ قبل الحذف: الصفوف تختفي بـcascade فلا مرجع لها بعده. */
    const { data: media } = await supabase
      .from("community_post_media")
      .select("storage_path")
      .eq("post_id", postId);
    // حذف مباشر عبر RLS: المالك أو الإدارة فقط — من غيره يُرجع 0 صفوف
    const { data, error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId)
      .select("id");
    if (error) {
      if (error.code === "42501")
        return fail("لا يمكنك حذف هذا المنشور.");
      return fail(toArabicDbError(error, "حذف المنشور"));
    }
    if (!data || data.length === 0)
      return fail("المنشور غير موجود أو لا تملك حذفه.");
    /* الـbucket عام: الصف وحده لا يكفي، والملف يبقى مخدومًا بالرابط. */
    await removeCommunityImages(supabase, (media ?? []).map((row) => row.storage_path));
    revalidatePath("/", "layout");
    return ok({ deleted: true });
  } catch (error) {
    return fail(toArabicDbError(error, "حذف المنشور"));
  }
}
