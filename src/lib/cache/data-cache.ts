/**
 * بيت المصور — ذاكرة تخزين مؤقت داخل العملية (In-Process Data Cache)
 * ---------------------------------------------------------------
 * المشكلة التي تحلّها:
 *
 * كل قراءة من Supabase داخل الخادم كانت تُنفَّذ من جديد في كل طلب.
 * `loadCmsData` وحدها تُطلق ~40 استعلامًا متوازيًا، وهي تعمل في
 * الـ root layout — أي في **كل صفحة من صفحات الموقع**. النتيجة: زمن
 * استجابة مرتفع وتحديث بطيء، رغم أن المحتوى نفسه يتغير نادرًا.
 *
 * الحل: طبقة كاش داخل عملية Node (لا شبكة، لا تسلسل JSON، لا كتابة
 * على القرص) تُعيد النتيجة نفسها لكل الطلبات حتى انتهاء مدتها.
 *
 * لماذا داخل العملية بدل `unstable_cache`:
 * - `unstable_cache` يكتب على نظام الملفات (`.next/cache`) — على استضافة
 *  shared قد يكون المجلد للقراءة فقط أو يُمحى مع كل نشر، فيضيع الكاش
 *   ويصبح أبطأ من عدمه.
 * - الكاش داخل الذاكرة أسرع: قراءة Map بدل قراءة ملف + تحليل JSON.
 * - الاستضافة تشغّل عملية Node واحدة → الكاش فعّال ومشارك.
 *
 * ثلاث ضمانات:
 * 1. **Single-flight**: الطلبات المتزامنة على نفس المفتاح تنفّذ المحمّل
 *    مرة واحدة فقط (وإلا ضغطت القاعدة بـ 40 استعلام × عدة طلبات).
 * 2. **انتهاء مدّة (TTL)**: لا بيانات قديمة إلى الأبد — حتى لو فُقد
 *    استدعاء إبطال ما.
 * 3. **إبطال صريح**: `invalidateDataCache("cms")` يبطل فورًا، فتصل
 *    تعديلات لوحة التحكم للزائر في ثوانٍ لا في دقائق.
 */
import "server-only";

interface CacheEntry {
  value: unknown;
  expiresAt: number;
  /** وعد الحميل الجاري — يمنع تكرار التنفيذ المتزامن */
  inflight: Promise<unknown> | null;
}

const store = new Map<string, CacheEntry>();

/**
 * مدّة الكاش بالمللي ثانية. إن كانت دالة، تُحسب من النتيجة نفسها
 * (مثلًا: نتيجة فاشلة تُخزَّن مدة أقصر من نتيجة ناجحة).
 */
export type CacheTtl<T = unknown> = number | ((value: T) => number);

function resolveTtl<T>(ttl: CacheTtl<T>, value: T): number {
  const ms = typeof ttl === "function" ? (ttl as (v: T) => number)(value) : ttl;
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

/**
 * يقرأ من الكاش أو ينفّذ المحمّل مرة واحدة.
 * @param key مفتاح فريد (يُستخدم بادئة `namespace:` لتمييز المجموعات)
 * @param ttl مدّة الصلاحية بالمللي ثانية
 * @param loader دالة التحميل (تُستدعى عند الفات，并未 عند وجود نتيجة سارية)
 */
export async function cachedData<T>(
  key: string,
  ttl: CacheTtl<T>,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);

  if (hit) {
    if (hit.expiresAt > now) return hit.value as T;
    /* حميل جارٍ: ننتظره بدل أن نبدأ تحميلًا ثانيًا على القاعدة. */
    if (hit.inflight) return hit.inflight as Promise<T>;
  }

  const inflight = loader()
    .then((value) => {
      const expiresAt = Date.now() + resolveTtl(ttl, value);
      store.set(key, { value, expiresAt, inflight: null });
      return value;
    })
    .catch((error) => {
      /* الفشل لا يُخزَّن: الطلب التالي يُحاول من جديد فورًا. */
      store.delete(key);
      throw error;
    });

  store.set(key, { value: undefined, expiresAt: 0, inflight });
  return inflight;
}

/**
 * إبطال كل المفاتيح التي تبدأ ببادئة معيّنة (البادئة نفسها أو `بادئة:`).
 * يُستدعى بعد كل كتابة في لوحة التحكم حتى تصل التعديلات للزائر فورًا.
 */
export function invalidateDataCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) store.delete(key);
  }
}

/** إبطال كل شيء (يُستخدم في اختبارات الأداء والفحص). */
export function clearDataCache(): void {
  store.clear();
}
