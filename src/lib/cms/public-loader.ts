/**
 * بيت المصور — حمل بيانات الموقع العام (CP-G — وضع متسامح)
 * ----------------------------------------------------------
 * عميل anon بلا كوكيز (D-86): جلسة إدارة لا يمكن أن تتسرب للقراءات
 * العامة، وRLS يخفي المسودات فعليًا على مستوى قاعدة البيانات.
 * الجداول المحمية (profiles/roles) تفشل للزائر — تعال فارغة (tolerate).
 *
 * الأداء: القراءة كانت ~40 استعلامًا في **كل** عرض صفحة (الـ layout
 * الجذر يناديها لكل مسار في الموقع). الآن تُخزَّن النتيجة في ذاكرة
 * العملية (`cachedData`) فتصبح صفر استعلامات في الطلبات التالية،
 * وتبقى البيانات طازجة لأن `invalidateDataCache("cms")` يُبطلها بعد
 * كل تعديل في لوحة التحكم.
 */
import "server-only";

import { cache } from "react";

import { getPublicAnonClient } from "@/lib/supabase/service";
import { cachedData } from "@/lib/cache/data-cache";
import { loadCmsData } from "./load";
import { derivePublicCms, type PublicCmsView } from "@/data/public-bridge";
import type { AdminData } from "@/data/admin/types";

/** مدّة صلاحية بيانات الموقع العام — شبكة أمان، لا وسيلة التحديث */
const PUBLIC_TTL_MS = 60_000;

/** فشل التحميل (القاعدة متعثرة) يُعاد المحاولة سريعًا لا بعد دقيقة */
const PUBLIC_TTL_ERROR_MS = 5_000;

async function loadPublicViewUncached(): Promise<PublicCmsView | null> {
  let adminData: AdminData | null = null;
  try {
    const outcome = await loadCmsData(getPublicAnonClient(), "tolerate");
    adminData = outcome.data;
  } catch {
    adminData = null;
  }
  if (!adminData) return null;
  try {
    return derivePublicCms(adminData);
  } catch {
    return null;
  }
}

/** العرض العام المشتق من قاعدة البيانات مباشرة — أو null عند فشل جوهري */
export const loadPublicView = cache(async (): Promise<PublicCmsView | null> => {
  return cachedData<PublicCmsView | null>(
    "cms:public",
    (value) => (value === null ? PUBLIC_TTL_ERROR_MS : PUBLIC_TTL_MS),
    loadPublicViewUncached,
  );
});
