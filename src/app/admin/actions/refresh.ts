"use server";

/**
 * بيت المصور — إعادة تحميل بيانات اللوحة (CP-G)
 * ------------------------------------------------
 * تُستخدم من زر «تحديث» في الشريط العلوي وبعد بعض الإجراءات
 * (تكرار/رفع وسائط/دعوة مستخدم) لسحب الحقيقة من قاعدة البيانات.
 */

import { getAdminSession } from "@/lib/admin/session";
import { loadAdminData } from "@/lib/cms/admin-loader";
import type { AdminData } from "@/data/admin/types";

export async function refreshDataAction(): Promise<AdminData | null> {
  const session = await getAdminSession();
  if (!session) return null;
  try {
    const data = await loadAdminData();
    /* المستخدم الحالي من الجلسة — ليس أول صف في الجدول */
    data.currentUserId = session.userId;
    return data;
  } catch {
    return null;
  }
}
