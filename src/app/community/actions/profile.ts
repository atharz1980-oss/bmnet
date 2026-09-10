"use server";
/**
 * أكشنات ملف العضو ووسائطه (CP-H V1).
 * كل كتابة عبر عميل الكوكيز (RLS يفرض الملكية) — لا عميل خدمة في مسار العضو.
 */
import { revalidatePath } from "next/cache";

import {
  fail,
  ok,
  toArabicDbError,
  type ActionResult,
} from "@/lib/cms/result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCommunityContext, requireCommunityUser } from "@/lib/community/member";
import { deleteCommunityImage, uploadCommunityImage } from "@/lib/community/storage";
import {
  validateBio,
  validateDisplayName,
  validateExperienceLevel,
  validateInstagramUrl,
  validateSpecialties,
  validateUsername,
  validateWebsiteUrl,
  validateYoutubeUrl,
} from "@/lib/community/validation";
import type { CommunityProfileInput } from "@/lib/community/types";

function normalizeOptionalUrl(value: string): string | null {
  const v = (value ?? "").trim();
  return v ? v : null;
}

export async function saveCommunityProfileAction(
  input: CommunityProfileInput,
): Promise<ActionResult<{ username: string }>> {
  // بوابة ناعمة: العضو الجديد بلا ملف يجب أن يستطيع إنشاءه (إلا فالدائرة قاهرة)
  const gate = await requireCommunityUser();
  if (!gate.ok) return fail(gate.error);
  const userId = gate.userId;
  const ctx = await getCommunityContext();
  const member = ctx?.member ?? null;

  const usernameError = validateUsername(input.username);
  if (usernameError) return fail(usernameError);
  const nameError = validateDisplayName(input.displayName);
  if (nameError) return fail(nameError);
  const bioError = validateBio(input.bio);
  if (bioError) return fail(bioError);
  const specError = validateSpecialties(input.specialties ?? []);
  if (specError) return fail(specError);
  const expError = validateExperienceLevel(input.experienceLevel);
  if (expError) return fail(expError);
  const webError = validateWebsiteUrl(input.websiteUrl);
  if (webError) return fail(webError);
  const igError = validateInstagramUrl(input.instagramUrl);
  if (igError) return fail(igError);
  const ytError = validateYoutubeUrl(input.youtubeUrl);
  if (ytError) return fail(ytError);

  const isNewProfile = !member?.username;
  const username = input.username.trim().toLowerCase();

  // تعديل اسم المستخدم لمالك الملف — تفرد مضمون بفهرس فريد + رسالة عربية
  const row = {
    user_id: userId,
    username,
    display_name: input.displayName.trim(),
    bio: (input.bio ?? "").trim() || null,
    city: (input.city ?? "").trim() || null,
    country: (input.country ?? "").trim() || null,
    specialties: (input.specialties ?? []).map((s) => s.trim()).filter(Boolean),
    experience_level: input.experienceLevel,
    avatar_path: input.avatarPath || null,
    cover_path: input.coverPath || null,
    available_for_work: Boolean(input.availableForWork),
    website_url: normalizeOptionalUrl(input.websiteUrl),
    instagram_url: normalizeOptionalUrl(input.instagramUrl),
    youtube_url: normalizeOptionalUrl(input.youtubeUrl),
    status: "active" as const,
  };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("community_profiles")
      .upsert(row, { onConflict: "user_id" });
    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique") || error.code === "23505")
        return fail("اسم المستخدم محجوز — اختر اسمًا آخر.");
      if (msg.includes("check") || error.code === "23514")
        return fail("المدخلات غير مطابقة للشروط — راجع الحقول.");
      if (msg.includes("row-level security") || error.code === "42501")
        return fail("ليست لديك صلاحية تنفيذ هذا الإجراء.");
      return fail(toArabicDbError(error, "حفظ الملف الشخصي"));
    }
    revalidatePath("/", "layout");
    return ok({ username });
  } catch (error) {
    return fail(toArabicDbError(error, isNewProfile ? "إنشاء الملف الشخصي" : "حفظ الملف الشخصي"));
  }
}

/** رفع صورة (أفاتار/غلاف/منشور/مشروع) إلى مجلد العضو عبر عميله — RLS يفرض المسار */
export async function uploadCommunityMediaAction(
  file: File,
  alt: string,
): Promise<ActionResult<{ path: string }>> {
  // بوابة ناعمة — الأفاتار/الغلاف يُرفعان قبل وجود صف الملف
  const gate = await requireCommunityUser();
  if (!gate.ok) return fail(gate.error);
  const altText = (alt ?? "").trim();
  if (altText.length > 300) return fail("النص البديل: 300 حرف كحد أقصى.");
  try {
    const supabase = await createSupabaseServerClient();
    const result = await uploadCommunityImage(supabase, gate.userId, file, altText);
    if (!result.ok) return fail(result.error);
    return ok({ path: result.path });
  } catch (error) {
    return fail(toArabicDbError(error, "رفع الصورة"));
  }
}

/** حذف صورة من مجلد العضو — RLS يمنع حذف ملفات غيره */
export async function deleteCommunityMediaAction(
  path: string,
): Promise<ActionResult<{ deleted: boolean }>> {
  const gate = await requireCommunityUser();
  if (!gate.ok) return fail(gate.error);
  if (!/^community\/[\w-]{36}\/[\w.\-]{1,160}$/.test(path))
    return fail("مسار وسائط غير صالح.");
  try {
    const supabase = await createSupabaseServerClient();
    const result = await deleteCommunityImage(supabase, path);
    if (!result.ok) return fail(result.error);
    return ok({ deleted: true });
  } catch (error) {
    return fail(toArabicDbError(error, "حذف الصورة"));
  }
}
