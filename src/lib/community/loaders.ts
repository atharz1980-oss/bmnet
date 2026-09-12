import "server-only";
/**
 * محمّلات المحتوى العام للمجتمع (CP-H V1) — server-only.
 * كل قراءة عبر عميل anon بلا كوكيز (D-86) بنمط tolerate:
 * غياب الجداول (قبل تطبيق المالك للمخططات) ينتج حالات فارغة — لا انهيار.
 * بيانات المشاهد (إعجابي/محفوظاتي/حجبي) تُجلب عبر عميل الكوكيز على حدة.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicAnonClient, getServiceSupabase } from "@/lib/supabase/service";

import {
  feedPostFromDb,
  memberFromDb,
  notificationFromDb,
  portfolioProjectFromDb,
  resolveCommunityMediaUrl,
  type CommunityProfileDbRow,
  type FeedPostDbRow,
  type NotificationDbRow,
  type PortfolioProjectDbRow,
} from "./mappers";
import { DISCOVERY_PAGE_SIZE, FEED_PAGE_SIZE } from "./validation";
import type {
  CommunityMember,
  FeedPost,
  NotificationItem,
  PortfolioProjectView,
  PublicProfileView,
} from "./types";

const SUSPENDED_OR_MISSING = Symbol("profile-unavailable");

interface DbEnvelope<T> {
  data: T | null;
  error: { message: string } | null;
}

async function safe<T>(
  run: () => PromiseLike<DbEnvelope<T>>,
): Promise<T | null | typeof SUSPENDED_OR_MISSING> {
  try {
    const { data, error } = await run();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/** مجموعات المشاهد: ما أعجبني / ما حفظته / من أحجب (بالطرفين) */
export interface ViewerSets {
  liked: Set<string>;
  saved: Set<string>;
  blocked: Set<string>;
  following: Set<string>;
}

export async function loadViewerSets(): Promise<ViewerSets> {
  const empty: ViewerSets = { liked: new Set(), saved: new Set(), blocked: new Set(), following: new Set() };
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return empty;
    const [likes, saves, blocks, follows] = await Promise.all([
      supabase.from("community_post_likes").select("post_id").eq("user_id", uid),
      supabase.from("community_saved_posts").select("post_id").eq("user_id", uid),
      supabase
        .from("community_user_blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`),
      supabase.from("community_follows").select("following_id").eq("follower_id", uid),
    ]);
    (likes.data ?? []).forEach((r: { post_id: string }) => empty.liked.add(r.post_id));
    (saves.data ?? []).forEach((r: { post_id: string }) => empty.saved.add(r.post_id));
    (blocks.data ?? []).forEach((r: { blocker_id: string; blocked_id: string }) => {
      if (r.blocker_id !== uid) empty.blocked.add(r.blocker_id);
      if (r.blocked_id !== uid) empty.blocked.add(r.blocked_id);
    });
    (follows.data ?? []).forEach((r: { following_id: string }) => empty.following.add(r.following_id));
    return empty;
  } catch {
    return empty;
  }
}

/** Feed V1: الأحدث أولًا، صفحة واحدة، تصفية الحجب من نتائج anon client */
export async function loadCommunityFeed(
  page = 0,
): Promise<{ posts: FeedPost[]; hasMore: boolean; failed: boolean }> {
  try {
    const client = getPublicAnonClient();
    const { data, error } = await client
      .from("community_posts")
      .select(
        `id, author_id, caption, category, camera, lens, location_name, created_at,
         author:community_profiles!community_posts_author_id_fkey!inner (user_id, username, display_name, avatar_path),
         media:community_post_media (storage_path, alt_text, sort_order),
         like_count:community_post_likes (count),
         comment_count:community_post_comments (count)`,
      )
      .order("created_at", { ascending: false })
      .range(page * FEED_PAGE_SIZE, page * FEED_PAGE_SIZE + FEED_PAGE_SIZE);

    if (error) return { posts: [], hasMore: false, failed: true };
    const rows = (data ?? []) as unknown as FeedPostDbRow[];
    const viewer = await loadViewerSets();
    const posts = rows.slice(0, FEED_PAGE_SIZE)
      .filter((row) => !viewer.blocked.has(row.author_id))
      .map((row) =>
        feedPostFromDb(row, {
          liked: viewer.liked,
          saved: viewer.saved,
        }),
      );
    return { posts, hasMore: rows.length > FEED_PAGE_SIZE, failed: false };
  } catch {
    return { posts: [], hasMore: false, failed: true };
  }
}

export async function loadMemberByUsername(
  username: string,
): Promise<CommunityMember | null> {
  const result = await safe(async () => {
    const client = getPublicAnonClient();
    return client
      .from("community_profiles")
      .select("*")
      .eq("username", username.toLowerCase())
      .eq("status", "active")
      .maybeSingle();
  });
  if (!result || result === SUSPENDED_OR_MISSING) return null;
  return memberFromDb(result as CommunityProfileDbRow);
}

