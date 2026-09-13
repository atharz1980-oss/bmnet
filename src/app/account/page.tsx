import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/admin/session";
import { getCommunityViewerId } from "@/lib/community/member";

/**
 * موجّه الحساب — لا صفحة، بل قرار وجهة.
 *
 * «حسابي» في الشريط والتذييل يشير إلى هنا لأن الشريط مكوّن عميل لا يعرف
 * إن كان صاحب الجلسة موظفًا: تمييز الموظف يحتاج قراءة `profiles`، وهي
 * غير ممنوحة لدور `authenticated` عمدًا. فيُتخذ القرار على الخادم.
 *
 * لا يمنح هذا المسار شيئًا: يقرأ الجلسة القائمة ويحوّل فقط. من لا جلسة
 * له يذهب إلى الدخول ويعود إلى هنا فيُوجَّه.
 */
export const metadata: Metadata = {
  title: "حسابي",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const staff = await getAdminSession();
  if (staff) redirect("/admin");

  const viewerId = await getCommunityViewerId();
  if (viewerId) redirect("/community/profile");

  redirect("/community/login?next=%2Faccount");
}
