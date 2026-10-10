import "server-only";

/**
 * جاهزية الدفع لورشة عند الطلب، بنتيجة قصيرة العمر (15 ثانية) لكل ورشة كي لا
 * تضرب زيارات الحملة القاعدة مع كل صفحة. لا تعيد إلا قيمة منطقية.
 */

import { workshopCheckoutReady } from "./orders";

export const CHECKOUT_STATUS_TTL_MS = 15_000;
const memo = new Map<string, { ready: boolean; at: number }>();

export async function cachedWorkshopCheckoutReady(slug: string, now = Date.now()): Promise<boolean> {
  const cached = memo.get(slug);
  if (cached && now - cached.at < CHECKOUT_STATUS_TTL_MS) return cached.ready;
  const ready = await workshopCheckoutReady(slug);
  memo.set(slug, { ready, at: now });
  return ready;
}

export function resetCheckoutStatusCache(): void {
  memo.clear();
}
