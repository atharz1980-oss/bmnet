/**
 * بيت المصور — إبطال كاش الـ CMS بعد الكتابة
 * -------------------------------------------
 * الكتابة في لوحة التحكم تُبطل كاش البيانات المعروضة، وإلا رأى
 * الزائرُ النسخة القديمة حتى انتهاء مدّة الكاش.
 *
 * الترتيب مهم: **الإبطال أولًا ثم إعادة البناء**. لو عكُسنا لَما
 * كانت إعادة البناء تقرأ النسخة القديمة وتبني منها الصفحة، فتبقى
 * الصفحة قديمة رغم الإبطال.
 */
import { revalidatePath } from "next/cache";

import { invalidateDataCache } from "@/lib/cache/data-cache";

/** إبطال كاش بيانات الـ CMS (عام + إدارة) — بلا إعادة بناء مسارات */
export function invalidateCmsCache(): void {
  invalidateDataCache("cms");
}

/**
 * إبطال الكاش + إعادة بناء المسارات المتأثرة.
 * @param paths أزواج [المسار، النوع] — النوع "page" أو "layout"
 */
export function refreshCmsPaths(paths: readonly (readonly [string, "page" | "layout"])[]): void {
  invalidateCmsCache();
  for (const [path, type] of paths) revalidatePath(path, type);
}
