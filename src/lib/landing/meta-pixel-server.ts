import "server-only";

/**
 * قرارات الخادم لـ Meta Pixel في صفحة الحملة: المعرّف من البيئة، وهل يُسجَّل
 * Purchase لطلب حسمه `verifyGuestOrder` «مدفوعًا».
 *
 * Purchase لا يُرسل إلا إن كانت كلها صحيحة:
 *   - بيئة الدفع `production` وسعر التجربة المؤقت معطّل (لا شراء تجريبي
 *     ولا تجربة 1 ريال في بيانات الحملة الحية)؛
 *   - الدفع حديث: `paid_at` خلال ساعتين — فتح رابط النجاح لاحقًا أو من جهاز
 *     آخر لا يكرر الحدث.
 * الاستثناء الوحيد للاختبار المحلي: `META_PIXEL_TEST_PURCHASES=1` مع معرّف
 * Pixel اختبار — ولا يعمل أبدًا مع المعرّف الحي.
 */

import { createHash } from "node:crypto";

import { TEMPORARY_TEST_PRICE_SAR } from "@/data/landing/mobile-content";
import { paymentsMode, type PaymentMode } from "@/lib/payments/env";

import { LIVE_META_PIXEL_ID, PIXEL_ID_PATTERN } from "./meta-pixel";

export const PURCHASE_TRACKING_WINDOW_MS = 2 * 60 * 60 * 1000;
/* فرق ساعات بسيط بين الخادم والقاعدة لا يُسقط شراءً حقيقيًا. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/** معرّف الـ Pixel، أو null (فارغ أو غير صالح) — null يعني لا Pixel ولا شريط موافقة. */
export function metaPixelId(value = process.env.NEXT_PUBLIC_META_PIXEL_ID): string | null {
  const id = value?.trim() ?? "";
  return PIXEL_ID_PATTERN.test(id) ? id : null;
}

export function purchaseTrackable({
  paidAt,
  now = Date.now(),
  mode = paymentsMode(),
  testPriceSar = TEMPORARY_TEST_PRICE_SAR,
  pixelId = metaPixelId(),
  allowTestPurchases = process.env.META_PIXEL_TEST_PURCHASES === "1",
}: {
  paidAt: string | null;
  now?: number;
  mode?: PaymentMode;
  testPriceSar?: number | null;
  pixelId?: string | null;
  allowTestPurchases?: boolean;
}): boolean {
  if (!pixelId || !paidAt) return false;
  const paid = Date.parse(paidAt);
  if (!Number.isFinite(paid)) return false;
  if (now - paid > PURCHASE_TRACKING_WINDOW_MS || paid - now > CLOCK_SKEW_MS) return false;
  if (mode === "production" && testPriceSar === null) return true;
  return allowTestPurchases && pixelId !== LIVE_META_PIXEL_ID;
}

/**
 * معرّف حدث Purchase لطلب: تجزئة SHA-256 لرقم الطلب — ثابت لكل طلب (لمنع
 * التكرار، ولربط Conversions API لاحقًا بالاشتقاق نفسه)، ولا يكشف رقم الطلب.
 */
export function purchaseEventId(orderId: string): string {
  return `purchase:${createHash("sha256").update(`bm-lp-purchase:${orderId}`).digest("hex").slice(0, 32)}`;
}
