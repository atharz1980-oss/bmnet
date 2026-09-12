import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SavedPosts } from "@/components/community/saved-posts";
import { loadSavedPosts } from "@/lib/community/loaders";
import { getCommunityContext } from "@/lib/community/member";

export const metadata: Metadata = {
  title: "المنشورات المحفوظة",
  robots: { index: false, follow: false },
};

export default async function CommunitySavedPage() {
  const ctx = await getCommunityContext();
  if (!ctx) redirect("/community/login?next=%2Fcommunity%2Fsaved");
  if (!ctx.member && !ctx.suspended) redirect("/community/profile");

  const data = await loadSavedPosts();
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">المنشورات المحفوظة</h1>
        <Link href="/community" className="text-sm text-brand-700 hover:underline">
          عودة للخلاصة
        </Link>
      </div>

      {data.failed ? (
        <div role="alert" className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          تعذر تحميل المحفوظات الآن — أعد المحاولة.
        </div>
      ) : (
        <SavedPosts
          initialPosts={data.posts}
          viewerUsername={ctx.member?.username}
          viewerId={ctx.member?.userId}
        />
      )}
    </section>
  );
}
