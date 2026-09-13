/**
 * محولات المجتمع DB↔UI (CP-H V1) — نقية وقابلة للاختبار.
 * الوسائط: bucket مستقل community-media (لا يلمس bm-media).
 */
import type {
  CommunityMember,
  ExperienceLevel,
  FeedPost,
  NotificationItem,
  NotificationType,
  PortfolioProjectView,
  PostMediaView,
  ReportItem,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "./types";

export const COMMUNITY_BUCKET = "community-media";

/**
 * مسار تخزين مجتمع → رابط عرض داخل التطبيق.
 *
 * كان يبني رابط /object/public/ مباشرًا على Supabase، وهو رابط دائم لا
 * يتأثر بإخفاء المنشور ولا بتعليق العضو. الـbucket صار خاصًا، والعرض يمر
 * بمسار /community/media الذي يفحص الظهور عند كل طلب.
 *
 * الرابط من نفس الأصل، فيعمل مع next/image بلا remotePatterns.
 */
export function resolveCommunityMediaUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("/")) return path; // أصل محلي داخل public/
  return `/community/media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export interface CommunityProfileDbRow {
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  specialties: string[] | null;
  experience_level: string;
  avatar_path: string | null;
  cover_path: string | null;
  available_for_work: boolean | null;
  website_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  created_at: string;
  status?: string;
}

export function memberFromDb(row: CommunityProfileDbRow): CommunityMember {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? "",
    city: row.city ?? "",
    country: row.country ?? "",
    specialties: Array.isArray(row.specialties) ? row.specialties : [],
    experienceLevel: (row.experience_level as ExperienceLevel) ?? "beginner",
    avatarUrl: resolveCommunityMediaUrl(row.avatar_path ?? ""),
    coverUrl: resolveCommunityMediaUrl(row.cover_path ?? ""),
    availableForWork: row.available_for_work ?? false,
    websiteUrl: row.website_url ?? "",
    instagramUrl: row.instagram_url ?? "",
    youtubeUrl: row.youtube_url ?? "",
    createdAt: row.created_at,
  };
}

export interface FeedPostDbRow {
  id: string;
  author_id: string;
  caption: string | null;
  category: string | null;
  camera: string | null;
  lens: string | null;
  location_name: string | null;
  created_at: string;
  author?: CommunityProfileDbRow | null;
  media?: CommunityPostMediaDbRow[] | null;
  like_count?: unknown;
  comment_count?: unknown;
}

/** شكل PostgREST للتجميع: [{count: n}] — أو رقم مباشر بعد تحويلات مستقبلية */
function countFromAgg(value: unknown): number {
  if (typeof value === "number") return value;
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0] as { count?: unknown } | null;
    if (first && typeof first.count === "number") return first.count;
  }
  return 0;
}

export interface CommunityPostMediaDbRow {
  storage_path: string;
  alt_text: string | null;
  sort_order?: number;
}

export function postMediaFromDb(rows: CommunityPostMediaDbRow[] | null | undefined): PostMediaView[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m) => ({
      path: m.storage_path,
      url: resolveCommunityMediaUrl(m.storage_path),
      alt: m.alt_text ?? "",
    }));
}

export function feedPostFromDb(
  row: FeedPostDbRow,
  viewerSets?: { liked: Set<string>; saved: Set<string> },
): FeedPost {
  const author = row.author;
  return {
    id: row.id,
    authorUserId: row.author_id,
    authorUsername: author?.username ?? "",
    authorDisplayName: author?.display_name ?? "عضو",
    authorAvatarUrl: resolveCommunityMediaUrl(author?.avatar_path ?? ""),
    caption: row.caption ?? "",
    category: row.category ?? "",
    camera: row.camera ?? "",
    lens: row.lens ?? "",
    locationName: row.location_name ?? "",
    media: postMediaFromDb(row.media),
    likeCount: countFromAgg(row.like_count),
    commentCount: countFromAgg(row.comment_count),
    likedByMe: viewerSets ? viewerSets.liked.has(row.id) : false,
    savedByMe: viewerSets ? viewerSets.saved.has(row.id) : false,
    createdAt: row.created_at,
  };
}

export interface PortfolioProjectDbRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  location_name: string | null;
  project_date: string | null;
  cover_path: string | null;
  published: boolean | null;
  media?: CommunityPostMediaDbRow[] | null;
}

export function portfolioProjectFromDb(row: PortfolioProjectDbRow): PortfolioProjectView {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    category: row.category ?? "",
    locationName: row.location_name ?? "",
    projectDate: row.project_date ?? "",
    coverUrl: resolveCommunityMediaUrl(row.cover_path ?? ""),
    published: row.published ?? false,
    media: postMediaFromDb(row.media),
  };
}

export interface NotificationDbRow {
  id: string;
  type: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
  actor?: CommunityProfileDbRow | null;
}

export function notificationFromDb(row: NotificationDbRow): NotificationItem {
  const actor = row.actor;
  return {
    id: row.id,
    type: row.type as NotificationType,
    actorName: actor?.display_name ?? "عضو",
    actorUsername: actor?.username ?? "",
    actorAvatarUrl: resolveCommunityMediaUrl(actor?.avatar_path ?? ""),
    entityType: row.entity_type as "post" | "profile",
    entityId: row.entity_id,
    read: row.read_at !== null,
    createdAt: row.created_at,
  };
}

export interface ReportDbRow {
  id: string;
  target_type: string;
  target_id: string;
  target_preview?: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter?: CommunityProfileDbRow | null;
}

export function reportFromDb(row: ReportDbRow): ReportItem {
  return {
    id: row.id,
    targetType: row.target_type as ReportTargetType,
    targetId: row.target_id,
    targetPreview: row.target_preview ?? "",
    reason: row.reason as ReportReason,
    details: row.details ?? "",
    status: row.status as ReportStatus,
    reporterUsername: row.reporter?.username ?? "—",
    createdAt: row.created_at,
  };
}
