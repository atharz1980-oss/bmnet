import "server-only";

/**
 * حدّ معدل بسيط للنماذج العامة.
 * جدولا contact_messages وcorporate_requests يقبلان INSERT من anon بحكم
 * التصميم، فبلا حدّ يستطيع أي أحد إغراقهما آليًا. هذا الحدّ يقع قبل لمس
 * القاعدة فلا يُكتب شيء أصلًا.
 *
 * الحدود: في ذاكرة العملية. التطبيق يعمل كعملية Node واحدة على الاستضافة
 * الحالية فتكفي، لكنها **ليست** حدًا موزعًا: تُفقد عند إعادة التشغيل ولا
 * تُشارَك بين عمليات متعددة. لو صار النشر متعدد النسخ فاستبدلها بحدّ مشترك
 * في القاعدة أو Redis. لا تعتمد عليها وحدها حماية من هجوم موجّه.
 */

interface Window {
  count: number;
  resetAt: number;
}

const WINDOWS = new Map<string, Window>();

/** تنظيف كسول: يمنع نمو الخريطة بلا حدّ دون مؤقّت دوري. */
function sweep(now: number): void {
  if (WINDOWS.size < 500) return;
  for (const [key, window] of WINDOWS) {
    if (window.resetAt <= now) WINDOWS.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  sweep(now);
  const existing = WINDOWS.get(key);
  if (!existing || existing.resetAt <= now) {
    WINDOWS.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** للاختبارات فقط — لا تُستدعى من كود التطبيق. */
export function resetRateLimits(): void {
  WINDOWS.clear();
}

/**
 * مفتاح المرسِل من ترويسات الوكيل.
 * القيمة قابلة للانتحال، فالحدّ يخفّف الإغراق العابر ولا يوقف مهاجمًا يزوّر
 * الترويسة. غياب الترويسة يُجمَّع تحت مفتاح واحد بدل السماح بلا حدّ.
 */
export function requesterKey(headers: Headers, scope: string): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = headers.get("x-real-ip")?.trim();
  return `${scope}:${forwarded || real || "unknown"}`;
}
