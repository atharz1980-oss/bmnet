"use client";

/**
 * المنشورات المحفوظة.
 * الحفظ كان يعمل بلا مكان يُعرض فيه، فلا سبيل لاسترجاع ما حُفظ.
 * إلغاء الحفظ من البطاقة يزيل المنشور من هذه القائمة فورًا: البقاء بعد
 * إلغاء الحفظ يناقض معنى الصفحة.
 */
import Link from "next/link";
import { useState } from "react";
import { Bookmark } from "lucide-react";

import { PostCard } from "./post-card";
import type { FeedPost } from "@/lib/community/types";

export function SavedPosts({
  initialPosts,
  viewerUsername,
  viewerId,
}: {
  initialPosts: FeedPost[];
  viewerUsername?: string;
  viewerId?: string;
}) {
  const [posts, setPosts] = useState(initialPosts);

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-6 py-12 text-center">
        <Bookmark aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-charcoal-300" />
        <p className="text-sm font-medium text-charcoal-700">لا منشورات محفوظة بعد</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          احفظ منشورًا من أيقونة الحفظ في الخلاصة ليظهر هنا.
        </p>
        <Link
          href="/community"
          className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline"
        >
          تصفّح الخلاصة
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {posts.length} منشورًا محفوظًا
      </p>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isMember
          /* الصفحة نفسها محمية، فلا زائر يصلها — الرابط احتياط لا مسار. */
          loginHref="/community/login?next=%2Fcommunity%2Fsaved"
          isOwn={post.authorUserId === viewerId}
          viewerUsername={viewerUsername}
          onDeleted={(postId) => setPosts((current) => current.filter((item) => item.id !== postId))}
        />
      ))}
    </div>
  );
}
