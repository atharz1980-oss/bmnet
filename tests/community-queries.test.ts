import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";
import { buildEmptyPermissions } from "@/data/admin/permissions";
import type { AdminSession } from "@/lib/admin/session";

const uid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
let responses: Record<string, unknown[]> = {};
let requests: URL[] = [];
let mutationRows: unknown[] = [];
let deletedTables: string[] = [];
const client = createClient("https://example.supabase.co", "test-key", {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    requests.push(url);
    const table = url.pathname.split("/").at(-1)!;
    if (init?.method === "DELETE") deletedTables.push(table);
    const rows = init?.method === "PATCH" ? mutationRows : responses[table] ?? [];
    const single = new Headers(init?.headers).get("accept")?.includes("vnd.pgrst.object");
    return new Response(JSON.stringify(single ? rows[0] ?? null : rows), {
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch },
});
client.auth.getUser = mock(async () => ({ data: { user: {
  id: uid, email: "member@example.test", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-01-01T00:00:00Z",
} }, error: null }));
mock.module("server-only", () => ({}));
mock.module("@/lib/supabase/service", () => ({ getPublicAnonClient: () => client, getServiceSupabase: () => client }));
mock.module("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => client }));
mock.module("next/cache", () => ({ revalidatePath: () => undefined }));
const { loadCommunityFeed, loadPhotographers, loadViewerSets, loadMyNotifications, loadMemberPosts } = await import("@/lib/community/loaders");
const { updatePostAction } = await import("@/app/community/actions/posts");
const { updatePortfolioProjectAction } = await import("@/app/community/actions/portfolio");
const { checkPublication } = await import("@/lib/admin/publishing");
const { acceptInvitationAction } = await import("@/app/admin/actions/auth");
let passwordUpdates = 0;
client.auth.updateUser = mock(async () => {
  passwordUpdates++;
  return { data: { user: null }, error: null };
}) as unknown as typeof client.auth.updateUser;

beforeEach(() => {
  responses = { community_profiles: [{ user_id: uid, username: "member", status: "active" }] };
  requests = [];
  mutationRows = [];
  deletedTables = [];
  passwordUpdates = 0;
});

describe("community query regressions (real PostgREST client, mocked HTTP)", () => {
  test("non-publishers may edit drafts but cannot publish through service actions", async () => {
    const session: AdminSession = {
      userId: uid, email: "staff@example.test", name: "Staff", avatarPath: null, roleId: uid,
      role: { id: uid, key: null, name: "Editor", kind: "custom", permissions: buildEmptyPermissions() },
    };
    responses.courses = [{ publish_status: "draft" }];
    expect(await checkPublication(client, session, "courses", "draft", uid)).toBeNull();
    expect(await checkPublication(client, session, "courses", "published", uid)).not.toBeNull();
    expect(await checkPublication(client, session, "courses", "published")).not.toBeNull();
    session.role.permissions.courses = ["publish"];
    expect(await checkPublication(client, session, "courses", "published", uid)).toBeNull();
  });
  test("invitation acceptance requires an invited staff profile", async () => {
    responses.profiles = [{ status: "suspended" }];
    expect((await acceptInvitationAction("a-long-password")).ok).toBe(false);
    expect(passwordUpdates).toBe(0);
    responses.profiles = [{ status: "invited" }];
    expect((await acceptInvitationAction("a-long-password")).ok).toBe(true);
    expect(passwordUpdates).toBe(1);
  });
  test("feed uses the extra row only to detect the next page", async () => {
    responses.community_posts = Array.from({ length: 13 }, (_, i) => ({ id: String(i), author_id: uid }));
    const result = await loadCommunityFeed();
    expect(result.posts).toHaveLength(12);
    expect(result.hasMore).toBe(true);
  });
  test("discovery does not repeat its lookahead row on the next page", async () => {
    responses.community_profiles = Array.from({ length: 25 }, (_, i) => ({ user_id: String(i), username: `member${i}` }));
    const result = await loadPhotographers({});
    expect(result.members).toHaveLength(24);
    expect(result.hasMore).toBe(true);
  });
  test("blocking another member never blocks the viewer", async () => {
    responses.community_user_blocks = [{ blocker_id: uid, blocked_id: other }];
    const result = await loadViewerSets();
    expect(result.blocked.has(uid)).toBe(false);
    expect(result.blocked.has(other)).toBe(true);
  });
  test("notification join explicitly selects the actor foreign key", async () => {
    await loadMyNotifications();
    const query = requests.find((r) => r.pathname.endsWith("community_notifications"));
    expect(query?.searchParams.get("select")).toContain("community_profiles!community_notifications_actor_id_fkey");
  });
  test("profile posts retain viewer likes and saves", async () => {
    responses.community_posts = [{ id: "post", author_id: other }];
    responses.community_post_likes = [{ post_id: "post" }];
    responses.community_saved_posts = [{ post_id: "post" }];
    const posts = await loadMemberPosts(other);
    expect(posts[0].likedByMe).toBe(true);
    expect(posts[0].savedByMe).toBe(true);
  });
  test("a hidden post update returning zero rows must not replace its media", async () => {
    responses.community_posts = [{ id: uid, author_id: uid }];
    const result = await updatePostAction(uid, { caption: "edit", category: "", camera: "", lens: "", locationName: "", media: [] });
    expect(result.ok).toBe(false);
    expect(deletedTables).toEqual([]);
  });
  test("a missing or unauthorized portfolio update cannot report success", async () => {
    const result = await updatePortfolioProjectAction(other, {
      title: "Project", description: "", category: "", locationName: "", projectDate: "",
      coverPath: "", published: false, media: [],
    });
    expect(result.ok).toBe(false);
    expect(deletedTables).toEqual([]);
  });
});
