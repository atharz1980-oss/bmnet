/**
 * بيت المصور — حمل بيانات الموقع العام (CP-G — وضع متسامح)
 * ----------------------------------------------------------
 * عميل anon بلا كوكيز (D-86): جلسة إدارة لا يمكن أن تتسرب للقراءات
 * العامة، وRLS يخفي المسودات فعليًا على مستوى قاعدة البيانات.
 * الجداول المحمية (profiles/roles) تفشل للزائر — تعال فارغة (tolerate).
 */
import "server-only";

import { cache } from "react";

import { getPublicAnonClient } from "@/lib/supabase/service";
import { loadCmsData } from "./load";
import { derivePublicCms, type PublicCmsView } from "@/data/public-bridge";
import type { AdminData } from "@/data/admin/types";

/** العرض العام المشتق من قاعدة البيانات مباشرة — أو null عند فشل جوهري */
export const loadPublicView = cache(async (): Promise<PublicCmsView | null> => {
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
});
