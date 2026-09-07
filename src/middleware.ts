/**
 * بيت المصور — Middleware (Phase 3 CP-A)
 * ----------------------------------------
 * ملاحظة معمارية موثقة (D-52): اصطلاح Next.js 16 الرسمي هو `proxy.ts`،
 * لكنه في next@16.1.3 مع Turbopack لا يُسجَّل في middleware-manifest
 * (يُجمَّع ويُكشف في قائمة البناء لكن لا يُستدعى وقت التشغيل — مُثبت
 * تجريبيًا بمقارنة مباشرة). لذا CP-A يستخدم `middleware.ts` المدعوم
 * فعليًا (بتحذير الإهمال المتوقع) — عند ترقية Next يُعاد التسمية إلى
 * proxy.ts دون أي تغيير في المنطق (نفس هذا الملف حرفيًا).
 *
 * دور CP-A الوحيد: تمرير كل طلب ديناميكي عبر مساعد تحديث جلسة Supabase.
 * لا حماية مسارات، لا توجيه، لا Auth — الموقع العام ولوحة التحكم كما هما.
 */
import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export default async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  /* تحقق CP-A الحي (مسار الفحص فقط): كتابة/تحديث كوكي عبر نفس آلية
     @supabase/ssr (response.cookies.set) لإثبات مسار الكتابة/التحديث —
     الصفحة تعرض القيمة المقروءة والاختبار يتحقق من تزايدها عبر الطلبات */
  if (request.nextUrl.pathname === "/admin/dev/supabase-check") {
    const current = request.cookies.get("cpa-probe")?.value;
    const next = current ? String(Number(current) + 1) : "1";
    response.cookies.set("cpa-probe", next, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  /* الأصول الثابتة لا تمر عبر الـ proxy — فقط الطلبات الديناميكية */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|logo.svg|robots.txt|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
