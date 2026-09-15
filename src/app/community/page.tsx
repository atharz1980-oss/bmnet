import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { CommunityFeed } from "@/components/community/feed";
import { loadCommunityFeed, loadViewerSets } from "@/lib/community/loaders";
import { getCommunityContext } from "@/lib/community/member";
import { communityLoginHref, communitySignupHref } from "@/lib/community/auth-links";

export const metadata: Metadata = {
  title: "المجتمع",
  description: "مجتمع بيت المصور — منصة المصورين لمشاركة الأعمال والتواصل والتعلم.",
  alternates: { canonical: "/community" },
};

export const revalidate = 60;

export default async function CommunityFeedPage() {
  const [feed, ctx] = await Promise.all([
    loadCommunityFeed(0),
    getCommunityContext(),
  ]);
  // مجموعات المشاهد تُحمَّل داخل مكوّن الخلاصة عند الحاجة (لأن anon client بلا كوكيز)
  await loadViewerSets().catch(() => null);

  return (
    <>
      <PageHeader
        title="مجتمع بيت المصور"
        description="شارك أعمالك، تابع المصورين، واستلهم من المجتمع."
        breadcrumb={[
          { label: "الرئيسية", href: "/" },
          { label: "المجتمع" },
        ]}
      />
      <section className="mx-auto w-full max-w-2xl px-4 py-8 space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/community/photographers" className="inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 hover:bg-muted lg:min-h-0">
            استكشف المصورين
          </Link>
          {ctx?.member ? (
            <>
              <Link href={`/community/u/${ctx.member.username}`} className="inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 hover:bg-muted lg:min-h-0">
                ملفي العام
              </Link>
              <Link href="/community/notifications" className="inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 hover:bg-muted lg:min-h-0">
                الإشعارات
              </Link>
            </>
          ) : null}
        </div>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
          <CommunityFeed
            loginHref={communityLoginHref("/community")}
            signupHref={communitySignupHref("/community")}
            initialPosts={feed.posts}
            initialHasMore={feed.hasMore}
            failed={feed.failed}
            isMember={Boolean(ctx?.member)}
            isSuspended={Boolean(ctx?.suspended)}
            currentUserId={ctx?.user.id ?? null}
            viewerUsername={ctx?.member?.username}
            needsProfile={Boolean(ctx && !ctx.member && !ctx.suspended)}
          />
        </Suspense>
      </section>
    </>
  );
}
