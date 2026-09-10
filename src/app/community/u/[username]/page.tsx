import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Briefcase, Globe, Instagram, Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/community/member-avatar";
import { FollowButton } from "@/components/community/follow-button";
import { getCommunityViewerId } from "@/lib/community/member";
import { loadPublicProfile, loadMemberPosts } from "@/lib/community/loaders";
import { EXPERIENCE_LABELS } from "@/lib/community/types";
import { siteConfig } from "@/data/site";
import { formatShortDate } from "@/lib/format";

interface Params {
  username: string;
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username } = await params;
  const safeUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  const profile = await loadPublicProfile(safeUsername, null);
  if (!profile) {
    return { title: "عضو غير موجود — المجتمع", robots: { index: false, follow: false } };
  }
  const { member } = profile;
  const title = `${member.displayName} | مجتمع بيت المصور`;
  const description =
    member.bio.slice(0, 160) ||
    `ملف ${member.displayName} في مجتمع بيت المصور — ${EXPERIENCE_LABELS[member.experienceLevel]}`;
  const url = `${siteConfig.url}/community/u/${member.username}`;
  return {
    title,
    description,
    alternates: { canonical: `/community/u/${member.username}` },
    openGraph: {
      title,
      description,
      url,
      type: "profile",
      images: member.coverUrl || member.avatarUrl ? [{ url: member.coverUrl || member.avatarUrl }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  const viewerId = await getCommunityViewerId().catch(() => null);
  const profile = await loadPublicProfile(username, viewerId);
  if (!profile) notFound();

  const { member } = profile;
  const posts = await loadMemberPosts(member.userId);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 space-y-8">
      {/* الترويسة */}
      <header className="overflow-hidden rounded-xl border bg-card">
        <div className="relative aspect-[3/1] bg-muted">
          {member.coverUrl ? (
             
            <img src={member.coverUrl} alt={`غلاف ملف ${member.displayName}`} className="size-full object-cover" />
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-4 p-4">
          <div className="-mt-10 rounded-full border-2 border-background bg-background">
            <MemberAvatar src={member.avatarUrl} name={member.displayName} className="size-24" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="flex items-center gap-1.5 text-xl font-bold">
              {member.displayName}
              {member.availableForWork ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-normal text-brand-800">
                  <Briefcase className="size-3" aria-hidden="true" /> متاح للعمل
                </span>
              ) : null}
            </h1>
            <p className="text-sm text-muted-foreground" dir="ltr">@{member.username}</p>
          </div>
          {viewerId && viewerId !== member.userId ? (
            <FollowButton targetUserId={member.userId} initialFollowing={profile.isFollowing} />
          ) : null}
        </div>
      </header>

      {/* الإحصاءات */}
      <dl className="grid grid-cols-4 gap-2 text-center" aria-label="إحصاءات الملف">
        {[
          { label: "منشور", value: profile.postsCount },
          { label: "متابِع", value: profile.followersCount },
          { label: "يتابع", value: profile.followingCount },
          { label: "مشروع", value: profile.projects.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-3">
            <dt className="order-2 text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="text-lg font-bold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {/* التعريف */}
      <div className="space-y-3">
        {member.bio ? <p className="text-sm leading-7 whitespace-pre-line">{member.bio}</p> : null}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-2 py-1">{EXPERIENCE_LABELS[member.experienceLevel]}</span>
          {member.city ? <span className="rounded-full bg-muted px-2 py-1">{member.city}</span> : null}
          {member.country ? <span className="rounded-full bg-muted px-2 py-1">{member.country}</span> : null}
          {member.specialties.map((s) => (
            <span key={s} className="rounded-full bg-brand-50 px-2 py-1 text-brand-800">{s}</span>
          ))}
        </div>
        <div className="flex gap-3 text-sm">
          {member.websiteUrl ? (
            <a href={member.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:underline">
              <Globe className="size-4" aria-hidden="true" /> الموقع
            </a>
          ) : null}
          {member.instagramUrl ? (
            <a href={member.instagramUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:underline">
              <Instagram className="size-4" aria-hidden="true" /> انستقرام
            </a>
          ) : null}
          {member.youtubeUrl ? (
            <a href={member.youtubeUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:underline">
              <Youtube className="size-4" aria-hidden="true" /> يوتيوب
            </a>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          عضو منذ <time dateTime={member.createdAt}>{formatShortDate(member.createdAt)}</time>
        </p>
      </div>

      {/* مشاريع الأعمال */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">مشاريع الأعمال</h2>
        {profile.projects.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            لا مشاريع منشورة بعد.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {profile.projects.map((project) => (
              <li key={project.id} className="overflow-hidden rounded-xl border bg-card">
                {project.coverUrl ? (
                  <div className="relative aspect-[3/2] bg-muted">
                    { }
                    <img src={project.coverUrl} alt={`غلاف مشروع ${project.title}`} className="size-full object-cover" />
                  </div>
                ) : null}
                <div className="space-y-1 p-3">
                  <h3 className="font-semibold">{project.title}</h3>
                  {project.category ? <span className="text-xs text-muted-foreground">{project.category}</span> : null}
                  {project.description ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{project.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* المنشورات الأخيرة */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">أحدث المنشورات</h2>
        {posts.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            لا منشورات بعد.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id} className="overflow-hidden rounded-lg border bg-card">
                {post.media[0] ? (
                  <div className="relative aspect-square bg-muted">
                    { }
                    <img
                      src={post.media[0].url}
                      alt={post.media[0].alt || `صورة من منشور ${member.displayName}`}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-muted p-2 text-center text-xs text-muted-foreground">
                    {post.caption.slice(0, 80) || "منشور"}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* تكامل الأكاديمية: يُعرض فقط ما هو موثوق فعليًا — لا بيانات اختراع.
          نظام التسجيل/الشهادات غير موجود بعد في الأكاديمية (موثق في checkpoint). */}
      <p className="text-center text-xs text-muted-foreground">
        <BadgeCheck className="inline size-3" aria-hidden="true" />{" "}
        عضو في <Link href="/community" className="underline">مجتمع بيت المصور</Link>
      </p>
    </section>
  );
}
