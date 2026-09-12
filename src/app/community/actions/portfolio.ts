"use server";
/**
 * أكشنات مشاريع الأعمال (CP-H V1): إنشاء/تعديل/حذف/نشر-إلغاء + الوسائط.
 * ملكية صاحبة عبر RLS + تحقق مسار الوسائط في مجلد المالك.
 */
import { revalidatePath } from "next/cache";

import { fail, ok, toArabicDbError, type ActionResult } from "@/lib/cms/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCommunityMember } from "@/lib/community/member";
import { removeCommunityImages } from "@/lib/community/storage";
import {
  MAX_PORTFOLIO_MEDIA,
  validateMediaCount,
  validateOwnedMediaPath,
  validatePortfolioTitle,
  validateProjectDate,
  validateShortText,
} from "@/lib/community/validation";
import type { PortfolioInput } from "@/lib/community/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validatePortfolioInput(
  input: PortfolioInput,
  userId: string,
): string | null {
  const titleError = validatePortfolioTitle(input.title ?? "");
  if (titleError) return titleError;
  const descError = validateShortText(input.description ?? "", "الوصف", 2000);
  if (descError) return descError;
  const catError = validateShortText(input.category ?? "", "التصنيف", 60);
  if (catError) return catError;
  const locError = validateShortText(input.locationName ?? "", "الموقع", 120);
  if (locError) return locError;
  const dateError = validateProjectDate(input.projectDate ?? "");
  if (dateError) return dateError;
  if (input.coverPath) {
    const invalid = validateOwnedMediaPath(input.coverPath, userId, 1);
    if (invalid) return invalid;
  }
  const media = input.media ?? [];
  const countError = validateMediaCount(media.length, MAX_PORTFOLIO_MEDIA, "المشروع");
  if (countError) return countError;
  for (const m of media) {
    const pathError = validateOwnedMediaPath(m?.path ?? "", userId, 1);
    if (pathError) return pathError;
  }
  return null;
}

export async function createPortfolioProjectAction(
  input: PortfolioInput,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  const inputError = validatePortfolioInput(input, gate.member.userId);
  if (inputError) return fail(inputError);
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("community_portfolio_projects")
      .insert({
        user_id: gate.member.userId,
        title: input.title.trim(),
        description: (input.description ?? "").trim() || null,
        category: (input.category ?? "").trim() || null,
        location_name: (input.locationName ?? "").trim() || null,
        project_date: input.projectDate?.trim() || null,
        cover_path: input.coverPath || null,
        published: Boolean(input.published),
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !data)
      return fail(toArabicDbError(error ?? new Error("no row"), "إنشاء المشروع"));
    const media = (input.media ?? []).map((m, index) => ({
      project_id: data.id,
      storage_path: m.path,
      alt_text: (m.alt ?? "").trim().slice(0, 300),
      sort_order: index,
    }));
    if (media.length > 0) {
      const { error: mediaError } = await supabase
        .from("community_portfolio_media")
        .insert(media);
      if (mediaError) {
        await supabase
          .from("community_portfolio_projects")
          .delete()
          .eq("id", data.id);
        return fail(toArabicDbError(mediaError, "حفظ وسائط المشروع"));
      }
    }
    revalidatePath("/", "layout");
    return ok({ id: data.id });
  } catch (error) {
    return fail(toArabicDbError(error, "إنشاء المشروع"));
  }
}

export async function updatePortfolioProjectAction(
  projectId: string,
  input: PortfolioInput,
): Promise<ActionResult<{ updated: boolean }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  if (!UUID_RE.test(projectId)) return fail("مشروع غير موجود.");
  const inputError = validatePortfolioInput(input, gate.member.userId);
  if (inputError) return fail(inputError);
  try {
    const supabase = await createSupabaseServerClient();
    const { data: updated, error } = await supabase
      .from("community_portfolio_projects")
      .update({
        title: input.title.trim(),
        description: (input.description ?? "").trim() || null,
        category: (input.category ?? "").trim() || null,
        location_name: (input.locationName ?? "").trim() || null,
        project_date: input.projectDate?.trim() || null,
        cover_path: input.coverPath || null,
        published: Boolean(input.published),
      })
      .eq("id", projectId)
      .eq("user_id", gate.member.userId)
      .select("id");
    if (!error && !updated?.length) return fail("المشروع غير موجود أو لا تملك تعديله.");
    if (error) {
      if (error.code === "42501")
        return fail("لا يمكنك تعديل هذا المشروع.");
      return fail(toArabicDbError(error, "تحديث المشروع"));
    }
    const { error: delError } = await supabase
      .from("community_portfolio_media")
      .delete()
      .eq("project_id", projectId);
    if (delError) return fail(toArabicDbError(delError, "تحديث وسائط المشروع"));
    const media = (input.media ?? []).map((m, index) => ({
      project_id: projectId,
      storage_path: m.path,
      alt_text: (m.alt ?? "").trim().slice(0, 300),
      sort_order: index,
    }));
    if (media.length > 0) {
      const { error: mediaError } = await supabase
        .from("community_portfolio_media")
        .insert(media);
      if (mediaError) return fail(toArabicDbError(mediaError, "حفظ وسائط المشروع"));
    }
    revalidatePath("/", "layout");
    return ok({ updated: true });
  } catch (error) {
    return fail(toArabicDbError(error, "تحديث المشروع"));
  }
}

export async function deletePortfolioProjectAction(
  projectId: string,
): Promise<ActionResult<{ deleted: boolean }>> {
  const gate = await requireCommunityMember();
  if (!gate.ok) return fail(gate.error);
  if (!UUID_RE.test(projectId)) return fail("مشروع غير موجود.");
  try {
    const supabase = await createSupabaseServerClient();
    /* المسارات تُقرأ قبل الحذف: الصفوف تختفي بـcascade فلا مرجع لها بعده. */
    const { data: media } = await supabase
      .from("community_portfolio_media")
      .select("storage_path")
      .eq("project_id", projectId);
    const { data, error } = await supabase
      .from("community_portfolio_projects")
      .delete()
      .eq("id", projectId)
      .select("id");
    if (error) {
      if (error.code === "42501")
        return fail("لا يمكنك حذف هذا المشروع.");
      return fail(toArabicDbError(error, "حذف المشروع"));
    }
    if (!data || data.length === 0)
      return fail("المشروع غير موجود أو لا تملك حذفه.");
    await removeCommunityImages(supabase, (media ?? []).map((row) => row.storage_path));
    revalidatePath("/", "layout");
    return ok({ deleted: true });
  } catch (error) {
    return fail(toArabicDbError(error, "حذف المشروع"));
  }
}
