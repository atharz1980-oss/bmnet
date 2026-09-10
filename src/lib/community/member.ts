import "server-only";
/**
 * هوية عضو المجتمع (CP-H V1) — server-only.
 * التسلسل: auth.getUser() عبر عميل الكوكيز → صف community_profiles عبر عميل الخدمة
 * (قراءة الحالة الحقيقية حتى عند التعليق الإداري — القراءة فقط، كل كتابة تمر بـ RLS
 * عبر عميل العضو في الأكشنات).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicAnonClient, getServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { memberFromDb, type CommunityProfileDbRow } from "./mappers";
import type { CommunityMember } from "./types";

export interface CommunityContext {
  user: { id: string; email: string };
  member: CommunityMember | null;
  /** العضو موجود لكنه موقوف إداريًا */
  suspended: boolean;
}

export async function getCommunityContext(): Promise<CommunityContext | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user?.id) return null;

    const svc = getServiceSupabase();
    const { data: row, error: profileError } = await svc
      .from("community_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<CommunityProfileDbRow>();
    if (profileError) return null;

    const suspended = row?.status === "suspended";
    return {
      user: { id: user.id, email: user.email ?? "" },
      member: row && row.status === "active" ? memberFromDb(row) : null,
      suspended,
    };
  } catch {
    // لا env أثناء البناء/تعذر العميل — عامل مجهول (نمط tolerate D-86)
    return null;
  }
}

/** عضو نشط أو null (للصفحات المحمية عبر layout) */
export async function getCommunityMember(): Promise<CommunityMember | null> {
  const ctx = await getCommunityContext();
  return ctx?.member ?? null;
}

/** بوابة الأكشنات: عضوية نشطة مطلوبة — رسالة عربية صادقة */
export async function requireCommunityMember(): Promise<
  { ok: true; member: CommunityMember } | { ok: false; error: string }
> {
  const ctx = await getCommunityContext();
  if (!ctx) return { ok: false, error: "انتهت الجلسة — يرجى تسجيل الدخول من جديد." };
  if (ctx.suspended)
    return { ok: false, error: "حسابك موقوف مؤقتًا — راجع إدارة المجتمع." };
  if (!ctx.member)
    return { ok: false, error: "أكمل إنشاء ملفك الشخصي أولًا." };
  return { ok: true, member: ctx.member };
}

/**
 * بوابة ناعمة: مصادقة + عدم تعليق — دون اشتراط وجود ملف.
 * لهذا تحتاجها أكشنات إنشاء الملف ورفع صوره (أفاتار/غلاف) قبل وجود الصف.
 * الكتابة نفسها تمر بـ RLS فيطبّق القيود النهائية.
 */
export async function requireCommunityUser(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const ctx = await getCommunityContext();
  if (!ctx) return { ok: false, error: "انتهت الجلسة — يرجى تسجيل الدخول من جديد." };
  if (ctx.suspended)
    return { ok: false, error: "حسابك موقوف مؤقتًا — راجع إدارة المجتمع." };
  return { ok: true, userId: ctx.user.id };
}

/** معرّف العضو الحالي عبر عميل الكوكيز (بدون صف الملف) — للمجموعات الخاصة بالمشاهد */
export async function getCommunityViewerId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

/** عميل anon بلا كوكيز للمحتوى العام (D-86) */
export function communityPublicClient(): SupabaseClient {
  return getPublicAnonClient();
}