async function count(
  client: ReturnType<typeof getPublicAnonClient>,
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  try {
    const { count: c, error } = await query;
    if (error) return 0;
    return c ?? 0;
  } catch {
    return 0;
  }
}

export async function loadPublicProfile(
  username: string,
  viewerId: string | null,
): Promise<PublicProfileView | null> {
  let client: ReturnType<typeof getPublicAnonClient>;
  try {
    client = getPublicAnonClient();
  } catch {
    return null;
  }
  const member = await loadMemberByUsername(username);
  if (!member) return null;

  const [followers, following, posts, projectsRaw, followRow] = await Promise.all([
    count(client, client.from("community_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", member.userId)),
    count(client, client.from("community_follows").select("following_id", { count: "exact", head: true }).eq("follower_id", member.userId)),
    count(client, client.from("community_posts").select("id", { count: "exact", head: true }).eq("author_id", member.userId).eq("status", "published")),
    safe(() =>
      client
        .from("community_portfolio_projects")
        .select("*, media:community_portfolio_media (storage_path, alt_text, sort_order)")
        .eq("user_id", member.userId)
        .eq("published", true)
        .order("project_date", { ascending: false, nullsFirst: false })
        .limit(24),
    ),
    viewerId
      ? safe(() =>
          client
            .from("community_follows")
            .select("follower_id")
            .eq("follower_id", viewerId)
            .eq("following_id", member.userId)
            .maybeSingle(),
        )
      : Promise.resolve(null),
  ]);

  const projects = ((projectsRaw && projectsRaw !== SUSPENDED_OR_MISSING ? projectsRaw : []) as PortfolioProjectDbRow[]).map(
    portfolioProjectFromDb,
  );

  return {
    member,
    followersCount: followers,
    followingCount: following,
    postsCount: posts,
    projects,
    isFollowing: Boolean(followRow && followRow !== SUSPENDED_OR_MISSING),
  };
}

export interface DiscoveryFilters {
  q?: string;
  city?: string;
  country?: string;
  specialty?: string;
  experience?: string;
  available?: string;
  page?: number;
}

export interface DiscoveryResult {
  members: CommunityMember[];
  hasMore: boolean;
  failed: boolean;
}

export async function loadPhotographers(
  filters: DiscoveryFilters,
): Promise<DiscoveryResult> {
  const page = Math.max(0, filters.page ?? 0);
  try {
    const client = getPublicAnonClient();
    let query = client
      .from("community_profiles")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(page * DISCOVERY_PAGE_SIZE, page * DISCOVERY_PAGE_SIZE + DISCOVERY_PAGE_SIZE);

    const q = (filters.q ?? "").trim();
    if (q) {
      const safeQ = q.replace(/[%,()]/g, "");
      query = query.or(`username.ilike.%${safeQ}%,display_name.ilike.%${safeQ}%`);
    }
    if (filters.city?.trim()) query = query.ilike("city", `%${filters.city.trim().replace(/[%,()]/g, "")}%`);
    if (filters.country?.trim()) query = query.ilike("country", `%${filters.country.trim().replace(/[%,()]/g, "")}%`);
    if (filters.specialty?.trim()) query = query.contains("specialties", [filters.specialty.trim()]);
    if (filters.experience && ["beginner", "intermediate", "professional"].includes(filters.experience))
      query = query.eq("experience_level", filters.experience);
    if (filters.available === "1") query = query.eq("available_for_work", true);

    const { data, error } = await query;
    if (error) return { members: [], hasMore: false, failed: true };
    const rows = (data ?? []) as CommunityProfileDbRow[];
    return {
      members: rows.slice(0, DISCOVERY_PAGE_SIZE).map(memberFromDb),
      hasMore: rows.length > DISCOVERY_PAGE_SIZE,
      failed: false,
    };
  } catch {
    return { members: [], hasMore: false, failed: true };
  }
}

/** إشعاراتي — عميل الكوكيز (RLS يعيد صفوف المالك فقط) */
export async function loadMyNotifications(): Promise<{
  items: NotificationItem[];
  unread: number;
  failed: boolean;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data?.user?.id) return { items: [], unread: 0, failed: true };
    const { data: rows, error } = await supabase
      .from("community_notifications")
      .select(
        `id, type, actor_id, entity_type, entity_id, read_at, created_at,
         actor:community_profiles!community_notifications_actor_id_fkey (user_id, username, display_name, avatar_path)`,
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { items: [], unread: 0, failed: true };
    const items = ((rows ?? []) as unknown as NotificationDbRow[]).map(notificationFromDb);
    return { items, unread: items.filter((i) => !i.read).length, failed: false };
  } catch {
    return { items: [], unread: 0, failed: true };
  }
}

