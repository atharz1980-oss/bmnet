/**
 * بيت المصور — حمل بيانات الإدارة (CP-G — وضع صارم)
 * ---------------------------------------------------
 * عميل الخدمة فقط: يقرأ كل جداول الـ CMS + روابط بريد المستخدمين من
 * auth (Admin API). أي فشل = بيانات null (اللوحة تعرض خطأ تحميل).
 */
import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service";
import { loadCmsData } from "./load";
import type { AdminData } from "@/data/admin/types";
import type { AdminSession } from "@/lib/admin/session";
import { scopeAdminData } from "@/lib/admin/data-access";

/** بريد كل المستخدمين من auth.users عبر Admin API (profiles بلا بريد) */
export async function loadUserEmails(): Promise<Map<string, string>> {
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
}

/** بيانات اللوحة الكاملة — تُرفع الأخطاء (strict) */
export async function loadAdminData(session: AdminSession): Promise<AdminData> {
  const emails = session.role.permissions.users?.includes("view")
    ? await loadUserEmails() : new Map([[session.userId, session.email]]);
  const outcome = await loadCmsData(getServiceSupabase(), "strict", emails);
  if (!outcome.data) {
    const detail = outcome.failures.length > 0 ? outcome.failures.join(", ") : "غير معروف";
    throw new Error(`فشل تحميل بيانات اللوحة من قاعدة البيانات (${detail})`);
  }
  return scopeAdminData(outcome.data, session);
}
