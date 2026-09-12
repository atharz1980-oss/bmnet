/**
 * بيت المصور — Supabase Server Client (Phase 3 — CP-A)
 * ------------------------------------------------------
 * عميل الخادم عبر @supabase/ssr متوافقًا مع Next.js 16:
 * `cookies()` من next/headers أصبحت **async** — تُنتظر قبل القراءة.
 *
 * - القراءة (getAll): تعمل في كل سياق خادم (RSC / Route Handler / Action).
 * - الكتابة (setAll): تُحاول وتُتجاهل بصمت داخل Server Components
 *   (لا يمكن الكتابة منها بالتصميم) — الكتابة/التحديث مسؤولية الـ proxy.
 *
 * المفتاح: Publishable (anon) فقط — لا Secret Key في CP-A.
 */
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { cookies } from "next/headers";

/** إنشاء عميل خادم مرتبط بكوكيز الطلب الحالي (Next 16: cookies وعد async) */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase env مفقود: تأكد من NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* داخل Server Component: الكتابة غير متاحة — الـ proxy يتولى التحديث */
        }
      },
    },
  });
}
