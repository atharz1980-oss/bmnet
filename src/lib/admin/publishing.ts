import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminSession } from "./session";

const targets = {
  courses: ["courses", "publish_status"],
  paths: ["learning_paths", "publish_status"],
  blog: ["blog_posts", "publish_status"],
  legal: ["legal_pages", "published"],
} as const;

/** Service-role writes must preserve the SQL publish-transition permission. */
export async function checkPublication(
  client: SupabaseClient, session: AdminSession, module: keyof typeof targets,
  next: string | boolean, id?: string,
): Promise<string | null> {
  if (session.role.permissions[module]?.includes("publish")) return null;
  if (!id) return next === "draft" || next === false ? null : "ليست لديك صلاحية النشر.";
  const [table, column] = targets[module];
  const { data, error } = await client.from(table).select(column).eq("id", id).maybeSingle();
  if (error || !data) return "تعذر التحقق من حالة النشر.";
  return (data as unknown as Record<string, unknown>)[column] === next ? null : "ليست لديك صلاحية تغيير حالة النشر.";
}
