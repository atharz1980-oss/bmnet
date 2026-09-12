import { NextResponse } from "next/server";

import { getPublicAnonClient } from "@/lib/supabase/service";

/**
 * تعليقات منشور — قراءة عامة عبر anon (RLS يعرض المنشورة فقط).
 * يتضمن مالك كل تعليق لعرض الاسم. لا بيانات حساسة.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const postId = url.searchParams.get("postId") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
    return NextResponse.json({ comments: [] }, { headers: { "cache-control": "no-store" } });
  }
  try {
    const client = getPublicAnonClient();
    const { data, error } = await client
      .from("community_post_comments")
      .select(
        `id, body, created_at, author_id,
         author:community_profiles!community_post_comments_author_id_fkey (user_id, username, display_name)`,
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) return NextResponse.json({ comments: [] }, { headers: { "cache-control": "no-store" } });
    const comments = ((data ?? []) as unknown as Array<{
      id: string; body: string; created_at: string; author_id: string;
      author?: { username: string; display_name: string } | null;
    }>).map((c) => ({
      id: c.id,
      body: c.body,
      author: c.author?.display_name ?? "عضو",
      authorUsername: c.author?.username ?? "",
      createdAt: c.created_at,
    }));
    return NextResponse.json({ comments }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ comments: [] }, { headers: { "cache-control": "no-store" } });
  }
}
