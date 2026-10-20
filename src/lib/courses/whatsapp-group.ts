import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service";

export const DEFAULT_PHOTOGRAPHER_AI_WHATSAPP_URL =
  "https://chat.whatsapp.com/CSyEpNt7Tfb4xesNfNr5JD?s=sh&p=a&mlu=4&ilr=4";

export const PHOTOGRAPHER_AI_COURSE_SLUG = "photographer-ai-website";

/**
 * Validates a WhatsApp invitation URL.
 * Accepts standard WhatsApp chat invite links and WhatsApp links.
 */
export function isWhatsAppGroupUrlValid(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "chat.whatsapp.com" || host === "wa.me";
  } catch {
    return false;
  }
}

/**
 * Retrieves the WhatsApp group link for a given course ID or slug.
 * Prioritizes the database setting (`course_whatsapp_groups`).
 * If table does not exist or record is missing, falls back to environment variable
 * or default URL for photographer-ai-website.
 */
export async function getCourseWhatsAppGroup(courseIdOrSlug: string): Promise<string | null> {
  if (!courseIdOrSlug) return null;

  try {
    const svc = getServiceSupabase();

    // Check if courseIdOrSlug is a UUID or slug
    let courseId = courseIdOrSlug;
    let isPhotographerSlug = courseIdOrSlug === PHOTOGRAPHER_AI_COURSE_SLUG;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseIdOrSlug);
    if (!isUuid) {
      const { data: course } = await svc
        .from("courses")
        .select("id, slug")
        .eq("slug", courseIdOrSlug)
        .maybeSingle();

      if (course) {
        courseId = course.id;
        if (course.slug === PHOTOGRAPHER_AI_COURSE_SLUG) {
          isPhotographerSlug = true;
        }
      }
    } else {
      // Check slug for this UUID
      const { data: course } = await svc
        .from("courses")
        .select("slug")
        .eq("id", courseId)
        .maybeSingle();

      if (course?.slug === PHOTOGRAPHER_AI_COURSE_SLUG) {
        isPhotographerSlug = true;
      }
    }

    // Try loading from database table
    try {
      // Cast to any to safely handle when table migration is not yet applied
      const { data, error } = await (svc as any)
        .from("course_whatsapp_groups")
        .select("whatsapp_url")
        .eq("course_id", courseId)
        .maybeSingle();

      if (!error && data?.whatsapp_url && isWhatsAppGroupUrlValid(data.whatsapp_url)) {
        return data.whatsapp_url;
      }
    } catch {
      // Table may not exist yet in local or preview DB
    }

    // Fallback for photographer course
    if (isPhotographerSlug) {
      return process.env.PHOTOGRAPHER_AI_WHATSAPP_GROUP_URL || DEFAULT_PHOTOGRAPHER_AI_WHATSAPP_URL;
    }

    return null;
  } catch {
    if (courseIdOrSlug === PHOTOGRAPHER_AI_COURSE_SLUG) {
      return process.env.PHOTOGRAPHER_AI_WHATSAPP_GROUP_URL || DEFAULT_PHOTOGRAPHER_AI_WHATSAPP_URL;
    }
    return null;
  }
}

/**
 * Saves or updates the WhatsApp group link for a course.
 */
export async function setCourseWhatsAppGroup(
  courseId: string,
  whatsappUrl: string
): Promise<{ ok: boolean; error?: string }> {
  if (!courseId) {
    return { ok: false, error: "معرف الدورة مطلوب" };
  }

  const trimmedUrl = whatsappUrl.trim();
  if (trimmedUrl && !isWhatsAppGroupUrlValid(trimmedUrl)) {
    return {
      ok: false,
      error: "رابط واتساب غير صالح. يجب أن يبدأ بـ https://chat.whatsapp.com/",
    };
  }

  try {
    const svc = getServiceSupabase();

    if (!trimmedUrl) {
      // Delete existing
      const { error: delError } = await (svc as any)
        .from("course_whatsapp_groups")
        .delete()
        .eq("course_id", courseId);

      if (delError) {
        if (delError.code === "42P01" || delError.message?.includes("course_whatsapp_groups")) {
          return {
            ok: false,
            error: "جدول روابط واتساب غير موجود في قاعدة البيانات. يرجى تطبيق ملف الترحيل (Migration) أولاً قبل تعديل الرابط.",
          };
        }
        return { ok: false, error: delError.message };
      }
      return { ok: true };
    }

    const { error } = await (svc as any)
      .from("course_whatsapp_groups")
      .upsert(
        {
          course_id: courseId,
          whatsapp_url: trimmedUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "course_id" }
      );

    if (error) {
      if (error.code === "42P01" || error.message?.includes("course_whatsapp_groups")) {
        return {
          ok: false,
          error: "جدول روابط واتساب غير موجود في قاعدة البيانات. يرجى تطبيق ملف الترحيل (Migration) أولاً قبل حفظ الرابط.",
        };
      }
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("course_whatsapp_groups") || msg.includes("42P01")) {
      return {
        ok: false,
        error: "جدول روابط واتساب غير موجود في قاعدة البيانات. يرجى تطبيق ملف الترحيل (Migration) أولاً.",
      };
    }
    return {
      ok: false,
      error: msg || "فشل حفظ رابط واتساب",
    };
  }
}
