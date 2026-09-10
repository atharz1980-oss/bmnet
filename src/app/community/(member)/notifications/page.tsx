import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { NotificationsList } from "@/components/community/notifications-list";
import { loadMyNotifications } from "@/lib/community/loaders";
import { getCommunityContext } from "@/lib/community/member";

export const metadata: Metadata = {
  title: "الإشعارات",
  robots: { index: false, follow: false },
};

export default async function CommunityNotificationsPage() {
  const ctx = await getCommunityContext();
  if (!ctx) redirect("/community/login?next=%2Fcommunity%2Fnotifications");
  if (!ctx.member && !ctx.suspended) redirect("/community/profile");
  const data = await loadMyNotifications();
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">الإشعارات</h1>
        <Link href="/community" className="text-sm text-brand-700 hover:underline">
          عودة للخلاصة
        </Link>
      </div>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        {data.failed ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            تعذر تحميل الإشعارات الآن — أعد المحاولة.
          </div>
        ) : (
          <NotificationsList initialItems={data.items} initialUnread={data.unread} />
        )}
      </Suspense>
    </section>
  );
}
