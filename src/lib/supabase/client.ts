/**
 * بيت المصور — Supabase Browser Client (Phase 3 — CP-A)
 * -------------------------------------------------------
 * عميل المتصفح عبر @supabase/ssr: مزامنة الجلسة عبر الكوكيز مع
 * الـ proxy والـ server client (نفس النمط الرسمي لـ Next.js App Router).
 *
 * المفاتيح: Publishable (anon) فقط — مصممة للعميل بالأصل.
 * لا Secret/service_role هنا أبدًا.
 *
 * Singleton كسول: إنشاء عميل واحد لكل تحميل صفحة (تفادي تحذير
 * GoTrueClient المتعدد من @supabase/auth-js).
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | undefined;

/** إنشاء/إرجاع عميل المتصفح الوحيد للجلسة الحالية */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase env مفقود: تأكد من NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  browserClient = createBrowserClient<Database>(url, publishableKey);
  return browserClient;
}
