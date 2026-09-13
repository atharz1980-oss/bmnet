import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/admin/session";
import { COMMUNITY_BUCKET } from "@/lib/community/mappers";
import { contentTypeFor, resolveMediaAccess } from "@/lib/community/media-access";

/**
 * منفذ صور المجتمع.
 * الـbucket خاص، فهذا المسار هو الطريق الوحيد لعرض الصورة. يفحص الظهور عند
 * كل طلب ثم يبثّ البايتات بعميل الخدمة — فلا يغادر الخادم رابط دائم ولا
 * موقّع، وإخفاء المنشور أو تعليق العضو يقطع الوصول فورًا.
 *
 * الكاش قصير وخاص عمدًا: تخزين مشترك طويل يعيد الثغرة التي أُغلقت.
 */
export const dynamic = "force-dynamic";

const MAX_AGE_SECONDS = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const path = (segments ?? []).join("/");

  let viewerId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    viewerId = data?.user?.id ?? null;
  } catch {
    viewerId = null;
  }

  /* الإشراف يرى المخفي؛ فشل قراءة الجلسة الإدارية لا يرفع الصلاحية. */
  let isStaff = false;
  try {
    const admin = await getAdminSession();
    isStaff = (admin?.role.permissions.community ?? []).includes("view");
  } catch {
    isStaff = false;
  }

  const verdict = await resolveMediaAccess(path, viewerId, isStaff);
  if (!verdict.allowed) {
    /* 404 لا 403: وجود الملف نفسه ليس معلومة نمنحها لمن لا يراه. */
    return new NextResponse(null, { status: 404 });
  }

  const { data, error } = await getServiceSupabase().storage.from(COMMUNITY_BUCKET).download(path);
  if (error || !data) return new NextResponse(null, { status: 404 });

  return new NextResponse(await data.arrayBuffer(), {
    status: 200,
    headers: {
      "content-type": contentTypeFor(path),
      "cache-control": `private, max-age=${MAX_AGE_SECONDS}`,
      "x-content-type-options": "nosniff",
    },
  });
}
