import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/admin/session";
import { getCommunityViewerId } from "@/lib/community/member";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadAccountDashboard } from "@/lib/account/loader";
import { AccountDashboard } from "@/components/account/account-dashboard";

/**
 * مركز الحساب الخاص بالمتدرب والعضو.
 *
 * الزائر غير الموثق يُعاد إلى صفحة الدخول مع رابط العودة.
 * موظف الإدارة يُوجّه إلى لوحة التحكم /admin.
 * المستخدم العادي (طالب أو عضو مجتمع) تفتح له لوحة حسابه التعليمية والمالية.
 * لا يُشترط وجود ملف مجتمع لاستخدام الحساب.
 */
export const metadata: Metadata = {
  title: "حسابي | بيت المصور",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const staff = await getAdminSession();
  if (staff) redirect("/admin");

  const viewerId = await getCommunityViewerId();
  if (!viewerId) redirect("/community/login?next=%2Faccount");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await loadAccountDashboard(viewerId, user?.email ?? "");

  return <AccountDashboard data={data} />;
}
