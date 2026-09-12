/**
 * بيت المصور — عميل الخدمة (Service Client — CP-F)
 * -------------------------------------------------
 * عميل Supabase بالمفتاح السري (Secret Key) لتشغيل العمليات الخلفية
 * المتحقق منها داخل Server Actions: تجاوز RLS مقصود ومقيّد —
 * الـ RLS يبقى حاجز الأمان الفعلي أمام عملاء anon/authenticated،
 * وهذا العميل يُستخدم فقط بعد التحقق من الجلسة والصلاحية في الإجراء.
 *
 * - "server-only": يفشل البناء إن استُورد من مكوّن متصفح (حماية تسريب).
 * - لا كوكيز هنا: عميل إداري خالص لعمليات الخادم.
 */
import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let serviceClient: SupabaseClient<Database> | undefined;

/** عميل الخدمة الوحيد على الخادم — يتطلب SUPABASE_SECRET_KEY */
export function getServiceSupabase(): SupabaseClient<Database> {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "Supabase service env مفقود: تأكد من NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SECRET_KEY",
    );
  }

  serviceClient = createClient<Database>(url, secretKey, {
    auth: {
      /* عميل إداري: لا جلسة مستخدم ولا تخزين رموز */
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return serviceClient;
}

/** عميل anon بلا كوكيز — للموقع العام (D-86): جلسة إدارة لا يمكن أن
 *  تتسرب إلى القراءات العامة، وRLS يخفي المسودات فعليًا على مستوى DB */
export function getPublicAnonClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase env مفقود: NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY");
  }
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
