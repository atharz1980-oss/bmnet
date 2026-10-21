/**
 * بيت المصور — حمل بيانات الإدارة (CP-G — وضع صارم)
 * ---------------------------------------------------
 * عميل الخدمة فقط: يقرأ كل جداول الـ CMS + روابط بريد المستخدمين من
 * auth (Admin API). أي فشل = بيانات null (اللوحة تعرض خطأ تحميل).
 *
 * الأداء: كان كل تنقّل داخل لوحة الإدارة يُطلق ~40 استعلامًا + سحب
 * 500 مستخدم من Admin API، وكل حفظ في اللوحة يُعيد السحب كله. الآن:
 * - نتائج قاعدة البيانات تُخزَّن في ذاكرة العملية لمدة قصيرة
 *   (ADMIN_TTL_MS) — فالتنقّل بين التبويبات شبه فوري.
 * - قائمة بُرد المستخدمين تُخزَّن مدة أطول (EMAILS_TTL_MS) لأنها
 *   لا تتغيّر إلا عند تغيير المستخدمين.
 * - أي كتابة إدارية تستدعي `invalidateDataCache("cms")` فتنكشف
 *   التعديلات فورًا بلا انتظار انتهاء المدّة.
 */
import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service";
import { cachedData } from "@/lib/cache/data-cache";
import { loadCmsData } from "./load";
import type { AdminData } from "@/data/admin/types";
import type { AdminSession } from "@/lib/admin/session";
import { scopeAdminData } from "@/lib/admin/data-access";

/** مدّة صلاحية بيانات اللوحة — قصيرة عمدًا: التصفّح والتعديل متقاربان */
const ADMIN_TTL_MS = 15_000;

/** مدّة صلاحية بُرد المستخدمين (Admin API) — أطول: تغيّر العضوية نادر */
const EMAILS_TTL_MS = 300_000;

/** بريد كل المستخدمين من auth.users عبر Admin API (profiles بلا بريد) */
export async function loadUserEmails(): Promise<Map<string, string>> {
  return cachedData<Map<string, string>>("cms:admin:emails", EMAILS_TTL_MS, async () => {
    const emails = new Map<string, string>();
    try {
      const svc = getServiceSupabase();
      const { data, error } = await svc.auth.admin.listUsers({ perPage: 500 });
      if (!error) {
        for (const user of data.users) {
          if (user.email) emails.set(user.id, user.email);
        }
      }
    } catch {
      /* البريد غير حرج للعرض — نكمل بلا بريد */
    }
    return emails;
  });
}

/** بيانات اللوحة الكاملة — تُرفع الأخطاء (strict) */
export async function loadAdminData(session: AdminSession): Promise<AdminData> {
  const canViewUsers = session.role.permissions.users?.includes("view") === true;

  /* مفاتيح منفصلة: من يرى كل المستخدمين يستلم سجلًا يحمل بُرد الجميع،
     ومن لا يرى إلا نفسه يستلم سجله وحده — فلا تختلط الصلاحيات. */
  const cacheKey = canViewUsers ? "cms:admin:full" : `cms:admin:limited:${session.userId}`;

  const outcome = await cachedData(
    cacheKey,
    (value) => (value.data === null ? 3_000 : ADMIN_TTL_MS),
    async () => {
      const emails = canViewUsers
        ? await loadUserEmails()
        : new Map([[session.userId, session.email]]);
      return loadCmsData(getServiceSupabase(), "strict", emails);
    },
  );

  if (!outcome.data) {
    const detail = outcome.failures.length > 0 ? outcome.failures.join(", ") : "غير معروف";
    throw new Error(`فشل تحميل بيانات اللوحة من قاعدة البيانات (${detail})`);
  }
  return scopeAdminData(outcome.data, session);
}
