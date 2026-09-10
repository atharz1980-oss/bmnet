"use client";
/**
 * خلاصة المجتمع (CP-H V1) — الأحدث أولًا مع ترقيم صفحات بسيط.
 * المجهول: يرى الخلاصة + تلميح تسجيل. العضو: ينشر ويعدّل ويحذف منشوره.
 */
import Link from "next/link";
import { useCallback, useState } from "react";
import { Loader2, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PostCard } from "./post-card";
import { PostComposer } from "./post-composer";
import type { FeedPost } from "@/lib/community/types";

interface FeedProps {
  initialPosts: FeedPost[];
  initialHasMore: boolean;
  failed: boolean;
  isMember: boolean;
  isSuspended: boolean;
  currentUserId: string | null;
}

export function CommunityFeed({
  initialPosts, initialHasMore, failed, isMember, isSuspended, currentUserId,
}: FeedProps) {
  const { toast } = useToast();
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<FeedPost | null>(null);

  const reloadFirstPage = useCallback(async () => {
    try {
      const response = await fetch("/community/api-feed?page=0", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { posts: FeedPost[]; hasMore: boolean };
        setPosts(data.posts);
        setHasMore(data.hasMore);
        setPage(0);
        return;
      }
    } catch { /* tolerate */ }
    window.location.reload();
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const response = await fetch(`/community/api-feed?page=${page + 1}`, { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { posts: FeedPost[]; hasMore: boolean };
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...data.posts.filter((p) => !seen.has(p.id))];
        });
        setHasMore(data.hasMore);
        setPage((p) => p + 1);
      }
    } catch {
      toast({ title: "تعذر تحميل المزيد", variant: "destructive" });
    } finally {
      setLoadingMore(false);
    }
  };

  if (failed && posts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-3">
        <p className="font-medium">تعذر تحميل الخلاصة الآن.</p>
        <p className="text-sm text-muted-foreground">قد تكون ميزة المجتمع لم تُفعّل بعد — أعد المحاولة لاحقًا.</p>
        <Button variant="outline" onClick={reloadFirstPage}>إعادة المحاولة</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isMember && !isSuspended ? (
        <div className="flex items-center justify-between rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">شارك أعمالك مع المجتمع</p>
          <Button onClick={() => { setEditing(null); setComposerOpen(true); }}>
            <PenLine className="size-4" /> منشور جديد
          </Button>
        </div>
      ) : null}

      {!isMember ? (
        <div className="rounded-xl border bg-brand-50 p-4 text-center space-y-2">
          <p className="text-sm font-medium">انضم إلى مجتمع بيت المصور</p>
          <p className="text-sm text-muted-foreground">أنشئ ملفك، انشر أعمالك، وتابع المصورين.</p>
          <div className="flex justify-center gap-2">
            <Button asChild size="sm"><Link href="/community/signup">إنشاء حساب</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/community/login">تسجيل الدخول</Link></Button>
          </div>
        </div>
      ) : null}

      {posts.length === 0 && !failed ? (
        <div className="rounded-xl border bg-card p-10 text-center space-y-2">
          <p className="font-medium">لا منشورات بعد</p>
          <p className="text-sm text-muted-foreground">كن أول من يشارك صورة في مجتمع بيت المصور.</p>
          {isMember && !isSuspended ? (
            <Button onClick={() => { setEditing(null); setComposerOpen(true); }}>انشر أول صورة</Button>
          ) : null}
        </div>
      ) : null}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isMember={isMember}
          isOwn={Boolean(currentUserId && post.authorUserId === currentUserId)}
          onEdit={(p) => { setEditing(p); setComposerOpen(true); }}
          onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
        />
      ))}

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
            تحميل المزيد
          </Button>
        </div>
      ) : null}

      <PostComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        editing={editing}
        onSaved={reloadFirstPage}
      />
    </div>
  );
}