/** منشورات عضو في ملفه العام (تُستخدم ضمن loadPublicProfile للعرض المستقبلي) */
export async function loadMemberPosts(
  userId: string,
  limit = 12,
): Promise<FeedPost[]> {
  const rows = await safe(async () => {
    const client = getPublicAnonClient();
    return client
      .from("community_posts")
      .select(
        `id, author_id, caption, category, camera, lens, location_name, created_at,
         author:community_profiles!community_posts_author_id_fkey!inner (user_id, username, display_name, avatar_path),
         media:community_post_media (storage_path, alt_text, sort_order),
         like_count:community_post_likes (count),
         comment_count:community_post_comments (count)`,
      )
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit) as unknown as PromiseLike<DbEnvelope<FeedPostDbRow[]>>;
  });
  if (!rows || rows === SUSPENDED_OR_MISSING) return [];
  const viewer = await loadViewerSets();
  return rows.filter((row) => !viewer.blocked.has(row.author_id))
    .map((row) => feedPostFromDb(row, viewer));
}

/**
 * المنشورات التي حفظها العضو.
 * الحفظ كان بلا مكان يُعرض فيه، فالميزة تعمل في اتجاه واحد فقط. تُقرأ
 * بجلسة العضو لأن community_saved_posts خاص بمالكه ولا يراه anon.
 */
export async function loadSavedPosts(limit = 24): Promise<{ posts: FeedPost[]; failed: boolean }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return { posts: [], failed: true };

    const { data: saved, error: savedError } = await supabase
      .from("community_saved_posts")
      .select("post_id, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (savedError) return { posts: [], failed: true };
    const ids = (saved ?? []).map((row) => row.post_id);
    if (ids.length === 0) return { posts: [], failed: false };

    const { data: rows, error } = await supabase
      .from("community_posts")
      .select(
        `id, author_id, caption, category, camera, lens, location_name, created_at,
         author:community_profiles!community_posts_author_id_fkey!inner (user_id, username, display_name, avatar_path),
         media:community_post_media (storage_path, alt_text, sort_order),
         like_count:community_post_likes (count),
         comment_count:community_post_comments (count)`,
      )
      .in("id", ids);
    if (error) return { posts: [], failed: true };

    const viewer = await loadViewerSets();
    /* ترتيب الحفظ لا ترتيب النشر: الأحدث حفظًا أولًا. */
    const order = new Map(ids.map((id, index) => [id, index]));
    const posts = ((rows ?? []) as unknown as FeedPostDbRow[])
      .filter((row) => !viewer.blocked.has(row.author_id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map((row) => feedPostFromDb(row, viewer));
    return { posts, failed: false };
  } catch {
    return { posts: [], failed: true };
  }
}

export interface BlockedMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  blockedAt: string;
}

/**
 * من حجبهم العضو.
 * بلا هذه القائمة يصير الحجب بابًا لا رجعة منه: منشورات المحجوب تختفي من
 * الخلاصة، وزر فك الحجب كان داخل بطاقة المنشور وحدها.
 */
export async function loadBlockedMembers(): Promise<{ members: BlockedMember[]; failed: boolean }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return { members: [], failed: true };

    const { data: blocks, error } = await supabase
      .from("community_user_blocks")
      .select("blocked_id, created_at")
      .eq("blocker_id", uid)
      .order("created_at", { ascending: false });
    if (error) return { members: [], failed: true };
    const ids = (blocks ?? []).map((row) => row.blocked_id);
    if (ids.length === 0) return { members: [], failed: false };

    /* الملفات بعميل الخدمة: سياسة العرض العام تُخفي الموقوف، والعضو يجب أن
       يرى من حجبه ليفك عنه مهما كانت حالته. */
    const { data: profiles } = await getServiceSupabase()
      .from("community_profiles")
      .select("user_id, username, display_name, avatar_path")
      .in("user_id", ids);

    const byId = new Map((profiles ?? []).map((row) => [row.user_id, row]));
    const members = (blocks ?? []).map((block) => {
      const profile = byId.get(block.blocked_id);
      return {
        userId: block.blocked_id,
        username: profile?.username ?? "",
        displayName: profile?.display_name ?? "عضو محذوف",
        avatarUrl: resolveCommunityMediaUrl(profile?.avatar_path ?? ""),
        blockedAt: block.created_at,
      };
    });
    return { members, failed: false };
  } catch {
    return { members: [], failed: true };
  }
}

/** هل اسم المستخدم متاح؟ (للمحرر أثناء إنشاء الملف) */
export async function isUsernameAvailable(
  username: string,
  exceptUserId?: string,
): Promise<boolean> {
  const result = await safe(async () => {
    const client = getPublicAnonClient();
    let query = client
      .from("community_profiles")
      .select("user_id")
      .eq("username", username.toLowerCase());
    if (exceptUserId) query = query.neq("user_id", exceptUserId);
    return query.limit(1);
  });
  if (!result || result === SUSPENDED_OR_MISSING) return false;
  return result.length === 0;
}

/** مشاريعي كلها (منشورًا ومسودة) — عميل الكوكيز، RLS يعيد صفوف المالك فقط */
export async function loadMyPortfolio(): Promise<PortfolioProjectView[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) return [];
    const { data, error } = await supabase
      .from("community_portfolio_projects")
      .select("*, media:community_portfolio_media (storage_path, alt_text, sort_order)")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return [];
    return ((data ?? []) as PortfolioProjectDbRow[]).map(portfolioProjectFromDb);
  } catch {
    return [];
  }
}
