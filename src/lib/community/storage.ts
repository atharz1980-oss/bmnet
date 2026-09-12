/**
 * وسائط المجتمع (CP-H V1) — bucket مستقل community-media.
 * الرفع يتم عبر عميل العضو المرتبط بالكوكيز ليُطبَّق RLS مجلد community/{uid}/…
 * القيود: 5MB، jpeg/png/webp — مطابقة لسياسات storage في 20260910092000.
 * (نفس عرف media-storage.ts: دوال نقية + عميل يُمرر من المستدعي)
 */
import { COMMUNITY_BUCKET } from "./mappers";

export const MAX_COMMUNITY_MEDIA_BYTES = 5 * 1024 * 1024;
export const COMMUNITY_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type CommunityMimeType = (typeof COMMUNITY_MIME_TYPES)[number];

const MIME_BY_EXT: Record<string, CommunityMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function communityMediaPathFor(userId: string, fileName: string): string {
  const ext = (fileName.split(".").pop() ?? "jpg").toLowerCase();
  const safeExt = ext in MIME_BY_EXT ? ext : "jpg";
  const uuid = crypto.randomUUID();
  return `community/${userId}/${uuid}.${safeExt}`;
}

export function validateCommunityFile(file: File): string | null {
  if (!file || typeof file.size !== "number") return "الملف غير صالح.";
  if (file.size === 0) return "الملف فارغ.";
  if (file.size > MAX_COMMUNITY_MEDIA_BYTES)
    return "حجم الصورة يتجاوز 5MB — اختر صورة أصغر.";
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) return "صيغة غير مدعومة — المسموح: JPG أو PNG أو WEBP.";
  if (file.type && !COMMUNITY_MIME_TYPES.includes(file.type as CommunityMimeType))
    return "صيغة غير مدعومة — المسموح: JPG أو PNG أو WEBP.";
  return null;
}

/** رفع صورة عضو عبر عميل الكوكيز (RLS يفرض مجلده الشخصي) */
export async function uploadCommunityImage(
  client: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  file: File,
  alt: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const invalid = validateCommunityFile(file);
  if (invalid) return { ok: false, error: invalid };
  const path = communityMediaPathFor(userId, file.name);
  const buffer = new Uint8Array(await file.arrayBuffer());
  const { error } = await client.storage
    .from(COMMUNITY_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || MIME_BY_EXT[(file.name.split(".").pop() ?? "").toLowerCase()],
      upsert: false,
    });
  if (error) {
    const duplicate = error.message?.toLowerCase().includes("exists");
    return {
      ok: false,
      error: duplicate
        ? "تعذر رفع الصورة — حاول مرة أخرى."
        : "تعذر رفع الصورة — تحقق من اتصالك وحجم الملف.",
    };
  }
  return { ok: true, path };
}

/** مسار وسائط مجتمع صالح: community/{uuid}/{اسم ملف} ولا شيء غيره. */
export function isCommunityMediaPath(path: string): boolean {
  return /^community\/[\w-]{36}\/[\w.\-]{1,160}$/.test(path);
}

/**
 * حذف وسائط منشور أو مشروع بعد حذف صفّه.
 * الـbucket عام، فحذف الصف وحده يترك الصورة مخدومة بالرابط إلى الأبد،
 * ويترك ملفًا يتيمًا لا يشير إليه شيء. تُستدعى بعد نجاح حذف الصف لأن
 * الصف هو المرجع: لو فشل الحذف بقيت الصور سليمة مع منشورها.
 * الإرجاع إخبار لا تحكّم — فشل التخزين لا يُلغي حذفًا تم في القاعدة.
 */
export async function removeCommunityImages(
  client: import("@supabase/supabase-js").SupabaseClient,
  paths: string[],
): Promise<{ removed: number; failed: number }> {
  const valid = [...new Set(paths.filter(isCommunityMediaPath))];
  if (valid.length === 0) return { removed: 0, failed: 0 };
  const { data, error } = await client.storage.from(COMMUNITY_BUCKET).remove(valid);
  if (error) return { removed: 0, failed: valid.length };
  const removed = data?.length ?? 0;
  return { removed, failed: valid.length - removed };
}

/** حذف كائن وسائط من مجلد العضو (يُستدعى من الأكشنات بعد فحص الملكية) */
export async function deleteCommunityImage(
  client: import("@supabase/supabase-js").SupabaseClient,
  path: string,
): Promise<{ ok: boolean; error: string }> {
  if (!isCommunityMediaPath(path)) return { ok: false, error: "مسار وسائط غير صالح." };
  const { error } = await client.storage.from(COMMUNITY_BUCKET).remove([path]);
  if (error) return { ok: false, error: "تعذر حذف الصورة — قد تكون محذوفة سابقًا." };
  return { ok: true, error: "" };
}
