import { NextResponse } from "next/server";

import { loadCommunityFeed } from "@/lib/community/loaders";

/**
 * نقطة تغذية الخلاصة (ترقيم صفحات) — عامة بلا كوكيز (D-86).
 * الحجب يُطبَّق داخل المحمّل عبر مجموعات المشاهد.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageRaw = Number.parseInt(url.searchParams.get("page") ?? "0", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 0 && pageRaw <= 50 ? pageRaw : 0;
  const result = await loadCommunityFeed(page);
  return NextResponse.json(
    { posts: result.posts, hasMore: result.hasMore },
    { headers: { "cache-control": "no-store" } },
  );
}
