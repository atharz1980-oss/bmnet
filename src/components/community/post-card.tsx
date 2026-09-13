"use client";
/**
 * بطاقة منشور المجتمع (CP-H V1) — إعجاب/تعليقات/حفظ/مشاركة + حجب وبلاغ.
 * التفاعل للمسجلين فقط؛ المجهول يُوجَّه إلى الدخول ويعود إلى نفس المنشور.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Camera, Heart, Link2, MapPin, MessageCircle, MoreHorizontal,
  Bookmark, Flag, Ban, Pencil, Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MemberAvatar } from "./member-avatar";
import { formatShortDate } from "@/lib/format";
import { REPORT_REASON_LABELS, type FeedPost } from "@/lib/community/types";
import {
  deleteCommentAction, reportContentAction,
  toggleLikeAction, toggleSaveAction, unblockUserAction, addCommentAction,
  blockUserAction,
} from "@/app/community/actions/social";
import { deletePostAction } from "@/app/community/actions/posts";
import { CommunityImage } from "./community-image";

interface PostCardProps {
  post: FeedPost;
  isMember: boolean;
  /** وجهة الدخول التي تعيد الزائر إلى هذه الصفحة بعد نجاحه. */
  loginHref: string;
  isOwn: boolean;
  viewerUsername?: string;
  onEdit?: (post: FeedPost) => void;
  onDeleted?: (postId: string) => void;
}

