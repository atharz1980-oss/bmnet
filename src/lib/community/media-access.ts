import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service";
import { isCommunityMediaPath } from "./storage";

/**
 * من يستحق رؤية ملف وسائط في المجتمع.
 *
 * الـbucket صار خاصًا، فلا رابط عام دائم. كل عرض يمر من هنا ويُفحص عند كل
 * طلب — لذلك إخفاء المنشور أو تعليق العضو يقطع الوصول فورًا، لا بعد انتهاء
 * مدة توقيع. هذا الفارق هو سبب اختيار المسار الخادمي على الروابط الموقّعة.
 */
export type MediaVerdict =
  | { allowed: true; reason: "owner" | "post" | "portfolio" | "profile" | "staff" }
  | { allowed: false; reason: "invalid-path" | "not-visible" };

/** صاحب الملف من مسار community/{uid}/… — المسار نفسه يحمل الملكية. */
export function ownerFromPath(path: string): string | null {
  if (!isCommunityMediaPath(path)) return null;
  return path.split("/")[1] ?? null;
}

/**
 * يقرأ بعميل الخدمة عمدًا: الفحص هنا صريح ومكتوب، ولا يُترك لـRLS الذي
 * يخدم حالة الاستخدام العادية لا هذا المسار. كل فرع يذكر شرطه كاملًا.
 */
export async function resolveMediaAccess(
  path: string,
  viewerId: string | null,
  isStaff: boolean,
): Promise<MediaVerdict> {
  if (!isCommunityMediaPath(path)) return { allowed: false, reason: "invalid-path" };

  /* المالك يرى ملفه دائمًا: يحتاجه فور الرفع وقبل ربطه بأي صف. */
  if (viewerId && ownerFromPath(path) === viewerId) return { allowed: true, reason: "owner" };

  /* الإشراف يرى المخفي ليحكم عليه. */
  if (isStaff) return { allowed: true, reason: "staff" };

  const svc = getServiceSupabase();

  /* صورة منشور: المنشور منشور وصاحبه نشط. */
  const post = await svc
    .from("community_post_media")
    .select("id, post:community_posts!inner (status, author:community_profiles!community_posts_author_id_fkey!inner (status))")
    .eq("storage_path", path)
    .limit(1);
  const postRow = (post.data ?? [])[0] as unknown as
    | { post?: { status?: string; author?: { status?: string } } }
    | undefined;
  if (postRow?.post?.status === "published" && postRow.post.author?.status === "active") {
    return { allowed: true, reason: "post" };
  }

  /* وسائط مشروع: المشروع منشور وصاحبه نشط. */
  const project = await svc
    .from("community_portfolio_media")
    .select("id, project:community_portfolio_projects!inner (published, owner:community_profiles!inner (status))")
    .eq("storage_path", path)
    .limit(1);
  const projectRow = (project.data ?? [])[0] as unknown as
    | { project?: { published?: boolean; owner?: { status?: string } } }
    | undefined;
  if (projectRow?.project?.published === true && projectRow.project.owner?.status === "active") {
    return { allowed: true, reason: "portfolio" };
  }

  /* صورة ملف أو غلافه: العضو نشط. */
  const profile = await svc
    .from("community_profiles")
    .select("user_id")
    .or(`avatar_path.eq.${path},cover_path.eq.${path}`)
    .eq("status", "active")
    .limit(1);
  if ((profile.data ?? []).length > 0) return { allowed: true, reason: "profile" };

  return { allowed: false, reason: "not-visible" };
}

/** نوع المحتوى من الامتداد — الـbucket يقبل هذه الصيغ وحدها. */
export function contentTypeFor(path: string): string {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}
