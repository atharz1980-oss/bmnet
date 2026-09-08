/**
 * بيت المصور — Middleware (CP-A + CP-F)
 * --------------------------------------
 * ملاحظة معمارية موثقة (D-52): اصطلاح Next.js 16 الرسمي هو `proxy.ts`،
 * لكنه في next@16.1.3 مع Turbopack لا يُسجَّل في middleware-manifest —
 * لذا يُستخدم `middleware.ts` المدعوم فعليًا (بتحذير الإهمال المتوقع).
 *
 * المهام:
 *  1. CP-A: تمرير كل طلب ديناميكي عبر تحديث جلسة Supabase (تجديد الرموز).
 *  2. CP-F: حماية /admin/** — أي مسار إداري بلا جلسة مصادقة يُعاد إلى
 *     /admin/login?next=… مع تحقق أمان الـ next (منع open-redirect:
 *     مسار داخلي فقط — يبدأ بـ «/» وليس «//»).
 *     ملاحظة الأمان: هذا حاجز UX سريع (Edge) — الحماية الحقيقية للبيانات
 *     هي RLS + بوابات requirePermission داخل كل Server Action.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { safeInternalNext } from "@/lib/cms/result";

export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  /* تحقق CP-A الحي (مسار الفحص فقط): كتابة/تحديث كوكي عبر آلية @supabase/ssr */
  if (pathname === "/admin/dev/supabase-check") {
    const response = NextResponse.next({ request });
    const current = request.cookies.get("cpa-probe")?.value;
    const next = current ? String(Number(current) + 1) : "1";
    response.cookies.set("cpa-probe", next, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  /* بوابة CP-F: مسارات الإدارة (عدا صفحة الدخول نفسها) */
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginPage = pathname.startsWith("/admin/login");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (isAdminArea && !isLoginPage && url && publishableKey) {
    let supabaseResponse = NextResponse.next({ request });
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

    /* getUser يلمس الخادم ويجدّد الرموز عند الحاجة (عبر setAll) */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const next = safeInternalNext(`${pathname}${search}`);
      const loginUrl = new URL("/admin/login", request.url);
      if (next) loginUrl.searchParams.set("next", next);
      const redirectResponse = NextResponse.redirect(loginUrl);
      /* انقل أي كوكيز جلسة متجددة إلى توجيه الدخول */
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }

    return supabaseResponse;
  }

  /* بقية الطلبات: تحديث جلسة عادي (CP-A) */
  const { updateSession } = await import("@/lib/supabase/middleware");
  return updateSession(request);
}

export const config = {
  /* الأصول الثابتة لا تمر عبر الـ proxy — فقط الطلبات الديناميكية */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|logo.svg|robots.txt|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