export function PostCard({ post, isMember, loginHref, isOwn, viewerUsername, onEdit, onDeleted }: PostCardProps) {
  const router = useRouter();
  const mineUsernames = new Set(viewerUsername ? [viewerUsername] : []);
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.savedByMe);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<{ id: string; body: string; mine: boolean; author: string }[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [removed, setRemoved] = useState(false);

  if (removed) return null;

  /**
   * الزائر لا يُمنع من الضغط — يُؤخذ إلى الدخول ويعود إلى هنا.
   * التلميح وحده كان بابًا مغلقًا بلا مقبض: يخبره أن الفعل ممنوع ولا
   * يعطيه طريقًا إليه.
   */
  const requireMemberThen = (run: () => Promise<void>) => async () => {
    if (!isMember) {
      toast({ title: "سجّل الدخول للمشاركة", description: "سنعيدك إلى هذا المنشور بعد الدخول." });
      router.push(loginHref);
      return;
    }
    setBusy(true);
    try { await run(); } finally { setBusy(false); }
  };

  const handleLike = requireMemberThen(async () => {
    const result = await toggleLikeAction(post.id);
    if (result.ok) {
      setLiked(result.data.liked);
      if (result.data.likeCount >= 0) setLikeCount(result.data.likeCount);
      else setLikeCount((c) => (result.data.liked ? c + 1 : Math.max(0, c - 1)));
    } else {
      toast({ title: "تعذر التفاعل", description: result.error, variant: "destructive" });
    }
  });

  const handleSave = requireMemberThen(async () => {
    const result = await toggleSaveAction(post.id);
    if (result.ok) setSaved(result.data.saved);
    else toast({ title: "تعذر الحفظ", description: result.error, variant: "destructive" });
  });

  const loadComments = async () => {
    setCommentsOpen(true);
    try {
      const response = await fetch(`/community/api-comments?postId=${post.id}`, { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as {
          comments: { id: string; body: string; author: string; authorUsername: string }[];
        };
        setComments(
          data.comments.map((c) => ({
            id: c.id, body: c.body, author: c.author,
            mine: mineUsernames.has(c.authorUsername),
          })),
        );
      }
    } catch { /* tolerate — القائمة تبقى فارغة برسالة */ }
  };

  const handleAddComment = requireMemberThen(async () => {
    if (!commentBody.trim()) return;
    const result = await addCommentAction(post.id, commentBody);
    if (result.ok) {
      setComments((prev) => [...prev, { id: result.data.id, body: commentBody.trim(), mine: true, author: "أنت" }]);
      setCommentBody("");
    } else {
      toast({ title: "تعذر إضافة التعليق", description: result.error, variant: "destructive" });
    }
  });

  const handleDeletePost = async () => {
    const result = await deletePostAction(post.id);
    if (result.ok) {
      setRemoved(true);
      toast({ title: "تم حذف المنشور" });
      onDeleted?.(post.id);
    } else {
      toast({ title: "تعذر الحذف", description: result.error, variant: "destructive" });
    }
  };

  const handleReport = requireMemberThen(async () => {
    const result = await reportContentAction({
      targetType: "post",
      targetId: post.id,
      reason: reportReason as Parameters<typeof reportContentAction>[0]["reason"],
      details: reportDetails,
    });
    if (result.ok) {
      setReportOpen(false);
      setReportDetails("");
      toast({ title: "تم إرسال البلاغ", description: "سيراجعه فريق الإشراف." });
    } else {
      toast({ title: "تعذر إرسال البلاغ", description: result.error, variant: "destructive" });
    }
  });

  const handleBlock = requireMemberThen(async () => {
    const result = await blockUserAction(post.authorUserId);
    if (result.ok) {
      toast({ title: "تم حجب العضو", description: "لن يظهر محتواه في خلاصتك." });
      setRemoved(true);
    } else {
      toast({ title: "تعذر الحجب", description: result.error, variant: "destructive" });
    }
  });

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/community/u/${post.authorUsername}`
    : `/community/u/${post.authorUsername}`;

  return (
    <article className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden" aria-label={`منشور من ${post.authorDisplayName}`}>
      <header className="flex items-center gap-3 p-4">
        <Link href={`/community/u/${post.authorUsername}`} aria-label={`ملف ${post.authorDisplayName}`}>
          <MemberAvatar src={post.authorAvatarUrl} name={post.authorDisplayName} className="size-10" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/community/u/${post.authorUsername}`} className="font-semibold text-sm hover:underline">
            {post.authorDisplayName}
          </Link>
          <p className="text-xs text-muted-foreground">
            <time dateTime={post.createdAt}>{formatShortDate(post.createdAt)}</time>
            {post.locationName ? <> · <MapPin className="inline size-3" aria-hidden="true" /> {post.locationName}</> : null}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="خيارات المنشور">
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {isOwn && onEdit ? (
              <DropdownMenuItem onClick={() => onEdit(post)}>
                <Pencil className="size-4" /> تعديل
              </DropdownMenuItem>
            ) : null}
            {isOwn ? (
              <DropdownMenuItem onClick={handleDeletePost} className="text-destructive">
                <Trash2 className="size-4" /> حذف
              </DropdownMenuItem>
            ) : null}
            {!isOwn && isMember ? (
              <>
                <DropdownMenuItem onClick={() => setReportOpen(true)}>
                  <Flag className="size-4" /> إبلاغ
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                  <Ban className="size-4" /> حجب العضو
                </DropdownMenuItem>
              </>
            ) : null}
            {!isOwn && !isMember ? (
              <DropdownMenuItem onClick={() => router.push(loginHref)}>
                <Flag className="size-4" /> إبلاغ — يتطلب الدخول
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {post.media.length > 0 ? (
        <div className={post.media.length > 1 ? "grid grid-cols-2 gap-px bg-border" : ""}>
          {post.media.map((m) => (
            <div key={m.path} className="relative aspect-[4/3] bg-muted">
              <CommunityImage
                src={m.url}
                alt={m.alt || `صورة من منشور ${post.authorDisplayName}`}
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="p-4 space-y-3">
        {post.caption ? <p className="text-sm leading-7 whitespace-pre-line">{post.caption}</p> : null}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {post.category ? <span className="rounded-full bg-muted px-2 py-1">{post.category}</span> : null}
          {post.camera ? <span className="rounded-full bg-muted px-2 py-1"><Camera className="inline size-3" aria-hidden="true" /> {post.camera}</span> : null}
          {post.lens ? <span className="rounded-full bg-muted px-2 py-1">{post.lens}</span> : null}
        </div>

        <div className="flex items-center gap-1 border-t pt-2">
          <Button variant="ghost" size="sm" onClick={handleLike} disabled={busy}
            aria-pressed={liked} aria-label={liked ? "إلغاء الإعجاب" : "إعجاب"}>
            <Heart className={`size-4 ${liked ? "fill-destructive text-destructive" : ""}`} />
            <span>{likeCount}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={loadComments} aria-expanded={commentsOpen} aria-label="التعليقات">
            <MessageCircle className="size-4" />
            <span>{post.commentCount}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={busy}
            aria-pressed={saved} aria-label={saved ? "إزالة من المحفوظات" : "حفظ"}>
            <Bookmark className={`size-4 ${saved ? "fill-brand-600 text-brand-600" : ""}`} />
          </Button>
          <Button variant="ghost" size="sm" aria-label="نسخ رابط المنشور"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                toast({ title: "تم نسخ الرابط" });
              } catch { toast({ title: "تعذر النسخ", variant: "destructive" }); }
            }}>
            <Link2 className="size-4" />
          </Button>
        </div>

        {commentsOpen ? (
          <div className="space-y-3 border-t pt-3" aria-label="قائمة التعليقات">
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا تعليقات بعد — كن أول المعلقين.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
                  <p className="leading-6"><span className="font-semibold">{c.author}: </span>{c.body}</p>
                  {c.mine ? (
                    <Button variant="ghost" size="sm" aria-label="حذف تعليقي"
                      onClick={async () => {
                        const result = await deleteCommentAction(c.id);
                        if (result.ok) setComments((prev) => prev.filter((x) => x.id !== c.id));
                        else toast({ title: "تعذر الحذف", description: result.error, variant: "destructive" });
                      }}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              ))
            )}
            {isMember ? (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleAddComment(); }}>
                <Input value={commentBody} onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="اكتب تعليقًا…" maxLength={1000} aria-label="نص التعليق" />
                <Button type="submit" size="sm" disabled={busy || !commentBody.trim()}>إرسال</Button>
              </form>
            ) : (
              /* الزائر يقرأ التعليقات ويرى طريقه إلى المشاركة — لا حقل صامت. */
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href={loginHref}>سجّل الدخول للتعليق</Link>
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إبلاغ عن المنشور</DialogTitle>
            <DialogDescription>سيُراجع فريق الإشراف البلاغ بسرية.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-reason">سبب البلاغ</Label>
              <select id="report-reason" value={reportReason} onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                aria-label="سبب البلاغ">
                {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-details">تفاصيل إضافية (اختياري)</Label>
              <Textarea id="report-details" value={reportDetails} onChange={(e) => setReportDetails(e.target.value)}
                maxLength={1000} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>إلغاء</Button>
            <Button onClick={handleReport} disabled={busy}>إرسال البلاغ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export function UnblockButton({ userId, onDone }: { userId: string; onDone?: () => void }) {
  const { toast } = useToast();
  return (
    <Button variant="outline" size="sm" onClick={async () => {
      const result = await unblockUserAction(userId);
      if (result.ok) { toast({ title: "تم إلغاء الحجب" }); onDone?.(); }
      else toast({ title: "تعذر إلغاء الحجب", description: result.error, variant: "destructive" });
    }}>
      إلغاء الحجب
    </Button>
  );
}
