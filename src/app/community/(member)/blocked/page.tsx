import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BlockedMembers } from "@/components/community/blocked-members";
import { loadBlockedMembers } from "@/lib/community/loaders";
import { getCommunityContext } from "@/lib/community/member";

export const metadata: Metadata = {
  title: "الأعضاء المحجوبون",
  robots: { index: false, follow: false },
};

export default async function CommunityBlockedPage() {
  const ctx = await getCommunityContext();
  if (!ctx) redirect("/community/login?next=%2Fcommunity%2Fblocked");
  if (!ctx.member && !ctx.suspended) redirect("/community/profile");

  const data = await loadBlockedMembers();
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">الأعضاء المحجوبون</h1>
        <Link href="/community/profile" className="inline-flex min-h-11 items-center text-sm text-brand-700 hover:underline lg:min-h-0">
          عودة لملفي
        </Link>
      </div>
      <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
        المحجوب لا تظهر منشوراته لك ولا تظهر منشوراتك له، ولا يستطيع أحدكما التفاعل مع الآخر.
      </p>

      {data.failed ? (
        <div role="alert" className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          تعذر تحميل قائمة المحجوبين الآن — أعد المحاولة.
        </div>
      ) : (
        <BlockedMembers initialMembers={data.members} />
      )}
    </section>
  );
}
