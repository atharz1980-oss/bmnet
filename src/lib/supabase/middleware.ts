/**
 * بيت المصور — Supabase Session Refresh في الـ Proxy (Phase 3 — CP-A)
 * ---------------------------------------------------------------------
 * مساعد تحديث الجلسة بالنمط الرسمي لـ @supabase/ssr مع Next.js:
 * - قراءة الكوكيز من الطلب (request.cookies)
 * - تحديثها عبر استجابة جديدة عند تجدد الرموز (response.cookies)
 * - `auth.getUser()` يلمس الخادم فيجدّد الرموز عند الحاجة عبر setAll
 *
 * CP-A: تحديث جلسة فقط — لا حماية مسارات ولا توجيه ولا Auth flows.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** تحديث جلسة Supabase لكل طلب مارّ عبر الـ proxy وإرجاع الاستجابة */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  /* تُبنى الاستجابة من جديد داخل setAll عند تحديث الكوكيز — نمط رسمي */
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    /* بلا env (نسخ محلية بلا Supabase): المرور حر دون أي تدخل */
    return supabaseResponse;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  /* تحديث الجلسة عند الحاجة (يكتب/يحدّث الكوكيز عبر setAll إن تجددت الرموز).
     CP-A: لا قراءة قرار من المستخدم — لا حماية ولا توجيه. */
  await supabase.auth.getUser();

  return supabaseResponse;
}
